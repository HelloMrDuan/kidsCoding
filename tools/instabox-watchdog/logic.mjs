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

const SHA40 = /^[0-9a-f]{40}$/;

/** Extract the commit SHA from an image reference's tag, if it is one. */
export function shaFromImageTag(image) {
  const tag = String(image || '').split(':').pop() || '';
  return SHA40.test(tag) ? tag : null;
}

/** Trailing version token of a tianji image tag (sealed-<sha>/static-<sha>). */
export function tjTagToken(image) {
  const tag = String(image || '').split(':').pop() || '';
  const m = /([0-9a-f]{7,40})$/.exec(tag);
  return m ? m[1] : null;
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
  const kidsShaRaw = get('KIDS_SHA');
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
  // Tianji is a sealed PAIR: the api and web containers are identified
  // by their image repositories (falling back to container names) and
  // each must exist, be up, and carry the same version token. Finding
  // just one of them is never healthy.
  const tjApi =
    tjContainers.find((c) => c.image.includes('tianji-api')) ||
    tjContainers.find((c) => c.name.includes('api'));
  const tjWeb =
    tjContainers.find((c) => c.image.includes('tianji-web')) ||
    tjContainers.find((c) => c.name.includes('web'));
  const tjApiToken = tjApi ? tjTagToken(tjApi.image) : null;
  const tjWebToken = tjWeb ? tjTagToken(tjWeb.image) : null;
  return {
    kidsOk,
    tjOk,
    kidsSha: SHA40.test(kidsShaRaw) ? kidsShaRaw : null,
    containers,
    kidsContainerFound: Boolean(kidsContainer),
    kidsContainerUp: Boolean(kidsContainer && /up/i.test(kidsContainer.status)),
    kidsImageSha: kidsContainer ? shaFromImageTag(kidsContainer.image) : null,
    tjContainersUp:
      tjContainers.length > 0 && tjContainers.every((c) => /up/i.test(c.status)),
    tjApiUp: Boolean(tjApi && /up/i.test(tjApi.status)),
    tjWebUp: Boolean(tjWeb && /up/i.test(tjWeb.status)),
    tjTagsConsistent: Boolean(
      tjApiToken && tjWebToken && tjApiToken === tjWebToken,
    ),
    healthy: kidsOk && tjOk,
  };
}

/**
 * Full health assessment: endpoints AND container states AND the
 * deployed-SHA comparison. `expectedKidsSha` is the GitHub head of the
 * deployment branch (tq-011), resolved by the workflow at run time;
 * when it is provided, a mismatch is an application fault, never a
 * silent pass.
 */
export function assessDeep(deep, expectedKidsSha, opts = {}) {
  // checkTianji: the GitHub watchdog's entry point passes false since
  // the 2026-10-23 migration (Tianji moved to tj-core-01 with its own
  // tj-watchdog; platforms-core-01 is Kids-only). The pure-logic
  // default stays true so the dual-site contract remains testable and
  // re-enabling is a one-line entry-point change.
  const checkTianji = opts.checkTianji !== false;
  const problems = [];
  if (!deep.kidsOk) problems.push('kids health endpoint not ok');
  if (checkTianji && !deep.tjOk) problems.push('tianji health endpoint not ok');
  if (!deep.kidsContainerUp) problems.push('kidscoding container not up');
  // No silent skip: if the running Kids image's tag cannot be parsed
  // as a full 40-char commit SHA, the three-way SHA comparison cannot
  // be performed — that is a fault, not a pass.
  if (deep.kidsContainerFound && !deep.kidsImageSha) {
    problems.push('running kids image tag does not carry a full 40-char SHA');
  }
  if (checkTianji && !deep.tjApiUp) problems.push('tianji api container missing or not up');
  if (checkTianji && !deep.tjWebUp) problems.push('tianji web container missing or not up');
  if (checkTianji && !deep.tjTagsConsistent) {
    problems.push('tianji api/web image version tags differ or are unparseable');
  }
  if (deep.kidsImageSha && deep.kidsSha && deep.kidsImageSha !== deep.kidsSha) {
    problems.push(
      `running kids image ${deep.kidsImageSha} != recorded deployed SHA ${deep.kidsSha}`,
    );
  }
  if (expectedKidsSha) {
    if (!deep.kidsSha) {
      problems.push('kids deployed SHA unreadable on the machine');
    } else if (deep.kidsSha !== expectedKidsSha) {
      problems.push(
        `kids SHA mismatch: deployed ${deep.kidsSha} != expected GitHub head ${expectedKidsSha}`,
      );
    }
    if (deep.kidsImageSha && deep.kidsImageSha !== expectedKidsSha) {
      problems.push(
        `running kids image ${deep.kidsImageSha} != expected GitHub head ${expectedKidsSha}`,
      );
    }
  }
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
]);
