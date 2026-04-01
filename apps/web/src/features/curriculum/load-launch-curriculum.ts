import { mergePublishedLessons } from '@/features/admin/launch-curriculum-records'
import { createLaunchCurriculumRepository } from '@/features/admin/launch-curriculum-repository'
import type { LaunchCurriculum } from '@/features/domain/types'
import { hasServiceRoleEnv } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSeedLaunchCurriculum } from './seed-launch-curriculum'

export async function loadLaunchCurriculum(): Promise<LaunchCurriculum> {
  const seed = createSeedLaunchCurriculum()

  if (!hasServiceRoleEnv()) {
    return seed
  }

  try {
    const repository = createLaunchCurriculumRepository(createAdminClient())
    const publicationRows = await repository.loadPublishedLessons()

    return {
      ...seed,
      lessons: mergePublishedLessons(seed.lessons, publicationRows),
    }
  } catch {
    return seed
  }
}
