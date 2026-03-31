import { expect, test } from '@playwright/test'

test('trial learner is locked on lesson four before purchase', async ({
  page,
}) => {
  await page.goto('/learn/lesson/course-04-two-characters')

  await expect(
    page.getByRole('link', { name: '去解锁整套课程' }),
  ).toHaveAttribute('href', '/parent/purchase')
})
