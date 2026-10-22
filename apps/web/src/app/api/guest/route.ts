import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  GUEST_PAYLOAD_MAX_BYTES,
  parseGuestSnapshotPayload,
} from '@/features/progress/guest-snapshot-payload'
import { hasSupabaseEnv } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * TQ-013: guest progress upload. Size-capped (413), whitelisted and type-checked
 * (400). Only ids are stored — no assessment answers, no names, no free text.
 * `guest_snapshots` is service-role only (RLS on, no anon/authenticated policy),
 * so this route must keep using the admin client.
 */
export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get('content-length') ?? '0')
  if (declaredLength > GUEST_PAYLOAD_MAX_BYTES) {
    return NextResponse.json({ error: 'payload-too-large' }, { status: 413 })
  }

  const raw = await request.text()
  if (new TextEncoder().encode(raw).byteLength > GUEST_PAYLOAD_MAX_BYTES) {
    return NextResponse.json({ error: 'payload-too-large' }, { status: 413 })
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 })
  }

  const parsed = parseGuestSnapshotPayload(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const cookieStore = await cookies()
  const existingGuestId = cookieStore.get('kc_guest_id')?.value
  const guestId = existingGuestId ?? crypto.randomUUID()
  let synced = false

  if (hasSupabaseEnv()) {
    const { error } = await createAdminClient()
      .from('guest_snapshots')
      .upsert({
        guest_id: guestId,
        onboarding: parsed.payload.onboarding,
        progress: parsed.payload.progress,
        // Retention clock (see migration 202610220011): refreshed on every sync.
        updated_at: new Date().toISOString(),
      })
    if (error) {
      return NextResponse.json({ error: 'sync-failed' }, { status: 502 })
    }
    synced = true
  }

  const response = NextResponse.json({ guestId, synced })

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
