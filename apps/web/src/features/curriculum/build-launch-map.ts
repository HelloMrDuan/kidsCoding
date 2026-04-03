import { foundationUnits } from '@/content/curriculum/foundation-units'
import { launchLessons } from '@/content/curriculum/launch-lessons'
import { remedialLessons } from '@/content/curriculum/remedial-lessons'
import type { LaunchLessonDefinition } from '@/features/domain/types'

export function buildLaunchMap(lessons: LaunchLessonDefinition[] = launchLessons) {
  const allLessons = [...lessons].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  )

  return {
    allLessons,
    trialLessons: allLessons,
    paidLessons: [],
    remedials: remedialLessons,
    foundationUnits,
  }
}
