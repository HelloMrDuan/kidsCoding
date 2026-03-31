import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { mergeGuestSnapshot } from '@/features/progress/merge-guest-snapshot'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const admin = createAdminClient()
  const cookieStore = await cookies()
  const guestId = cookieStore.get('kc_guest_id')?.value
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user
  const body = await request.json()

  if (!guestId || !user) {
    return NextResponse.json({ error: 'missing-session' }, { status: 400 })
  }

  const { data: guestSnapshot } = await admin
    .from('guest_snapshots')
    .select('*')
    .eq('guest_id', guestId)
    .single()

  if (!guestSnapshot) {
    return NextResponse.json(
      { error: 'missing-guest-snapshot' },
      { status: 404 },
    )
  }

  const merged = mergeGuestSnapshot({
    snapshot: {
      onboarding: guestSnapshot.onboarding,
      progress: guestSnapshot.progress,
    },
  })

  await admin.from('child_profiles').upsert({
    user_id: user.id,
    display_name: body.displayName,
    age_band: merged.childProfile.ageBand,
    recommended_start_level: merged.childProfile.recommendedStartLevel,
  })

  if (merged.progressRecords.length > 0) {
    await admin.from('progress_records').upsert(
      merged.progressRecords.map((record) => ({
        user_id: user.id,
        lesson_id: record.lessonId,
        status: record.status,
        stars: record.stars,
      })),
      {
        onConflict: 'user_id,lesson_id',
      },
    )
  }

  if (merged.badgeRecords.length > 0) {
    await admin.from('badge_records').upsert(
      merged.badgeRecords.map((record) => ({
        user_id: user.id,
        badge_type: record.badgeType,
      })),
      {
        onConflict: 'user_id,badge_type',
      },
    )
  }

  if (merged.cardRecords.length > 0) {
    await admin.from('card_records').upsert(
      merged.cardRecords.map((record) => ({
        user_id: user.id,
        card_definition_id: record.cardDefinitionId,
        source_type: record.sourceType,
      })),
      {
        onConflict: 'user_id,card_definition_id,source_type',
      },
    )
  }

  if (merged.projectSnapshots.length > 0) {
    await admin.from('project_snapshots').upsert(
      merged.projectSnapshots.map((snapshot) => ({
        owner_guest_id: guestId,
        owner_user_id: user.id,
        lesson_id: snapshot.lessonId,
        snapshot: {
          blocks: snapshot.blocks,
        },
        updated_at: snapshot.updatedAt,
      })),
      {
        onConflict: 'owner_user_id,lesson_id',
      },
    )
  }

  return NextResponse.json({ ok: true })
}
