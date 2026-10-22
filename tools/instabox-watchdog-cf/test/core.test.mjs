// Behaviour tests for the Cloudflare watchdog orchestration.
//
// These run the real runWatchdog() from src/core.mjs against fake
// api/store/clock implementations and assert on OBSERVABLE behaviour:
// verdicts, exact API call counts, and what was persisted to the
// store. No network, no real waiting (the fake clock only advances
// when the code under test sleeps).
//   node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runWatchdog } from '../src/core.mjs';
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
    sleep: async (ms) => {
      t += ms;
    },
  };
}

// Scriptable fake InstaBox API. `states` is consumed one per
// getMachine call and clamps at the last entry; an Error entry is
// thrown. `resumeErrors[i]` is thrown by the (i+1)-th resume call.
// `opStates` works like `states` for getOperation.
function makeApi(script = {}) {
  const states = script.states || ['running'];
  const opStates = script.opStates || ['succeeded'];
  const calls = { getMachine: 0, resume: 0, exec: 0, getOperation: 0 };
  let si = 0;
  let oi = 0;
  return {
    calls,
    async getMachine() {
      calls.getMachine += 1;
      const s = states[Math.min(si, states.length - 1)];
      si += 1;
      if (s instanceof Error) throw s;
      return { id: MACHINE_ID, name: 'platforms-core-01', state: s };
    },
    async resumeMachine() {
      calls.resume += 1;
      const e = (script.resumeErrors || [])[calls.resume - 1];
      if (e) throw e;
      return { id: 'op-1', state: script.resumeOpState || 'succeeded' };
    },
    async getOperation() {
      calls.getOperation += 1;
      const s = opStates[Math.min(oi, opStates.length - 1)];
      oi += 1;
      return { id: 'op-1', state: s };
    },
    async exec() {
      calls.exec += 1;
      if (script.execError) throw script.execError;
      return { exitCode: script.execExitCode ?? 0, stdout: script.execOut ?? HEALTHY_OUT };
    },
  };
}

function depsFor({ api, store, clock, sha = SHA, hold = false }) {
  return {
    api,
    store,
    fetchExpectedSha: async () => sha,
    now: clock.now,
    sleep: clock.sleep,
    log: () => {},
    config: { machineId: MACHINE_ID, hold },
  };
}

const capacityErr = () =>
  new ApiError('no host capacity', { status: 500, code: 'no_capacity' });
const conflictErr = () =>
  new ApiError('operation in flight', { status: 409, code: 'operation_conflict' });

test('running + healthy deep check -> OK, no resume, healthy timestamps persisted', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({ states: ['running'] });
  const rec = await runWatchdog(depsFor({ api, store, clock }));
  assert.equal(rec.verdict, 'OK');
  assert.equal(api.calls.resume, 0);
  assert.equal(api.calls.exec, 1);
  const status = await store.get('status');
  assert.ok(status.lastRunAt);
  assert.ok(status.lastSuccessAt);
  assert.ok(status.lastHealthyAt);
  assert.equal(status.lastMachineState, 'running');
});

test('running + SHA mismatch -> APP_FAULT, alert recorded, healthy timestamp NOT set', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({ states: ['running'] });
  const rec = await runWatchdog(depsFor({ api, store, clock, sha: OTHER_SHA }));
  assert.equal(rec.verdict, 'APP_FAULT');
  assert.equal(api.calls.resume, 0);
  const status = await store.get('status');
  assert.equal(status.lastAlert.verdict, 'APP_FAULT');
  assert.equal(status.lastHealthyAt, undefined);
  assert.equal(status.lastSuccessAt, undefined);
});

test('suspended -> resume succeeds -> deep check OK; episode cleared', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({ states: ['suspended', 'running'] });
  const rec = await runWatchdog(depsFor({ api, store, clock }));
  assert.equal(rec.verdict, 'OK');
  assert.equal(api.calls.resume, 1);
  assert.equal(await store.get('episode'), null);
  const status = await store.get('status');
  assert.ok(status.lastHealthyAt);
});

test('resume waits for the resume operation to succeed before deep-checking', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({
    states: ['suspended', 'running'],
    resumeOpState: 'pending',
    opStates: ['pending', 'succeeded'],
  });
  const rec = await runWatchdog(depsFor({ api, store, clock }));
  assert.equal(rec.verdict, 'OK');
  assert.ok(api.calls.getOperation >= 2, `getOperation calls=${api.calls.getOperation}`);
});

test('stopped -> STOPPED_MANUAL and never resumed', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({ states: ['stopped'] });
  const rec = await runWatchdog(depsFor({ api, store, clock }));
  assert.equal(rec.verdict, 'STOPPED_MANUAL');
  assert.equal(api.calls.resume, 0);
  assert.equal(api.calls.exec, 0);
});

test('suspended + maintenance hold -> HELD and never resumed', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({ states: ['suspended'] });
  const rec = await runWatchdog(depsFor({ api, store, clock, hold: true }));
  assert.equal(rec.verdict, 'HELD');
  assert.equal(api.calls.resume, 0);
});

test('resume hitting no_capacity twice -> BLOCKED_CAPACITY after exactly 2 attempts', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({
    states: ['suspended'],
    resumeErrors: [capacityErr(), capacityErr(), capacityErr()],
  });
  const rec = await runWatchdog(depsFor({ api, store, clock }));
  assert.equal(rec.verdict, 'BLOCKED_CAPACITY');
  assert.equal(api.calls.resume, 2);
  const episode = await store.get('episode');
  assert.equal(episode.attempts, 2);
  assert.ok(episode.lastError.includes('no_capacity'));
  const status = await store.get('status');
  assert.equal(status.lastAlert.verdict, 'BLOCKED_CAPACITY');
});

// NEGATIVE: the per-episode cap must hold ACROSS runs — a fresh cron
// invocation must not reset the budget and keep hammering resume.
test('episode cap persists across runs: a capped episode is never resumed again', async () => {
  const clock = makeClock();
  const store = makeStore({
    episode: {
      suspendedSince: new Date(clock.now() - 600_000).toISOString(),
      attempts: 2,
      lastAttemptAt: clock.now() - 600_000,
      lastError: 'capacity: no_capacity earlier',
    },
  });
  const api = makeApi({ states: ['suspended'] });
  const rec = await runWatchdog(depsFor({ api, store, clock }));
  assert.equal(rec.verdict, 'BLOCKED_RESUME');
  assert.equal(api.calls.resume, 0);
});

test('operation_conflict -> waits for running, never POSTs resume twice', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({
    states: ['suspended', 'resuming', 'running'],
    resumeErrors: [conflictErr()],
  });
  const rec = await runWatchdog(depsFor({ api, store, clock }));
  assert.equal(rec.verdict, 'OK');
  assert.equal(api.calls.resume, 1);
});

// NEGATIVE (fail-closed): auth failure on the state read is a failing
// verdict, and nothing is resumed on a guess.
test('state read 401 -> BLOCKED_AUTH, no resume', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({
    states: [new ApiError('bad key', { status: 401, code: 'missing_api_key' })],
  });
  const rec = await runWatchdog(depsFor({ api, store, clock }));
  assert.equal(rec.verdict, 'BLOCKED_AUTH');
  assert.equal(api.calls.resume, 0);
  const status = await store.get('status');
  assert.equal(status.lastSuccessAt, undefined);
});

// NEGATIVE (fail-closed): a network failure while reading state is
// BLOCKED_MONITOR, never a healthy-looking pass.
test('state read network error -> BLOCKED_MONITOR (fail-closed)', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({
    states: [new ApiError('socket reset', { status: 0, code: 'network_error', retryable: true })],
  });
  const rec = await runWatchdog(depsFor({ api, store, clock }));
  assert.equal(rec.verdict, 'BLOCKED_MONITOR');
  assert.equal(api.calls.resume, 0);
});

test('perpetual resuming state -> IN_TRANSITION, no second resume issued', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({ states: ['resuming'] });
  const rec = await runWatchdog(depsFor({ api, store, clock }));
  assert.equal(rec.verdict, 'IN_TRANSITION');
  assert.equal(api.calls.resume, 0);
});

// NEGATIVE (fail-closed): when the deep check itself cannot run, a
// running machine is NOT reported healthy.
test('deep check exec failure on a running machine -> BLOCKED_MONITOR', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({
    states: ['running'],
    execError: new ApiError('exec channel down', { status: 0, code: 'network_error', retryable: true }),
  });
  const rec = await runWatchdog(depsFor({ api, store, clock }));
  assert.equal(rec.verdict, 'BLOCKED_MONITOR');
  const status = await store.get('status');
  assert.equal(status.lastHealthyAt, undefined);
});

// NEGATIVE: an overlapping run must make no API calls at all and must
// not touch the liveness timestamps the backup layer relies on.
test('lock held by another run -> LOCKED, zero API calls, liveness untouched', async () => {
  const clock = makeClock();
  const store = makeStore({
    lock: { runId: 'someone-else', at: clock.now() },
  });
  const api = makeApi({ states: ['running'] });
  const rec = await runWatchdog(depsFor({ api, store, clock }));
  assert.equal(rec.verdict, 'LOCKED');
  assert.equal(api.calls.getMachine, 0);
  assert.equal(api.calls.resume, 0);
  const status = await store.get('status');
  assert.equal(status.lastRunAt, undefined);
  assert.ok(status.lastLockSkipAt);
});

test('expected SHA unavailable -> still OK on machine-side checks, gap explicitly recorded', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({ states: ['running'] });
  const rec = await runWatchdog(depsFor({ api, store, clock, sha: null }));
  assert.equal(rec.verdict, 'OK');
  assert.equal(rec.expectedShaMissing, true);
});

test('unknown machine state -> BLOCKED_STATE, no resume', async () => {
  const store = makeStore();
  const clock = makeClock();
  const api = makeApi({ states: ['melting'] });
  const rec = await runWatchdog(depsFor({ api, store, clock }));
  assert.equal(rec.verdict, 'BLOCKED_STATE');
  assert.equal(api.calls.resume, 0);
});

test('resumed machine whose apps stay unhealthy -> APP_FAULT after bounded deep-check retries', async () => {
  const store = makeStore();
  const clock = makeClock();
  const badOut = HEALTHY_OUT.replace(
    'TJ_HEALTH={"status":"ok","engine":"ready"}',
    'TJ_HEALTH=CURL_FAIL',
  );
  const api = makeApi({ states: ['suspended', 'running'], execOut: badOut });
  const rec = await runWatchdog(depsFor({ api, store, clock }));
  assert.equal(rec.verdict, 'APP_FAULT');
  assert.equal(api.calls.resume, 1);
  assert.equal(api.calls.exec, 3);
});

test('missing API key -> BLOCKED_AUTH before any state decision', async () => {
  const store = makeStore();
  const clock = makeClock();
  const deps = depsFor({ api: null, store, clock });
  const rec = await runWatchdog(deps);
  assert.equal(rec.verdict, 'BLOCKED_AUTH');
});
