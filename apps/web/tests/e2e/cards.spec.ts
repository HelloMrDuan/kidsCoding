import { expect, test } from '@playwright/test'

test('card book opens and shows the card heading', async ({ page }) => {
  await page.goto('/cards')

  await expect(page.getByTestId('cards-heading')).toBeVisible()
})
