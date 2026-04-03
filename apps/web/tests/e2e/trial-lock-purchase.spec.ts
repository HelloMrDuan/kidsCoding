import { expect, test } from '@playwright/test'

test('graduation project shows the upgrade invitation after lesson twelve', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'guest-progress',
      JSON.stringify({
        completedLessonIds: ['lesson-01-forest-hello', 'lesson-12-graduation-show'],
        currentLessonId: 'lesson-12-graduation-show',
        stars: 36,
        badgeIds: ['lesson-lesson-12-graduation-show'],
        cardIds: ['commemorative-foundation-graduate'],
        streakDays: 5,
        completedProjectIds: ['lesson-12-graduation-show'],
        projectSnapshots: [
          {
            lessonId: 'lesson-12-graduation-show',
            updatedAt: '2026-03-31T10:00:00.000Z',
            blocks: [],
          },
        ],
      }),
    )
  })

  await page.goto('/project/lesson-12-graduation-show/complete')

  await expect(page.getByText('启蒙毕业', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('link', { name: '查看高阶创作路线' }),
  ).toHaveAttribute('href', '/parent/purchase')
})
