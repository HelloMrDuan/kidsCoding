export function buildParentOverview({
  profile,
  progressRecords,
  cardRecords,
  badgeRecords,
  projectSnapshots,
  lessonCatalog,
  hasLaunchPack,
}: {
  profile: { display_name: string; recommended_start_level: string }
  progressRecords: Array<{ lesson_id: string; status: string; stars?: number }>
  cardRecords: Array<{ card_definition_id: string }>
  badgeRecords: Array<{ badge_type: string }>
  projectSnapshots: Array<{ lesson_id: string; updated_at: string }>
  lessonCatalog: Array<{ id: string; title: string }>
  hasLaunchPack: boolean
}) {
  const completedLessonCount = progressRecords.filter(
    (item) => item.status === 'completed',
  ).length
  const earnedStarCount = progressRecords.reduce(
    (maxStars, item) => Math.max(maxStars, item.stars ?? 0),
    0,
  )
  const hasFinishedTrial = progressRecords.some(
    (item) => item.lesson_id === 'trial-03-scene-story',
  )
  const lessonTitles = new Map(
    lessonCatalog.map((lesson) => [lesson.id, lesson.title]),
  )
  const recentProjects = [...projectSnapshots]
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
    .map((snapshot) => ({
      lessonId: snapshot.lesson_id,
      lessonTitle: lessonTitles.get(snapshot.lesson_id) ?? snapshot.lesson_id,
      href: `/parent/projects/${snapshot.lesson_id}`,
      updatedAt: snapshot.updated_at,
    }))

  return {
    childName: profile.display_name,
    recommendedStartLevel: profile.recommended_start_level,
    completedLessonCount,
    earnedStarCount,
    earnedCardCount: cardRecords.length,
    earnedBadgeCount: badgeRecords.length,
    recentProjectCount: projectSnapshots.length,
    recentProjects,
    hasLaunchPack,
    nextAction: hasLaunchPack
      ? '继续正式课程第 4 课，开始双角色动画故事。'
      : hasFinishedTrial
        ? '孩子已经完成试听，可以购买整套课程继续学习。'
        : '先完成第 3 节试听课，做出第一个完整小故事。',
  }
}
