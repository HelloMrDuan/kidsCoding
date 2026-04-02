import { expect, test } from '@playwright/test'

test('setup admin page can complete the first-admin bootstrap flow', async ({
  page,
}) => {
  await page.route(
    '**/api/setup/admin/bootstrap?token=setup-demo-token',
    async (route) => {
      await route.fulfill({
        json: {
          status: 'ready',
          identityLabel: 'owner@example.com',
        },
      })
    },
  )

  await page.route('**/api/setup/admin/bootstrap', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      token: 'setup-demo-token',
    })

    await route.fulfill({
      json: { ok: true },
    })
  })

  await page.goto('/setup/admin?token=setup-demo-token')
  await expect(page.getByText('owner@example.com')).toBeVisible()
  await page.getByTestId('setup-admin-confirm').click()
  await page.waitForURL('**/admin')
})
