import { expect, test } from '@playwright/test'

import { FIRST_LAUNCH_LESSON_ID } from './_fixtures/curriculum'

test('admin can save the default ai provider and model', async ({ page }) => {
  await page.route('**/api/admin/ai/settings', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      defaultProviderSlot: 'secondary',
      defaultModel: 'qwen2.5-coder:7b',
    })

    await route.fulfill({
      json: { ok: true },
    })
  })

  await page.goto('/admin')

  // Verify the admin dashboard renders with at least one lesson link
  await expect(
    page.getByTestId(`admin-lesson-link-${FIRST_LAUNCH_LESSON_ID}`),
  ).toBeVisible()

  await page.getByTestId('admin-ai-provider-select').selectOption('secondary')
  await page.getByTestId('admin-ai-model-select').selectOption('qwen2.5-coder:7b')
  await page.getByTestId('admin-ai-settings-save').click()

  await expect(page.getByTestId('admin-ai-settings-message')).toContainText('保存')
})
