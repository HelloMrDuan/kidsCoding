import { expect, test } from '@playwright/test'
import { clickLessonControl, expectStageWalk, showLessonPane, solveMistakeStep, solvePracticeStep } from './lesson-pane-helpers'

/** UX-502: remedial learning and reward collection stay consistent —
 *  failing then returning from remedial lands back on the same lesson and
 *  program, rewards are awarded exactly once no matter how often the child
 *  clicks, and the cards shelf shows exactly what progress earned. */

test('advancing then reloading resumes the new step, not step 1', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/learn/lesson/lesson-01-forest-hello')
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15_000 })
  await clickLessonControl(page, 'lesson-complete-step')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 2 关')
  await page.reload()
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 2 关')
  const canvas = page.getByTestId('lesson-blockly-workspace').locator('svg.blocklySvg .blocklyBlockCanvas')
  await expect(canvas).toContainText('开始时')
})

test('remedial return restores the failed lesson step and program', async ({ page }) => {
  test.setTimeout(120_000)
  // Lesson 5 step 1 (not lesson 1 step 1, whose palette is when_start only):
  // move_right + switch_scene without when_start is a real wrong program.
  await page.goto('/learn/lesson/lesson-05-meadow-order')
  await clickLessonControl(page, 'lesson-add-move_right')
  await clickLessonControl(page, 'lesson-add-switch_scene')
  for (let i = 0; i < 3; i++) {
    await clickLessonControl(page, 'run-code-button')
    await expect(page.getByTestId('stage-run-reason')).toBeVisible({ timeout: 12_000 })
  }
  await expect(page.getByTestId('lesson-hint')).toHaveAttribute('data-hint-tier', '3', { timeout: 12_000 })
  await clickLessonControl(page, 'lesson-remedial-link')
  await page.waitForURL('**/learn/remedial/**')
  await page.getByRole('link', { name: '回到刚才的课程' }).click()
  await page.waitForURL('**/learn/lesson/lesson-05-meadow-order')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 1 关')
  const canvas = page.getByTestId('lesson-blockly-workspace').locator('svg.blocklySvg .blocklyBlockCanvas')
  await expect(canvas).toContainText('向右走 100 步')
  // Appending when_start last leaves it disconnected ("掉队"), so the real
  // repair is delete-and-rebuild in order, the same fix a child performs.
  await showLessonPane(page, 'code')
  for (let i = 0; i < 2; i++) {
    await canvas.locator('.blocklyDraggable').first().click()
    await clickLessonControl(page, 'lesson-delete-selected')
  }
  await expect(canvas).not.toContainText('向右走 100 步')
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'lesson-add-move_right')
  await clickLessonControl(page, 'lesson-add-switch_scene')
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15_000 })
  await expect(page.getByTestId('stage-current-scene')).toContainText('草地')
  await clickLessonControl(page, 'lesson-complete-step')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 2 关')
})

test('click farming awards nothing; one completion fills the cards shelf exactly once', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-01-forest-hello')
  for (let i = 0; i < 3; i++) await clickLessonControl(page, 'lesson-complete-step')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 1 关')
  await expect(page).toHaveURL(/learn\/lesson\/lesson-01-forest-hello/)
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'lesson-complete-step')
  await expect(page.getByTestId('lesson-feedback-card')).toContainText('请先点击舞台')
  for (let step = 0; step < 2; step++) {
    if (step === 1) await clickLessonControl(page, 'lesson-add-move_right')
    await clickLessonControl(page, 'run-code-button')
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15_000 })
    await clickLessonControl(page, 'lesson-complete-step')
  }
  await solvePracticeStep(page, { goalType: 'change-distance', guess: 'beside-friend', build: ['move_right'] })
  await expectStageWalk(page, 200)
  await clickLessonControl(page, 'lesson-complete-step')
  await solveMistakeStep(page, { expectCode: 'missing-start', answer: 'stayed', fix: ['when_start', 'move_right'] })
  await expectStageWalk(page, 100)
  await clickLessonControl(page, 'lesson-complete-step')
  await page.waitForURL('**/project/lesson-01-forest-hello/complete')
  await expect(page.getByText('当前累计 3 颗星星')).toBeVisible()
  await page.goto('/cards')
  await expect(page.getByTestId('collection-card-theme-forest-fox')).toHaveCount(1)
  await expect(page.getByTestId('collection-card-growth-first-project')).toHaveCount(1)
  await page.goto('/project/lesson-01-forest-hello/complete')
  await expect(page.getByText('当前累计 3 颗星星')).toHaveCount(1)
})
