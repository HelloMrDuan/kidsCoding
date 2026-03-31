import type { LaunchLessonDefinition } from '@/features/domain/types'
import type { GuestProgress } from '@/features/progress/local-progress'
import { normalizeProjectSnapshots } from '@/features/progress/project-snapshot'

type CompleteLaunchLessonInput = {
  lesson: LaunchLessonDefinition
  lessons: LaunchLessonDefinition[]
  progress: GuestProgress
  reward: {
    stars: number
    badgeIds: string[]
    cardIds: string[]
  }
  blocks: Array<{ type: string }>
  updatedAt: string
}

export function completeLaunchLesson({
  lesson,
  lessons,
  progress,
  reward,
  blocks,
  updatedAt,
}: CompleteLaunchLessonInput): GuestProgress {
  const lessonIndex = lessons.findIndex((item) => item.id === lesson.id)
  const nextLessonId = lessons[lessonIndex + 1]?.id ?? lesson.id

  return {
    ...progress,
    completedLessonIds: [...new Set([...progress.completedLessonIds, lesson.id])],
    currentLessonId: nextLessonId,
    stars: progress.stars + reward.stars,
    badgeIds: [...new Set([...progress.badgeIds, ...reward.badgeIds])],
    cardIds: [...new Set([...progress.cardIds, ...reward.cardIds])],
    completedProjectIds: [
      ...new Set([...progress.completedProjectIds, lesson.id]),
    ],
    projectSnapshots: normalizeProjectSnapshots([
      ...progress.projectSnapshots,
      {
        lessonId: lesson.id,
        updatedAt,
        blocks,
      },
    ]),
  }
}
