// Watchdog orchestration for tj-watchdog (Tianji machine tj-core-01).
//
// Dependencies are injected so the exact production flow runs in
// Workers (fetch + KV) and in Node unit tests (fakes):
//   deps.api    — createApi() client (or a fake with the same shape)
//   deps.store  — async KV: get(key), put(key, value); put(key, null)
//                 deletes. Keys: 'status', 'episode'.
//   deps.now    — () => epoch ms; deps.sleep — async (ms) => void
//   deps.log    — (event, detail) => void
//   deps.config — { machineId, machineName, hold, healthMode, ... }
//
// CONCURRENCY DESIGN (read this before touching the resume path):
// Cloudflare KV is EVENTUALLY CONSISTENT. A KV read-modify-write is
// NOT an atomic lock: two overlapping runs can both read "no lock" or
// a stale episode counter. This module therefore never treats KV as a
// lock and never derives safety from it:
//   - An earlier revision wrote an advisory 'claim' key (telemetry
//     only; no decision ever read it). It was removed on 2026-10-24:
//     it cost two KV writes per run against the free-tier daily
//     write quota and bought nothing. A plain run now performs
//     exactly one KV write (the 'status' record).
//   - The actual anti-collision mechanism is the InstaBox API, which
//     serializes operations per machine:
//       1. WRITE-AHEAD: the episode attempt is persisted BEFORE any
//          resume POST, so a run that dies mid-flight has still
//          accounted for its attempt.
//       2. FRESH-STATE GATE: immediately before the POST, the machine
//          state is re-read. If it is no longer `suspended`, or an
//          operationId is already in flight, this run does NOT POST.
//       3. CONFLICT IS BENIGN: if two runs still race into the POST,
//          the platform accepts one operation and rejects the other
//          with 409 operation_conflict. The loser treats that as
//          "resume already in progress by another actor": it polls,
//          never re-POSTs in the same run, and finishes with the
//          success-class verdict RESUME_IN_PROGRESS (or the healthy
//          path if the machine reaches `running`).
//     Consequence: overlapping runs can at worst produce extra API
//     reads and ONE platform resume operation per episode window —
//     never two competing operations. The per-episode attempt cap is
//     enforced on the persisted counter in the normal (non-racing)
//     case; in the racing case the platform gate, not the counter,
//     is what bounds real operations, and the counter is reconciled
//     from observed state on the next run.
//   - FAIL-CLOSED: any monitoring error produces a BLOCKED_* verdict
//     and never updates the healthy timestamps.

import {
  decideForState,
  classifyError,
  resumeRetryable,
  parseTianjiDeepCheck,
  assessTianji,
  verdictFor,
  FAILING_VERDICTS,
  isRunSuccess,
} from './logic.mjs';
import { ApiError } from './api.mjs';

// Tianji-only deep check (HEALTH_MODE=tianji). No Kids endpoints, no
// Kids containers, no Kids SHA: KidsCoding is not on this machine.
// TJ_RECORD_PATH must be confirmed against the real deploy layout on
// tj-core-01 when tianji mode is activated (see README checklist); a
// missing record is a fail-closed problem in assessTianji().
export const TJ_RECORD_PATH =
  '/data/workspace/platform-deploy/cicd/state/tianji-prerelease.sha';

export const DEEP_CHECK_CMD = [
  'TJ_HEALTH=$(curl -s -m 5 http://127.0.0.1:8080/health | head -c 300 || echo CURL_FAIL)',
  `TJ_RECORD=$(cat ${TJ_RECORD_PATH} 2>/dev/null || echo MISSING)`,
  'CONTAINERS=$(docker ps --format "{{.Names}}|{{.Image}}|{{.Status}}" 2>/dev/null | tr "\\n" ";")',
  'echo "TJ_HEALTH=$TJ_HEALTH"; echo "TJ_RECORD=$TJ_RECORD"; echo "CONTAINERS=$CONTAINERS"; exit 0',
].join('; ');

/**
 * Stable idempotency key for one suspended episode. The InstaBox
 * platform requires an Idempotency-Key header (1-200 printable
 * characters) on POST /v1/machines/<id>/resume; without it the call
 * is rejected with bad_request and the machine stays suspended.
 * The key is derived from suspendedSince and a cooldown generation.
 * Ordinary retries/races share a key. A verified 409 machine_cooldown
 * response with no operation ID is a rejected operation, so after its
 * cooldown expires we use a NEW generation to avoid replaying a cached
 * rejection. Never rotate after an ambiguous network/operation error.
 */
export function episodeResumeKey(episode) {
  const base = episode && episode.suspendedSince ? episode.suspendedSince : 'unknown';
  const generation = Number.isSafeInteger(episode?.cooldownGeneration) && episode.cooldownGeneration > 0
    ? `-cooldown-${episode.cooldownGeneration}`
    : '';
  return `watchdog-resume-${base}${generation}`;
}

/** Only a definite platform cooldown rejection WITHOUT a created
 * operation permits refunding an attempt and rotating its key. */
export function verifiedCooldownUntilMs(err) {
  if (!err || err.code !== 'machine_cooldown' || err.operationId) return null;
  const source = [err.cooldownUntil, err.message].filter(Boolean).join(' ');
  const match = source.match(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/);
  if (!match) return null;
  const ms = Date.parse(match[0]);
  return Number.isFinite(ms) ? ms : null;
}

export const DEFAULTS = {
  statePollTimeoutMs: 240_000,
  statePollIntervalMs: 15_000,
  operationPollTimeoutMs: 300_000,
  operationPollIntervalMs: 5_000,
  resumeBackoffMs: 45_000,
  deepCheckTries: 3,
  deepCheckIntervalMs: 30_000,
  episodeMaxAttempts: 2,
  episodeMaxCooldownRejections: 6,
  cooldownGraceMs: 30_000,
  cooldownRetryFloorMs: 60_000,
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

  async function finish(verdict, extra = {}) {
    const record = {
      service: 'tj-watchdog',
      verdict,
      machineId: cfg.machineId || null,
      machineName: cfg.machineName || null,
      healthMode: cfg.healthMode || 'lifecycle',
      runId,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(now()).toISOString(),
      detail: '',
      ...extra,
      events,
    };
    try {
      const status = (await deps.store.get('status')) || {};
      status.service = 'tj-watchdog';
      status.machineId = cfg.machineId || null;
      status.machineName = cfg.machineName || null;
      status.healthMode = record.healthMode;
      status.hold = Boolean(cfg.hold);
      const recent = Array.isArray(status.recentRuns) ? status.recentRuns : [];
      recent.push({
        at: record.finishedAt,
        verdict,
        state: record.state || null,
        runId,
      });
      status.recentRuns = recent.slice(-cfg.runHistoryKeep);
      status.lastRunAt = record.finishedAt;
      status.lastVerdict = verdict;
      if (record.state) status.lastMachineState = record.state;
      if (isRunSuccess(verdict)) status.lastSuccessAt = record.finishedAt;
      // 'OK' (full Tianji health) is the ONLY verdict that may set the
      // healthy timestamp. LIFECYCLE_OK sets its own, separate field:
      // an undeployed service must never read as healthy.
      if (verdict === 'OK') status.lastHealthyAt = record.finishedAt;
      if (verdict === 'LIFECYCLE_OK') status.lastLifecycleOkAt = record.finishedAt;
      if (record.resumed) status.lastResumeAt = record.finishedAt;
      if (FAILING_VERDICTS.has(verdict)) {
        status.lastAlert = {
          verdict,
          at: record.finishedAt,
          detail: record.detail || '',
        };
      }
      await deps.store.put('status', status);
    } catch (err) {
      log('status-write-failed', String((err && err.message) || err));
    }
    log('verdict', verdict);
    return record;
  }

  // Config gate: this worker must NEVER fall back to another machine's
  // ID. A missing or placeholder MACHINE_ID is a hard config failure
  // with zero API calls.
  if (!cfg.machineId || String(cfg.machineId).startsWith('REPLACE_')) {
    log('config-error', 'MACHINE_ID is missing or still a placeholder');
    return finish('BLOCKED_CONFIG', {
      detail: 'MACHINE_ID is not configured for tj-core-01; refusing to guess or reuse another machine ID',
      errorClass: 'config',
    });
  }
  if (!deps.api) {
    log('config-error', 'INSTABOX_API_KEY is not set');
    return finish('BLOCKED_AUTH', { detail: 'INSTABOX_API_KEY secret is missing' });
  }

  try {
    return await execute({ cfg, deps, now, sleep, log, finish });
  } catch (err) {
    log('unhandled-error', String((err && err.message) || err));
    return finish('BLOCKED_MONITOR', {
      detail: `unhandled error: ${String((err && err.message) || err)}`,
    });
  }
}

async function execute({ cfg, deps, now, sleep, log, finish }) {
  const { api, store } = deps;
  const machineId = cfg.machineId;
  const healthMode = cfg.healthMode === 'tianji' ? 'tianji' : 'lifecycle';

  async function deepCheck() {
    const res = await api.exec(machineId, DEEP_CHECK_CMD, 60);
    if (!res || res.exitCode !== 0) {
      throw new Error(`deep check command exited ${res ? res.exitCode : 'no-response'}`);
    }
    return assessTianji(parseTianjiDeepCheck(res.stdout || ''));
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

  // Reached `running`: in lifecycle mode that is the whole check (the
  // app is not deployed; nothing may be called healthy). In tianji
  // mode the deep check decides between OK and APP_FAULT.
  async function runningVerdict(state, resumed) {
    if (healthMode !== 'tianji') {
      return finish('LIFECYCLE_OK', {
        state,
        resumed: Boolean(resumed),
        detail: resumed
          ? 'machine resumed; lifecycle mode: Tianji not deployed, no application health check performed'
          : 'lifecycle mode: Tianji not deployed, no application health check performed',
      });
    }
    let deep = null;
    const tries = cfg.deepCheckTries;
    for (let i = 1; i <= tries; i++) {
      try {
        deep = await deepCheck();
      } catch (err) {
        // A THROWN deep check is a monitoring-path failure (exec or
        // network), not an application fault: retry it bounded times
        // before reporting BLOCKED_*. Only the last failure decides.
        const cls = classifyError(err);
        log('deep-check-failed', `${cls}: ${err.message || err}`);
        if (i === tries) {
          return finish(verdictFor({ errorClass: cls }), {
            state,
            resumed: Boolean(resumed),
            detail: String(err.message || err),
            errorClass: cls,
          });
        }
        await sleep(cfg.deepCheckIntervalMs);
        continue;
      }
      if (deep.healthy) break;
      // An obtained assessment is a real signal. In steady state it
      // is reported at once (APP_FAULT); only a just-resumed machine
      // gets settling retries while its services come up.
      if (!resumed) break;
      if (i < tries) await sleep(cfg.deepCheckIntervalMs);
    }
    log(
      'deep-check',
      `tjOk=${deep.tjOk} tjApiUp=${deep.tjApiUp} tjWebUp=${deep.tjWebUp} ` +
        `tjTagsConsistent=${deep.tjTagsConsistent} recordPresent=${deep.recordPresent} ` +
        `problems=${JSON.stringify(deep.problems || [])}`,
    );
    return finish(verdictFor({ state, action: 'running', deep, healthMode }), {
      state,
      resumed: Boolean(resumed),
      deep,
      detail: deep.healthy ? '' : (deep.problems || []).join('; '),
    });
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
  // suspended; any other observed state closes it.
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
    // Transitional (incl. resuming): wait it out; NEVER issue a
    // resume while one may already be in flight.
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

  if (action === 'running') {
    return runningVerdict(state, false);
  }

  // action === 'resume'
  if (cfg.hold) {
    log('held', 'maintenance hold is on; reporting only');
    return finish('HELD', { state, detail: 'maintenance hold is on' });
  }
  episode = episode || {
    suspendedSince: new Date(now()).toISOString(),
    attempts: 0,
    lastAttemptAt: 0,
    lastError: '',
    cooldownGeneration: 0,
    cooldownRejections: 0,
    cooldownUntil: null,
  };
  // The platform's cooldown is a time gate, not an API failure budget.
  // Do not issue any Resume POST before the timestamp (plus clock-skew
  // margin), regardless of whether another Cron fired.
  const cooldownEnd = Date.parse(episode.cooldownUntil || '');
  if (Number.isFinite(cooldownEnd) && now() < cooldownEnd) {
    log('cooldown-wait', `until=${episode.cooldownUntil}; no Resume POST`);
    return finish('COOLDOWN_WAIT', {
      state,
      detail: `InstaBox cooldown until ${episode.cooldownUntil}; no resume request made`,
    });
  }
  if ((episode.cooldownRejections || 0) >= cfg.episodeMaxCooldownRejections) {
    log('cooldown-cap-reached', `cooldown rejections=${episode.cooldownRejections}`);
    return finish('BLOCKED_RESUME', {
      state,
      detail: `platform cooldown rejection cap reached (${cfg.episodeMaxCooldownRejections}); needs operator review`,
    });
  }
  if (episode.attempts >= cfg.episodeMaxAttempts) {
    log('resume-cap-reached', `episode attempts=${episode.attempts}`);
    return finish('BLOCKED_RESUME', {
      state,
      detail: `resume attempt cap (${cfg.episodeMaxAttempts}) for this suspended episode already reached; last error: ${episode.lastError || 'unknown'}`,
    });
  }

  let lastError = '';
  while (episode.attempts < cfg.episodeMaxAttempts) {
    // Enforce the 45 s spacing across runs as well as within one.
    if (episode.lastAttemptAt) {
      const waitMs = cfg.resumeBackoffMs - (now() - episode.lastAttemptAt);
      if (waitMs > 0) await sleep(waitMs);
    }
    // (1) WRITE-AHEAD: account for this attempt before any POST.
    episode.attempts += 1;
    episode.lastAttemptAt = now();
    await store.put('episode', episode);

    // (2) FRESH-STATE GATE: re-read immediately before the POST.
    let fresh;
    try {
      fresh = await api.getMachine(machineId);
    } catch (err) {
      const cls = classifyError(err);
      lastError = `${cls}: ${err.code || ''} ${err.message || err}`;
      log('fresh-state-gate-failed', lastError);
      return finish(verdictFor({ errorClass: cls }), {
        state,
        detail: lastError,
        errorClass: cls,
      });
    }
    if (fresh.state !== 'suspended' || fresh.operationId) {
      log(
        'fresh-state-gate',
        `state=${fresh.state} operationId=${fresh.operationId || 'none'}; not posting resume`,
      );
      state = fresh.state;
      const settledAction = decideForState(state);
      if (state === 'running') {
        await store.put('episode', null);
        episode = null;
        return runningVerdict(state, true);
      }
      if (settledAction === 'observe') {
        return finish('STOPPED_MANUAL', { state, detail: 'settled to stopped (owner action)' });
      }
      if (settledAction === 'blocked') {
        return finish('BLOCKED_STATE', { state, detail: `machine state=${state}` });
      }
      // Transitional / an operation is in flight: wait, never POST.
      info = await pollState('running', cfg.statePollTimeoutMs);
      state = info.state;
      if (state === 'running') {
        await store.put('episode', null);
        episode = null;
        return runningVerdict(state, true);
      }
      return finish('RESUME_IN_PROGRESS', {
        state,
        detail: 'another actor has an operation in flight; this run did not post a resume',
      });
    }

    // (3) POST the resume. The platform serializes operations per
    // machine; a racing POST is rejected with operation_conflict.
    try {
      log('resume-attempt', `attempt ${episode.attempts} from state=suspended`);
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
    } catch (err) {
      const cls = classifyError(err);
      lastError = `${cls}: ${err.code || ''} ${err.message || err}`;
      episode.lastError = lastError;
      // A 409 machine_cooldown with a verifiable deadline and no
      // operation ID cannot have started a resume. Return the write-
      // ahead attempt to the budget, record the hold, and rotate the
      // idempotency key for the next POST after that hold expires.
      // Missing/malformed deadlines or ambiguous responses still
      // fail closed and retain their attempt budget consumption.
      const platformCooldownMs = verifiedCooldownUntilMs(err);
      if (platformCooldownMs !== null) {
        episode.attempts = Math.max(0, episode.attempts - 1);
        episode.cooldownRejections = (episode.cooldownRejections || 0) + 1;
        episode.cooldownGeneration = (episode.cooldownGeneration || 0) + 1;
        episode.cooldownUntil = new Date(
          Math.max(platformCooldownMs + cfg.cooldownGraceMs, now() + cfg.cooldownRetryFloorMs),
        ).toISOString();
        await store.put('episode', episode);
        log('resume-cooldown', `until=${episode.cooldownUntil}; rejections=${episode.cooldownRejections}`);
        return finish('COOLDOWN_WAIT', {
          state,
          detail: `machine_cooldown: next eligible attempt after ${episode.cooldownUntil}`,
          cooldownUntil: episode.cooldownUntil,
        });
      }
      // Unknown or ambiguous machine_cooldown responses are NOT
      // ordinary transients: retrying would risk exhausting the
      // budget and/or duplicating an in-flight operation.
      if (err.code === 'machine_cooldown') {
        await store.put('episode', episode);
        log('resume-cooldown-unverified', lastError);
        return finish('BLOCKED_RESUME', {
          state,
          detail: `unsafe machine_cooldown response (missing valid deadline or operation ID present): ${lastError}`,
        });
      }
      await store.put('episode', episode);
      log('resume-failed', lastError);
      if (cls === 'conflict') {
        // BENIGN: another actor is already resuming. Never re-POST in
        // this run; wait and report honestly.
        info = await pollState('running', cfg.statePollTimeoutMs);
        state = info.state;
        if (state === 'running') {
          await store.put('episode', null);
          episode = null;
          return runningVerdict(state, true);
        }
        return finish('RESUME_IN_PROGRESS', {
          state,
          detail: `operation_conflict: another actor is resuming this machine (${lastError})`,
        });
      }
      if (!resumeRetryable(cls) || episode.attempts >= cfg.episodeMaxAttempts) {
        return finish(verdictFor({ action: 'resume-failed', errorClass: cls }), {
          state,
          detail: lastError,
        });
      }
      await sleep(cfg.resumeBackoffMs);
      continue; // loop re-checks via the fresh-state gate
    }

    if (state !== 'running') {
      info = await pollState('running', cfg.statePollTimeoutMs);
      state = info.state;
    }
    if (state !== 'running') {
      return finish('BLOCKED_RESUME', {
        state,
        detail: lastError || `state=${state} after resume`,
      });
    }
    await store.put('episode', null);
    episode = null;
    return runningVerdict(state, true);
  }

  // Attempt budget exhausted inside the loop (capacity/transient path).
  return finish('BLOCKED_RESUME', {
    state,
    detail: lastError || 'resume attempts exhausted for this episode',
  });
}
