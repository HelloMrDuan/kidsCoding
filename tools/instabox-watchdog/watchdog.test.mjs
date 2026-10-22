// Unit tests for the watchdog's pure decision logic.
// These run without an API key and without network access:
//   node --test watchdog.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideForState,
  classifyError,
  resumeRetryable,
  parseDeepCheck,
  assessDeep,
  verdictFor,
  FAILING_VERDICTS,
} from './logic.mjs';

const SHA = 'df56de7bb8a9a5a8c445c7c6e74ae44fd95e7f0b';
const OTHER_SHA = '6a637259d02dc4469e61b643fad847af790b1f42';

test('state decisions follow the lifecycle contract', () => {
  assert.equal(decideForState('running'), 'deep-check');
  assert.equal(decideForState('suspended'), 'resume'); // idle pause
  assert.equal(decideForState('stopped'), 'observe'); // owner stop: never auto-resume
  assert.equal(decideForState('resuming'), 'wait'); // never double-resume
  assert.equal(decideForState('suspending'), 'wait');
  assert.equal(decideForState('starting'), 'wait');
  assert.equal(decideForState('error'), 'blocked');
  assert.equal(decideForState('deleted'), 'blocked');
  assert.equal(decideForState('something-new'), 'blocked'); // unknown: surface, never guess
});

test('error classification separates auth, capacity, conflict, transient', () => {
  const mk = (props) => Object.assign(new Error('x'), props);
  assert.equal(classifyError(mk({ name: 'InstaboxAuthError', status: 401 })), 'auth');
  assert.equal(classifyError(mk({ code: 'missing_api_key', status: 0 })), 'auth');
  assert.equal(classifyError(mk({ code: 'insufficient_scope', status: 403 })), 'auth');
  assert.equal(classifyError(mk({ code: 'no_capacity', status: 500 })), 'capacity');
  assert.equal(classifyError(mk({ name: 'InstaboxQuotaError', status: 429, code: 'quota_exceeded' })), 'capacity');
  assert.equal(classifyError(mk({ code: 'operation_conflict', status: 409 })), 'conflict');
  assert.equal(classifyError(mk({ code: 'not_found', status: 404 })), 'not-found');
  assert.equal(classifyError(mk({ name: 'InstaboxTimeoutError', code: 'operation_timeout' })), 'transient');
  assert.equal(classifyError(mk({ code: 'network_error', status: 0 })), 'transient');
  assert.equal(classifyError(mk({ status: 503, retryable: true })), 'transient');
});

test('resume retries are bounded to capacity/transient classes', () => {
  assert.equal(resumeRetryable('capacity'), true);
  assert.equal(resumeRetryable('transient'), true);
  assert.equal(resumeRetryable('auth'), false);
  assert.equal(resumeRetryable('conflict'), false);
  assert.equal(resumeRetryable('not-found'), false);
});

// NEGATIVE CASES (fail-closed): a monitoring failure — the check itself
// could not be completed — must produce a FAILING verdict for every
// error class, never IN_TRANSITION / OK with exit code 0.
test('monitoring failures are fail-closed for every error class', () => {
  for (const cls of ['capacity', 'transient', 'unknown', 'conflict']) {
    const v = verdictFor({ action: 'check-failed', errorClass: cls });
    assert.ok(FAILING_VERDICTS.has(v), `${cls} -> ${v} must be failing`);
  }
  assert.equal(verdictFor({ action: 'check-failed', errorClass: 'capacity' }), 'BLOCKED_CAPACITY');
  assert.equal(verdictFor({ action: 'check-failed', errorClass: 'transient' }), 'BLOCKED_MONITOR');
  assert.equal(verdictFor({ action: 'check-failed', errorClass: 'unknown' }), 'BLOCKED_MONITOR');
  // Even a bare error class with no action must fail closed.
  assert.equal(verdictFor({ errorClass: 'transient' }), 'BLOCKED_MONITOR');
  assert.equal(verdictFor({ errorClass: 'capacity' }), 'BLOCKED_CAPACITY');
  assert.equal(verdictFor({ errorClass: 'auth' }), 'BLOCKED_AUTH');
  assert.equal(verdictFor({ errorClass: 'not-found' }), 'BLOCKED_NOT_FOUND');
  // Resume failures keep their distinct failing verdicts.
  assert.equal(verdictFor({ action: 'resume-failed', errorClass: 'capacity' }), 'BLOCKED_CAPACITY');
  assert.equal(verdictFor({ action: 'resume-failed', errorClass: 'transient' }), 'BLOCKED_RESUME');
  // Non-failing outcomes stay non-failing and unreachable with an error.
  assert.equal(verdictFor({ action: 'wait', state: 'resuming' }), 'IN_TRANSITION');
  assert.equal(verdictFor({ action: 'observe', state: 'stopped' }), 'STOPPED_MANUAL');
  assert.ok(!FAILING_VERDICTS.has('STOPPED_MANUAL'));
  assert.ok(!FAILING_VERDICTS.has('IN_TRANSITION'));
  assert.ok(!FAILING_VERDICTS.has('HELD'));
});

const HEALTHY = [
  'KIDS_HEALTH={"status":"ok"}',
  'TJ_HEALTH={"status":"ok","engine":"ready"}',
  `KIDS_SHA=${SHA}`,
  `CONTAINERS=kidscoding-web-1|ghcr.io/hellomrduan/kidscoding-web:${SHA}|Up 2 hours (healthy);tianji-api-1|tianji-api:sealed-82b119e|Up 2 hours;tianji-web-1|tianji-web:static-82b119e|Up 2 hours;`,
].join('\n');

test('deep-check parser reads a healthy machine (incl. image SHA + tj pair)', () => {
  const d = parseDeepCheck(HEALTHY);
  assert.equal(d.kidsOk, true);
  assert.equal(d.tjOk, true);
  assert.equal(d.kidsSha, SHA);
  assert.equal(d.kidsImageSha, SHA);
  assert.equal(d.kidsContainerUp, true);
  assert.equal(d.tjContainersUp, true);
  assert.equal(d.tjTagsConsistent, true);
  assert.equal(d.healthy, true);
});

test('assessment passes when deployed SHA equals the expected GitHub head', () => {
  const a = assessDeep(parseDeepCheck(HEALTHY), SHA);
  assert.equal(a.healthy, true);
  assert.deepEqual(a.problems, []);
});

test('assessment fails on SHA mismatch against the expected GitHub head', () => {
  const a = assessDeep(parseDeepCheck(HEALTHY), OTHER_SHA);
  assert.equal(a.healthy, false);
  assert.ok(a.problems.some((p) => p.includes('SHA mismatch')), a.problems.join(';'));
});

test('assessment fails when the running image disagrees with the recorded SHA', () => {
  const out = HEALTHY.replace(
    `kidscoding-web:${SHA}`,
    `kidscoding-web:${OTHER_SHA}`,
  );
  const a = assessDeep(parseDeepCheck(out), null);
  assert.equal(a.healthy, false);
  assert.ok(a.problems.some((p) => p.includes('running kids image')), a.problems.join(';'));
});

test('container states are part of health: a down container is a fault', () => {
  const out = HEALTHY.replace(
    'kidscoding-web-1|',
    'kidscoding-web-1|',
  ).replace('Up 2 hours (healthy)', 'Exited (1) 3 minutes ago');
  const a = assessDeep(parseDeepCheck(out), SHA);
  assert.equal(a.healthy, false);
  assert.ok(a.problems.some((p) => p.includes('container not up')), a.problems.join(';'));
});

test('tianji sealed pair must carry the same version token', () => {
  const out = HEALTHY.replace('static-82b119e', 'static-d65f81b');
  const d = parseDeepCheck(out);
  assert.equal(d.tjTagsConsistent, false);
  const a = assessDeep(d, SHA);
  assert.equal(a.healthy, false);
});

test('endpoint failure is an app fault with the SHA still visible', () => {
  const d = parseDeepCheck(HEALTHY.replace('KIDS_HEALTH={"status":"ok"}', 'KIDS_HEALTH=CURL_FAIL'));
  assert.equal(d.kidsOk, false);
  const a = assessDeep(d, SHA);
  assert.equal(a.healthy, false);
  assert.equal(a.kidsSha, SHA);
  assert.equal(verdictFor({ action: 'deep-check', deep: a }), 'APP_FAULT');
  assert.equal(verdictFor({ action: 'deep-check', deep: assessDeep(parseDeepCheck(HEALTHY), SHA) }), 'OK');
});
