import { cookies } from 'next/headers'
import { hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function currentLessonDraftOwner(): Promise<string | null> {
  try {
    if (hasSupabaseEnv()) {
      const client = await createServerSupabaseClient()
      const { data, error } = await client.auth.getUser()
      if (data.user) return `user:${data.user.id}`
      if (error && error.name !== 'AuthSessionMissingError') return null
    }
    const guestId = (await cookies()).get('kc_guest_id')?.value
    return guestId ? `guest:${guestId}` : 'guest'
  } catch {
    return null
  }
}
