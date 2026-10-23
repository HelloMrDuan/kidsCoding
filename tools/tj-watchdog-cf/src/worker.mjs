// Cloudflare Worker entry for the InstaBox primary watchdog.
//
// Bindings and configuration (see wrangler.toml and README.md):
//   env.WATCHDOG_KV       KV namespace holding status/episode/lock
//   env.INSTABOX_API_KEY  Worker Secret (never in code, git or logs)
//   env.RUN_TOKEN         Worker Secret required to enable POST /run
//   env.MACHINE_ID        real tj-core-01 ID; NO old machine fallback
//   env.GITHUB_REPO       var: repo whose branch head is the expected
//                         Kids deployed SHA (public API, no token)
//   env.GITHUB_BRANCH     var: deployment branch (default tq-011)
//   env.WATCHDOG_HOLD     maintenance flag
//   env.TIANJI_DEPLOYED  true only after actual Tianji deployment
//
// HTTP surface:
//   GET  /status  public, coarse run status (timestamps, verdict,
//                 machine state) so the independent Muse backup
//                 layer can judge whether this primary is alive.
//                 Contains no secrets and no API key material.
//   POST /run     manual trigger for diagnostics; requires the
//                 RUN_TOKEN secret when one is configured. A manual
//                 run is NOT cron evidence and is labelled as such.

import { createApi } from './api.mjs';
import { runWatchdog } from './core.mjs';

// No machine ID fallback: a missing ID must fail closed.

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
    store: kvStore(env.WATCHDOG_KV),
    now: () => Date.now(),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    log: (event, detail) =>
      console.log(JSON.stringify({ event, detail, trigger })),
    config: {
      machineId: env.MACHINE_ID || '',
      hold: env.WATCHDOG_HOLD === 'true',
      appDeployed: env.TIANJI_DEPLOYED === 'true',
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
    !['OK', 'APP_PENDING', 'STOPPED_MANUAL', 'HELD', 'IN_TRANSITION', 'LOCKED'].includes(record.verdict)
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
      const status = await kvStore(env.WATCHDOG_KV).get('status');
      return Response.json(
        status || { service: 'tj-watchdog-cf', note: 'no runs recorded yet' },
        { headers: { 'cache-control': 'no-store' } },
      );
    }
    if (request.method === 'POST' && url.pathname === '/run') {
      // Fail closed: without an explicitly configured RUN_TOKEN,
      // the manual endpoint is disabled. A public URL must never
      // allow anonymous callers to trigger Resume.
      if (!env.RUN_TOKEN) {
        return new Response('manual execution disabled', { status: 403 });
      }
      const auth = request.headers.get('authorization') || '';
      if (auth !== `Bearer ${env.RUN_TOKEN}`) {
        return new Response('unauthorized', { status: 401 });
      }
      const record = await runOnce(env, 'manual');
      return Response.json(record, { headers: { 'cache-control': 'no-store' } });
    }
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response('tj-watchdog-cf: see /status', {
        headers: { 'content-type': 'text/plain' },
      });
    }
    return new Response('not found', { status: 404 });
  },
};
