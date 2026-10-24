import { test } from 'node:test';
import assert from 'node:assert/strict';

import { runWatchdog } from '../src/core.mjs';
import { isRunSuccess } from '../src/logic.mjs';
import { ApiError } from '../src/api.mjs';

// ---------- fakes ----------

class FakeStore {
  // staleKeys simulates Cloudflare KV eventual consistency at its
  // worst: reads of those keys NEVER observe writes (perpetually
  // stale snapshot = absent). Writes still land in the map so the
  // final persisted state can be inspected.
  constructor({ staleKeys = [] } = {}) {
    this.map = new Map();
    this.stale = new Set(staleKeys);
  }
  async get(key) {
    if (this.stale.has(key)) return null;
    const v = this.map.get(key);
    return v === undefined ? null : structuredClone(v);
  }
  async put(key, value) {
    if (value === null || value === undefined) this.map.delete(key);
    else this.map.set(key, structuredClone(value));
  }
}

class FakeApi {
  constructor() {
    this.state = 'running';
    this.operationId = null;
    this.script = []; // queued getMachine results (objects or Errors)
    this.getMachineError = null;
    this.getMachineCalls = 0;
    this.resumeCalls = 0;
    this.successfulResumes = 0;
    this.resumeErrorQueue = [];
    this.resumeArgs = [];
    this.onResume = null;
    this.execCalls = 0;
    this.execStdout = '';
    this.execError = null;
  }
  async getMachine(id) {
    this.getMachineCalls += 1;
    if (this.script.length) {
      const s = this.script.shift();
      if (s instanceof Error) throw s;
      return s;
    }
    if (this.getMachineError) throw this.getMachineError;
    return { id, name: 'tj-core-01', state: this.state, operationId: this.operationId };
  }
  async resumeMachine(id, opts) {
    this.resumeCalls += 1;
    this.resumeArgs.push({ id, opts: opts || {} });
    if (this.onResume) return this.onResume(this);
    if (this.resumeErrorQueue.length) throw this.resumeErrorQueue.shift();
    this.successfulResumes += 1;
    this.state = 'running';
    return { id: 'op_1', state: 'succeeded' };
  }
  async getOperation(id) {
    return { id, state: 'succeeded' };
  }
  async exec(id, cmd) {
    this.execCalls += 1;
    if (this.execError) throw this.execError;
    return { exitCode: 0, stdout: this.execStdout, stderr: '' };
  }
}

function makeClock(start = 1_000_000) {
  const clock = {
    t: start,
    sleeps: [],
    now: () => clock.t,
    sleep: async (ms) => {
      clock.sleeps.push(ms);
      clock.t += ms;
    },
  };
  return clock;
}

function makeDeps({ api, store, clock, config = {} }) {
  return {
    api,
    store,
    now: clock.now,
    sleep: clock.sleep,
    log: () => {},
    config: {
      machineId: 'm_tj_test_id',
      machineName: 'tj-core-01',
      healthMode: 'lifecycle',
      hold: false,
      statePollTimeoutMs: 10_000,
      statePollIntervalMs: 1_000,
      operationPollTimeoutMs: 10_000,
      operationPollIntervalMs: 100,
      deepCheckIntervalMs: 1_000,
      ...config,
    },
  };
}

const HEALTHY_STDOUT = [
  'TJ_HEALTH={"status":"ok"}',
  'TJ_RECORD=sealed-82b119e',
  'CONTAINERS=tianji-api|tianji-api:sealed-82b119e|Up 2 hours;tianji-web|tianji-web:sealed-82b119e|Up 2 hours',
].join('\n');

const conflictError = () =>
  new ApiError('another operation in flight', { status: 409, code: 'operation_conflict' });
const capacityError = () =>
  new ApiError('no host capacity', { status: 503, code: 'no_capacity', retryable: true });

// ---------- config gates ----------

test('config gate: missing MACHINE_ID fails closed with zero API calls', async () => {
  const api = new FakeApi();
  const deps = makeDeps({ api, store: new FakeStore(), clock: makeClock(), config: { machineId: '' } });
  const rec = await runWatchdog(deps);
  assert.equal(rec.verdict, 'BLOCKED_CONFIG');
  assert.equal(api.getMachineCalls, 0);
  assert.equal(api.resumeCalls, 0);
});

test('config gate: placeholder MACHINE_ID fails closed (never reuse another machine)', async () => {
  const api = new FakeApi();
  const deps = makeDeps({
    api,
    store: new FakeStore(),
    clock: makeClock(),
    config: { machineId: 'REPLACE_WITH_TJ_CORE_01_MACHINE_ID' },
  });
  const rec = await runWatchdog(deps);
  assert.equal(rec.verdict, 'BLOCKED_CONFIG');
  assert.equal(api.getMachineCalls, 0);
});

test('config gate: missing API key -> BLOCKED_AUTH', async () => {
  const deps = makeDeps({ api: null, store: new FakeStore(), clock: makeClock() });
  const rec = await runWatchdog(deps);
  assert.equal(rec.verdict, 'BLOCKED_AUTH');
});

// ---------- lifecycle mode ----------

test('lifecycle: running -> LIFECYCLE_OK, no exec, no healthy timestamp', async () => {
  const api = new FakeApi();
  api.state = 'running';
  const store = new FakeStore();
  const rec = await runWatchdog(makeDeps({ api, store, clock: makeClock() }));
  assert.equal(rec.verdict, 'LIFECYCLE_OK');
  assert.equal(api.execCalls, 0); // no app health check before deployment
  const status = store.map.get('status');
  assert.equal(status.service, 'tj-watchdog');
  assert.equal(status.lastHealthyAt, undefined); // undeployed != healthy
  assert.ok(status.lastLifecycleOkAt);
  assert.ok(status.lastSuccessAt);
});

test('lifecycle: suspended -> resume -> LIFECYCLE_OK with resume recorded', async () => {
  const api = new FakeApi();
  api.state = 'suspended';
  const store = new FakeStore();
  const rec = await runWatchdog(makeDeps({ api, store, clock: makeClock() }));
  assert.equal(rec.verdict, 'LIFECYCLE_OK');
  assert.equal(rec.resumed, true);
  assert.equal(api.successfulResumes, 1);
  assert.equal(api.execCalls, 0);
  assert.equal(store.map.get('episode'), undefined); // episode closed
  assert.ok(store.map.get('status').lastResumeAt);
});

test('stopped is never resumed', async () => {
  const api = new FakeApi();
  api.state = 'stopped';
  const rec = await runWatchdog(makeDeps({ api, store: new FakeStore(), clock: makeClock() }));
  assert.equal(rec.verdict, 'STOPPED_MANUAL');
  assert.equal(api.resumeCalls, 0);
});

test('hold: suspended is reported, never resumed', async () => {
  const api = new FakeApi();
  api.state = 'suspended';
  const rec = await runWatchdog(
    makeDeps({ api, store: new FakeStore(), clock: makeClock(), config: { hold: true } }),
  );
  assert.equal(rec.verdict, 'HELD');
  assert.equal(api.resumeCalls, 0);
});

test('resuming: waits for running, never posts a second resume', async () => {
  const api = new FakeApi();
  api.state = 'running';
  api.script = [{ id: 'm_tj_test_id', name: 'tj-core-01', state: 'resuming', operationId: 'op_9' }];
  const rec = await runWatchdog(makeDeps({ api, store: new FakeStore(), clock: makeClock() }));
  assert.equal(rec.verdict, 'LIFECYCLE_OK');
  assert.equal(api.resumeCalls, 0);
});

test('machine not found -> BLOCKED_NOT_FOUND', async () => {
  const api = new FakeApi();
  api.getMachineError = new ApiError('no such machine', { status: 404, code: 'not_found' });
  const rec = await runWatchdog(makeDeps({ api, store: new FakeStore(), clock: makeClock() }));
  assert.equal(rec.verdict, 'BLOCKED_NOT_FOUND');
});

test('API 500 on state read -> BLOCKED_MONITOR (fail closed)', async () => {
  const api = new FakeApi();
  api.getMachineError = new ApiError('internal', { status: 500, code: 'internal', retryable: true });
  const rec = await runWatchdog(makeDeps({ api, store: new FakeStore(), clock: makeClock() }));
  assert.equal(rec.verdict, 'BLOCKED_MONITOR');
});

// ---------- resume retries and the cross-run cap ----------

test('capacity: bounded retries, raw code kept, cap persists across runs', async () => {
  const api = new FakeApi();
  api.state = 'suspended';
  api.resumeErrorQueue = [capacityError(), capacityError(), capacityError()];
  const store = new FakeStore();
  const clock = makeClock();
  const rec1 = await runWatchdog(makeDeps({ api, store, clock }));
  assert.equal(rec1.verdict, 'BLOCKED_CAPACITY');
  assert.ok(rec1.detail.includes('no_capacity'));
  assert.equal(api.resumeCalls, 2); // cap = 2 attempts per episode

  // A later run in the same episode must NOT post again.
  const rec2 = await runWatchdog(makeDeps({ api, store, clock }));
  assert.equal(rec2.verdict, 'BLOCKED_RESUME');
  assert.equal(api.resumeCalls, 2);
});

test('resume spacing: 45s between attempts is enforced across runs', async () => {
  const api = new FakeApi();
  api.state = 'suspended';
  const store = new FakeStore();
  const t0 = 5_000_000;
  store.map.set('episode', {
    suspendedSince: new Date(t0).toISOString(),
    attempts: 1,
    lastAttemptAt: t0,
    lastError: '',
  });
  const clock = makeClock(t0 + 10_000); // only 10s since last attempt
  const rec = await runWatchdog(makeDeps({ api, store, clock }));
  assert.equal(rec.verdict, 'LIFECYCLE_OK');
  assert.equal(api.resumeCalls, 1);
  assert.equal(clock.sleeps[0], 35_000); // waited the remaining backoff first
});

// ---------- fresh-state gate ----------

test('fresh-state gate: machine resumed by another actor -> no POST from this run', async () => {
  const api = new FakeApi();
  api.state = 'running';
  api.script = [
    { id: 'm_tj_test_id', name: 'tj-core-01', state: 'suspended', operationId: null },
    { id: 'm_tj_test_id', name: 'tj-core-01', state: 'running', operationId: null },
  ];
  const rec = await runWatchdog(makeDeps({ api, store: new FakeStore(), clock: makeClock() }));
  assert.equal(rec.verdict, 'LIFECYCLE_OK');
  assert.equal(api.resumeCalls, 0);
});

test('fresh-state gate: operation already in flight while suspended -> wait, no POST', async () => {
  const api = new FakeApi();
  api.state = 'running';
  api.script = [
    { id: 'm_tj_test_id', name: 'tj-core-01', state: 'suspended', operationId: null },
    { id: 'm_tj_test_id', name: 'tj-core-01', state: 'suspended', operationId: 'op_other' },
  ];
  const rec = await runWatchdog(makeDeps({ api, store: new FakeStore(), clock: makeClock() }));
  assert.equal(rec.verdict, 'LIFECYCLE_OK');
  assert.equal(api.resumeCalls, 0);
});

// ---------- conflict handling ----------

test('conflict on POST is benign: poll to running, exactly one POST', async () => {
  const api = new FakeApi();
  api.state = 'suspended';
  api.onResume = (a) => {
    a.state = 'running'; // the other actor's resume lands
    throw conflictError();
  };
  const rec = await runWatchdog(makeDeps({ api, store: new FakeStore(), clock: makeClock() }));
  assert.equal(rec.verdict, 'LIFECYCLE_OK');
  assert.equal(api.resumeCalls, 1); // never re-POSTed
});

test('conflict on POST, machine still resuming at poll timeout -> RESUME_IN_PROGRESS', async () => {
  const api = new FakeApi();
  api.state = 'resuming';
  api.script = [
    { id: 'm_tj_test_id', name: 'tj-core-01', state: 'suspended', operationId: null },
    { id: 'm_tj_test_id', name: 'tj-core-01', state: 'suspended', operationId: null },
  ];
  api.onResume = () => {
    throw conflictError();
  };
  const rec = await runWatchdog(makeDeps({ api, store: new FakeStore(), clock: makeClock() }));
  assert.equal(rec.verdict, 'RESUME_IN_PROGRESS');
  assert.equal(isRunSuccess(rec.verdict), true); // monitor behaved correctly
  assert.equal(api.resumeCalls, 1);
});

// ---------- NEGATIVE concurrency tests (requirement: KV is not a lock) ----------

test('NEGATIVE: two overlapping runs, KV reads fully stale -> exactly ONE platform resume', async () => {
  const api = new FakeApi();
  api.state = 'suspended';
  // Platform serialization: the first POST wins; any racing POST is
  // rejected with operation_conflict.
  api.onResume = (a) => {
    if (a.successfulResumes >= 1) throw conflictError();
    a.successfulResumes += 1;
    a.state = 'running';
    return { id: 'op_win', state: 'succeeded' };
  };
  // Worst-case eventual consistency: episode/claim reads never see
  // writes, so both runs believe they are alone with attempts=0.
  const store = new FakeStore({ staleKeys: ['episode', 'claim'] });
  const clock = makeClock();
  const depsA = makeDeps({ api, store, clock, config: {} });
  const depsB = makeDeps({ api, store, clock, config: {} });
  const [recA, recB] = await Promise.all([runWatchdog(depsA), runWatchdog(depsB)]);
  assert.equal(api.successfulResumes, 1); // the platform saw ONE resume operation
  assert.ok(api.resumeCalls <= 2); // at most one success + one conflicted POST
  assert.equal(isRunSuccess(recA.verdict), true);
  assert.equal(isRunSuccess(recB.verdict), true); // the loser is NOT a failure
});

test('NEGATIVE: a fresh advisory claim by another run never gates this run', async () => {
  const api = new FakeApi();
  api.state = 'running';
  const store = new FakeStore();
  const clock = makeClock();
  store.map.set('claim', { runId: 'someone-else', at: clock.now() });
  const rec = await runWatchdog(makeDeps({ api, store, clock }));
  // The claim is telemetry only: the run still did its read-only check.
  assert.equal(rec.verdict, 'LIFECYCLE_OK');
  assert.ok(api.getMachineCalls >= 1);
});

test('NEGATIVE: stale claim from a crashed run does not block recovery', async () => {
  const api = new FakeApi();
  api.state = 'suspended';
  const store = new FakeStore();
  const clock = makeClock();
  store.map.set('claim', { runId: 'crashed-run', at: clock.now() - 3_600_000 });
  const rec = await runWatchdog(makeDeps({ api, store, clock }));
  assert.equal(rec.verdict, 'LIFECYCLE_OK');
  assert.equal(api.successfulResumes, 1);
});

// ---------- tianji mode (post-migration) ----------

test('tianji mode: running + healthy deep check -> OK with healthy timestamp', async () => {
  const api = new FakeApi();
  api.state = 'running';
  api.execStdout = HEALTHY_STDOUT;
  const store = new FakeStore();
  const rec = await runWatchdog(
    makeDeps({ api, store, clock: makeClock(), config: { healthMode: 'tianji' } }),
  );
  assert.equal(rec.verdict, 'OK');
  assert.equal(api.execCalls, 1);
  assert.ok(store.map.get('status').lastHealthyAt);
});

test('tianji mode: web container down -> APP_FAULT', async () => {
  const api = new FakeApi();
  api.state = 'running';
  api.execStdout = HEALTHY_STDOUT.replace(
    'tianji-web|tianji-web:sealed-82b119e|Up 2 hours',
    'tianji-web|tianji-web:sealed-82b119e|Exited (1) 3 minutes ago',
  );
  const rec = await runWatchdog(
    makeDeps({ api, store: new FakeStore(), clock: makeClock(), config: { healthMode: 'tianji' } }),
  );
  assert.equal(rec.verdict, 'APP_FAULT');
});

test('tianji mode: resume is followed by the tianji deep check', async () => {
  const api = new FakeApi();
  api.state = 'suspended';
  api.execStdout = HEALTHY_STDOUT;
  const rec = await runWatchdog(
    makeDeps({ api, store: new FakeStore(), clock: makeClock(), config: { healthMode: 'tianji' } }),
  );
  assert.equal(rec.verdict, 'OK');
  assert.equal(rec.resumed, true);
  assert.ok(api.execCalls >= 1);
});

test('import smoke: worker module loads', async () => {
  const worker = await import('../src/worker.mjs');
  assert.equal(typeof worker.default.scheduled, 'function');
  assert.equal(typeof worker.default.fetch, 'function');
});

test('resume attempts in one episode carry a stable Idempotency-Key', async () => {
  // Regression test for the real 2026-10-23 tj-core-01 episode: the
  // platform rejected both resume POSTs with bad_request because no
  // Idempotency-Key header was sent. Both attempts of one episode
  // must carry the same key.
  const api = new FakeApi();
  api.state = 'suspended';
  api.resumeErrorQueue = [capacityError(), capacityError(), capacityError()];
  const store = new FakeStore();
  const clock = makeClock();
  const rec1 = await runWatchdog(makeDeps({ api, store, clock }));
  assert.equal(rec1.verdict, 'BLOCKED_CAPACITY');
  assert.equal(api.resumeCalls, 2);
  assert.equal(api.resumeArgs.length, 2);
  const k1 = api.resumeArgs[0].opts.idempotencyKey;
  const k2 = api.resumeArgs[1].opts.idempotencyKey;
  assert.ok(k1, 'attempt 1 must carry an Idempotency-Key');
  assert.equal(k2, k1, 'both attempts of one episode must share the key');
  assert.match(k1, /^[\x20-\x7E]{1,200}$/);
});

// ---------- 2026-10-24 fixes: KV write budget + deep-check retries ----------

test('plain running run performs exactly one KV write (status) and no claim', async () => {
  const api = new FakeApi();
  const store = new FakeStore();
  const puts = [];
  const rawPut = store.put.bind(store);
  store.put = async (key, value) => {
    puts.push(key);
    return rawPut(key, value);
  };
  const rec = await runWatchdog(makeDeps({ api, store, clock: makeClock() }));
  assert.equal(rec.verdict, 'LIFECYCLE_OK');
  assert.deepEqual(puts, ['status']);
  assert.equal(store.map.has('claim'), false);
});

test('steady-state deep check: one transient exec failure is retried, verdict OK', async () => {
  const api = new FakeApi();
  api.execStdout = HEALTHY_STDOUT;
  const rawExec = api.exec.bind(api);
  let thrown = false;
  api.exec = async (...args) => {
    if (!thrown) {
      thrown = true;
      api.execCalls += 1;
      throw new ApiError('network error calling POST exec', { code: 'network_error', retryable: true });
    }
    return rawExec(...args);
  };
  const rec = await runWatchdog(
    makeDeps({ api, store: new FakeStore(), clock: makeClock(), config: { healthMode: 'tianji' } }),
  );
  assert.equal(rec.verdict, 'OK');
  assert.equal(api.execCalls, 2);
});

test('steady-state deep check: persistent exec failure fails closed after all tries', async () => {
  const api = new FakeApi();
  api.execError = new ApiError('network error calling POST exec', { code: 'network_error', retryable: true });
  const rec = await runWatchdog(
    makeDeps({ api, store: new FakeStore(), clock: makeClock(), config: { healthMode: 'tianji' } }),
  );
  assert.equal(rec.verdict, 'BLOCKED_MONITOR');
  assert.equal(api.execCalls, 3); // deepCheckTries, then fail closed
});

test('tianji mode: production mixed-length image tokens verdict OK', async () => {
  const api = new FakeApi();
  api.execStdout = [
    'TJ_HEALTH={"status":"ok","engine":"ready","rag_ready":true}',
    'TJ_RECORD=bef41968860a21f06651ead493de7b2628a72b8f',
    'CONTAINERS=tianji-tianji-api-1|tianji-api:cicd-prerelease-bef41968|Up 15 hours (healthy);tianji-tianji-web-1|ghcr.io/hellomrduan/tianji-web:bef41968860a21f06651ead493de7b2628a72b8f|Up 15 hours',
  ].join('\n');
  const rec = await runWatchdog(
    makeDeps({ api, store: new FakeStore(), clock: makeClock(), config: { healthMode: 'tianji' } }),
  );
  assert.equal(rec.verdict, 'OK');
});
