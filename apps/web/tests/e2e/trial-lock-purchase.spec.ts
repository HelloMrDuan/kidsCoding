import { expect, test } from '@playwright/test'

import {
  GUEST_PROGRESS_STORAGE_KEY,
  seedGuestProgress,
} from './_fixtures/progress'

const COURSE_LESSON_FIXTURE_PAYLOAD = {
  lessons: [
    {
      id: 'course-fixture-advanced-story',
      title: '高阶夹具：动画续写',
      goal: '验证 course 阶段课程的访问控制。',
      recommendedLevel: 'foundation',
      steps: [
        {
          id: 'step-1',
          title: '认识高阶任务',
          instruction: '先把开始积木放上去。',
          voiceover: '高阶任务先放开始积木',
          allowedBlocks: ['when_start'],
          requiredBlockTypes: ['when_start'],
        },
      ],
      rewardCardId: 'theme-forest-fox',
      phase: 'course',
      mode: 'guided',
      sortOrder: 100,
      hintLayers: [],
      parentAdvice: '',
    },
  ],
  templates: [],
}

test.describe('trial and course access control', () => {
  test('trial lesson is accessible without entitlement', async ({ page }) => {
    await page.route('**/api/course-access', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ hasLaunchPack: false }),
      })
    })

    await page.goto('/learn/lesson/lesson-01-forest-hello')

    await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()
    await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  })

  test('course lesson without entitlement shows the lock and no blockly workspace', async ({
    page,
  }) => {
    await page.route('**/api/course-access', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ hasLaunchPack: false }),
      })
    })
    await page.route('**/api/curriculum/launch', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(COURSE_LESSON_FIXTURE_PAYLOAD),
      })
    })

    await page.goto('/learn/lesson/course-fixture-advanced-story')

    await expect(page.getByRole('link', { name: '看看高阶升级内容' })).toBeVisible()
    await expect(page.getByTestId('lesson-workbench-shell')).toHaveCount(0)
    await expect(page.getByTestId('lesson-blockly-workspace')).toHaveCount(0)
  })

  test('course lesson with entitlement allows access', async ({ page }) => {
    await page.route('**/api/course-access', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ hasLaunchPack: true }),
      })
    })
    await page.route('**/api/curriculum/launch', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(COURSE_LESSON_FIXTURE_PAYLOAD),
      })
    })

    await page.goto('/learn/lesson/course-fixture-advanced-story')

    await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()
    await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
    await expect(
      page.getByRole('link', { name: '看看高阶升级内容' }),
    ).toHaveCount(0)
  })

  test('course lesson stays locked when the entitlement API fails', async ({
    page,
  }) => {
    await page.route('**/api/course-access', async (route) => {
      await route.fulfill({ status: 500 })
    })
    await page.route('**/api/curriculum/launch', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(COURSE_LESSON_FIXTURE_PAYLOAD),
      })
    })

    await page.goto('/learn/lesson/course-fixture-advanced-story')

    await expect(page.getByRole('link', { name: '看看高阶升级内容' })).toBeVisible()
    await expect(page.getByTestId('lesson-blockly-workspace')).toHaveCount(0)
  })
})

test('graduation project shows the upgrade invitation after lesson twelve', async ({
  page,
}) => {
  await seedGuestProgress(page, {
    completedLessonIds: [
      'lesson-01-forest-hello',
      'lesson-12-graduation-show',
    ],
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
  })

  await page.goto('/project/lesson-12-graduation-show/complete')

  await expect(page.getByText('启蒙毕业作品', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('link', { name: '看看高阶创作阶段' }),
  ).toHaveAttribute('href', '/parent/purchase')
})

// Guards against accidental regression of the storage key constant.
test('storage key constant stays the product key kc-progress', () => {
  expect(GUEST_PROGRESS_STORAGE_KEY).toBe('kc-progress')
})
