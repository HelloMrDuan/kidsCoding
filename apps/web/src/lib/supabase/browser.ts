import { createBrowserClient } from '@supabase/ssr'

import { getRequiredEnv } from '@/lib/env'

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  )
}
