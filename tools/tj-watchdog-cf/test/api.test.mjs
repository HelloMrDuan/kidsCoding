// Wire-level tests for the InstaBox API client.
//
// The platform REQUIRES an Idempotency-Key header (1-200 printable
// characters) on POST /v1/machines/<id>/resume. Without it the call
// is rejected with bad_request and the machine stays suspended —
// this is what produced the real BLOCKED_RESUME episode on
// tj-core-01 (2026-10-23). These tests pin the header on the wire.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createApi } from '../src/api.mjs';
import { episodeResumeKey } from '../src/core.mjs';

const okJson = (obj) => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(obj),
});

function stubFetch(handler) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  return { calls, fetchImpl };
}

test('resumeMachine sends the Idempotency-Key header when provided', async () => {
  const { calls, fetchImpl } = stubFetch(() =>
    okJson({ id: 'op_1', state: 'succeeded' }),
  );
  const api = createApi({ apiKey: 'k', fetchImpl });
  await api.resumeMachine('m_test', {
    idempotencyKey: 'watchdog-resume-2026-10-23T04:55:12.360Z',
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/v1\/machines\/m_test\/resume$/);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(
    calls[0].init.headers['Idempotency-Key'],
    'watchdog-resume-2026-10-23T04:55:12.360Z',
  );
});

test('requests without a key send no Idempotency-Key header', async () => {
  const { calls, fetchImpl } = stubFetch(() =>
    okJson({ id: 'm', state: 'running' }),
  );
  const api = createApi({ apiKey: 'k', fetchImpl });
  await api.getMachine('m_test');
  await api.resumeMachine('m_test');
  assert.equal(calls.length, 2);
  for (const c of calls) {
    assert.ok(
      !('Idempotency-Key' in c.init.headers),
      `unexpected Idempotency-Key on ${c.url}`,
    );
  }
});

test('episodeResumeKey is stable per episode and within the platform limit', () => {
  const episode = { suspendedSince: '2026-10-23T04:55:12.360Z' };
  const k1 = episodeResumeKey(episode);
  const k2 = episodeResumeKey({ suspendedSince: '2026-10-23T04:55:12.360Z' });
  assert.equal(k1, k2); // same episode -> same key
  assert.match(k1, /^[\x20-\x7E]{1,200}$/); // 1-200 printable ASCII
  const other = episodeResumeKey({
    suspendedSince: '2026-10-23T06:10:00.000Z',
  });
  assert.notEqual(k1, other); // new episode -> fresh key
});

test('positional timeout call shape still works (backward compat)', async () => {
  const { calls, fetchImpl } = stubFetch(() =>
    okJson({ exitCode: 0, stdout: '', stderr: '' }),
  );
  const api = createApi({ apiKey: 'k', fetchImpl });
  await api.exec('m_test', 'echo hi', 5);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/v1\/machines\/m_test\/exec$/);
});


test('API client preserves structured cooldown deadline and operationId', async () => {
  const { fetchImpl } = stubFetch(() => ({
    ok: false,
    status: 409,
    text: async () => JSON.stringify({ error: {
      code: 'machine_cooldown',
      message: 'machine is cooling down until 2026-10-24T06:45:27Z',
      retryable: true,
      cooldownUntil: '2026-10-24T06:45:27Z',
      operationId: null,
    } }),
  }));
  const api = createApi({ apiKey: 'k', fetchImpl });
  await assert.rejects(api.resumeMachine('m_test', { idempotencyKey: 'k-test' }), (err) => {
    assert.equal(err.code, 'machine_cooldown');
    assert.equal(err.status, 409);
    assert.equal(err.retryable, true);
    assert.equal(err.cooldownUntil, '2026-10-24T06:45:27Z');
    assert.equal(err.operationId, null);
    return true;
  });
});
