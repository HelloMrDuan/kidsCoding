// Cloudflare Worker entry for tj-watchdog: the primary watchdog for
// the Tianji machine tj-core-01 ONLY.
//
// This worker is fully independent of instabox-watchdog (the
// platforms-core-01 worker): separate Worker, separate KV namespace,
// separate secret, separate state. Nothing here may read or write the
// other worker's KV, and there is NO default machine ID — if
// MACHINE_ID is not configured, runs fail closed with BLOCKED_CONFIG
// instead of ever touching another machine.
//
// Bindings and configuration (see wrangler.toml and README.md):
//   env.TJ_WATCHDOG_KV    this worker's own KV namespace
//   env.INSTABOX_API_KEY  Worker Secret: a DEDICATED InstaBox API key
//                         for this worker (never shared, never logged)
//   env.RUN_TOKEN         optional Worker Secret guarding POST /run
//   env.MACHINE_ID        var: tj-core-01's real machine ID, filled
//                         in at deploy time from the InstaBox API
//   env.MACHINE_NAME      var: 'tj-core-01'
//   env.HEALTH_MODE       var: 'lifecycle' (initial) or 'tianji'
//                         (after the Tianji migration completes)
//   env.TIANJI_DEPLOYED   var: the production Worker's flag set by
//                         the owner in the dashboard ('false' ->
//                         lifecycle, 'true' -> tianji). HEALTH_MODE
//                         wins when both are present; see
//                         healthModeFromEnv() in logic.mjs.
//   env.WATCHDOG_HOLD     var: "true" = monitor only, never resume
//
// HTTP surface:
//   GET  /status  public, coarse run status so the independent Muse
//                 backup layer (tj-backup-watchdog) can judge whether
//                 this primary is alive. No secrets.
//   POST /run     manual diagnostics trigger; requires RUN_TOKEN when
//                 configured. A manual run is NOT cron evidence.

import { createApi } from './api.mjs';
import { runWatchdog } from './core.mjs';
import { healthModeFromEnv } from './logic.mjs';

function kvStore(kv) {
  return {
    async get(key) {
      const raw = await kv.get(key);
      if (raw === null || raw === undefined) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    async put(key, value) {
      if (value === null || value === undefined) {
        await kv.delete(key);
      } else {
        await kv.put(key, JSON.stringify(value));
      }
    },
  };
}

async function runOnce(env, trigger) {
  const apiKey = env.INSTABOX_API_KEY || '';
  const api = apiKey
    ? createApi({ apiKey, baseUrl: env.INSTABOX_API_URL || undefined })
    : null;
  const record = await runWatchdog({
    api,
    store: kvStore(env.TJ_WATCHDOG_KV),
    now: () => Date.now(),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    log: (event, detail) =>
      console.log(JSON.stringify({ event, detail, trigger })),
    config: {
      machineId: env.MACHINE_ID || '',
      machineName: env.MACHINE_NAME || 'tj-core-01',
      healthMode: healthModeFromEnv(env),
      hold: env.WATCHDOG_HOLD === 'true',
    },
  });
  const line = {
    trigger,
    verdict: record.verdict,
    state: record.state || null,
    finishedAt: record.finishedAt,
  };
  if (
    record.verdict &&
    !['OK', 'LIFECYCLE_OK', 'STOPPED_MANUAL', 'HELD', 'IN_TRANSITION', 'RESUME_IN_PROGRESS', 'COOLDOWN_WAIT'].includes(
      record.verdict,
    )
  ) {
    console.error(JSON.stringify({ alert: true, ...line }));
  } else {
    console.log(JSON.stringify(line));
  }
  return record;
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runOnce(env, 'cron'));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/status') {
      const status = await kvStore(env.TJ_WATCHDOG_KV).get('status');
      return Response.json(
        status || { service: 'tj-watchdog', note: 'no runs recorded yet' },
        { headers: { 'cache-control': 'no-store' } },
      );
    }
    if (request.method === 'POST' && url.pathname === '/run') {
      if (env.RUN_TOKEN) {
        const auth = request.headers.get('authorization') || '';
        if (auth !== `Bearer ${env.RUN_TOKEN}`) {
          return new Response('unauthorized', { status: 401 });
        }
      }
      const record = await runOnce(env, 'manual');
      return Response.json(record, { headers: { 'cache-control': 'no-store' } });
    }
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response('tj-watchdog: see /status', {
        headers: { 'content-type': 'text/plain' },
      });
    }
    return new Response('not found', { status: 404 });
  },
};
