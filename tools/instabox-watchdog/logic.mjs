// Pure decision logic for the InstaBox watchdog.
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
    case 'stopped':
      return 'resume';
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

/**
 * Parse the deep-check command output printed inside the machine.
 * Expected marker lines:
 *   KIDS_HEALTH=<body or CURL_FAIL>
 *   TJ_HEALTH=<body or CURL_FAIL>
 *   KIDS_SHA=<40-hex or MISSING>
 *   CONTAINERS=<name|image|status;...>
 */
export function parseDeepCheck(stdout) {
  const get = (key) => {
    const m = new RegExp(`^${key}=(.*)$`, 'm').exec(stdout || '');
    return m ? m[1].trim() : '';
  };
  const kidsHealth = get('KIDS_HEALTH');
  const tjHealth = get('TJ_HEALTH');
  const kidsSha = get('KIDS_SHA');
  const containersRaw = get('CONTAINERS');
  const containers = containersRaw
    ? containersRaw
        .split(';')
        .filter(Boolean)
        .map((row) => {
          const [name, image, status] = row.split('|');
          return { name: name || '', image: image || '', status: status || '' };
        })
    : [];
  const kidsOk = kidsHealth.includes('"status":"ok"') || kidsHealth.includes('"status": "ok"');
  const tjOk = tjHealth.includes('"status":"ok"') || tjHealth.includes('"status": "ok"');
  const kidsContainer = containers.find((c) => c.name.includes('kidscoding'));
  const tjContainers = containers.filter((c) => c.name.includes('tianji'));
  return {
    kidsOk,
    tjOk,
    kidsSha: /^[0-9a-f]{40}$/.test(kidsSha) ? kidsSha : null,
    containers,
    kidsContainerUp: Boolean(kidsContainer && /up/i.test(kidsContainer.status)),
    tjContainersUp:
      tjContainers.length > 0 && tjContainers.every((c) => /up/i.test(c.status)),
    healthy: kidsOk && tjOk,
  };
}

/** Final verdict for a run, from the pieces the monitor collected. */
export function verdictFor({ state, action, deep, errorClass }) {
  if (errorClass === 'auth') return 'BLOCKED_AUTH';
  if (errorClass === 'not-found') return 'BLOCKED_NOT_FOUND';
  if (action === 'blocked') return 'BLOCKED_STATE';
  if (action === 'resume-failed') {
    return errorClass === 'capacity' ? 'BLOCKED_CAPACITY' : 'BLOCKED_RESUME';
  }
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
  'APP_FAULT',
]);
