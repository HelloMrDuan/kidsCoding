import { NextResponse } from 'next/server'

import { hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// CLOUD-105: guardian consent records for children's private works.
// The account holder (guardian) grants consent for cloud drafts; the
// scope is fixed server-side, never caller-supplied. Consent is recorded,
// never a gate on saves or binding, so existing users keep working.
export const runtime = 'nodejs'
const HEADERS = { 'Cache-Control': 'private, no-store' }
const SCOPE = 'cloud-drafts'

export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: 'cloud-sync-not-configured' }, { status: 503, headers: HEADERS })
  const client = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'authentication-required' }, { status: 401, headers: HEADERS })
  const { data, error } = await client.from('guardian_consents')
    .select('scope,granted_at')
    .eq('user_id', user.id).eq('scope', SCOPE).maybeSingle()
  if (error) return NextResponse.json({ error: 'cloud-draft-storage-unavailable' }, { status: 503, headers: HEADERS })
  if (!data) return NextResponse.json({ granted: false, grantedAt: null }, { headers: HEADERS })
  return NextResponse.json({ granted: true, grantedAt: data.granted_at }, { headers: HEADERS })
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: 'cloud-sync-not-configured' }, { status: 503, headers: HEADERS })
  // Same-origin, authenticated mutation. No anonymous consent or user-supplied user ids.
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'cross-site-request' }, { status: 403, headers: HEADERS })
  }
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'cross-origin-request' }, { status: 403, headers: HEADERS })
  }
  const client = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'authentication-required' }, { status: 401, headers: HEADERS })
  const grantedAt = new Date().toISOString()
  const { error } = await client.from('guardian_consents').upsert({
    user_id: user.id,
    scope: SCOPE,
    granted_at: grantedAt,
  }, { onConflict: 'user_id,scope' })
  if (error) return NextResponse.json({ error: 'cloud-draft-storage-unavailable' }, { status: 503, headers: HEADERS })
  return NextResponse.json({ granted: true, grantedAt }, { headers: HEADERS })
}
