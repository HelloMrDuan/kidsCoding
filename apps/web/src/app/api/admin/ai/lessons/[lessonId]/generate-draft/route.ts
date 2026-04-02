import { NextResponse } from 'next/server'

import { launchLessons } from '@/content/curriculum/launch-lessons'
import { assertAdminUser } from '@/features/admin/admin-auth'
import { resolveAiRequestConfig } from '@/features/admin/ai/ai-runtime-settings'
import { generateLaunchLessonDraft } from '@/features/admin/ai/generate-launch-lesson-draft'
import { createLaunchCurriculumRepository } from '@/features/admin/launch-curriculum-repository'
import { saveLaunchLessonDraft } from '@/features/admin/lesson-actions'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasAiEnv, hasServiceRoleEnv, hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(
  _: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv() || !hasAiEnv()) {
    return NextResponse.json({ error: 'ai-unavailable' }, { status: 503 })
  }

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  const user = assertAdminUser(data.user)
  const { lessonId } = await context.params

  const repository = createLaunchCurriculumRepository(createAdminClient())
  const aiConfig = await resolveAiRequestConfig({
    env: process.env,
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    repository,
  })
  const [lesson, skeleton, skeletons] = await Promise.all([
    repository.loadAdminLesson(lessonId),
    repository.loadCurriculumSkeleton(lessonId),
    repository.loadCurriculumSkeletons(),
  ])

  if (!skeleton) {
    return NextResponse.json(
      {
        ok: false,
        error: 'curriculum-skeleton-required',
        issues: [],
      },
      { status: 409 },
    )
  }

  const lessonIndex = launchLessons.findIndex((item) => item.id === lessonId)
  const previousSkeleton =
    lessonIndex > 0
      ? skeletons.find((item) => item.lessonId === launchLessons[lessonIndex - 1]?.id)
      : undefined
  const nextSkeleton =
    lessonIndex >= 0
      ? skeletons.find((item) => item.lessonId === launchLessons[lessonIndex + 1]?.id)
      : undefined

  const draftLesson = await generateLaunchLessonDraft({
    aiConfig: {
      baseUrl: aiConfig.baseUrl,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
    },
    lesson,
    skeleton,
    previousSkeleton,
    nextSkeleton,
  })

  const saveResult = await saveLaunchLessonDraft({
    actorUserId: user.id,
    lesson: draftLesson,
    repository,
  })

  return NextResponse.json({
    ...saveResult,
    lesson: draftLesson,
  })
}
