type ParentOverviewInput = {
  profile: { display_name: string; recommended_start_level: string }
  progressRecords: Array<{ lesson_id: string; status: string; stars?: number }>
  cardRecords: Array<{ card_definition_id: string }>
  badgeRecords: Array<{ badge_type: string }>
  projectSnapshots: Array<{ lesson_id: string; updated_at: string }>
  lessonCatalog: Array<{ id: string; title: string }>
  hasLaunchPack: boolean
}

function describeProjectResult(lessonId: string) {
  if (lessonId === 'lesson-03-forest-story') {
    return '小狐狸已经会走上舞台，还会打招呼了。'
  }

  if (lessonId === 'lesson-06-meadow-story') {
    return '这次，小动物从森林走到草地，完成了一次小旅行。'
  }

  if (lessonId === 'lesson-09-garden-story') {
    return '现在，你的故事已经会回应你的点击了。'
  }

  if (lessonId === 'lesson-12-graduation-show') {
    return '这次，两个动物朋友一起完成了一个完整故事。'
  }

  if (lessonId === 'lesson-02-forest-greeting') {
    return '现在，角色已经会开口打招呼了。'
  }

  if (lessonId === 'lesson-01-forest-hello') {
    return '现在，角色已经会走上舞台了。'
  }

  if (lessonId === 'lesson-04-meadow-scene') {
    return '现在，故事已经会换到新场景了。'
  }

  if (lessonId === 'lesson-05-meadow-order') {
    return '现在，故事已经有先后顺序了。'
  }

  if (lessonId === 'lesson-07-garden-click') {
    return '现在，角色已经会回应点击了。'
  }

  if (lessonId === 'lesson-08-garden-dialogue') {
    return '现在，角色已经会先动再说了。'
  }

  if (lessonId === 'lesson-10-second-friend') {
    return '现在，第二位朋友已经上场了。'
  }

  if (lessonId === 'lesson-11-duo-rehearsal') {
    return '现在，两个朋友已经开始配合了。'
  }

  return '孩子刚完成了一次新的故事练习。'
}

export function buildParentOverview({
  profile,
  progressRecords,
  cardRecords,
  badgeRecords,
  projectSnapshots,
  lessonCatalog,
  hasLaunchPack,
}: ParentOverviewInput) {
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
      lessonSummary: describeProjectResult(snapshot.lesson_id),
      href: `/parent/projects/${snapshot.lesson_id}`,
      updatedAt: snapshot.updated_at,
    }))

  const nextAction = hasLaunchPack
    ? '孩子已经进入高阶创作阶段，可以继续挑战更长的故事结构和更复杂的互动表演。'
    : completedLessonCount >= 12
      ? '孩子已经完成启蒙毕业作品，现在已经能做出两个角色一起完成的完整故事。可以先回看作品，再看看高阶创作阶段是否适合继续升级。'
      : completedLessonCount >= 9
        ? '孩子已经做出了会回应点击的互动故事。接下来会进入第四单元，开始完成启蒙毕业作品。'
        : completedLessonCount >= 6
          ? '孩子已经做出了第二个完整作品。接下来会进入第三单元，开始让故事回应点击。'
          : completedLessonCount >= 3
            ? '孩子已经做出了第一个完整作品。接下来会进入第二单元，开始让故事从一个画面走到另一个画面。'
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
