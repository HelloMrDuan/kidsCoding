import { expect, test, type Page } from '@playwright/test'
import { clickLessonControl, expectStageWalk, showLessonPane, solveMistakeStep, solvePracticeStep, openForestV3, completeForestStep } from './lesson-pane-helpers'

/** UX-502: remedial learning and reward collection stay consistent —
 *  failing then returning from remedial lands back on the same lesson and
 *  program, rewards are awarded exactly once no matter how often the child
 *  clicks, and the cards shelf shows exactly what progress earned. */

test('advancing then reloading resumes the new step, not step 1', async ({ page }) => {
  test.setTimeout(120_000)
  await openForestV3(page)
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15_000 })
  await completeForestStep(page)
  await expect(page.getByTestId('forest-hello-step-progress')).toContainText('第 2 / 4 关')
  // 第 2 关 opens empty in V3 (each 关 keeps its own program), so add a real
  // block and let autosave land: the reload must restore this step and program.
  await clickLessonControl(page, 'lesson-add-move_right')
  await expect(page.getByTestId('studio-save-chip')).toHaveAttribute('data-state', 'saved', { timeout: 10_000 })
  await page.reload()
  await expect(page.getByTestId('forest-hello-slot')).toBeVisible()
  await expect(page.getByTestId('forest-hello-step-progress')).toContainText('第 2 / 4 关')
  await showLessonPane(page, 'code')
  const canvas = page.getByTestId('lesson-blockly-workspace').locator('svg.blocklySvg .blocklyBlockCanvas')
  await expect(canvas).toContainText('向右走 100 步')
})

/**
 * OPS-056: lesson-05 runs in the V3 launch studio (/studio/blockly/launch/<id>; the old
 * /learn/lesson/<id> entry 308-redirects there). Mapping (same strength):
 * - lesson-task-card 第 N 关 -> launch-v3-step-progress 第 N / M 关;
 * - the return lands on the V3 studio (the remedial page links via launchLessonHref);
 * - "three real failures" is asserted on the real owner-scoped draft's script.failures.
 * 复审 HOLD P1 (restored): V3 counts every real failed run again and shows the tier-3 hint
 * with a lesson-remedial-link (asserted in the second spec). The return leg below enters the
 * remedial page through the exact URL that link pushes (from + step).
 */
const LAUNCH_DRAFT_KEY = 'kids-lesson-owner-v1:guest:kidscoding-draft:lesson-05-meadow-order'

async function failLesson5ThreeTimes(page: Page) {
  // Lesson 5 step 1 (not lesson 1 step 1, whose palette is when_start only):
  // move_right + switch_scene without when_start is a real wrong program.
  await page.goto('/learn/lesson/lesson-05-meadow-order')
  await page.waitForURL('**/studio/blockly/launch/lesson-05-meadow-order')
  await clickLessonControl(page, 'lesson-add-move_right')
  await clickLessonControl(page, 'lesson-add-switch_scene')
  for (let i = 0; i < 3; i++) {
    await clickLessonControl(page, 'run-code-button')
    await expect(page.getByTestId('stage-run-reason')).toBeVisible({ timeout: 12_000 })
    await expect(page.getByTestId('ws-run-toggle')).not.toHaveText(/停止/, { timeout: 15_000 })
  }
}

function draftFailures(page: Page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    try { return (JSON.parse(raw) as { script?: { failures?: number } }).script?.failures ?? null } catch { return null }
  }, LAUNCH_DRAFT_KEY)
}

test('remedial return restores the failed lesson step and program', async ({ page }) => {
  test.setTimeout(120_000)
  await failLesson5ThreeTimes(page)
  // Real failed runs are recorded in the real draft (autosaved before leaving).
  // Same as the old classroom: every real failed run counts, so three runs record 3 (tier 3).
  await expect.poll(() => draftFailures(page), { timeout: 15_000 }).toBe(3)
  // Same remedial URL the old classroom's tier-3 link pushed (from + step).
  await page.goto('/learn/remedial/remedial-scene-switch?from=lesson-05-meadow-order&step=step-1')
  await page.getByRole('link', { name: '回到刚才的课程' }).click()
  await page.waitForURL('**/studio/blockly/launch/lesson-05-meadow-order')
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText(/第 1 \/ \d+ 关/)
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
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText(/第 2 \/ \d+ 关/)
})

test('OPS-056: V3 offers the tier-3 hint and remedial link after three failures (restored)', async ({ page }) => {
  test.setTimeout(90_000)
  await failLesson5ThreeTimes(page)
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('lesson-hint')).toHaveAttribute('data-hint-tier', '3', { timeout: 12_000 })
  await expect(page.getByTestId('lesson-remedial-link')).toHaveAttribute('data-remedial-id', 'remedial-scene-switch')
  await page.getByTestId('lesson-remedial-link').click()
  await page.waitForURL('**/learn/remedial/**')
  expect(new URL(page.url()).searchParams.get('from')).toBe('lesson-05-meadow-order')
})

test('click farming awards nothing; one completion fills the cards shelf exactly once', async ({ page }) => {
  test.setTimeout(180_000)
  await openForestV3(page)
  for (let i = 0; i < 3; i++) await clickLessonControl(page, 'lesson-complete-step')
  await expect(page.getByTestId('forest-hello-step-progress')).toContainText('第 1 / 4 关')
  await expect(page).toHaveURL(/\/studio\/blockly\/lesson-01-forest-hello$/)
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'lesson-complete-step')
  await expect(page.getByTestId('forest-hello-notice')).toContainText('请先点击舞台')
  // 第 1 关: run the real 0-step program before the step may pass.
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15_000 })
  await completeForestStep(page)
  // 第 2 关 keeps its own program in V3, so it is built again from empty.
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'lesson-add-move_right')
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15_000 })
  await completeForestStep(page)
  await solvePracticeStep(page, { goalType: 'change-distance', guess: 'beside-friend', build: ['when_start', 'move_right', 'move_right'] })
  await expectStageWalk(page, 200)
  await completeForestStep(page)
  await solveMistakeStep(page, { expectCode: 'missing-start', answer: 'stayed', fix: ['when_start', 'move_right'] })
  await expectStageWalk(page, 100)
  await completeForestStep(page)
  await page.waitForURL('**/project/lesson-01-forest-hello/complete')
  await expect(page.getByText('当前累计 3 颗星星')).toBeVisible()
  await page.goto('/cards')
  await expect(page.getByTestId('collection-card-theme-forest-fox')).toHaveCount(1)
  await expect(page.getByTestId('collection-card-growth-first-project')).toHaveCount(1)
  await page.goto('/project/lesson-01-forest-hello/complete')
  await expect(page.getByText('当前累计 3 颗星星')).toHaveCount(1)
})
