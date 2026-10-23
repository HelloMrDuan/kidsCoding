// InstaBox official REST API client for Cloudflare Workers.
//
// Uses only fetch (native in Workers and in Node 18+ for tests), so no
// SDK compatibility risk. The endpoints and shapes mirror the official
// SDK (@insforge/instabox-sdk): GET /v1/machines/<id>,
// POST /v1/machines/<id>/resume, GET /v1/operations/<id>,
// POST /v1/machines/<id>/exec. Auth is the X-API-Key header; the key
// is passed in by the caller (a Worker Secret in production) and is
// never logged or persisted by this module.

export class ApiError extends Error {
  constructor(message, { status = 0, code = '', retryable = false } = {}) {
    super(message);
    this.name = 'InstaBoxApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

const DEFAULT_BASE = 'https://api.instabox.sh';

export function createApi({ apiKey, baseUrl = DEFAULT_BASE, fetchImpl } = {}) {
  const doFetch = fetchImpl || ((...args) => fetch(...args));
  const base = String(baseUrl || DEFAULT_BASE).replace(/\/$/, '');

  async function request(method, path, body, timeoutMs = 30_000) {
    let res;
    try {
      res = await doFetch(base + path, {
        method,
        headers: {
          'X-API-Key': apiKey,
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      // Network failure, DNS, abort/timeout: a transient monitoring
      // error. classifyError() maps code network_error -> transient.
      throw new ApiError(`network error calling ${method} ${path}: ${err && err.message ? err.message : err}`, {
        status: 0,
        code: 'network_error',
        retryable: true,
      });
    }
    const text = await res.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    if (!res.ok) {
      const errBody = (parsed && parsed.error) || parsed || {};
      throw new ApiError(
        errBody.message || `${method} ${path} returned HTTP ${res.status}`,
        {
          status: res.status,
          code: errBody.code || '',
          retryable: errBody.retryable === true,
        },
      );
    }
    return parsed;
  }

  return {
    /** Read one machine. Never wakes a suspended machine. */
    getMachine(id) {
      return request('GET', `/v1/machines/${encodeURIComponent(id)}`);
    },
    /** Resume a suspended machine. Returns an operation object. */
    resumeMachine(id) {
      return request('POST', `/v1/machines/${encodeURIComponent(id)}/resume`);
    },
    /** Read one long-running operation (for resume polling). */
    getOperation(id) {
      return request('GET', `/v1/operations/${encodeURIComponent(id)}`);
    },
    /** Run a command inside a running machine. Returns {stdout, stderr, exitCode, ...}. */
    exec(id, cmd, timeoutSeconds = 60) {
      return request(
        'POST',
        `/v1/machines/${encodeURIComponent(id)}/exec`,
        { cmd },
        (timeoutSeconds + 30) * 1000,
      );
    },
  };
}
