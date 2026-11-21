import { hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function currentCreateOwner(): Promise<string | null> {
  if (!hasSupabaseEnv()) return 'guest'
  try {
    const client = await createServerSupabaseClient()
    const { data, error } = await client.auth.getUser()
    if (data.user) return `user:${data.user.id}`
    if (error && error.name !== 'AuthSessionMissingError') return null
    return 'guest'
  } catch {
    return null
  }
}
