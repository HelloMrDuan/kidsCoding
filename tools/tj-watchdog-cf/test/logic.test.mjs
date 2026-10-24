import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  decideForState,
  classifyError,
  resumeRetryable,
  tjTagToken,
  sameVersionToken,
  parseTianjiDeepCheck,
  assessTianji,
  verdictFor,
  isRunSuccess,
  FAILING_VERDICTS,
  healthModeFromEnv,
} from '../src/logic.mjs';
import { ApiError } from '../src/api.mjs';

test('decideForState: lifecycle contract', () => {
  assert.equal(decideForState('running'), 'running');
  assert.equal(decideForState('suspended'), 'resume');
  assert.equal(decideForState('stopped'), 'observe');
  assert.equal(decideForState('error'), 'blocked');
  assert.equal(decideForState('deleted'), 'blocked');
  assert.equal(decideForState('resuming'), 'wait');
  assert.equal(decideForState('creating'), 'wait');
  assert.equal(decideForState('something-new'), 'blocked');
});

test('classifyError: documented error surface', () => {
  assert.equal(classifyError(new ApiError('x', { status: 401 })), 'auth');
  assert.equal(classifyError(new ApiError('x', { status: 403 })), 'auth');
  assert.equal(classifyError(new ApiError('x', { status: 409, code: 'operation_conflict' })), 'conflict');
  assert.equal(classifyError(new ApiError('x', { code: 'no_capacity', retryable: true })), 'capacity');
  assert.equal(classifyError(new ApiError('x', { status: 429, code: 'quota_exceeded' })), 'capacity');
  assert.equal(classifyError(new ApiError('x', { status: 404, code: 'not_found' })), 'not-found');
  assert.equal(classifyError(new ApiError('x', { status: 500 })), 'transient');
  assert.equal(classifyError(new ApiError('x', { code: 'network_error', retryable: true })), 'transient');
  assert.equal(classifyError(new ApiError('x', { status: 400 })), 'unknown');
  assert.equal(classifyError(null), 'unknown');
});

test('resumeRetryable: only capacity/transient', () => {
  assert.equal(resumeRetryable('capacity'), true);
  assert.equal(resumeRetryable('transient'), true);
  assert.equal(resumeRetryable('conflict'), false);
  assert.equal(resumeRetryable('auth'), false);
  assert.equal(resumeRetryable('unknown'), false);
});

test('tjTagToken: trailing token of sealed/static tags', () => {
  assert.equal(tjTagToken('tianji-api:sealed-82b119e'), '82b119e');
  assert.equal(tjTagToken('tianji-web:static-82b119e'), '82b119e');
  assert.equal(tjTagToken('tianji-api:latest'), null);
});

const HEALTHY_STDOUT = [
  'TJ_HEALTH={"status":"ok"}',
  'TJ_RECORD=sealed-82b119e',
  'CONTAINERS=tianji-api|tianji-api:sealed-82b119e|Up 2 hours;tianji-web|tianji-web:sealed-82b119e|Up 2 hours',
].join('\n');

test('parse+assess: healthy tianji deep check', () => {
  const deep = assessTianji(parseTianjiDeepCheck(HEALTHY_STDOUT));
  assert.equal(deep.healthy, true);
  assert.deepEqual(deep.problems, []);
  assert.equal(deep.tjApiUp, true);
  assert.equal(deep.tjWebUp, true);
  assert.equal(deep.tjTagsConsistent, true);
  assert.equal(deep.recordToken, '82b119e');
});

test('assess: web container down is a fault', () => {
  const out = HEALTHY_STDOUT.replace(
    'tianji-web|tianji-web:sealed-82b119e|Up 2 hours',
    'tianji-web|tianji-web:sealed-82b119e|Exited (1) 3 minutes ago',
  );
  const deep = assessTianji(parseTianjiDeepCheck(out));
  assert.equal(deep.healthy, false);
  assert.ok(deep.problems.some((p) => p.includes('web')));
});

test('assess: api/web version mismatch is a fault', () => {
  const out = HEALTHY_STDOUT.replace(
    'tianji-web:sealed-82b119e',
    'tianji-web:sealed-d65f81b',
  );
  const deep = assessTianji(parseTianjiDeepCheck(out));
  assert.equal(deep.healthy, false);
  assert.ok(deep.problems.some((p) => p.includes('tags differ')));
});

test('assess: missing deployed record fails closed (no silent skip)', () => {
  const out = HEALTHY_STDOUT.replace('TJ_RECORD=sealed-82b119e', 'TJ_RECORD=MISSING');
  const deep = assessTianji(parseTianjiDeepCheck(out));
  assert.equal(deep.healthy, false);
  assert.ok(deep.problems.some((p) => p.includes('record unreadable')));
});

test('assess: record not matching running images is a fault', () => {
  const out = HEALTHY_STDOUT.replace('TJ_RECORD=sealed-82b119e', 'TJ_RECORD=sealed-aaaaaaa');
  const deep = assessTianji(parseTianjiDeepCheck(out));
  assert.equal(deep.healthy, false);
  assert.ok(deep.problems.some((p) => p.includes('record')));
});

test('assess: unhealthy health endpoint body is a fault', () => {
  const out = HEALTHY_STDOUT.replace('TJ_HEALTH={"status":"ok"}', 'TJ_HEALTH=CURL_FAIL');
  const deep = assessTianji(parseTianjiDeepCheck(out));
  assert.equal(deep.healthy, false);
});

test('assess: a down KidsCoding container NEVER affects the tianji verdict', () => {
  // Requirement: this worker must not check KidsCoding. A broken kids
  // container in the raw list (e.g. mid-migration leftovers) is not
  // selected and must not change the outcome.
  const withKids = assessTianji(
    parseTianjiDeepCheck(
      [
        'TJ_HEALTH={"status":"ok"}',
        'TJ_RECORD=sealed-82b119e',
        'CONTAINERS=kidscoding-web|kidscoding-web:acb9fa4|Exited (1) 1 hour ago;tianji-api|tianji-api:sealed-82b119e|Up 2 hours;tianji-web|tianji-web:sealed-82b119e|Up 2 hours',
      ].join('\n'),
    ),
  );
  assert.equal(withKids.healthy, true);
});

test('verdictFor: lifecycle running is LIFECYCLE_OK, never OK', () => {
  const v = verdictFor({ state: 'running', action: 'running', healthMode: 'lifecycle' });
  assert.equal(v, 'LIFECYCLE_OK');
  assert.notEqual(v, 'OK');
  assert.equal(isRunSuccess(v), true);
});

test('verdictFor: tianji mode running without a deep check fails closed', () => {
  const v = verdictFor({ state: 'running', action: 'running', healthMode: 'tianji' });
  assert.equal(v, 'BLOCKED_MONITOR');
  assert.equal(isRunSuccess(v), false);
});

test('verdictFor: deep check decides OK vs APP_FAULT in tianji mode', () => {
  assert.equal(
    verdictFor({ state: 'running', action: 'running', deep: { healthy: true }, healthMode: 'tianji' }),
    'OK',
  );
  assert.equal(
    verdictFor({ state: 'running', action: 'running', deep: { healthy: false }, healthMode: 'tianji' }),
    'APP_FAULT',
  );
});

test('verdictFor: conflict-benign is success-class RESUME_IN_PROGRESS', () => {
  const v = verdictFor({ state: 'resuming', action: 'conflict-benign' });
  assert.equal(v, 'RESUME_IN_PROGRESS');
  assert.equal(isRunSuccess(v), true);
  assert.equal(FAILING_VERDICTS.has(v), false);
});

test('verdictFor: error classes fail closed', () => {
  assert.equal(verdictFor({ errorClass: 'config' }), 'BLOCKED_CONFIG');
  assert.equal(verdictFor({ errorClass: 'auth' }), 'BLOCKED_AUTH');
  assert.equal(verdictFor({ errorClass: 'not-found' }), 'BLOCKED_NOT_FOUND');
  assert.equal(verdictFor({ errorClass: 'capacity', action: 'resume-failed' }), 'BLOCKED_CAPACITY');
  assert.equal(verdictFor({ errorClass: 'transient', action: 'resume-failed' }), 'BLOCKED_RESUME');
  assert.equal(verdictFor({ errorClass: 'transient' }), 'BLOCKED_MONITOR');
  for (const ec of ['config', 'auth', 'not-found', 'capacity', 'transient']) {
    assert.equal(isRunSuccess(verdictFor({ errorClass: ec })), false);
  }
});

test('verdictFor: observe/held/wait', () => {
  assert.equal(verdictFor({ state: 'stopped', action: 'observe' }), 'STOPPED_MANUAL');
  assert.equal(verdictFor({ state: 'suspended', action: 'held' }), 'HELD');
  assert.equal(verdictFor({ state: 'resuming', action: 'wait' }), 'IN_TRANSITION');
});

test('healthModeFromEnv: deployed-flag mapping stays fail-closed', () => {
  assert.equal(healthModeFromEnv({}), 'lifecycle');
  assert.equal(healthModeFromEnv({ TIANJI_DEPLOYED: 'false' }), 'lifecycle');
  assert.equal(healthModeFromEnv({ TIANJI_DEPLOYED: 'true' }), 'tianji');
  assert.equal(healthModeFromEnv({ TIANJI_DEPLOYED: 'yes' }), 'lifecycle');
  assert.equal(healthModeFromEnv({ HEALTH_MODE: 'lifecycle', TIANJI_DEPLOYED: 'true' }), 'lifecycle');
  assert.equal(healthModeFromEnv({ HEALTH_MODE: 'tianji', TIANJI_DEPLOYED: 'false' }), 'tianji');
  assert.equal(healthModeFromEnv({ HEALTH_MODE: 'bogus' }), 'lifecycle');
});

test('sameVersionToken: same commit at different token lengths matches', () => {
  const full = 'bef41968860a21f06651ead493de7b2628a72b8f';
  assert.equal(sameVersionToken(full, full), true);
  assert.equal(sameVersionToken(full, 'bef41968'), true); // cicd-prerelease-<short>
  assert.equal(sameVersionToken('bef41968', full), true);
  assert.equal(sameVersionToken('82b119e', '82b119e'), true); // sealed pair
  assert.equal(sameVersionToken(full, 'bef4196'), true); // 7-char prefix floor
});

test('sameVersionToken: different commits and junk still differ', () => {
  const full = 'bef41968860a21f06651ead493de7b2628a72b8f';
  assert.equal(sameVersionToken(full, 'd65f81b2'), false); // prefix of another commit
  assert.equal(sameVersionToken('82b119e', 'd65f81b'), false);
  assert.equal(sameVersionToken(full, null), false);
  assert.equal(sameVersionToken(null, full), false);
  assert.equal(sameVersionToken('abc', 'abcdef0'), false); // below the 7-char floor
});

// Regression for the 2026-10-24 false positive: the production
// deployment pairs a full-SHA GHCR web image + full-SHA record with
// a cicd-prerelease-<short> api image. state=running and the app
// healthy produced APP_FAULT on every run under strict equality.
const PROD_STDOUT = [
  'TJ_HEALTH={"status":"ok","engine":"ready","rag_ready":true}',
  'TJ_RECORD=bef41968860a21f06651ead493de7b2628a72b8f',
  'CONTAINERS=tianji-tianji-api-1|tianji-api:cicd-prerelease-bef41968|Up 15 hours (healthy);tianji-tianji-web-1|ghcr.io/hellomrduan/tianji-web:bef41968860a21f06651ead493de7b2628a72b8f|Up 15 hours',
].join('\n');

test('parseTianjiDeepCheck: production mixed-length tokens are consistent', () => {
  const deep = parseTianjiDeepCheck(PROD_STDOUT);
  assert.equal(deep.tjApiToken, 'bef41968');
  assert.equal(deep.tjWebToken, 'bef41968860a21f06651ead493de7b2628a72b8f');
  assert.equal(deep.recordToken, 'bef41968860a21f06651ead493de7b2628a72b8f');
  assert.equal(deep.tjTagsConsistent, true);
  const assessed = assessTianji(deep);
  assert.equal(assessed.healthy, true);
  assert.deepEqual(assessed.problems, []);
  assert.equal(
    verdictFor({ state: 'running', action: 'running', deep: assessed, healthMode: 'tianji' }),
    'OK',
  );
});

test('assessTianji: api running a genuinely different commit still faults', () => {
  const out = PROD_STDOUT.replace(
    'cicd-prerelease-bef41968',
    'cicd-prerelease-d65f81b2',
  );
  const assessed = assessTianji(parseTianjiDeepCheck(out));
  assert.equal(assessed.tjTagsConsistent, false);
  assert.equal(assessed.healthy, false);
  assert.equal(
    verdictFor({ state: 'running', action: 'running', deep: assessed, healthMode: 'tianji' }),
    'APP_FAULT',
  );
});
