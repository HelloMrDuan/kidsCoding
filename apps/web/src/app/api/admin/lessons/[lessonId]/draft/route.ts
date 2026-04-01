import { NextResponse } from 'next/server'

import { assertAdminUser } from '@/features/admin/admin-auth'
import { createLaunchCurriculumRepository } from '@/features/admin/launch-curriculum-repository'
import { saveLaunchLessonDraft } from '@/features/admin/lesson-actions'
import type { EditableLaunchLesson } from '@/features/domain/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasServiceRoleEnv, hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return NextResponse.json({ error: 'supabase-unavailable' }, { status: 503 })
  }

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  const user = assertAdminUser(data.user)
  const { lessonId } = await context.params
  const body = (await request.json()) as { lesson: EditableLaunchLesson }

  if (body.lesson.id !== lessonId) {
    return NextResponse.json({ error: 'lesson-id-mismatch' }, { status: 409 })
  }

  const result = await saveLaunchLessonDraft({
    actorUserId: user.id,
    lesson: body.lesson,
    repository: createLaunchCurriculumRepository(createAdminClient()),
  })

  return NextResponse.json(result, { status: result.ok ? 200 : 422 })
}
