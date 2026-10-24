// Cloudflare Worker entry for the InstaBox primary watchdog.
//
// Bindings and configuration (see wrangler.toml and README.md):
//   env.WATCHDOG_KV       KV namespace holding status/episode/lock
//   env.INSTABOX_API_KEY  Worker Secret (never in code, git or logs)
//   env.RUN_TOKEN         Worker Secret required to enable POST /run
//   env.MACHINE_ID        var, default below
//   env.GITHUB_REPO       var: repo whose branch head is the expected
//                         Kids deployed SHA (public API, no token)
//   env.GITHUB_BRANCH     var: deployment branch (default main)
//   env.GITHUB_TOKEN      optional GitHub read-only API token (Worker Secret),
//                         NEVER printed or put in the KV state
//   env.WATCHDOG_HOLD     var: "true" = monitor only, never resume
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

const DEFAULT_MACHINE_ID = 'm_agqv2gsjiybrpuen46a2rpxohe';

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

/** GitHub head SHA lookup must never invent a commit or fall back to a
 * stale cached SHA. Auth is OPTIONAL (a Worker Secret); non-transient
 * HTTP 403/429/401 are never hot-retried. 5xx/network failures get
 * short, bounded retries within the same scheduled run.
 *
 * Both fetch and sleep are injectable to test the actual retry logic.
 */
export async function fetchExpectedSha(
  env,
  { fetchImpl = fetch, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {},
) {
  const repo = env.GITHUB_REPO || 'HelloMrDuan/kidsCoding';
  const branch = env.GITHUB_BRANCH || 'main';
  // Reject invalid path input before making any request to GitHub.
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) ||
      !/^[A-Za-z0-9_./-]+$/.test(branch) || branch.includes('..')) {
    throw new Error('invalid GitHub repo or branch configuration');
  }
  const url = `https://api.github.com/repos/${repo}/branches/${encodeURIComponent(branch)}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'instabox-watchdog-cf',
    ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    let retry = false;
    let error = null;
    try {
      const response = await fetchImpl(url, {
        headers,
        signal: AbortSignal.timeout(12_000),
        cache: 'no-store',
      });
      if (!response.ok) {
        const remaining = response.headers?.get('x-ratelimit-remaining') || '';
        const reset = response.headers?.get('x-ratelimit-reset') || '';
        const retryAfter = response.headers?.get('retry-after') || '';
        const rateLimited = response.status === 429 ||
          (response.status === 403 && (remaining === '0' || retryAfter));
        const safeDetail = rateLimited
          ? `GitHub rate limit HTTP ${response.status}, remaining=${remaining || 'unknown'}, reset_epoch=${reset || 'unknown'}`
          : `GitHub branch lookup HTTP ${response.status}`;
        error = new Error(safeDetail);
        // Respect documented GitHub rate-limiting rules: do NOT
        // retry 403/429 in this run or impersonate success.
        retry = !rateLimited && (response.status === 408 || response.status >= 500);
      } else {
        let data;
        try {
          data = await response.json();
        } catch {
          throw new Error('GitHub branch returned invalid JSON');
        }
        const sha = data && data.commit && data.commit.sha;
        if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/.test(sha)) {
          throw new Error('GitHub branch returned invalid 40-character SHA');
        }
        return sha;
      }
    } catch (cause) {
      error = cause;
      // Fetch DNS/timeout/connection errors are transient. Malformed
      // GitHub responses are not. Never include token values in logs.
      retry = !(cause.message || '').startsWith('GitHub branch returned');
    }
    if (!retry || attempt === 3) {
      throw new Error(error?.message || 'GitHub branch lookup failed');
    }
    await sleep(attempt === 1 ? 500 : 1_500);
  }
  throw new Error('GitHub branch lookup failed');
}

async function runOnce(env, trigger) {
  const apiKey = env.INSTABOX_API_KEY || '';
  const api = apiKey
    ? createApi({ apiKey, baseUrl: env.INSTABOX_API_URL || undefined })
    : null;
  const record = await runWatchdog({
    api,
    store: kvStore(env.WATCHDOG_KV),
    fetchExpectedSha: () => fetchExpectedSha(env),
    now: () => Date.now(),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    log: (event, detail) =>
      console.log(JSON.stringify({ event, detail, trigger })),
    config: {
      machineId: env.MACHINE_ID || DEFAULT_MACHINE_ID,
      hold: env.WATCHDOG_HOLD === 'true',
      checkTianji: env.CHECK_TIANJI !== 'false',
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
    !['OK', 'STOPPED_MANUAL', 'HELD', 'IN_TRANSITION', 'LOCKED', 'COOLDOWN_WAIT'].includes(record.verdict)
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
        status || { service: 'instabox-watchdog-cf', note: 'no runs recorded yet' },
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
      return new Response('instabox-watchdog-cf: see /status', {
        headers: { 'content-type': 'text/plain' },
      });
    }
    return new Response('not found', { status: 404 });
  },
};
