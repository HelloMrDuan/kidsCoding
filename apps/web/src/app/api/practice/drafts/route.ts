import { NextResponse } from 'next/server'

import { hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { validatePythonDraftPayload } from '@/features/progress/cloud-python-drafts'

export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: 'cloud-sync-not-configured' }, { status: 503 })
  const client = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'authentication-required' }, { status: 401 })
  const { data, error } = await client.from('python_practice_drafts')
    .select('lesson_id,source,updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'cloud-draft-storage-unavailable' }, { status: 503 })
  const drafts = (data ?? []).map(row => ({
    lessonId: row.lesson_id, source: row.source, updatedAt: row.updated_at,
  }))
  return NextResponse.json({ drafts }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function PUT(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: 'cloud-sync-not-configured' }, { status: 503 })
  // Same-origin, authenticated mutation. No anonymous sync or user-supplied user ids.
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'cross-site-request' }, { status: 403 })
  }
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'cross-origin-request' }, { status: 403 })
  }
  const client = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'authentication-required' }, { status: 401 })
  const declaredLength = Number(request.headers.get('content-length') ?? '0')
  if (declaredLength > 12000) return NextResponse.json({ error: 'request-too-large' }, { status: 413 })
  let body: unknown
  try {
    const text = await request.text()
    if (text.length > 12000) return NextResponse.json({ error: 'request-too-large' }, { status: 413 })
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 })
  }
  const draft = validatePythonDraftPayload(body)
  if (!draft) return NextResponse.json({ error: 'invalid-draft' }, { status: 400 })
  const updatedAt = new Date().toISOString()
  const { error } = await client.from('python_practice_drafts').upsert({
    user_id: user.id,
    lesson_id: draft.lessonId,
    source: draft.source,
    updated_at: updatedAt,
  }, { onConflict: 'user_id,lesson_id' })
  if (error) return NextResponse.json({ error: 'cloud-draft-storage-unavailable' }, { status: 503 })
  return NextResponse.json({
    lessonId: draft.lessonId, updatedAt, synced: true,
    // A browser pass flag is intentionally NOT accepted or persisted.
    verifiedGrade: false,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}

// CLOUD-105: delete the account's own cloud draft for one lesson. The
// database already permits owner deletes (practice_drafts_delete_own);
// this route was the missing half. Same-origin, authenticated mutation.
// The lesson comes from the query string and the user filter always comes
// from the session, never from caller-supplied ids; without a lesson id
// nothing is deleted.
export async function DELETE(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: 'cloud-sync-not-configured' }, { status: 503 })
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'cross-site-request' }, { status: 403 })
  }
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'cross-origin-request' }, { status: 403 })
  }
  const client = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'authentication-required' }, { status: 401 })
  const lessonId = new URL(request.url).searchParams.get('lessonId')
  if (!lessonId) return NextResponse.json({ error: 'invalid-draft' }, { status: 400 })
  const { error } = await client.from('python_practice_drafts').delete()
    .eq('user_id', user.id).eq('lesson_id', lessonId)
  if (error) return NextResponse.json({ error: 'cloud-draft-storage-unavailable' }, { status: 503 })
  return NextResponse.json({ deleted: true, lessonId }, { headers: { 'Cache-Control': 'private, no-store' } })
}
