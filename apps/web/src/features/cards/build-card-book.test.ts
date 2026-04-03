import { describe, expect, it } from 'vitest'

import { cardDefinitions } from '@/content/cards/card-definitions'

import { buildCardBook } from './build-card-book'

describe('buildCardBook', () => {
  it('groups cards by category and marks earned cards', () => {
    const result = buildCardBook(cardDefinitions, ['theme-forest-fox'])
    const themeGroup = result.find((group) => group.category === 'theme')
    const earnedCard = themeGroup?.cards.find((card) => card.id === 'theme-forest-fox')

    expect(themeGroup).toBeDefined()
    expect(earnedCard?.isEarned).toBe(true)
  })
})
