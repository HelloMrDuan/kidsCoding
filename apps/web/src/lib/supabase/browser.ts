import { createBrowserClient } from '@supabase/ssr'

// Use direct process.env member access (not the dynamic getRequiredEnv helper)
// so Next.js inlines the NEXT_PUBLIC_* values into the client bundle at build
// time. Dynamic access like process.env[name] is not inlined and resolves to
// undefined in production builds, which would break the browser Supabase client.
//
// Environment handling:
// - When real Supabase env vars are present, use them (production + dev with Supabase).
// - In explicit test mode (NEXT_PUBLIC_SUPABASE_TEST_MODE=true), fall back to the
//   current origin so Playwright route mocks can intercept GoTrue requests without
//   a real Supabase instance. This flag is only for E2E; never set it in production.
// - In any other environment (production/dev without Supabase env), throw a clear
//   configuration error instead of silently falling back, so misconfigurations are
//   surfaced at the call site rather than manifesting as opaque fetch failures.

export type BrowserSupabaseConfig = {
  supabaseUrl: string
  supabaseKey: string
}

class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SupabaseConfigError'
  }
}

export function resolveBrowserSupabaseConfig(
  env?: {
    NEXT_PUBLIC_SUPABASE_URL?: string
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string
    NEXT_PUBLIC_SUPABASE_TEST_MODE?: string
    NODE_ENV?: string
  },
  windowOrigin?: string,
): BrowserSupabaseConfig {
  // Read NEXT_PUBLIC_* values directly from process.env when no explicit env
  // is provided, so Next.js can inline them into the client bundle at build
  // time. (Dynamic access like process.env[name] or via an alias variable is
  // NOT inlined and resolves to undefined in production builds, which would
  // break the browser Supabase client.)
  //
  // When an explicit env is passed (unit tests), use it exclusively and do
  // NOT fall back to process.env — otherwise a developer's .env.local would
  // leak into tests and mask the very misconfiguration paths the tests
  // assert against.
  const useProcessEnv = env === undefined
  const url = (
    (useProcessEnv ? process.env.NEXT_PUBLIC_SUPABASE_URL : env!.NEXT_PUBLIC_SUPABASE_URL) ?? ''
  ).trim()
  const key = (
    (useProcessEnv
      ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      : env!.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ?? ''
  ).trim()
  const testMode = (
    (useProcessEnv
      ? process.env.NEXT_PUBLIC_SUPABASE_TEST_MODE
      : env!.NEXT_PUBLIC_SUPABASE_TEST_MODE) ?? ''
  ).trim() === 'true'

  if (url && key) {
    return { supabaseUrl: url, supabaseKey: key }
  }

  if (testMode) {
    // Prefer the explicitly passed origin (used by tests / SSR), then fall
    // back to the browser window origin, then to a localhost default. In a
    // browser context window.location.origin is always available; in SSR the
    // caller must supply windowOrigin or we use localhost for relative URLs.
    const fallbackUrl =
      windowOrigin ??
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

    // Use a stable placeholder key in test mode; route mocks replace real requests.
    return { supabaseUrl: fallbackUrl, supabaseKey: 'test-mode-placeholder' }
  }

  const missing = [
    !url && 'NEXT_PUBLIC_SUPABASE_URL',
    !key && 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ]
    .filter(Boolean)
    .join(' and ')

  throw new SupabaseConfigError(
    `supabase-config-missing: ${missing} is required when NEXT_PUBLIC_SUPABASE_TEST_MODE is not "true". Set the Supabase env vars or enable test mode for E2E.`,
  )
}

export function createBrowserSupabaseClient() {
  const config = resolveBrowserSupabaseConfig()

  return createBrowserClient(config.supabaseUrl, config.supabaseKey)
}
