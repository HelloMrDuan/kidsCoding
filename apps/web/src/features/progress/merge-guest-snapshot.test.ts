import { describe, expect, it } from 'vitest'

import { mergeGuestSnapshot } from './merge-guest-snapshot'

describe('mergeGuestSnapshot', () => {
  it('maps guest progress into profile, progress, badges, and cards', () => {
    const result = mergeGuestSnapshot({
      snapshot: {
        onboarding: { ageBand: 'age_9_12', recommendedLevel: 'foundation' },
        progress: {
          completedLessonIds: ['move-character', 'move-character'],
          stars: 3,
          badgeIds: ['lesson-move-character', 'first-project'],
          cardIds: ['theme-scout-cat', 'growth-first-project'],
          completedProjectIds: ['move-character'],
        },
      },
    })

    expect(result.childProfile).toEqual({
      ageBand: 'age_9_12',
      recommendedStartLevel: 'foundation',
    })
    expect(result.progressRecords).toEqual([
      { lessonId: 'move-character', status: 'completed', stars: 3 },
    ])
    expect(result.badgeRecords).toEqual([
      { badgeType: 'lesson-move-character' },
      { badgeType: 'first-project' },
    ])
    expect(result.cardRecords).toEqual([
      { cardDefinitionId: 'theme-scout-cat', sourceType: 'guest_merge' },
      {
        cardDefinitionId: 'growth-first-project',
        sourceType: 'guest_merge',
      },
    ])
  })
})
