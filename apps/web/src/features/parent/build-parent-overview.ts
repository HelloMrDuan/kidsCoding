export function buildParentOverview({
  profile,
  progressRecords,
  cardRecords,
  badgeRecords,
}: {
  profile: { display_name: string; recommended_start_level: string }
  progressRecords: Array<{ lesson_id: string; status: string; stars?: number }>
  cardRecords: Array<{ card_definition_id: string }>
  badgeRecords: Array<{ badge_type: string }>
}) {
  return {
    childName: profile.display_name,
    recommendedStartLevel: profile.recommended_start_level,
    completedLessonCount: progressRecords.filter((item) => item.status === 'completed')
      .length,
    earnedStarCount: progressRecords.reduce(
      (maxStars, item) => Math.max(maxStars, item.stars ?? 0),
      0,
    ),
    earnedCardCount: cardRecords.length,
    earnedBadgeCount: badgeRecords.length,
    nextAction: progressRecords.some((item) => item.lesson_id === 'move-character')
      ? '回到学习地图继续下一关。'
      : '先完成第一关“让角色动起来”。',
  }
}
