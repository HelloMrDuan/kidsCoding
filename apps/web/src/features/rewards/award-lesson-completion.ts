type AwardLessonCompletionInput = {
  lessonId: string
  rewardCardId: string
  isFirstProject: boolean
  streakDays: number
}

export function awardLessonCompletion({
  lessonId,
  rewardCardId,
  isFirstProject,
  streakDays,
}: AwardLessonCompletionInput) {
  const badgeIds = [`lesson-${lessonId}`]
  const cardIds = [rewardCardId]

  if (isFirstProject) {
    badgeIds.push('first-project')
    cardIds.push('growth-first-project')
  }

  if (streakDays >= 3) {
    cardIds.push('growth-three-day-streak')
  }

  return {
    stars: 3,
    badgeIds: [...new Set(badgeIds)],
    cardIds: [...new Set(cardIds)],
  }
}
