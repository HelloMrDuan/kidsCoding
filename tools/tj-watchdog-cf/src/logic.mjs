// Pure decision logic for the InstaBox watchdog.
// Ported unchanged from tools/instabox-watchdog/logic.mjs (GitHub
// version) so both implementations share one lifecycle contract; the
// only additions are the REST error shape (see api.mjs: errors arrive
// with .code / .status / .retryable already normalized) and
// isRunSuccess() at the bottom.
// No I/O in this module: every function is unit-testable without an API key.
//
// Machine states (official SDK reference, @insforge/instabox-sdk):
//   creating starting running stopping stopped suspending suspended
//   resuming deleting deleted error
// A user-visible "paused" machine is `suspended`.

export const TRANSITIONAL_STATES = new Set([
  'creating',
  'starting',
  'stopping',
  'suspending',
  'resuming',
]);

/** What should the watchdog do for a given machine state? */
export function decideForState(state) {
  switch (state) {
    case 'running':
      return 'deep-check';
    case 'suspended':
      return 'resume'; // idle pause: the watchdog's one recovery job
    case 'stopped':
      // A stopped machine was shut down deliberately (owner stop or
      // archive). Never auto-resume it: that would fight maintenance.
      return 'observe';
    case 'error':
    case 'deleting':
    case 'deleted':
      return 'blocked';
    default:
      if (TRANSITIONAL_STATES.has(state)) return 'wait';
      return 'blocked'; // unknown state: never guess, surface it
  }
}

/**
 * Classify an SDK / API error into a handling class.
 * Uses the documented error surface: error.name (class), error.code,
 * error.status, error.retryable.
 */
export function classifyError(err) {
  if (!err) return 'unknown';
  const name = err.name || '';
  const code = err.code || '';
  const status = typeof err.status === 'number' ? err.status : 0;
  if (name === 'InstaboxAuthError' || status === 401 || code === 'missing_api_key') {
    return 'auth';
  }
  if (status === 403 || code === 'insufficient_scope' || code === 'template_not_allowed') {
    return 'auth'; // a permissions problem retries will not fix
  }
  if (code === 'operation_conflict') return 'conflict';
  if (code === 'no_capacity') return 'capacity';
  if (name === 'InstaboxQuotaError' || status === 429 || code === 'quota_exceeded') {
    return 'capacity'; // account limit: same bounded-retry handling
  }
  if (code === 'not_found') return 'not-found';
  if (err.retryable === true) return 'transient';
  if (
    name === 'InstaboxTimeoutError' ||
    code === 'request_timeout' ||
    code === 'operation_timeout' ||
    code === 'network_error' ||
    status >= 500
  ) {
    return 'transient';
  }
  return 'unknown';
}

/** Should a failed resume be retried (bounded, with backoff)? */
export function resumeRetryable(errorClass) {
  return errorClass === 'capacity' || errorClass === 'transient';
}

// Tianji-specific sealed API/Web container and health checks.
export function tjTagToken(image) {
  const tag = String(image || '').split(':').pop() || '';
  const match = /(?:sealed-|static-)([0-9a-f]{7,40})$/.exec(tag);
  return match ? match[1] : null;
}

export function parseTianjiDeepCheck(stdout) {
  const get = (key) => {
    const match = new RegExp(`^${key}=(.*)$`, 'm').exec(stdout || '');
    return match ? match[1].trim() : '';
  };
  const healthText = get('TJ_HEALTH');
  let health;
  try { health = JSON.parse(healthText); } catch { health = null; }
  const tjOk = Boolean(health && health.status === 'ok');
  const containers = get('CONTAINERS').split(';').filter(Boolean).map((row) => {
    const [name = '', image = '', status = ''] = row.split('|');
    return { name, image, status };
  });
  const isApi = (c) => /(?:^|\/)tianji-api:/.test(c.image) || /tianji[-_].*api/.test(c.name);
  const isWeb = (c) => /(?:^|\/)tianji-web:/.test(c.image) || /tianji[-_].*web/.test(c.name);
  const api = containers.find(isApi);
  const web = containers.find(isWeb);
  const up = (container) => Boolean(container && /^Up(?:\s|$)/i.test(container.status));
  const apiTag = api ? tjTagToken(api.image) : null;
  const webTag = web ? tjTagToken(web.image) : null;
  return {
    tjOk,
    containers,
    tjApiUp: up(api),
    tjWebUp: up(web),
    tjTagsConsistent: Boolean(apiTag && webTag && apiTag === webTag),
    tjApiTag: apiTag,
    tjWebTag: webTag,
  };
}

export function assessTianjiDeep(deep) {
  const problems = [];
  if (!deep.tjOk) problems.push('tianji 8080/health not ok');
  if (!deep.tjApiUp) problems.push('tianji api container absent or not Up');
  if (!deep.tjWebUp) problems.push('tianji web container absent or not Up');
  if (!deep.tjTagsConsistent) problems.push('tianji API/Web image version missing or mismatched');
  return { ...deep, healthy: problems.length === 0, problems };
}

/**
 * Final verdict for a run. FAIL-CLOSED: whenever an error class is
 * present, the verdict is a failing BLOCKED_* one — a monitoring
 * failure must never exit 0 or masquerade as a transitional state.
 * IN_TRANSITION / OK are reachable only with no recorded error.
 */
export function verdictFor({ state, action, deep, errorClass }) {
  if (errorClass === 'auth') return 'BLOCKED_AUTH';
  if (errorClass === 'not-found') return 'BLOCKED_NOT_FOUND';
  if (errorClass) {
    if (action === 'resume-failed') {
      return errorClass === 'capacity' ? 'BLOCKED_CAPACITY' : 'BLOCKED_RESUME';
    }
    return errorClass === 'capacity' ? 'BLOCKED_CAPACITY' : 'BLOCKED_MONITOR';
  }
  if (action === 'blocked') return 'BLOCKED_STATE';
  if (action === 'observe') return 'STOPPED_MANUAL';
  if (action === 'held') return 'HELD';
  if (deep) return deep.healthy ? 'OK' : 'APP_FAULT';
  if (action === 'wait') return 'IN_TRANSITION';
  if (state === 'running') return 'OK';
  return 'IN_TRANSITION';
}

export const FAILING_VERDICTS = new Set([
  'BLOCKED_AUTH',
  'BLOCKED_NOT_FOUND',
  'BLOCKED_STATE',
  'BLOCKED_CAPACITY',
  'BLOCKED_RESUME',
  'BLOCKED_MONITOR',
  'APP_FAULT',
  'BLOCKED_CONFIG',
]);

/**
 * Did the watchdog itself complete its job this run? Any non-failing
 * verdict (OK, STOPPED_MANUAL, HELD, IN_TRANSITION) means the monitor
 * ran correctly and reported honestly; every BLOCKED_* / APP_FAULT
 * verdict means it did not. The Cloudflare status record uses this to
 * maintain lastSuccessAt, which the Muse backup layer reads to judge
 * whether the primary monitor is alive.
 */
export function isRunSuccess(verdict) {
  return !FAILING_VERDICTS.has(verdict);
}
