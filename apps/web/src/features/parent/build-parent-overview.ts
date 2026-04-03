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

  const nextAction = hasLaunchPack
    ? '孩子已经进入高阶创作阶段，可以继续挑战更长的故事结构和更复杂的互动演出。'
    : completedLessonCount >= 12
      ? '孩子已经完成启蒙毕业作品，现在可以看看是否适合升级到更复杂的高阶创作路线。'
      : completedLessonCount >= 9
        ? '继续完成最后一个单元，目标是做出双角色互动的启蒙毕业作品。'
        : completedLessonCount >= 3
          ? '孩子已经完成第一个完整小故事，接下来会进入第二单元，开始学会场景切换和故事顺序。'
        : '沿着当前单元继续往前走，每 2 到 3 节就会完成一个新的小故事作品。'

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
    nextAction,
  }
}
