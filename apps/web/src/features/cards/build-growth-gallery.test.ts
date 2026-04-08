import { describe, expect, it } from 'vitest'

import { cardDefinitions } from '@/content/cards/card-definitions'
import { badgeDefinitions } from '@/content/rewards/badge-definitions'

import { buildGrowthGallery } from './build-growth-gallery'

describe('buildGrowthGallery', () => {
  it('builds summary stats, badge gallery, and card groups from progress', () => {
    const result = buildGrowthGallery({
      cardDefinitions,
      badgeDefinitions,
      stars: 18,
      earnedBadgeIds: [
        'lesson-lesson-03-forest-story',
        'lesson-lesson-06-meadow-story',
      ],
      earnedCardIds: ['growth-first-project', 'theme-meadow-story'],
    })

    expect(result.summary).toEqual({
      stars: 18,
      badgeCount: 2,
      cardCount: 2,
    })
    expect(
      result.badges.find((badge) => badge.id === 'lesson-lesson-03-forest-story')
        ?.isEarned,
    ).toBe(true)
    expect(
      result.badges.find((badge) => badge.id === 'lesson-lesson-09-garden-story')
        ?.isEarned,
    ).toBe(false)
    expect(
      result.cardGroups.find((group) => group.category === 'growth')?.cards[0],
    ).toHaveProperty('isEarned')
  })
})
