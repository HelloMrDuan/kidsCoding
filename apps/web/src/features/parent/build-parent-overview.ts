export function buildParentOverview({
  profile,
  progressRecords,
  cardRecords,
  badgeRecords,
  projectSnapshots,
  hasLaunchPack,
}: {
  profile: { display_name: string; recommended_start_level: string }
  progressRecords: Array<{ lesson_id: string; status: string; stars?: number }>
  cardRecords: Array<{ card_definition_id: string }>
  badgeRecords: Array<{ badge_type: string }>
  projectSnapshots: Array<{ lesson_id: string; updated_at: string }>
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

  return {
    childName: profile.display_name,
    recommendedStartLevel: profile.recommended_start_level,
    completedLessonCount,
    earnedStarCount,
    earnedCardCount: cardRecords.length,
    earnedBadgeCount: badgeRecords.length,
    recentProjectCount: projectSnapshots.length,
    hasLaunchPack,
    nextAction: hasLaunchPack
      ? '继续正式课程第 4 课，开始双角色动画故事。'
      : hasFinishedTrial
        ? '孩子已经完成试听，可以购买整套课程继续学习。'
        : '先完成第 3 节试听课，做出第一个完整小故事。',
  }
}
