import { NextResponse } from 'next/server'

import { assertAdminUser } from '@/features/admin/admin-auth'
import { generateLaunchCurriculumSkeleton } from '@/features/admin/ai/generate-launch-curriculum-skeleton'
import { createLaunchCurriculumRepository } from '@/features/admin/launch-curriculum-repository'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasAiEnv, hasServiceRoleEnv, hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST() {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv() || !hasAiEnv()) {
    return NextResponse.json({ error: 'ai-unavailable' }, { status: 503 })
  }

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()

  assertAdminUser(data.user)

  const repository = createLaunchCurriculumRepository(createAdminClient())
  const skeletons = await generateLaunchCurriculumSkeleton()

  await Promise.all(
    skeletons.map((skeleton) => repository.upsertCurriculumSkeleton(skeleton)),
  )

  return NextResponse.json({
    ok: true,
    skeletonCount: skeletons.length,
  })
}
