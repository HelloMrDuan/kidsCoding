import { expect, test } from '@playwright/test'

test('parent overview redirects unauthenticated visitors to bind page', async ({
  page,
}) => {
  await page.goto('/parent/overview')
  await page.waitForURL('**/auth/bind')

  await expect(page).toHaveURL(/\/auth\/bind$/)
})
