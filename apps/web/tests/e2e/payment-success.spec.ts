import { expect, test } from '@playwright/test'

test('purchase success page polls until the order is unlocked', async ({ page }) => {
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
        callCount >= 2
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
    .poll(() => seenOrderUrls.length, { timeout: 10_000 })
    .toBeGreaterThan(0)
  await expect.poll(() => callCount, { timeout: 10_000 }).toBeGreaterThan(1)
  await expect(page.getByText('正式课程已解锁')).toBeVisible()
})
