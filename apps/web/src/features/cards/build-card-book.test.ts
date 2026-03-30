import { describe, expect, it } from 'vitest'

import { cardDefinitions } from '@/content/cards/card-definitions'

import { buildCardBook } from './build-card-book'

describe('buildCardBook', () => {
  it('groups cards by category and marks earned cards', () => {
    const result = buildCardBook(cardDefinitions, ['theme-scout-cat'])

    expect(result[0].category).toBe('theme')
    expect(result[0].cards[0].isEarned).toBe(true)
  })
})
