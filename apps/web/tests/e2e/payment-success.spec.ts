import { expect, test } from '@playwright/test'

test.describe('purchase success polling', () => {
  test('polls until the order is paid and unlocked', async ({ page }) => {
    let callCount = 0
    const seenOrderUrls: string[] = []

    page.on('request', (request) => {
      if (request.url().includes('/api/payments/orders/')) {
        seenOrderUrls.push(request.url())
      }
    })

    await page.route('**/api/payments/orders/**', async (route) => {
      callCount += 1

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          callCount >= 3
            ? {
                orderId: 'order-paid',
                status: 'paid',
                unlocked: true,
              }
            : {
                orderId: 'order-paid',
                status: 'pending',
                unlocked: false,
              },
        ),
      })
    })

    await page.goto('/parent/purchase/success?order=order-paid')

    await expect(page.getByText('正在确认支付')).toBeVisible()
    await expect
      .poll(() => seenOrderUrls.length, { timeout: 15_000 })
      .toBeGreaterThan(0)
    await expect.poll(() => callCount, { timeout: 15_000 }).toBeGreaterThan(1)
    await expect(page.getByText('高阶创作已解锁')).toBeVisible({ timeout: 15_000 })
  })

  test('stays pending when paid is reported but unlocked is false', async ({
    page,
  }) => {
    let callCount = 0

    page.on('request', (request) => {
      if (request.url().includes('/api/payments/orders/')) {
        callCount += 1
      }
    })

    await page.route('**/api/payments/orders/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orderId: 'order-paid-locked',
          status: 'paid',
          unlocked: false,
        }),
      })
    })

    await page.goto('/parent/purchase/success?order=order-paid-locked')

    await expect(page.getByText('正在确认支付')).toBeVisible()
    // Give the polling a moment to fire multiple times.
    await expect.poll(() => callCount, { timeout: 10_000 }).toBeGreaterThan(1)
    await expect(page.getByText('高阶创作已解锁')).toHaveCount(0)
  })

  test('shows the failure state when the order is failed', async ({ page }) => {
    await page.route('**/api/payments/orders/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orderId: 'order-failed',
          status: 'failed',
          unlocked: false,
        }),
      })
    })

    await page.goto('/parent/purchase/success?order=order-failed')

    await expect(page.getByText('这次支付没有完成')).toBeVisible()
    await expect(page.getByText('正在确认支付')).toHaveCount(0)
  })

  test('shows the expired state when the order is expired', async ({ page }) => {
    await page.route('**/api/payments/orders/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orderId: 'order-expired',
          status: 'expired',
          unlocked: false,
        }),
      })
    })

    await page.goto('/parent/purchase/success?order=order-expired')

    await expect(page.getByText('支付二维码已失效')).toBeVisible()
    await expect(page.getByText('正在确认支付')).toHaveCount(0)
  })

  test('keeps polling when the order stays pending', async ({ page }) => {
    let callCount = 0

    page.on('request', (request) => {
      if (request.url().includes('/api/payments/orders/')) {
        callCount += 1
      }
    })

    await page.route('**/api/payments/orders/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orderId: 'order-stuck',
          status: 'pending',
          unlocked: false,
        }),
      })
    })

    await page.goto('/parent/purchase/success?order=order-stuck')

    await expect(page.getByText('正在确认支付')).toBeVisible()
    await expect.poll(() => callCount, { timeout: 10_000 }).toBeGreaterThan(1)
    await expect(page.getByText('高阶创作已解锁')).toHaveCount(0)
  })
})
