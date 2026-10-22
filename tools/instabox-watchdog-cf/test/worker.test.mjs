import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';

const endpoint = 'https://instabox-watchdog.example.workers.dev/run';

test('manual trigger is disabled when RUN_TOKEN is not configured', async () => {
  const response = await worker.fetch(new Request(endpoint, { method: 'POST' }), {});
  assert.equal(response.status, 403);
  assert.match(await response.text(), /disabled/);
});

test('manual trigger rejects missing or invalid bearer token', async () => {
  for (const authorization of [null, 'Bearer wrong-token']) {
    const headers = authorization ? { authorization } : {};
    const response = await worker.fetch(
      new Request(endpoint, { method: 'POST', headers }),
      { RUN_TOKEN: 'configured-secret-not-used-in-logs' },
    );
    assert.equal(response.status, 401);
  }
});
