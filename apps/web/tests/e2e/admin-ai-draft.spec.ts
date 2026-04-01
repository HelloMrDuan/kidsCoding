import { expect, test } from '@playwright/test'

test('admin can trigger AI draft generation from the lesson editor', async ({
  page,
}) => {
  await page.route('**/api/admin/ai/curriculum-skeleton', async (route) => {
    await route.fulfill({
      json: { ok: true, skeletonCount: 15 },
    })
  })
  await page.route(
    '**/api/admin/ai/lessons/trial-01-move-character/generate-draft',
    async (route) => {
      await route.fulfill({
        json: {
          ok: true,
          issues: [],
          lesson: {
            id: 'trial-01-move-character',
            title: 'AI 新标题',
            goal: 'AI 新目标',
            steps: [
              {
                id: 'step-1',
                title: 'AI 步骤标题',
                instruction: 'AI 步骤说明',
                allowedBlocks: ['when_start', 'move_right'],
                requiredBlockTypes: ['when_start'],
              },
              {
                id: 'step-2',
                title: 'AI 第二步标题',
                instruction: 'AI 第二步说明',
                allowedBlocks: ['when_start', 'move_right'],
                requiredBlockTypes: ['when_start', 'move_right'],
              },
            ],
            hintLayers: [
              { id: 'repeat-goal', mode: 'repeat_goal', copy: 'AI 提示 1' },
              { id: 'show-block', mode: 'show_block', copy: 'AI 提示 2' },
              {
                id: 'offer-remedial',
                mode: 'offer_remedial',
                copy: 'AI 提示 3',
                remedialLessonId: 'remedial-click-trigger',
              },
            ],
            phase: 'trial',
            mode: 'guided',
            sortOrder: 1,
          },
        },
      })
    },
  )

  await page.goto('/admin/lessons/trial-01-move-character')
  await page.getByTestId('admin-generate-skeleton').click()
  await expect(page.getByText('整套课程骨架已生成')).toBeVisible()
  await page.getByTestId('admin-generate-draft').click()
  await expect(page.getByTestId('admin-lesson-title')).toHaveValue('AI 新标题')
  await expect(page.getByText('AI 草稿已生成，请审核后再发布')).toBeVisible()
})
