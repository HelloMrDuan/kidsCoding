import { expect, test } from '@playwright/test'

import { seedGuestProgress } from './_fixtures/progress'

test.describe('reward idempotency', () => {
  test('replaying a completed lesson does not add stars again', async ({
    page,
  }) => {
    // Start with lesson-01 already completed once and 3 stars earned.
    await seedGuestProgress(page, {
      completedLessonIds: ['lesson-01-forest-hello'],
      currentLessonId: 'lesson-02-forest-greeting',
      stars: 3,
      badgeIds: ['lesson-lesson-01-forest-hello', 'first-project'],
      cardIds: ['theme-forest-fox', 'growth-first-project'],
      streakDays: 1,
      completedProjectIds: ['lesson-01-forest-hello'],
      projectSnapshots: [
        {
          lessonId: 'lesson-01-forest-hello',
          updatedAt: '2026-03-31T10:00:00.000Z',
          blocks: [{ type: 'when_start' }, { type: 'move_right' }],
        },
      ],
    })

    await page.goto('/learn/lesson/lesson-01-forest-hello')

    // Replay all five steps of lesson-01.
    await page.getByTestId('lesson-add-when_start').click()
    await page.getByTestId('lesson-complete-step').click()
    await page.getByTestId('lesson-complete-step').click()
    await page.getByTestId('lesson-complete-step').click()
    await page.getByTestId('lesson-add-move_right').click()
    await page.getByTestId('lesson-complete-step').click()
    await page.getByTestId('lesson-complete-step').click()

    await page.waitForURL('**/project/lesson-01-forest-hello/complete')

    await expect(page.getByTestId('project-complete-heading')).toBeVisible()
    // Stars must stay at 3 after replaying the same lesson.
    await expect(page.getByText('当前累计 3 颗星星')).toBeVisible()
  })

  test('completing a different lesson after replay keeps adding stars', async ({
    page,
    }) => {
    await seedGuestProgress(page, {
      completedLessonIds: ['lesson-01-forest-hello'],
      currentLessonId: 'lesson-02-forest-greeting',
      stars: 3,
      badgeIds: ['lesson-lesson-01-forest-hello', 'first-project'],
      cardIds: ['theme-forest-fox', 'growth-first-project'],
      streakDays: 1,
      completedProjectIds: ['lesson-01-forest-hello'],
      projectSnapshots: [
        {
          lessonId: 'lesson-01-forest-hello',
          updatedAt: '2026-03-31T10:00:00.000Z',
          blocks: [{ type: 'when_start' }, { type: 'move_right' }],
        },
      ],
    })

    await page.goto('/learn/lesson/lesson-02-forest-greeting')

    // lesson-02 step 1 requires when_start + move_right.
    await page.getByTestId('lesson-add-when_start').click()
    await page.getByTestId('lesson-add-move_right').click()
    await page.getByTestId('lesson-complete-step').click()
    // Remaining steps progressively allow say_line; keep adding the required blocks.
    await page.getByTestId('lesson-add-say_line').click()
    await page.getByTestId('lesson-complete-step').click()
    await page.getByTestId('lesson-complete-step').click()
    await page.getByTestId('lesson-complete-step').click()
    await page.getByTestId('lesson-complete-step').click()

    await page.waitForURL('**/project/lesson-02-forest-greeting/complete')

    await expect(page.getByTestId('project-complete-heading')).toBeVisible()
    // Total stars should now be 6.
    await expect(page.getByText('当前累计 6 颗星星')).toBeVisible()
  })
})
