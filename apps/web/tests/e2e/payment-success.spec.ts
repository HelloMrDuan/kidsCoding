import { expect, test } from '@playwright/test'

test('purchase success page polls until the order is unlocked', async ({ page }) => {
  let callCount = 0

  await page.route('**/api/payments/orders/order-paid', async (route) => {
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
  await page.waitForTimeout(3500)
  await expect(page.getByText('正式课程已解锁')).toBeVisible()
})
