/**
 * LessonWorkspace E2E — real browser, production build, stock chromium.
 * Covers DESIGN.md §3 three viewports + ACCEPTANCE.md R7 lifecycle + draft
 * isolation + fail-closed save + OPS-020 regressions R3/R4/R5/R6/R8.
 * No fixed-duration sleep is used as a sync mechanism: every wait is a
 * conditional expectation (visible text, count, storage state).
 * Run via a TEMP Playwright config inside apps/web (own port, no channel
 * line); the temp config is deleted after the run and playwright.config.ts
 * is never modified.
 */
import { expect, test } from '@playwright/test'

const DEMO_A = '/learn/workspace/demo-a'
const DEMO_S = '/learn/workspace/demo-s'
const DEMO_SCRATCH = '/learn/workspace/demo-scratch'

async function dragFlyoutBlockToWorkspace(
  page: import('@playwright/test').Page,
  categoryLabel: string,
) {
  // Category selection goes through the shell's icon rail (which drives
  // the real Blockly toolbox selection); Blockly's own category column is
  // hidden by scoped CSS while the rail is on.
  await page.getByTestId(`ws-rail-${categoryLabel}`).click()
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
  // Conditional wait, not a fixed sleep: the first frame (x=30) proves the
  // run is genuinely mid-playback before stopping it.
  await page.getByTestId('ws-run-toggle').click()
  await expect(page.getByTestId('ws-stage-state')).toContainText('x=30')
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

test('R8 loop ownership: post-loop move runs once, delete restores structure', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  // [hat, right 30] + repeat(3 x right 50) + right 50 -> x = 30 + 150 + 50 = 230.
  // If the trailing move were misjudged as in-loop, x would be 30 + 3*100 = 330
  // and the conclusion would fail instead of passing.
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-repeat').click()
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(4)
  await page.getByTestId('ws-run-script').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveText('结论：已完成，已掌握', {
    timeout: 15000,
  })
  await expect(page.getByTestId('ws-stage-state')).toContainText('x=230')
  // Delete the repeat (index 2): [hat, right 30, right 50] -> x=80, not caught.
  await page.getByTestId('ws-script-delete-2').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByTestId('ws-run-script').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('未合格', { timeout: 15000 })
  await expect(page.getByTestId('ws-stage-state')).toContainText('x=80')
})

test('R3 edit invalidates a pass; rerun restores it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-repeat').click()
  await page.getByTestId('ws-run-script').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveText('结论：已完成，已掌握', {
    timeout: 15000,
  })
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
  await expect(page.getByTestId('ws-judgment-stale')).toBeVisible()
  await page.getByTestId('ws-run-script').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveText('结论：已完成，已掌握', {
    timeout: 15000,
  })
})

test('R5 mobile 375: blocks-tab drawer chain, no cross-tab drag, engine intact', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(DEMO_A)
  // Material drawer on the blocks tab (not the script-panel palette).
  await page.getByTestId('ws-tab-blocks').click()
  await page.getByTestId('ws-blocks-panel').getByTestId('ws-drawer-move-right').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByTestId('ws-tab-script').click()
  await page.getByTestId('ws-script-steps-2').fill('100')
  await expect(page.getByTestId('ws-script-item-2')).toContainText('向右走 100 步')
  await page.getByTestId('ws-script-up-2').click()
  await expect(page.getByTestId('ws-script-item-1')).toContainText('向右走 100 步')
  await page.getByTestId('ws-script-down-1').click()
  await expect(page.getByTestId('ws-script-item-2')).toContainText('向右走 100 步')
  await page.getByTestId('ws-script-delete-2').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-repeat').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByTestId('ws-run-script').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveText('结论：已完成，已掌握', {
    timeout: 15000,
  })
  // Tab round-trip neither rebuilds the engine nor loses the script.
  // (The 100-step move was deleted above, so the surviving items are the
  // 30-step move and the repeat — assert those, not the deleted move.)
  await page.getByTestId('ws-tab-stage').click()
  await page.getByTestId('ws-tab-script').click()
  await expect(page.getByTestId('ws-blockly-mount')).toHaveCount(1)
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await expect(page.getByTestId('ws-script-item-1')).toContainText('向右走 30 步')
  await expect(page.getByTestId('ws-script-item-2')).toContainText('重复 3 次')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  const runBox = await page.getByTestId('ws-run-script').boundingBox()
  expect(runBox).not.toBeNull()
  expect(runBox!.x + runBox!.width).toBeLessThanOrEqual(375)
})

test('R6 tablet 768: category flyout, run/stop, resize keeps the editor usable', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(DEMO_A)
  await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  // Expand a real category via the icon rail: the flyout must appear (not
  // just a button). The demo toolbox renders 开始 / 控制 / 更多 ('移动'
  // is not a demo category).
  await page.getByTestId('ws-rail-更多').click()
  await expect(page.locator('.blocklyFlyout .blocklyDraggable').first()).toBeVisible({ timeout: 10000 })
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-repeat').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByTestId('ws-run-script').click()
  await expect(page.getByTestId('ws-stage-state')).toContainText('x=30')
  await page.getByTestId('ws-run-script').click()
  await expect(page.getByTestId('ws-stage-state')).toContainText('未运行')
  await expect(page.getByTestId('ws-stage-state')).toContainText('分数=0')
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
  // Resize (tablet rotation shape): the editor must re-measure and stay
  // usable — same strength as before, but the rail (not Blockly's own
  // hidden column) is the visible category surface after resize.
  await page.setViewportSize({ width: 1024, height: 768 })
  await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
  await expect(page.getByTestId('ws-icon-rail')).toBeVisible()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
})

test('R4 corrupt draft degrades safely to the initial script', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  // Seed via evaluate + reload: addInitScript would re-seed on every
  // navigation (including reload) and mask the real stored draft.
  await page.evaluate(() => {
    localStorage.setItem('kidscoding-draft:demo-a', 'not-json{{{')
  })
  await page.reload()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  await expect(page.getByTestId('ws-script-item-1')).toContainText('向右走 30 步')
})

test('R4 restore prompt survives autosave; autosave persists edits without explicit save', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  // Seed via evaluate + reload (see the corrupt-draft test: addInitScript
  // re-seeds on reload and would overwrite the autosaved draft).
  await page.evaluate(() => {
    localStorage.setItem(
      'kidscoding-draft:demo-a',
      JSON.stringify({
        lessonId: 'demo-a',
        savedAt: '2026-11-04T00:00:00.000Z',
        script: [{ type: 'when_start' }, { type: 'ws_move_right', steps: 99 }],
      }),
    )
  })
  await page.reload()
  await expect(page.getByTestId('ws-script-item-1')).toContainText('向右走 99 步')
  await expect(page.getByTestId('ws-save-message')).toHaveText('已恢复草稿')
  // Edit without any explicit save: delete the 99-step move, add a 50-step one.
  await page.getByTestId('ws-script-delete-1').click()
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  // Autosave (1s debounce) writes the edited script; poll storage, never sleep.
  await page.waitForFunction(() => {
    const d = localStorage.getItem('kidscoding-draft:demo-a')
    return d !== null && d.includes('"steps":50')
  })
  // Chip shows the current save state (saved); the restore prompt is preserved.
  await expect(page.getByTestId('ws-save-chip')).toHaveText('已保存到本机')
  await expect(page.getByTestId('ws-save-message')).toHaveText('已恢复草稿')
  await page.reload()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2, { timeout: 10000 })
  await expect(page.getByTestId('ws-script-item-1')).toContainText('向右走 50 步')
})

test('icon rail drives a real category flyout; Blockly own column stays hidden', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
  // Three rail buttons, one per demo category; Blockly's own column hidden.
  await expect(page.getByTestId('ws-icon-rail')).toBeVisible()
  await expect(page.getByTestId('ws-rail-开始')).toBeVisible()
  await expect(page.getByTestId('ws-rail-控制')).toBeVisible()
  await expect(page.getByTestId('ws-rail-更多')).toBeVisible()
  await expect(page.locator('.blocklyToolbox')).toBeHidden()
  // Clicking a rail icon opens the real flyout with draggable blocks.
  await page.getByTestId('ws-rail-开始').click()
  await expect(page.getByTestId('ws-rail-开始')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.blocklyFlyout .blocklyDraggable').first()).toBeVisible({ timeout: 10000 })
  // Clicking the active rail icon again closes the flyout (toggle).
  await page.getByTestId('ws-rail-开始').click()
  await expect(page.locator('.blocklyFlyout .blocklyDraggable').first()).toBeHidden({ timeout: 10000 })
})

test('block search inserts a real block and filters the drawer chips', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  await page.getByTestId('ws-block-search').fill('向右')
  await expect(page.getByTestId('ws-search-results')).toBeVisible()
  await page.getByTestId('ws-search-result-ws_move_right').click()
  // A real Blockly block landed at the end of the main chain.
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await expect(page.getByTestId('ws-script-item-2')).toContainText('向右走 50 步')
  // The same search text filters the demo drawer chips.
  await page.getByTestId('ws-block-search').fill('重复')
  await expect(page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right')).toHaveCount(0)
  await expect(page.getByTestId('ws-script-panel').getByTestId('ws-drawer-repeat')).toBeVisible()
  await page.getByTestId('ws-block-search').fill('')
  await expect(page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right')).toBeVisible()
})

test('editor zoom changes the real canvas scale and resets', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
  const readScale = async () => {
    const transform = await page
      .locator('.blocklyBlockCanvas')
      .first()
      .getAttribute('transform')
    const match = transform?.match(/scale\(([\d.]+)\)/)
    expect(match).not.toBeNull()
    return parseFloat(match![1])
  }
  const before = await readScale()
  await page.getByTestId('ws-editor-zoom-in').click()
  const zoomed = await readScale()
  expect(zoomed).toBeGreaterThan(before)
  await page.getByTestId('ws-editor-zoom-reset').click()
  const reset = await readScale()
  expect(Math.abs(reset - 0.9)).toBeLessThan(0.01)
})

test('mobile sticky action row is in-flow sticky and runs the program', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(DEMO_A)
  await page.getByTestId('ws-tab-script').click()
  await expect(page.getByTestId('ws-sticky-run')).toBeVisible()
  // In-flow sticky, never a fixed overlay on the editor.
  const position = await page.evaluate(
    () => getComputedStyle(document.querySelector('.ws-sticky-actions')!).position,
  )
  expect(position).toBe('sticky')
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-repeat').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByTestId('ws-sticky-run').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveText('结论：已完成，已掌握', {
    timeout: 15000,
  })
})

test('summary wide layout: task left, editor wide, honest empty feedback, no blocks tab', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_S)
  await expect(page.getByTestId('ws-demo-summary-editor')).toBeVisible()
  // Desktop shows the task column beside the editor (not a narrow box),
  // on the SAME row as the editor (not dropped below it).
  await expect(page.getByTestId('ws-task-panel')).toBeVisible()
  const taskBox = await page.getByTestId('ws-task-panel').boundingBox()
  const scriptBox = await page.getByTestId('ws-script-panel').boundingBox()
  expect(taskBox).not.toBeNull()
  expect(scriptBox).not.toBeNull()
  expect(Math.abs(taskBox!.y - scriptBox!.y)).toBeLessThanOrEqual(20)
  expect(taskBox!.x).toBeLessThan(scriptBox!.x)
  const editorBox = await page.getByTestId('ws-summary-textarea').boundingBox()
  expect(editorBox).not.toBeNull()
  expect(editorBox!.width).toBeGreaterThan(400)
  // No stage, no roles, no run button, no blocks tab, honest empty state.
  expect(await page.getByTestId('ws-stage-panel').count()).toBe(0)
  expect(await page.getByTestId('ws-roles-panel').count()).toBe(0)
  expect(await page.getByTestId('ws-run-script').count()).toBe(0)
  expect(await page.getByTestId('ws-tab-blocks').count()).toBe(0)
  await expect(page.getByTestId('ws-feedback')).toContainText('暂无检查结果')
})

test('summary demo: React editor slot mounts, types, saves, restores; no stage or run button', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_S)
  await expect(page.getByTestId('ws-demo-summary-editor')).toBeVisible()
  expect(await page.getByTestId('ws-stage-panel').count()).toBe(0)
  expect(await page.getByTestId('ws-tab-stage').count()).toBe(0)
  expect(await page.getByTestId('ws-run-script').count()).toBe(0)
  expect(await page.getByTestId('ws-roles-panel').count()).toBe(0)
  await page.getByTestId('ws-summary-textarea').fill('今天学了循环和总结')
  await expect(page.getByTestId('ws-summary-count')).toContainText('1 句')
  await page.getByTestId('ws-file-menu-button').click()
  await page.getByTestId('ws-file-save').click()
  await expect(page.getByTestId('ws-save-chip')).toHaveText('已保存到本机')
  await page.reload()
  await expect(page.getByTestId('ws-summary-textarea')).toHaveValue('今天学了循环和总结', {
    timeout: 10000,
  })
})
