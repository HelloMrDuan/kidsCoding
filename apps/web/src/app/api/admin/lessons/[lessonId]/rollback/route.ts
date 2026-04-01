import { NextResponse } from 'next/server'

import { assertAdminUser } from '@/features/admin/admin-auth'
import { createLaunchCurriculumRepository } from '@/features/admin/launch-curriculum-repository'
import { rollbackLaunchLessonPublication } from '@/features/admin/lesson-actions'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasServiceRoleEnv, hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(
  _: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return NextResponse.json({ error: 'supabase-unavailable' }, { status: 503 })
  }

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  const user = assertAdminUser(data.user)
  const { lessonId } = await context.params

  await rollbackLaunchLessonPublication({
    lessonId,
    actorUserId: user.id,
    repository: createLaunchCurriculumRepository(createAdminClient()),
  })

  return NextResponse.json({ ok: true })
}
