import { expect, test } from '@playwright/test'

import {
  GUEST_PROGRESS_FIXTURE,
  seedGuestProgress,
} from './_fixtures/progress'

test.describe('cards growth gallery', () => {
  test('shows the growth gallery heading, star count and card states', async ({
    page,
  }) => {
    await seedGuestProgress(page, GUEST_PROGRESS_FIXTURE)
    await page.goto('/cards')

    await expect(page.getByTestId('cards-heading')).toBeVisible()
    await expect(page.getByTestId('cards-star-count')).toContainText('3')
    await expect(page.getByTestId('cards-badge-count')).toContainText('2')
    await expect(page.getByTestId('cards-collected-count')).toContainText('2')

    const earnedCard = page.getByTestId('collection-card-theme-forest-fox')
    await expect(earnedCard).toHaveAttribute('data-earned', 'true')

    const lockedCard = page.getByTestId('collection-card-theme-forest-rabbit')
    await expect(lockedCard).toHaveAttribute('data-earned', 'false')
  })

  test('filters cards by rarity', async ({ page }) => {
    await seedGuestProgress(page, GUEST_PROGRESS_FIXTURE)
    await page.goto('/cards')

    await page.getByTestId('cards-rarity-filter-common').click()

    const commonCards = page.locator('[data-testid^="collection-card-"]')
    const count = await commonCards.count()
    expect(count).toBeGreaterThan(0)
    await expect(commonCards.first()).toBeVisible()
  })
})
