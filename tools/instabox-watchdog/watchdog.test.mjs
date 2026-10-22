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
  verdictFor,
} from './logic.mjs';

test('state decisions follow the lifecycle contract', () => {
  assert.equal(decideForState('running'), 'deep-check');
  assert.equal(decideForState('suspended'), 'resume'); // paused
  assert.equal(decideForState('stopped'), 'resume');
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

const HEALTHY = [
  'KIDS_HEALTH={"status":"ok"}',
  'TJ_HEALTH={"status":"ok","engine":"ready"}',
  'KIDS_SHA=df56de7bb8a9a5a8c445c7c6e74ae44fd95e7f0b',
  'CONTAINERS=kidscoding-web-1|ghcr.io/hellomrduan/kidscoding-web:df56|x Up 2 hours (healthy);tianji-api-1|tianji-api:sealed-82b119e|Up 2 hours;',
].join('\n');

test('deep-check parser reads a healthy machine', () => {
  const d = parseDeepCheck(HEALTHY);
  assert.equal(d.kidsOk, true);
  assert.equal(d.tjOk, true);
  assert.equal(d.kidsSha, 'df56de7bb8a9a5a8c445c7c6e74ae44fd95e7f0b');
  assert.equal(d.kidsContainerUp, true);
  assert.equal(d.tjContainersUp, true);
  assert.equal(d.healthy, true);
});

test('deep-check parser flags an app fault without hiding the rest', () => {
  const d = parseDeepCheck(
    HEALTHY.replace('KIDS_HEALTH={"status":"ok"}', 'KIDS_HEALTH=CURL_FAIL'),
  );
  assert.equal(d.kidsOk, false);
  assert.equal(d.tjOk, true);
  assert.equal(d.healthy, false);
  assert.equal(d.kidsSha, 'df56de7bb8a9a5a8c445c7c6e74ae44fd95e7f0b');
});

test('verdicts distinguish blocked causes and app faults', () => {
  assert.equal(verdictFor({ errorClass: 'auth' }), 'BLOCKED_AUTH');
  assert.equal(verdictFor({ action: 'resume-failed', errorClass: 'capacity' }), 'BLOCKED_CAPACITY');
  assert.equal(verdictFor({ action: 'resume-failed', errorClass: 'transient' }), 'BLOCKED_RESUME');
  assert.equal(verdictFor({ action: 'blocked', state: 'error' }), 'BLOCKED_STATE');
  assert.equal(
    verdictFor({ action: 'deep-check', deep: parseDeepCheck(HEALTHY) }),
    'OK',
  );
  assert.equal(
    verdictFor({
      action: 'deep-check',
      deep: parseDeepCheck(HEALTHY.replace('TJ_HEALTH={"status":"ok","engine":"ready"}', 'TJ_HEALTH=CURL_FAIL')),
    }),
    'APP_FAULT',
  );
});
