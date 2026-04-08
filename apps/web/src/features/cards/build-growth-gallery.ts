import type { BadgeDefinition } from '@/content/rewards/badge-definitions'
import type { CardDefinition } from '@/features/domain/types'

import { buildCardBook } from './build-card-book'

export function buildGrowthGallery({
  cardDefinitions,
  badgeDefinitions,
  stars,
  earnedBadgeIds,
  earnedCardIds,
}: {
  cardDefinitions: CardDefinition[]
  badgeDefinitions: BadgeDefinition[]
  stars: number
  earnedBadgeIds: string[]
  earnedCardIds: string[]
}) {
  return {
    summary: {
      stars,
      badgeCount: earnedBadgeIds.length,
      cardCount: earnedCardIds.length,
    },
    badges: badgeDefinitions.map((badge) => ({
      ...badge,
      isEarned: earnedBadgeIds.includes(badge.id),
    })),
    cardGroups: buildCardBook(cardDefinitions, earnedCardIds),
  }
}
