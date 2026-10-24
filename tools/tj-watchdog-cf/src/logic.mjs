// Pure decision logic for the tj-watchdog (Tianji machine tj-core-01).
//
// This worker watches ONE machine only: tj-core-01, which will host the
// Tianji platform exclusively. It never checks KidsCoding — Kids lives
// on platforms-core-01 and is covered by the separate instabox-watchdog.
//
// Health modes (config HEALTH_MODE):
//   'lifecycle' — initial phase. Tianji is NOT deployed yet, so the
//                 worker checks only the machine lifecycle. A running
//                 machine yields LIFECYCLE_OK, which is deliberately
//                 NOT the verdict 'OK': no application health has been
//                 evaluated, and the status record never sets a
//                 healthy timestamp in this mode.
//   'tianji'    — after the Tianji migration completes. Running also
//                 requires the Tianji deep check (8080/health, api+web
//                 containers up, image version consistency, deployed
//                 record match) to pass before verdict 'OK'.
//
// No I/O in this module: every function is unit-testable offline.

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
      return 'running';
    case 'suspended':
      return 'resume'; // idle pause: the watchdog's one recovery job
    case 'stopped':
      // Owner-stopped on purpose. Never auto-resume.
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

/** Classify an API error into a handling class (same contract as the
 *  platforms-core-01 watchdog: .code / .status / .retryable surface). */
export function classifyError(err) {
  if (!err) return 'unknown';
  const name = err.name || '';
  const code = err.code || '';
  const status = typeof err.status === 'number' ? err.status : 0;
  if (name === 'InstaboxAuthError' || status === 401 || code === 'missing_api_key') {
    return 'auth';
  }
  if (status === 403 || code === 'insufficient_scope' || code === 'template_not_allowed') {
    return 'auth';
  }
  if (code === 'operation_conflict') return 'conflict';
  if (code === 'no_capacity') return 'capacity';
  if (name === 'InstaboxQuotaError' || status === 429 || code === 'quota_exceeded') {
    return 'capacity';
  }
  if (code === 'not_found' || status === 404) return 'not-found';
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

/** Trailing version token of a tianji image tag (sealed-<sha>/static-<sha>). */
export function tjTagToken(image) {
  const tag = String(image || '').split(':').pop() || '';
  const m = /([0-9a-f]{7,40})$/.exec(tag);
  return m ? m[1] : null;
}

/**
 * Do two version tokens name the same commit? Tokens are trailing
 * hex runs (7-40 chars) taken from image tags and the deployed
 * record. The same commit legitimately appears at different lengths:
 * the deploy record stores the full 40-char SHA and the GHCR web
 * image carries it in full, while the locally built api image is
 * tagged cicd-prerelease-<8-char short SHA>. Strict string equality
 * therefore reports a permanent mismatch for one and the same
 * deployment — the 2026-10-24 APP_FAULT false positive, where state
 * was running and the app healthy yet every run alerted. Tokens
 * match when identical or when one is a prefix of the other;
 * anything else is genuine version drift and still faults.
 */
export function sameVersionToken(a, b) {
  if (!a || !b) return false;
  const x = String(a);
  const y = String(b);
  if (x.length < 7 || y.length < 7) return false;
  return x === y || x.startsWith(y) || y.startsWith(x);
}

/**
 * Parse the Tianji deep-check output printed inside the machine.
 * Expected marker lines:
 *   TJ_HEALTH=<body or CURL_FAIL>
 *   TJ_RECORD=<deployed record content or MISSING>
 *   CONTAINERS=<name|image|status;...>
 * Kids containers may appear in the raw list during a transition, but
 * they are never selected or assessed here — this worker must not
 * check KidsCoding (negative-tested).
 */
export function parseTianjiDeepCheck(stdout) {
  const get = (key) => {
    const m = new RegExp(`^${key}=(.*)$`, 'm').exec(stdout || '');
    return m ? m[1].trim() : '';
  };
  const tjHealth = get('TJ_HEALTH');
  const tjRecordRaw = get('TJ_RECORD');
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
  const tjOk = tjHealth.includes('"status":"ok"') || tjHealth.includes('"status": "ok"');
  const tjContainers = containers.filter(
    (c) => c.name.includes('tianji') || c.image.includes('tianji'),
  );
  const tjApi =
    tjContainers.find((c) => c.image.includes('tianji-api')) ||
    tjContainers.find((c) => c.name.includes('api'));
  const tjWeb =
    tjContainers.find((c) => c.image.includes('tianji-web')) ||
    tjContainers.find((c) => c.name.includes('web'));
  const tjApiToken = tjApi ? tjTagToken(tjApi.image) : null;
  const tjWebToken = tjWeb ? tjTagToken(tjWeb.image) : null;
  const recordToken =
    tjRecordRaw && tjRecordRaw !== 'MISSING' ? tjTagToken(tjRecordRaw) || null : null;
  return {
    tjOk,
    containers,
    tjApiUp: Boolean(tjApi && /up/i.test(tjApi.status)),
    tjWebUp: Boolean(tjWeb && /up/i.test(tjWeb.status)),
    tjApiToken,
    tjWebToken,
    tjTagsConsistent: Boolean(
      tjApiToken && tjWebToken && sameVersionToken(tjApiToken, tjWebToken),
    ),
    recordPresent: Boolean(tjRecordRaw && tjRecordRaw !== 'MISSING'),
    recordToken,
  };
}

/**
 * Tianji-only health assessment. FAIL-CLOSED: a missing deployed
 * record is a problem (the version-consistency check cannot be
 * performed), never a silent skip.
 */
export function assessTianji(deep) {
  const problems = [];
  if (!deep.tjOk) problems.push('tianji health endpoint not ok');
  if (!deep.tjApiUp) problems.push('tianji api container missing or not up');
  if (!deep.tjWebUp) problems.push('tianji web container missing or not up');
  if (!deep.tjTagsConsistent) {
    problems.push('tianji api/web image version tags differ or are unparseable');
  }
  if (!deep.recordPresent || !deep.recordToken) {
    problems.push('tianji deployed record unreadable on the machine');
  } else if (deep.tjApiToken && !sameVersionToken(deep.recordToken, deep.tjApiToken)) {
    problems.push(
      `tianji deployed record ${deep.recordToken} != running api image token ${deep.tjApiToken}`,
    );
  }
  return { ...deep, healthy: problems.length === 0, problems };
}

/**
 * Final verdict for a run. FAIL-CLOSED: any error class produces a
 * BLOCKED_* verdict. LIFECYCLE_OK (lifecycle mode, machine running)
 * and RESUME_IN_PROGRESS (another actor is already resuming; this run
 * behaved correctly) are success-class for monitor liveness but are
 * NOT 'OK': only a passed Tianji deep check earns 'OK'.
 */
export function verdictFor({ state, action, deep, errorClass, healthMode }) {
  if (errorClass === 'config') return 'BLOCKED_CONFIG';
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
  if (action === 'conflict-benign') return 'RESUME_IN_PROGRESS';
  if (deep) return deep.healthy ? 'OK' : 'APP_FAULT';
  if (action === 'wait') return 'IN_TRANSITION';
  if (state === 'running') {
    return healthMode === 'tianji' ? 'BLOCKED_MONITOR' : 'LIFECYCLE_OK';
  }
  return 'IN_TRANSITION';
}

export const FAILING_VERDICTS = new Set([
  'BLOCKED_CONFIG',
  'BLOCKED_AUTH',
  'BLOCKED_NOT_FOUND',
  'BLOCKED_STATE',
  'BLOCKED_CAPACITY',
  'BLOCKED_RESUME',
  'BLOCKED_MONITOR',
  'APP_FAULT',
]);

/** Did the watchdog itself do its job this run (for lastSuccessAt)? */
export function isRunSuccess(verdict) {
  return !FAILING_VERDICTS.has(verdict);
}

// Map deployment env vars to the health mode. The production Worker
// deployed by the owner uses the TIANJI_DEPLOYED flag ("false" during
// the lifecycle phase, "true" once Tianji is deployed and healthy);
// HEALTH_MODE, when set, takes precedence for repo-managed deploys.
// Anything other than an explicit deployed signal stays 'lifecycle':
// an undeployed service must never be judged healthy.
export function healthModeFromEnv(env = {}) {
  if (env.HEALTH_MODE) return env.HEALTH_MODE === 'tianji' ? 'tianji' : 'lifecycle';
  return env.TIANJI_DEPLOYED === 'true' ? 'tianji' : 'lifecycle';
}
