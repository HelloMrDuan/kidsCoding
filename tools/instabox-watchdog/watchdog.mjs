// InstaBox external watchdog for platforms-core-01.
//
// Runs OUTSIDE the machine (GitHub-hosted runner) so it keeps working
// while the machine is paused. Uses only the official SDK
// (@insforge/instabox-sdk) and the official lifecycle API:
//   - read state via Sandbox.connect(id, { resume: false }) + getInfo()
//   - recover a paused/stopped machine via sbx.resume()
//   - deep-check over sbx.commands (localhost health, containers, SHA)
// It never simulates user activity and never touches containers:
// an application fault is reported, not "repaired" from outside.
//
// Inputs (environment):
//   INSTABOX_API_KEY   (required) repo Secret; never printed
//   INSTABOX_MACHINE_ID (default m_agqv2gsjiybrpuen46a2rpxohe)
//   INSTABOX_API_URL   (optional override)
// Outputs: stdout log lines, verdict.json, alert.md; exit 1 on a
// failing verdict so the workflow run is visibly red.

import { writeFileSync } from 'node:fs';
import { Sandbox } from '@insforge/instabox-sdk';
import {
  decideForState,
  classifyError,
  resumeRetryable,
  parseDeepCheck,
  verdictFor,
  FAILING_VERDICTS,
} from './logic.mjs';

const MACHINE_ID = process.env.INSTABOX_MACHINE_ID || 'm_agqv2gsjiybrpuen46a2rpxohe';
const API_KEY = process.env.INSTABOX_API_KEY || '';
const startedAt = new Date();
const events = [];

function log(event, detail = '') {
  const line = { ts: new Date().toISOString(), event, detail: String(detail) };
  events.push(line);
  console.log(`[${line.ts}] ${event}${detail ? ` — ${detail}` : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DEEP_CHECK_CMD = [
  'KIDS_HEALTH=$(curl -s -m 5 http://127.0.0.1:3000/api/health || echo CURL_FAIL)',
  'TJ_HEALTH=$(curl -s -m 5 http://127.0.0.1:8080/health | head -c 300 || echo CURL_FAIL)',
  'KIDS_SHA=$(cat /data/workspace/platform-deploy/cicd/state/kids-prerelease.sha 2>/dev/null || echo MISSING)',
  'CONTAINERS=$(docker ps --format "{{.Names}}|{{.Image}}|{{.Status}}" 2>/dev/null | tr "\\n" ";")',
  'echo "KIDS_HEALTH=$KIDS_HEALTH"; echo "TJ_HEALTH=$TJ_HEALTH"; echo "KIDS_SHA=$KIDS_SHA"; echo "CONTAINERS=$CONTAINERS"; exit 0',
].join('; ');

async function deepCheck(sbx) {
  const res = await sbx.commands.run(DEEP_CHECK_CMD, { timeoutMs: 60_000 });
  return parseDeepCheck(res.stdout || '');
}

async function waitForState(sbx, want, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let info = await sbx.getInfo();
  while (info.state !== want && Date.now() < deadline) {
    if (info.state === 'error' || info.state === 'deleted') break;
    await sleep(15_000);
    info = await sbx.getInfo();
    log('state-poll', info.state);
  }
  return info;
}

async function main() {
  if (!API_KEY) {
    log('config-error', 'INSTABOX_API_KEY is not set');
    return finish('BLOCKED_AUTH', null, 'INSTABOX_API_KEY secret is missing');
  }
  const conn = {
    apiKey: API_KEY,
    ...(process.env.INSTABOX_API_URL ? { apiUrl: process.env.INSTABOX_API_URL } : {}),
    requestTimeoutMs: 30_000,
    operationTimeoutMs: 420_000,
  };

  let sbx;
  try {
    // resume:false — attach WITHOUT waking, so a Running check never
    // counts as activity and a Paused machine is woken only by the
    // explicit resume() below.
    sbx = await Sandbox.connect(MACHINE_ID, { ...conn, resume: false });
  } catch (err) {
    const cls = classifyError(err);
    log('connect-failed', `${cls}: ${err.code || err.name || ''} ${err.message || err}`);
    return finish(verdictFor({ errorClass: cls }), null, String(err.message || err));
  }

  let info;
  try {
    info = await sbx.getInfo();
  } catch (err) {
    const cls = classifyError(err);
    log('getinfo-failed', `${cls}: ${err.message || err}`);
    return finish(verdictFor({ errorClass: cls }), null, String(err.message || err));
  }
  log('machine-state', `${info.name || MACHINE_ID} state=${info.state}`);
  let action = decideForState(info.state);
  let deep = null;
  let lastError = '';

  if (action === 'wait') {
    // Transitional (incl. resuming): poll briefly; never issue a
    // second resume while one may already be in flight.
    info = await waitForState(sbx, 'running', 240_000);
    action = decideForState(info.state);
    log('settled-state', info.state);
    if (action === 'wait') {
      return finish('IN_TRANSITION', { state: info.state }, 'still in transition; next cycle continues');
    }
  }

  if (action === 'resume') {
    // Bounded recovery: at most 2 resume attempts per run, 45 s apart,
    // and only for capacity/transient failures. The 10-minute schedule
    // is the outer backoff loop; auth failures stop immediately.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        log('resume-attempt', `attempt ${attempt} from state=${info.state}`);
        await sbx.resume();
        info = await sbx.getInfo();
        log('resume-result', `state=${info.state}`);
        break;
      } catch (err) {
        const cls = classifyError(err);
        lastError = `${cls}: ${err.code || ''} ${err.message || err}`;
        log('resume-failed', lastError);
        if (cls === 'conflict') {
          info = await waitForState(sbx, 'running', 240_000);
          if (info.state === 'running') break;
        }
        if (!resumeRetryable(cls) || attempt === 2) {
          return finish(
            verdictFor({ action: 'resume-failed', errorClass: cls }),
            { state: info.state },
            lastError,
          );
        }
        await sleep(45_000);
        info = await sbx.getInfo();
        if (info.state === 'running') break;
        if (decideForState(info.state) !== 'resume') {
          return finish('IN_TRANSITION', { state: info.state }, 'state changed during backoff');
        }
      }
    }
    if (info.state !== 'running') {
      info = await waitForState(sbx, 'running', 240_000);
    }
    if (info.state !== 'running') {
      return finish('BLOCKED_RESUME', { state: info.state }, lastError || `state=${info.state}`);
    }
    action = 'deep-check';
    // A resumed VM's processes continue, but give services a moment
    // and re-check up to 3 times before calling it an app fault.
    for (let i = 1; i <= 3; i++) {
      try {
        deep = await deepCheck(sbx);
      } catch (err) {
        log('deep-check-error', String(err.message || err));
      }
      if (deep && deep.healthy) break;
      if (i < 3) await sleep(30_000);
    }
  } else if (action === 'deep-check') {
    try {
      deep = await deepCheck(sbx);
    } catch (err) {
      const cls = classifyError(err);
      log('deep-check-failed', `${cls}: ${err.message || err}`);
      return finish(verdictFor({ errorClass: cls }), { state: info.state }, String(err.message || err));
    }
  } else if (action === 'blocked') {
    return finish('BLOCKED_STATE', { state: info.state }, `machine state=${info.state}`);
  }

  if (deep) {
    log(
      'deep-check',
      `kidsOk=${deep.kidsOk} tjOk=${deep.tjOk} kidsSha=${deep.kidsSha || 'unknown'} ` +
        `kidsContainerUp=${deep.kidsContainerUp} tjContainersUp=${deep.tjContainersUp}`,
    );
  }
  return finish(verdictFor({ state: info.state, action, deep }), { state: info.state, deep }, lastError);
}

function finish(verdict, extra, detail) {
  const record = {
    verdict,
    machineId: MACHINE_ID,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    detail: detail || '',
    ...(extra || {}),
    events,
  };
  writeFileSync('verdict.json', JSON.stringify(record, null, 2));
  const failing = FAILING_VERDICTS.has(verdict);
  if (failing) {
    const deep = record.deep || {};
    writeFileSync(
      'alert.md',
      [
        `## InstaBox watchdog: ${verdict}`,
        '',
        `- Machine: platforms-core-01 (\`${MACHINE_ID}\`)`,
        `- State: ${record.state || 'unknown'}`,
        `- Time (UTC): ${record.finishedAt}`,
        `- Detail: ${record.detail || '—'}`,
        deep && Object.keys(deep).length
          ? `- KidsCoding health ok: ${deep.kidsOk} · Tianji health ok: ${deep.tjOk} · Kids deployed SHA: ${deep.kidsSha || 'unknown'}`
          : '',
        '',
        'The watchdog reports and recovers machine lifecycle only; it does not restart or rebuild application containers. Inspect the workflow run log for the full event trace.',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
  log('verdict', verdict);
  process.exitCode = failing ? 1 : 0;
  return record;
}

main().catch((err) => {
  log('unhandled-error', String((err && err.message) || err));
  finish('BLOCKED_RESUME', null, String((err && err.message) || err));
});
