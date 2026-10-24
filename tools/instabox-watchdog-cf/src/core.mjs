// Watchdog orchestration for the Cloudflare Worker implementation.
//
// This is the GitHub watchdog's main flow (tools/instabox-watchdog/
// watchdog.mjs) re-expressed against injected dependencies so the
// exact same behaviour runs in Workers (fetch + KV) and in Node unit
// tests (fakes, no network, no real waiting):
//   deps.api    — createApi() client (or a fake with the same shape)
//   deps.store  — async key/value store: get(key), put(key, value);
//                 put(key, null) deletes. Keys: 'status', 'episode',
//                 'lock'.
//   deps.fetchExpectedSha — async () => 40-hex SHA of the KidsCoding
//                 deployment branch head on GitHub; null/fetch errors
//                 fail closed and never produce an OK verdict.
//   deps.now    — () => epoch ms; deps.sleep — async (ms) => void
//   deps.log    — (event, detail) => void
//   deps.config — { machineId, hold, ...tunables }
//
// Safety contract (same as the GitHub version, plus cross-run state):
//   - Only a machine whose FRESH state is `suspended` is resumed.
//   - `stopped` is never resumed (owner action).
//   - Transitional states are waited out; a second resume is never
//     issued while one may be in flight (operation_conflict = wait).
//   - Resume attempts are capped per EPISODE (persisted in the store,
//     so the cap holds across separate cron invocations, not just
//     within one run): at most 2, at least 45 s apart, and only
//     capacity/transient failures are retried.
//   - A KV lock with a 25-minute TTL prevents overlapping runs (and
//     therefore overlapping resumes) inside this layer; the other
//     layers re-read state before acting, which is the cross-layer
//     guard until they are retired or re-pointed.
//   - FAIL-CLOSED: any monitoring error produces a BLOCKED_* verdict
//     and never updates the healthy timestamps.

import {
  decideForState,
  classifyError,
  resumeRetryable,
  parseDeepCheck,
  assessDeep,
  verdictFor,
  FAILING_VERDICTS,
  isRunSuccess,
} from './logic.mjs';
import { ApiError } from './api.mjs';

export const DEEP_CHECK_CMD = [
  'KIDS_HEALTH=$(curl -s -m 5 http://127.0.0.1:3000/api/health || echo CURL_FAIL)',
  'TJ_HEALTH=$(curl -s -m 5 http://127.0.0.1:8080/health | head -c 300 || echo CURL_FAIL)',
  'KIDS_SHA=$(cat /data/workspace/platform-deploy/cicd/state/kids-prerelease.sha 2>/dev/null || echo MISSING)',
  'CONTAINERS=$(docker ps --format "{{.Names}}|{{.Image}}|{{.Status}}" 2>/dev/null | tr "\\n" ";")',
  'echo "KIDS_HEALTH=$KIDS_HEALTH"; echo "TJ_HEALTH=$TJ_HEALTH"; echo "KIDS_SHA=$KIDS_SHA"; echo "CONTAINERS=$CONTAINERS"; exit 0',
].join('; ');

/**
 * Stable idempotency key for one suspended episode. The InstaBox
 * platform requires an Idempotency-Key header (1-200 printable
 * characters) on POST /v1/machines/<id>/resume; without it the call
 * is rejected with bad_request and the machine stays suspended.
 * The key is derived from the episode's suspendedSince timestamp,
 * so every retry inside the same episode carries the same key (a
 * racing duplicate POST becomes a no-op instead of a second
 * resume), while a new episode gets a fresh key.
 */
export function episodeResumeKey(episode) {
  return `watchdog-resume-${episode && episode.suspendedSince ? episode.suspendedSince : 'unknown'}`;
}

export const DEFAULTS = {
  statePollTimeoutMs: 240_000,
  statePollIntervalMs: 15_000,
  operationPollTimeoutMs: 300_000,
  operationPollIntervalMs: 5_000,
  resumeBackoffMs: 45_000,
  deepCheckTries: 3,
  deepCheckIntervalMs: 30_000,
  lockTtlMs: 25 * 60_000,
  episodeMaxAttempts: 2,
  runHistoryKeep: 20,
};

export async function runWatchdog(deps) {
  const cfg = { ...DEFAULTS, ...(deps.config || {}) };
  const now = () => deps.now();
  const sleep = deps.sleep;
  const startedAtMs = now();
  const runId =
    deps.runId || `run-${startedAtMs}-${Math.random().toString(36).slice(2, 8)}`;
  const events = [];
  const log = (event, detail = '') => {
    const line = { ts: new Date(now()).toISOString(), event, detail: String(detail) };
    events.push(line);
    if (deps.log) deps.log(event, line.detail);
  };

  // Persist the run record into the status object the backup layer
  // reads. LOCKED runs deliberately do NOT touch lastRunAt /
  // lastSuccessAt / lastHealthyAt: a skipped run proves nothing.
  async function finish(verdict, extra = {}) {
    const record = {
      verdict,
      machineId: cfg.machineId,
      runId,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(now()).toISOString(),
      detail: '',
      ...extra,
      events,
    };
    try {
      const status = (await deps.store.get('status')) || {};
      status.machineId = cfg.machineId;
      status.hold = Boolean(cfg.hold);
      const recent = Array.isArray(status.recentRuns) ? status.recentRuns : [];
      recent.push({
        at: record.finishedAt,
        verdict,
        state: record.state || null,
        runId,
      });
      status.recentRuns = recent.slice(-cfg.runHistoryKeep);
      if (verdict !== 'LOCKED') {
        status.lastRunAt = record.finishedAt;
        status.lastVerdict = verdict;
        if (record.state) status.lastMachineState = record.state;
        if (isRunSuccess(verdict)) status.lastSuccessAt = record.finishedAt;
        if (verdict === 'OK') status.lastHealthyAt = record.finishedAt;
        if (FAILING_VERDICTS.has(verdict)) {
          status.lastAlert = {
            verdict,
            at: record.finishedAt,
            detail: record.detail || '',
          };
        }
      } else {
        status.lastLockSkipAt = record.finishedAt;
      }
      await deps.store.put('status', status);
    } catch (err) {
      log('status-write-failed', String((err && err.message) || err));
    }
    log('verdict', verdict);
    return record;
  }

  // Cross-run overlap guard (covers duplicate cron triggers and a
  // manual /run racing a scheduled run inside this layer).
  const existingLock = await deps.store.get('lock');
  if (
    existingLock &&
    typeof existingLock.at === 'number' &&
    now() - existingLock.at < cfg.lockTtlMs &&
    existingLock.runId !== runId
  ) {
    log('lock-held', `locked by ${existingLock.runId} at ${new Date(existingLock.at).toISOString()}`);
    return finish('LOCKED', { detail: 'another watchdog run holds the lock; this run made no API calls' });
  }
  await deps.store.put('lock', { runId, at: now() });

  try {
    return await execute({ cfg, deps, now, sleep, log, finish });
  } catch (err) {
    // Fail-closed catch-all, mirroring the GitHub version: an
    // unexpected orchestration error is a monitoring failure.
    log('unhandled-error', String((err && err.message) || err));
    return finish('BLOCKED_MONITOR', {
      detail: `unhandled error: ${String((err && err.message) || err)}`,
    });
  } finally {
    try {
      const lock = await deps.store.get('lock');
      if (lock && lock.runId === runId) await deps.store.put('lock', null);
    } catch {
      // A stale lock expires via its TTL; never mask the verdict.
    }
  }
}

async function execute({ cfg, deps, now, sleep, log, finish }) {
  const { api, store } = deps;
  const machineId = cfg.machineId;

  if (!api) {
    log('config-error', 'INSTABOX_API_KEY is not set');
    return finish('BLOCKED_AUTH', { detail: 'INSTABOX_API_KEY secret is missing' });
  }

  let expectedSha = null;
  let expectedShaResolved = false;
  async function expectedKidsSha() {
    if (!expectedShaResolved) {
      expectedShaResolved = true;
      try {
        expectedSha = await deps.fetchExpectedSha();
      } catch (err) {
        log('expected-sha-error', String((err && err.message) || err));
        expectedSha = null;
      }
      log('expected-sha', expectedSha || 'unavailable (recorded; machine-side checks still enforced)');
    }
    return expectedSha;
  }

  async function deepCheck() {
    const res = await api.exec(machineId, DEEP_CHECK_CMD, 60);
    if (!res || res.exitCode !== 0) {
      throw new Error(`deep check command exited ${res ? res.exitCode : 'no-response'}`);
    }
    // Strict three-way SHA contract: a failed GitHub lookup must not
    // silently bypass the expected-versus-deployed comparison.
    const expected = await expectedKidsSha();
    if (!expected) {
      throw new ApiError('expected KidsCoding GitHub SHA unavailable', {
        code: 'expected_sha_unavailable',
        retryable: true,
      });
    }
    return assessDeep(parseDeepCheck(res.stdout || ''), expected, { checkTianji: cfg.checkTianji !== false });
  }

  async function pollState(want, timeoutMs) {
    const deadline = now() + timeoutMs;
    let info = await api.getMachine(machineId);
    while (info.state !== want && now() < deadline) {
      if (info.state === 'error' || info.state === 'deleted') break;
      await sleep(cfg.statePollIntervalMs);
      info = await api.getMachine(machineId);
      log('state-poll', info.state);
    }
    return info;
  }

  async function pollOperation(opId) {
    const deadline = now() + cfg.operationPollTimeoutMs;
    let op = await api.getOperation(opId);
    while (op && op.state !== 'succeeded') {
      if (op.state === 'failed') {
        const e = op.error || {};
        throw new ApiError(e.message || `operation ${opId} failed`, {
          code: e.code || 'operation_failed',
          retryable: e.retryable === true,
        });
      }
      if (now() + cfg.operationPollIntervalMs > deadline) {
        throw new ApiError(`operation ${opId} did not finish in time`, {
          code: 'operation_timeout',
          retryable: true,
        });
      }
      await sleep(cfg.operationPollIntervalMs);
      op = await api.getOperation(opId);
    }
    return op;
  }

  let info;
  try {
    info = await api.getMachine(machineId);
  } catch (err) {
    const cls = classifyError(err);
    log('getmachine-failed', `${cls}: ${err.code || err.name || ''} ${err.message || err}`);
    return finish(verdictFor({ errorClass: cls }), {
      detail: String(err.message || err),
      errorClass: cls,
    });
  }
  log('machine-state', `${info.name || machineId} state=${info.state}`);
  let state = info.state;
  let action = decideForState(state);

  // Episode bookkeeping: an episode lives only while the machine is
  // suspended. Any other observed state closes it.
  let episode = await store.get('episode');
  if (state !== 'suspended' && episode) {
    await store.put('episode', null);
    episode = null;
  }

  if (action === 'observe') {
    log('observe-only', 'machine is stopped (owner action); not resuming');
    return finish('STOPPED_MANUAL', {
      state,
      detail: 'owner-stopped; watchdog does not resume stopped machines',
    });
  }
  if (action === 'blocked') {
    return finish('BLOCKED_STATE', { state, detail: `machine state=${state}` });
  }

  if (action === 'wait') {
    // Transitional (incl. resuming): poll briefly; never issue a
    // second resume while one may already be in flight.
    info = await pollState('running', cfg.statePollTimeoutMs);
    state = info.state;
    action = decideForState(state);
    log('settled-state', state);
    if (action === 'wait') {
      return finish('IN_TRANSITION', { state, detail: 'still in transition; next cycle continues' });
    }
    if (action === 'observe') {
      return finish('STOPPED_MANUAL', { state, detail: 'settled to stopped (owner action)' });
    }
    if (action === 'blocked') {
      return finish('BLOCKED_STATE', { state, detail: `machine state=${state}` });
    }
    if (state !== 'suspended' && episode) {
      await store.put('episode', null);
      episode = null;
    }
  }

  let deep = null;
  let lastError = '';

  if (action === 'resume') {
    if (cfg.hold) {
      log('held', 'maintenance hold is on; reporting only');
      return finish('HELD', { state, detail: 'maintenance hold is on' });
    }
    episode = episode || {
      suspendedSince: new Date(now()).toISOString(),
      attempts: 0,
      lastAttemptAt: 0,
      lastError: '',
    };
    if (episode.attempts >= cfg.episodeMaxAttempts) {
      log('resume-cap-reached', `episode attempts=${episode.attempts}`);
      return finish('BLOCKED_RESUME', {
        state,
        detail: `resume attempt cap (${cfg.episodeMaxAttempts}) for this suspended episode already reached; last error: ${episode.lastError || 'unknown'}`,
      });
    }
    let resumed = false;
    while (episode.attempts < cfg.episodeMaxAttempts) {
      // Enforce the 45 s spacing across runs as well as within one.
      if (episode.lastAttemptAt) {
        const waitMs = cfg.resumeBackoffMs - (now() - episode.lastAttemptAt);
        if (waitMs > 0) await sleep(waitMs);
      }
      episode.attempts += 1;
      episode.lastAttemptAt = now();
      await store.put('episode', episode);
      try {
        log('resume-attempt', `attempt ${episode.attempts} from state=${state}`);
        // The platform serializes resume operations per machine; a
        // stable per-episode Idempotency-Key keeps retries (and a
        // racing duplicate POST) from creating a second operation.
        const op = await api.resumeMachine(machineId, {
          idempotencyKey: episodeResumeKey(episode),
        });
        if (op && op.id && op.state !== 'succeeded') await pollOperation(op.id);
        info = await api.getMachine(machineId);
        state = info.state;
        log('resume-result', `state=${state}`);
        resumed = true;
        break;
      } catch (err) {
        const cls = classifyError(err);
        lastError = `${cls}: ${err.code || ''} ${err.message || err}`;
        episode.lastError = lastError;
        await store.put('episode', episode);
        log('resume-failed', lastError);
        if (cls === 'conflict') {
          // Another actor is already resuming: wait, never re-POST.
          info = await pollState('running', cfg.statePollTimeoutMs);
          state = info.state;
          if (state === 'running') {
            resumed = true;
            break;
          }
          return finish(verdictFor({ action: 'resume-failed', errorClass: cls }), {
            state,
            detail: lastError,
          });
        }
        if (!resumeRetryable(cls) || episode.attempts >= cfg.episodeMaxAttempts) {
          return finish(verdictFor({ action: 'resume-failed', errorClass: cls }), {
            state,
            detail: lastError,
          });
        }
        await sleep(cfg.resumeBackoffMs);
        info = await api.getMachine(machineId);
        state = info.state;
        if (state === 'running') {
          resumed = true;
          break;
        }
        if (decideForState(state) !== 'resume') {
          return finish('IN_TRANSITION', { state, detail: 'state changed during backoff' });
        }
      }
    }
    if (!resumed || state !== 'running') {
      info = await pollState('running', cfg.statePollTimeoutMs);
      state = info.state;
    }
    if (state !== 'running') {
      return finish('BLOCKED_RESUME', {
        state,
        detail: lastError || `state=${state}`,
      });
    }
    await store.put('episode', null);
    episode = null;
    action = 'deep-check';
    // A resumed machine's services need a moment: re-check up to
    // deepCheckTries times before calling it an app fault. If the deep
    // check itself never succeeds, that is BLOCKED_MONITOR.
    for (let i = 1; i <= cfg.deepCheckTries; i++) {
      try {
        deep = await deepCheck();
      } catch (err) {
        log('deep-check-error', String((err && err.message) || err));
        deep = null;
      }
      if (deep && deep.healthy) break;
      if (i < cfg.deepCheckTries) await sleep(cfg.deepCheckIntervalMs);
    }
    if (!deep) {
      return finish('BLOCKED_MONITOR', {
        state,
        detail: 'deep check unavailable after resume',
      });
    }
  } else if (action === 'deep-check') {
    // Steady state: a THROWN deep check is a monitoring-path failure
    // (exec or network), not an application fault — retry it bounded
    // times before reporting BLOCKED_*; only the last failure
    // decides. An obtained unhealthy assessment is a real signal and
    // is reported at once (APP_FAULT), never retried away.
    for (let i = 1; i <= cfg.deepCheckTries; i++) {
      try {
        deep = await deepCheck();
        break;
      } catch (err) {
        const cls = classifyError(err);
        log('deep-check-failed', `${cls}: ${err.message || err}`);
        if (i === cfg.deepCheckTries) {
          return finish(verdictFor({ errorClass: cls }), {
            state,
            detail: String(err.message || err),
            errorClass: cls,
          });
        }
        await sleep(cfg.deepCheckIntervalMs);
      }
    }
  }

  if (deep) {
    log(
      'deep-check',
      `kidsOk=${deep.kidsOk} tjOk=${deep.tjOk} kidsSha=${deep.kidsSha || 'unknown'} ` +
        `expectedSha=${expectedSha || 'unavailable'} imageSha=${deep.kidsImageSha || 'unknown'} ` +
        `kidsContainerUp=${deep.kidsContainerUp} tjApiUp=${deep.tjApiUp} tjWebUp=${deep.tjWebUp} ` +
        `tjTagsConsistent=${deep.tjTagsConsistent} problems=${JSON.stringify(deep.problems || [])}`,
    );
  }
  return finish(verdictFor({ state, action, deep }), {
    state,
    deep,
    expectedKidsSha: expectedSha,
    expectedShaMissing: expectedShaResolved && !expectedSha,
    detail: lastError,
  });
}
