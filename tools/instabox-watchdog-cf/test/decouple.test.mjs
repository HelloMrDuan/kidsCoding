// 2026-11-06 decoupling tests: machine lifecycle keepalive must keep
// working when the GitHub expected-SHA lookup fails or is rate-limited,
// while the deployment comparison stays strict (drift still faults,
// and an unverified deployment can never earn an 'OK' verdict).
//
// Harness mirrors test/core.test.mjs (fake api/store/clock, no network,
// no real waiting).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runWatchdog } from '../src/core.mjs';
import { fetchExpectedSha } from '../src/worker.mjs';
import { ApiError } from '../src/api.mjs';

const SHA = 'df56de7bb8a9a5a8c445c7c6e74ae44fd95e7f0b';
const OTHER_SHA = '6a637259d02dc4469e61b643fad847af790b1f42';
const MACHINE_ID = 'm_agqv2gsjiybrpuen46a2rpxohe';

const HEALTHY_OUT = [
  'KIDS_HEALTH={"status":"ok"}',
  'TJ_HEALTH={"status":"ok","engine":"ready"}',
  `KIDS_SHA=${SHA}`,
  `CONTAINERS=kidscoding-web-1|ghcr.io/hellomrduan/kidscoding-web:${SHA}|Up 2 hours (healthy);tianji-api-1|tianji-api:sealed-82b119e|Up 2 hours;tianji-web-1|tianji-web:static-82b119e|Up 2 hours;`,
].join('\n');

function makeStore(initial = {}) {
  const data = new Map(
    Object.entries(initial).map(([k, v]) => [k, structuredClone(v)]),
  );
  return {
    data,
    async get(k) {
      return data.has(k) ? structuredClone(data.get(k)) : null;
    },
    async put(k, v) {
      if (v === null || v === undefined) data.delete(k);
      else data.set(k, structuredClone(v));
    },
  };
}

function makeClock(start = 1_760_000_000_000) {
  let t = start;
  return {
    now: () => t,
    advanceTo: (absoluteMs) => { t = absoluteMs; },
    sleep: async (ms) => { t += ms; },
  };
}

function makeApi(script = {}) {
  const states = script.states || ['running'];
  const calls = { getMachine: 0, resume: 0, exec: 0, getOperation: 0, resumeArgs: [] };
  let si = 0;
  return {
    calls,
    async getMachine() {
      calls.getMachine += 1;
      const s = states[Math.min(si, states.length - 1)];
      si += 1;
      if (s instanceof Error) throw s;
      return { id: MACHINE_ID, name: 'platforms-core-01', state: s };
    },
    async resumeMachine(id, opts) {
      calls.resume += 1;
      calls.resumeArgs.push({ id, opts: opts || {} });
      const e = (script.resumeErrors || [])[calls.resume - 1];
      if (e) throw e;
      return { id: 'op-1', state: 'succeeded' };
    },
    async getOperation() {
      calls.getOperation += 1;
      return { id: 'op-1', state: 'succeeded' };
    },
    async exec() {
      calls.exec += 1;
      if (script.execError) throw script.execError;
      return { exitCode: script.execExitCode ?? 0, stdout: script.execOut ?? HEALTHY_OUT };
    },
  };
}

function depsFor({ api, store, clock, fetchExpectedSha: fetchFn, hold = false, ttlMs }) {
  return {
    api,
    store,
    fetchExpectedSha: fetchFn,
    now: clock.now,
    sleep: clock.sleep,
    log: () => {},
    config: {
      machineId: MACHINE_ID,
      hold,
      ...(ttlMs !== undefined ? { expectedShaCacheTtlMs: ttlMs } : {}),
    },
  };
}

// The exact error shape the deployed worker produced on 2026-11-06
// (worker.mjs OPS-013 format), with a reset one hour after the fake clock.
const rateLimitError = () =>
  new Error('GitHub rate limit HTTP 403, remaining=0, reset_epoch=1760003600');

test('SHA rate-limit -> LIFECYCLE_OK, shaCheck unknown, liveness advances, no deep-check retry storm', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({ states: ['running'] });
  const rec = await runWatchdog(depsFor({
    api, store, clock,
    fetchExpectedSha: async () => { throw rateLimitError(); },
  }));
  assert.equal(rec.verdict, 'LIFECYCLE_OK');
  assert.equal(rec.shaCheck, 'unknown');
  assert.equal(rec.deploymentVerdict, 'unknown');
  assert.equal(rec.expectedShaSource, 'rate-limited');
  assert.equal(rec.githubRateLimitUntil, '2025-10-09T09:53:20.000Z');
  assert.equal(api.calls.exec, 1, 'a SHA failure must not retry the deep check 3x');
  const status = await store.get('status');
  assert.equal(status.lastVerdict, 'LIFECYCLE_OK');
  assert.equal(status.lastShaCheck, 'unknown');
  assert.ok(status.lastSuccessAt, 'monitor liveness must advance past a GitHub rate limit');
  assert.equal(status.lastHealthyAt, undefined);
  assert.match(status.lastShaError, /rate limit/);
});

test('SHA drift still faults: APP_FAULT with both SHAs recorded', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({ states: ['running'] });
  const rec = await runWatchdog(depsFor({
    api, store, clock,
    fetchExpectedSha: async () => OTHER_SHA,
  }));
  assert.equal(rec.verdict, 'APP_FAULT');
  assert.equal(rec.shaCheck, 'drift');
  assert.equal(rec.deployedKidsSha, SHA);
  assert.equal(rec.expectedKidsSha, OTHER_SHA);
  assert.match(rec.detail, /SHA mismatch/);
  const status = await store.get('status');
  assert.equal(status.lastShaCheck, 'drift');
  assert.equal(status.lastDeployedSha, SHA);
  assert.equal(status.lastExpectedSha, OTHER_SHA);
  assert.equal(status.lastHealthyAt, undefined);
  assert.equal(status.lastSuccessAt, undefined);
});

test('suspended + SHA rate-limit -> resume still happens, then LIFECYCLE_OK', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({ states: ['suspended', 'running'] });
  const rec = await runWatchdog(depsFor({
    api, store, clock,
    fetchExpectedSha: async () => { throw rateLimitError(); },
  }));
  assert.equal(rec.verdict, 'LIFECYCLE_OK');
  assert.equal(rec.shaCheck, 'unknown');
  assert.equal(api.calls.resume, 1, 'the resume path must not depend on GitHub');
  assert.equal(await store.get('episode'), null);
  assert.equal(api.calls.exec, 1);
});

test('fresh cache hit -> zero GitHub fetches on the next run, verdict OK from cache', async () => {
  const store = makeStore();
  const clock = makeClock();
  let fetches = 0;
  const fetchFn = async () => { fetches += 1; return SHA; };
  const api1 = makeApi({ states: ['running'] });
  const rec1 = await runWatchdog(depsFor({ api: api1, store, clock, fetchExpectedSha: fetchFn }));
  assert.equal(rec1.verdict, 'OK');
  assert.equal(rec1.expectedShaSource, 'live');
  assert.equal(fetches, 1);
  // 10 minutes later (next cron): the cached head is used, no fetch.
  clock.advanceTo(clock.now() + 10 * 60_000);
  const api2 = makeApi({ states: ['running'] });
  const rec2 = await runWatchdog(depsFor({ api: api2, store, clock, fetchExpectedSha: fetchFn }));
  assert.equal(rec2.verdict, 'OK');
  assert.equal(rec2.expectedShaSource, 'cache');
  assert.equal(fetches, 1, 'a fresh cache must suppress the GitHub call');
});

test('rate-limit reset is honoured: no GitHub calls before reset, live fetch resumes after', async () => {
  const store = makeStore();
  const clock = makeClock();
  let fetches = 0;
  const fetchFn = async () => {
    fetches += 1;
    if (fetches === 1) throw rateLimitError();
    return SHA;
  };
  const rec1 = await runWatchdog(depsFor({
    api: makeApi({ states: ['running'] }), store, clock, fetchExpectedSha: fetchFn,
  }));
  assert.equal(rec1.verdict, 'LIFECYCLE_OK');
  assert.equal(fetches, 1);
  // 10 minutes later, still before the reset epoch: no GitHub call.
  clock.advanceTo(clock.now() + 10 * 60_000);
  const rec2 = await runWatchdog(depsFor({
    api: makeApi({ states: ['running'] }), store, clock, fetchExpectedSha: fetchFn,
  }));
  assert.equal(rec2.verdict, 'LIFECYCLE_OK');
  assert.equal(rec2.expectedShaSource, 'rate-limited');
  assert.equal(fetches, 1, 'must not hammer GitHub during a rate-limit window');
  // Past the reset epoch: the live fetch is attempted again and succeeds.
  clock.advanceTo(1_760_003_601_000);
  const rec3 = await runWatchdog(depsFor({
    api: makeApi({ states: ['running'] }), store, clock, fetchExpectedSha: fetchFn,
  }));
  assert.equal(rec3.verdict, 'OK');
  assert.equal(rec3.expectedShaSource, 'live');
  assert.equal(fetches, 2);
});

test('stale cache + live fetch failure -> LIFECYCLE_OK, never OK on old data', async () => {
  const clock = makeClock();
  const store = makeStore({
    expectedShaCache: {
      sha: SHA,
      fetchedAt: clock.now() - 31 * 60_000, // 31 min old, TTL is 30 min
      rateLimitUntilMs: null,
    },
  });
  let fetches = 0;
  const rec = await runWatchdog(depsFor({
    api: makeApi({ states: ['running'] }), store, clock,
    fetchExpectedSha: async () => { fetches += 1; throw rateLimitError(); },
  }));
  assert.equal(fetches, 1, 'a stale cache must still attempt a live fetch');
  assert.equal(rec.verdict, 'LIFECYCLE_OK');
  assert.notEqual(rec.verdict, 'OK');
  assert.equal(rec.shaCheck, 'unknown');
  assert.equal(rec.expectedKidsSha, null);
});

test('real app fault is not masked by an unknown expected SHA', async () => {
  const store = makeStore();
  const clock = makeClock();
  const badOut = HEALTHY_OUT.replace('KIDS_HEALTH={"status":"ok"}', 'KIDS_HEALTH=CURL_FAIL');
  const rec = await runWatchdog(depsFor({
    api: makeApi({ states: ['running'], execOut: badOut }), store, clock,
    fetchExpectedSha: async () => { throw rateLimitError(); },
  }));
  assert.equal(rec.verdict, 'APP_FAULT');
  assert.equal(rec.shaCheck, 'unknown');
  assert.match(rec.detail, /kids health endpoint not ok/);
});

test('token present -> Authorization header sent, and errors never contain the token', async () => {
  const secret = 'ghp_test-token-must-never-leak';
  let captured;
  const sha = await fetchExpectedSha({ GITHUB_TOKEN: secret }, {
    fetchImpl: async (_url, init) => {
      captured = init;
      return { ok: true, status: 200, json: async () => ({ commit: { sha: SHA } }) };
    },
    sleep: async () => {},
  });
  assert.equal(sha, SHA);
  assert.equal(captured.headers.Authorization, `Bearer ${secret}`);
  let thrown;
  try {
    await fetchExpectedSha({ GITHUB_TOKEN: secret }, {
      fetchImpl: async () => ({ ok: false, status: 403, headers: new Headers({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1792836000' }) }),
      sleep: async () => {},
    });
  } catch (err) { thrown = err; }
  assert.ok(thrown);
  assert.doesNotMatch(thrown.message, /ghp_test-token-must-never-leak/);
});
