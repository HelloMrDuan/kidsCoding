import { describe, expect, it } from 'vitest'

import { awardLessonCompletion } from './award-lesson-completion'

describe('awardLessonCompletion', () => {
  it('awards stars, a badge, and a card', () => {
    const result = awardLessonCompletion({
      lessonId: 'move-character',
      rewardCardId: 'theme-scout-cat',
      isFirstProject: true,
      streakDays: 1,
    })

    expect(result.stars).toBe(3)
    expect(result.badgeIds).toContain('lesson-move-character')
    expect(result.badgeIds).toContain('first-project')
    expect(result.cardIds).toContain('theme-scout-cat')
    expect(result.cardIds).toContain('growth-first-project')
  })

  it('adds the streak card after three learning days', () => {
    const result = awardLessonCompletion({
      lessonId: 'move-character',
      rewardCardId: 'theme-scout-cat',
      isFirstProject: false,
      streakDays: 3,
    })

    expect(result.cardIds).toContain('growth-three-day-streak')
  })
})
