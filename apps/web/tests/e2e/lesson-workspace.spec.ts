/**
 * LessonWorkspace E2E — real browser, production build, stock chromium.
 * Covers DESIGN.md §3 three viewports + ACCEPTANCE.md R7 lifecycle + draft
 * isolation + fail-closed save. Run via a TEMP Playwright config inside
 * apps/web (own port, no channel line); the temp config is deleted after the
 * run and playwright.config.ts is never modified.
 */
import { expect, test } from '@playwright/test'

const DEMO_A = '/learn/workspace/demo-a'
const DEMO_SCRATCH = '/learn/workspace/demo-scratch'

async function dragFlyoutBlockToWorkspace(
  page: import('@playwright/test').Page,
  categoryLabel: string,
) {
  // Blockly v12 toolbox: categories are .blocklyToolboxCategory divs (the
  // label span itself is pointer-intercepted by its parent div).
  const toolbox = page.locator('.blocklyToolbox')
  await toolbox.locator('.blocklyToolboxCategory', { hasText: categoryLabel }).click()
  const flyoutBlock = page.locator('.blocklyFlyout .blocklyDraggable').first()
  await flyoutBlock.waitFor({ state: 'visible', timeout: 10000 })
  const box = await flyoutBlock.boundingBox()
  expect(box).not.toBeNull()
  const target = page.locator('[data-testid="ws-blockly-mount"] svg.blocklySvg')
  await target.waitFor({ state: 'visible', timeout: 10000 })
  const tbox = await target.boundingBox()
  expect(tbox).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(tbox!.x + tbox!.width / 2, tbox!.y + tbox!.height / 2, { steps: 12 })
  await page.mouse.up()
}

test('desktop 1440: real Blockly drag grows the script list', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  await dragFlyoutBlockToWorkspace(page, '更多')
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3, { timeout: 10000 })
  await page.screenshot({ path: 'test-results/lesson-workspace-1440.png' })
})

test('tablet 768: drawer insert works and stage hide/show keeps the script', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(DEMO_A)
  await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByTestId('ws-stage-toggle').click()
  await expect(page.getByTestId('ws-stage-hidden-note')).toBeVisible()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByTestId('ws-stage-toggle').click()
  await expect(page.getByTestId('ws-stage-panel')).toBeVisible()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.screenshot({ path: 'test-results/lesson-workspace-768.png' })
})

test('mobile 375: drawer insert, param edit, reorder, delete, run in script panel, tab switch keeps script', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(DEMO_A)
  await page.getByTestId('ws-tab-script').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  // Drawer insert inside the script panel.
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  // Param edit: last item steps 50 -> 100.
  await page.getByTestId('ws-script-steps-2').fill('100')
  await expect(page.getByTestId('ws-script-item-2')).toContainText('向右走 100 步')
  // Reorder: move item 2 up, so item 1 becomes the 100-step move.
  await page.getByTestId('ws-script-up-2').click()
  await expect(page.getByTestId('ws-script-item-1')).toContainText('向右走 100 步')
  // Delete the remaining 30-step move (now item 2).
  await page.getByTestId('ws-script-delete-2').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  // Insert a repeat, then run inside the script panel: 100 + 3*50 = 250,
  // |250-200| = 50 <= 80 caught, repeat moved -> conclusion passed.
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-repeat').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByTestId('ws-run-script').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveText('结论：已完成，已掌握', {
    timeout: 15000,
  })
  // Tab switch keeps the script (DOM kept, adapter never remounted).
  await page.getByTestId('ws-tab-stage').click()
  await page.getByTestId('ws-tab-script').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await expect(page.getByTestId('ws-script-item-1')).toContainText('向右走 100 步')
  await page.screenshot({ path: 'test-results/lesson-workspace-375.png' })
})

test('run/stop/rerun (R7): stop keeps script and score 0, rerun passes with score 1, rerun again still 1', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-repeat').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  // Program: hat + right 30 + repeat 3 x right 50 -> x=180 caught, 4 frames.
  await page.getByTestId('ws-run-toggle').click()
  await page.waitForTimeout(500)
  await page.getByTestId('ws-run-toggle').click()
  await expect(page.getByTestId('ws-stage-state')).toContainText('分数=0')
  await expect(page.getByTestId('ws-stage-state')).toContainText('未运行')
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByTestId('ws-run-toggle').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveText('结论：已完成，已掌握', {
    timeout: 15000,
  })
  await expect(page.getByTestId('ws-stage-state')).toContainText('分数=1')
  await page.getByTestId('ws-run-toggle').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveText('结论：已完成，已掌握', {
    timeout: 15000,
  })
  await expect(page.getByTestId('ws-stage-state')).toContainText('分数=1')
})

test('save + refresh restores the script', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByTestId('ws-file-menu-button').click()
  await page.getByTestId('ws-file-save').click()
  await expect(page.getByTestId('ws-save-chip')).toHaveText('已保存到本机')
  await page.reload()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3, { timeout: 10000 })
})

test('lesson switch round-trip: A intact, B intact, no cross-lesson residue', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByRole('link', { name: '演示 B：送篮子到果园' }).click()
  await expect(page.getByTestId('ws-topbar').locator('h1')).toHaveText('演示：送篮子到果园')
  // Goal strip shows only the current goal by default; expand for full text.
  await page.getByTestId('ws-goal-expand').click()
  await expect(page.getByTestId('ws-goal5')).toContainText('果园')
  await expect(page.getByTestId('ws-goal5')).not.toContainText('接住')
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByRole('link', { name: '演示 A：接住掉落水果' }).click()
  await expect(page.getByTestId('ws-topbar').locator('h1')).toHaveText('演示：接住掉落水果')
  await page.getByTestId('ws-goal-expand').click()
  await expect(page.getByTestId('ws-goal5')).toContainText('接住')
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3, { timeout: 10000 })
})

test('save failure shows 未能保存, never 已保存到本机 (demo test hook)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${DEMO_A}?demoFailSave=1`)
  await page.getByTestId('ws-file-menu-button').click()
  await page.getByTestId('ws-file-save').click()
  await expect(page.getByTestId('ws-save-chip')).toHaveText('未能保存')
  await expect(page.getByText('已保存到本机')).toHaveCount(0)
})

test('no horizontal overflow at 1440, 768 and 375', async ({ page }) => {
  for (const [width, height] of [
    [1440, 900],
    [768, 1024],
    [375, 812],
  ] as const) {
    await page.setViewportSize({ width, height })
    await page.goto(DEMO_A)
    await expect(page.getByTestId('ws-root')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    const runBox = await page.getByTestId('ws-run-toggle').boundingBox()
    expect(runBox).not.toBeNull()
    expect(runBox!.x + runBox!.width).toBeLessThanOrEqual(width)
  }
})

test('scratch demo: iframe mounts with sandbox attr and reports an honest readiness state', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_SCRATCH)
  const iframe = page.locator('[data-testid="ws-scratch-mount"] iframe')
  await expect(iframe).toHaveCount(1)
  await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts')
  await expect(iframe).toHaveAttribute('src', '/scratch-vm-sandbox.html')
  // Either ready or an honest failure/pending state — never a fake ready.
  await expect(page.getByTestId('ws-scratch-note')).toHaveText(/已就绪|未就绪|握手/, { timeout: 20000 })
  expect(await page.getByTestId('ws-blockly-mount').count()).toBe(0)
})
