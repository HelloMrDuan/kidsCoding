import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideForState, classifyError, resumeRetryable,
  parseTianjiDeepCheck, assessTianjiDeep, verdictFor, isRunSuccess,
  FAILING_VERDICTS
} from '../src/logic.mjs';

const HEALTHY = [
  'TJ_HEALTH={"status":"ok"}',
  'CONTAINERS=tianji-api-1|tianji-api:sealed-82b119e|Up 3m;tianji-web-1|tianji-web:static-82b119e|Up 3m;',
].join('\n');

test('lifecycle state machine: suspended resumes, stopped only observed', () => {
  assert.equal(decideForState('suspended'), 'resume');
  assert.equal(decideForState('stopped'), 'observe');
  assert.equal(decideForState('running'), 'deep-check');
  assert.equal(decideForState('resuming'), 'wait');
  assert.equal(decideForState('unknown-state'), 'blocked');
});
test('capacity and transient retry; auth and conflict do not retry', () => {
  for (const c of ['capacity','transient']) assert.equal(resumeRetryable(c), true);
  for (const c of ['auth','conflict','not-found']) assert.equal(resumeRetryable(c), false);
  assert.equal(classifyError({code:'no_capacity'}), 'capacity');
  assert.equal(classifyError({status:401}), 'auth');
});
test('Tianji healthy only when 8080 health and both versioned containers are Up', () => {
  const deep = assessTianjiDeep(parseTianjiDeepCheck(HEALTHY));
  assert.equal(deep.healthy, true);
  assert.deepEqual(deep.problems, []);
});
test('Tianji health missing or invalid JSON is not healthy', () => {
  for (const h of ['CURL_FAIL','{"status":"down"}','<html>Error</html>']) {
    const deep = assessTianjiDeep(parseTianjiDeepCheck(HEALTHY.replace('{"status":"ok"}',h)));
    assert.equal(deep.healthy, false);
  }
});
test('Tianji both containers are required, including no false Up from backup text', () => {
  for (const text of [
    HEALTHY.replace(/tianji-web-1\|[^;]+;/,''),
    HEALTHY.replace(/tianji-api-1\|[^;]+;/,''),
    HEALTHY.replace('Up 3m','Exited (1) 1m'),
    HEALTHY.replace('tianji-web:static-82b119e|Up','tianji-web:static-82b119e|backup')
  ]) assert.equal(assessTianjiDeep(parseTianjiDeepCheck(text)).healthy, false);
});
test('Tianji API/Web tag mismatch and unparseable tag fail', () => {
  for (const tag of ['static-7abc123','latest','static-xyz']) {
    const deep = assessTianjiDeep(parseTianjiDeepCheck(HEALTHY.replace('static-82b119e',tag)));
    assert.equal(deep.healthy, false);
    assert.ok(deep.problems.some(x=>x.includes('version')));
  }
});
test('Tianji does not need KidsCoding containers or KidsCoding SHA', () => {
  const d = assessTianjiDeep(parseTianjiDeepCheck(HEALTHY));
  assert.equal(d.healthy, true);
  assert.ok(!JSON.stringify(d).includes('kids'));
});
test('APP_PENDING is honest liveness, not application health', () => {
  assert.equal(isRunSuccess('APP_PENDING'), true);
  assert.equal(FAILING_VERDICTS.has('APP_PENDING'),false);
  assert.equal(FAILING_VERDICTS.has('BLOCKED_CONFIG'),true);
  assert.equal(verdictFor({ errorClass:'transient' }), 'BLOCKED_MONITOR');
  assert.equal(verdictFor({ state:'running', deep:assessTianjiDeep(parseTianjiDeepCheck(HEALTHY.replace('static-82b119e','static-7abc123'))) }), 'APP_FAULT');
});
