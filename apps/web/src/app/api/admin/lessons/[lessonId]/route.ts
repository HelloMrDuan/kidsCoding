import { NextResponse } from 'next/server'

import { assertAdminUser } from '@/features/admin/admin-auth'
import { hasUnpublishedLessonChanges } from '@/features/admin/launch-curriculum-records'
import { createLaunchCurriculumRepository } from '@/features/admin/launch-curriculum-repository'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasServiceRoleEnv, hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  _: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return NextResponse.json({ error: 'supabase-unavailable' }, { status: 503 })
  }

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()

  assertAdminUser(data.user)

  const { lessonId } = await context.params
  const repository = createLaunchCurriculumRepository(createAdminClient())
  const lesson = await repository.loadAdminLesson(lessonId)
  const [draft, publication] = await Promise.all([
    repository.loadDraftLesson(lessonId),
    repository.loadPublishedLesson(lessonId),
  ])

  return NextResponse.json({
    lesson,
    draftUpdatedAt: draft?.updated_at ?? null,
    publishedAt: publication?.published_at ?? null,
    hasUnpublishedChanges: hasUnpublishedLessonChanges(draft, publication),
  })
}
