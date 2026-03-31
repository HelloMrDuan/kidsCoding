import { normalizeProjectSnapshots } from './project-snapshot'

export function mergeGuestSnapshot({
  snapshot,
}: {
  snapshot: {
    onboarding: { ageBand: string; recommendedLevel: string }
    progress: {
      completedLessonIds: string[]
      stars: number
      badgeIds: string[]
      cardIds: string[]
      completedProjectIds: string[]
      projectSnapshots?: Array<{
        lessonId: string
        updatedAt: string
        blocks: Array<{ type: string }>
      }>
    }
  }
}) {
  const completedLessons = [...new Set(snapshot.progress.completedLessonIds)]
  const badgeIds = [...new Set(snapshot.progress.badgeIds)]
  const cardIds = [...new Set(snapshot.progress.cardIds)]
  const projectSnapshots = normalizeProjectSnapshots(
    snapshot.progress.projectSnapshots ?? [],
  )

  return {
    childProfile: {
      ageBand: snapshot.onboarding.ageBand,
      recommendedStartLevel: snapshot.onboarding.recommendedLevel,
    },
    progressRecords: completedLessons.map((lessonId) => ({
      lessonId,
      status: 'completed',
      stars: snapshot.progress.stars,
    })),
    badgeRecords: badgeIds.map((badgeType) => ({ badgeType })),
    cardRecords: cardIds.map((cardDefinitionId) => ({
      cardDefinitionId,
      sourceType: 'guest_merge',
    })),
    projectSnapshots,
  }
}
