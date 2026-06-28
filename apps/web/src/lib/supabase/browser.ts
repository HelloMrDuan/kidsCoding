import { createBrowserClient } from '@supabase/ssr'

// Use direct process.env member access (not the dynamic getRequiredEnv helper)
// so Next.js inlines the NEXT_PUBLIC_* values into the client bundle at build
// time. Dynamic access like process.env[name] is not inlined and resolves to
// undefined in production builds, which would break the browser Supabase client.
//
// When the env vars are absent (e.g. E2E runs without Supabase), fall back to
// the current origin so the GoTrue client issues relative requests that
// Playwright route mocks can intercept.
export function createBrowserSupabaseClient() {
  const fallbackUrl =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'anon-key-placeholder',
  )
}
