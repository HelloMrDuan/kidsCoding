import { expect, test } from '@playwright/test'

import { FIRST_LAUNCH_LESSON_ID } from './_fixtures/curriculum'

test('admin can save a draft, publish it, and roll it back', async ({
  page,
}) => {
  await page.route(
    `**/api/admin/lessons/${FIRST_LAUNCH_LESSON_ID}/draft`,
    async (route) => {
      await route.fulfill({
        json: { ok: true, issues: [] },
      })
    },
  )
  await page.route(
    `**/api/admin/lessons/${FIRST_LAUNCH_LESSON_ID}/publish`,
    async (route) => {
      await route.fulfill({
        json: { ok: true, issues: [] },
      })
    },
  )
  await page.route(
    `**/api/admin/lessons/${FIRST_LAUNCH_LESSON_ID}/rollback`,
    async (route) => {
      await route.fulfill({
        json: { ok: true },
      })
    },
  )

  await page.goto('/admin')
  await page.getByTestId(`admin-lesson-link-${FIRST_LAUNCH_LESSON_ID}`).click()
  await page.getByTestId('admin-lesson-title').fill('E2E 标题')
  await page.getByTestId('admin-save-draft').click()
  await expect(page.getByText('草稿已保存')).toBeVisible()
  await page.getByTestId('admin-publish-lesson').click()
  await expect(page.getByText('本课已发布')).toBeVisible()
  await page.getByTestId('admin-rollback-lesson').click()
  await expect(page.getByText('已回退到上一发布版')).toBeVisible()
})
