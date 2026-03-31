import { describe, expect, it } from 'vitest'

import { mergeGuestSnapshot } from './merge-guest-snapshot'

describe('mergeGuestSnapshot', () => {
  it('maps guest progress into profile, progress, badges, cards, and projects', () => {
    const result = mergeGuestSnapshot({
      snapshot: {
        onboarding: { ageBand: 'age_6_8', recommendedLevel: 'starter' },
        progress: {
          completedLessonIds: [
            'trial-01-move-character',
            'trial-01-move-character',
          ],
          currentLessonId: 'trial-03-scene-story',
          stars: 6,
          badgeIds: ['first-project'],
          cardIds: ['growth-first-project'],
          streakDays: 2,
          completedProjectIds: ['trial-03-scene-story'],
          projectSnapshots: [
            {
              lessonId: 'trial-03-scene-story',
              updatedAt: '2026-03-31T10:00:00.000Z',
              blocks: [],
            },
          ],
        },
      },
    })

    expect(result.childProfile).toEqual({
      ageBand: 'age_6_8',
      recommendedStartLevel: 'starter',
    })
    expect(result.progressRecords).toEqual([
      { lessonId: 'trial-01-move-character', status: 'completed', stars: 6 },
    ])
    expect(result.badgeRecords).toEqual([{ badgeType: 'first-project' }])
    expect(result.cardRecords).toEqual([
      {
        cardDefinitionId: 'growth-first-project',
        sourceType: 'guest_merge',
      },
    ])
    expect(result.projectSnapshots).toEqual([
      {
        lessonId: 'trial-03-scene-story',
        updatedAt: '2026-03-31T10:00:00.000Z',
        blocks: [],
      },
    ])
  })
})
