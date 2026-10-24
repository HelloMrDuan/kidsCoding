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


// -------- OPS-013: actual Worker GitHub head lookup retries --------

import { fetchExpectedSha } from '../src/worker.mjs';

const MAIN_SHA = 'a'.repeat(40);
const okHead = () => ({
  ok: true, status: 200,
  json: async () => ({ commit: { sha: MAIN_SHA } }),
});

test('OPS-013: transient 502 retries, validates SHA; no stale fallback', async () => {
  let calls = 0;
  const waits = [];
  const sha = await fetchExpectedSha({}, {
    fetchImpl: async () => {
      calls++;
      return calls === 1
        ? { ok: false, status: 502, headers: new Headers() }
        : okHead();
    },
    sleep: async (ms) => waits.push(ms),
  });
  assert.equal(sha, MAIN_SHA);
  assert.equal(calls, 2);
  assert.deepEqual(waits, [500]);
});

test('OPS-013: transient network failure retries but never returns a guessed SHA', async () => {
  let calls = 0;
  const sha = await fetchExpectedSha({}, {
    fetchImpl: async () => {
      if (++calls === 1) throw new Error('fetch failed');
      return okHead();
    },
    sleep: async () => {},
  });
  assert.equal(sha, MAIN_SHA);
  assert.equal(calls, 2);
});

test('OPS-013: 403 GitHub rate limit never retry-spins; reports status and reset', async () => {
  let calls = 0;
  await assert.rejects(
    fetchExpectedSha({}, {
      fetchImpl: async () => {
        calls++;
        return { ok: false, status: 403, headers: new Headers({
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': '1792836000',
        }) };
      },
      sleep: async () => { throw new Error('should not sleep'); },
    }),
    /GitHub rate limit HTTP 403, remaining=0, reset_epoch=1792836000/,
  );
  assert.equal(calls, 1);
});

test('OPS-013: 429 never retries, including when GitHub headers are absent', async () => {
  let calls = 0;
  await assert.rejects(fetchExpectedSha({}, {
    fetchImpl: async () => {
      calls++;
      return { ok: false, status: 429, headers: new Headers() };
    },
    sleep: async () => { throw new Error('unexpected sleep'); },
  }), /GitHub rate limit HTTP 429/);
  assert.equal(calls, 1);
});

test('OPS-013: invalid SHA is a hard failure (not a fake healthy value)', async () => {
  let calls = 0;
  await assert.rejects(fetchExpectedSha({}, {
    fetchImpl: async () => {
      calls++;
      return { ok: true, status: 200, json: async () => ({ commit: { sha: 'bad' } }) };
    },
    sleep: async () => {},
  }), /invalid 40-character SHA/);
  assert.equal(calls, 1);
});

test('OPS-013: persistent 503 retries exactly three times then fails', async () => {
  let calls = 0;
  const waits = [];
  await assert.rejects(fetchExpectedSha({}, {
    fetchImpl: async () => {
      calls++;
      return { ok: false, status: 503, headers: new Headers() };
    },
    sleep: async (ms) => waits.push(ms),
  }), /GitHub branch lookup HTTP 503/);
  assert.equal(calls, 3);
  assert.deepEqual(waits, [500, 1500]);
});

test('OPS-013: optional GitHub token is a secret header and never a log detail', async () => {
  const secret = 'private-gh-token-for-unit-test';
  let captured;
  const sha = await fetchExpectedSha({ GITHUB_TOKEN: secret }, {
    fetchImpl: async (_url, init) => {
      captured = init;
      return okHead();
    },
    sleep: async () => {},
  });
  assert.equal(sha, MAIN_SHA);
  assert.equal(captured.headers.Authorization, `Bearer ${secret}`);
  let thrown;
  try {
    await fetchExpectedSha({ GITHUB_TOKEN: secret }, {
      fetchImpl: async () => ({ ok: false, status: 401, headers: new Headers() }),
      sleep: async () => {},
    });
  } catch (err) { thrown = err; }
  assert.ok(thrown);
  assert.doesNotMatch(thrown.message, /private-gh-token-for-unit-test/);
});

test('OPS-013: repo or branch path cannot redirect monitoring to another endpoint', async () => {
  await assert.rejects(
    fetchExpectedSha({ GITHUB_REPO: 'https://example.com', GITHUB_BRANCH: 'main' },
      { fetchImpl: async () => { throw new Error('must not fetch'); } }),
    /invalid GitHub repo or branch configuration/,
  );
});
