import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { hasSupabaseEnv } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const payload = await request.json()
  const cookieStore = await cookies()
  const existingGuestId = cookieStore.get('kc_guest_id')?.value
  const guestId = existingGuestId ?? crypto.randomUUID()

  if (hasSupabaseEnv()) {
    await createAdminClient().from('guest_snapshots').upsert({
      guest_id: guestId,
      onboarding: payload.onboarding,
      progress: payload.progress,
    })
  }

  const response = NextResponse.json({
    guestId,
    synced: hasSupabaseEnv(),
  })

  if (!existingGuestId) {
    response.cookies.set('kc_guest_id', guestId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  return response
}
