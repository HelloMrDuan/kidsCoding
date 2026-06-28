import { expect, test } from '@playwright/test'

test.describe('first admin bootstrap', () => {
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

  test('shows invalid token state when the bootstrap token is not accepted', async ({
    page,
  }) => {
    await page.route(
      '**/api/setup/admin/bootstrap?token=bad-token',
      async (route) => {
        await route.fulfill({
          json: { status: 'invalid_token' },
        })
      },
    )

    await page.goto('/setup/admin?token=bad-token')
    await expect(page.getByText('开通链接无效或不可用')).toBeVisible()
    // Confirm button must not be rendered for invalid tokens
    await expect(page.getByTestId('setup-admin-confirm')).toHaveCount(0)
  })

  test('shows closed state when the first admin has already been bootstrapped', async ({
    page,
  }) => {
    await page.route(
      '**/api/setup/admin/bootstrap?token=setup-demo-token',
      async (route) => {
        await route.fulfill({
          json: { status: 'closed' },
        })
      },
    )

    await page.goto('/setup/admin?token=setup-demo-token')
    await expect(page.getByText('首个管理员已完成开通')).toBeVisible()
    await expect(page.getByTestId('setup-admin-confirm')).toHaveCount(0)
  })
})
