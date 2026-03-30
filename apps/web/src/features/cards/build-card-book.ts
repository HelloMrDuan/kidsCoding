import type { CardCategory, CardDefinition } from '@/features/domain/types'

const categoryOrder: CardCategory[] = ['theme', 'growth', 'commemorative']

export function buildCardBook(
  definitions: CardDefinition[],
  earnedCardIds: string[],
) {
  return categoryOrder.map((category) => ({
    category,
    cards: definitions
      .filter((card) => card.category === category)
      .map((card) => ({
        ...card,
        isEarned: earnedCardIds.includes(card.id),
      })),
  }))
}
