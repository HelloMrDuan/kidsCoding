/**
 * LessonWorkspace E2E — real browser, production build, stock chromium.
 * Covers DESIGN.md §3 three viewports + ACCEPTANCE.md R7 lifecycle + draft
 * isolation + fail-closed save + OPS-020 regressions R3/R4/R5/R6/R8.
 * Round 3: the mobile four-tab pages are gone (one-screen touch workspace)
 * and the tablet is a dedicated single-column IDE; every old tab-chain
 * operation is re-covered below in the new structure at the same strength.
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

async function openDemoNav(page: import('@playwright/test').Page) {
  await page.getByTestId('ws-demo-nav').locator('summary').click()
  await expect(page.getByRole('link', { name: '演示 B：送篮子到果园' })).toBeVisible()
}

test('desktop 1440: real Blockly drag grows the script list, script keeps room', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  await dragFlyoutBlockToWorkspace(page, '更多')
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3, { timeout: 10000 })
  // Flyout open/drag/close leaves the script area dominant, not squeezed.
  // Measured 636px: the V2 222px site sidebar plus stage 280 + roles 120
  // + rail 56 + gaps/padding leave 636 for the script — still the widest
  // column (the old 700 assumed no site sidebar and was wrong, not the
  // layout). The threshold proves dominance, not an exact width.
  const mountBox = await page.getByTestId('ws-blockly-mount').boundingBox()
  expect(mountBox).not.toBeNull()
  expect(mountBox!.width).toBeGreaterThan(600)
  await page.screenshot({ path: 'test-results/lesson-workspace-1440.png' })
})

test('tablet 768: drawer insert works and stage hide/show keeps the script', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(DEMO_A)
  await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  // Palette starts collapsed below 1280px: open it, then insert.
  await page.getByTestId('ws-palette-toggle').click()
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

test('tablet 768 first screen: stage + script + rail + run + task entry, compact stage, horizontal roles', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(DEMO_A)
  // Demo nav is collapsed: it must not eat first-screen height.
  expect(await page.getByTestId('ws-demo-nav').evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false)
  const stageBox = await page.getByTestId('ws-stage-box').boundingBox()
  expect(stageBox).not.toBeNull()
  expect(stageBox!.height).toBeLessThanOrEqual(230)
  expect(stageBox!.y + stageBox!.height).toBeLessThan(1024)
  const svgBox = await page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg').boundingBox()
  expect(svgBox).not.toBeNull()
  expect(svgBox!.y).toBeLessThan(1024)
  // Round 4 strengthening: tablet canvas >= 300px tall, and a real
  // rendered block fully inside the 1024px viewport.
  expect(svgBox!.height).toBeGreaterThanOrEqual(300)
  const firstBlockBox = await page.locator('.blocklyBlockCanvas .blocklyDraggable').first().boundingBox()
  expect(firstBlockBox).not.toBeNull()
  expect(firstBlockBox!.y).toBeGreaterThanOrEqual(svgBox!.y)
  expect(firstBlockBox!.y + firstBlockBox!.height).toBeLessThanOrEqual(1024)
  const runBox = await page.getByTestId('ws-run-toggle').boundingBox()
  expect(runBox).not.toBeNull()
  expect(runBox!.y + runBox!.height).toBeLessThan(1024)
  await expect(page.getByTestId('ws-icon-rail')).toBeVisible()
  const railBox = await page.getByTestId('ws-icon-rail').boundingBox()
  expect(railBox).not.toBeNull()
  expect(railBox!.y).toBeLessThan(1024)
  const taskBox = await page.getByTestId('ws-task-button').boundingBox()
  expect(taskBox).not.toBeNull()
  expect(taskBox!.y + taskBox!.height).toBeLessThan(1024)
  await expect(page.getByTestId('ws-goal-current')).toBeVisible()
  // Roles are a horizontal strip, not three tall cards in a column.
  const foxBox = await page.getByTestId('ws-role-fox').boundingBox()
  const rabbitBox = await page.getByTestId('ws-role-rabbit').boundingBox()
  expect(foxBox).not.toBeNull()
  expect(rabbitBox).not.toBeNull()
  expect(Math.abs(foxBox!.y - rabbitBox!.y)).toBeLessThanOrEqual(20)
})

test('tablet 768: folding the stage grows the script area; resize keeps the editor usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(DEMO_A)
  await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  const before = await page.getByTestId('ws-blockly-mount').boundingBox()
  expect(before).not.toBeNull()
  await page.getByTestId('ws-stage-toggle').click()
  await expect(page.getByTestId('ws-stage-hidden-note')).toBeVisible()
  const folded = await page.getByTestId('ws-blockly-mount').boundingBox()
  expect(folded).not.toBeNull()
  expect(folded!.y).toBeLessThan(before!.y)
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  // Resize (tablet rotation shape): the editor must re-measure and stay
  // usable — same strength as before, rail still the category surface.
  await page.setViewportSize({ width: 1024, height: 768 })
  await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
  await expect(page.getByTestId('ws-icon-rail')).toBeVisible()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  await page.getByTestId('ws-stage-toggle').click()
  await expect(page.getByTestId('ws-stage-panel')).toBeVisible()
})

test('mobile 375 one-screen: drawer insert, param edit, reorder, delete, run, fold keeps script', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(DEMO_A)
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  // Material drawer lives inside the script panel; on phones it starts
  // collapsed and opens from its toggle (no tab page anymore).
  await page.getByTestId('ws-palette-toggle').click()
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
  // Folding the stage neither rebuilds the engine nor loses the script.
  await page.getByTestId('ws-stage-toggle').click()
  await expect(page.getByTestId('ws-stage-hidden-note')).toBeVisible()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await expect(page.getByTestId('ws-script-item-1')).toContainText('向右走 100 步')
  await page.getByTestId('ws-stage-toggle').click()
  await expect(page.getByTestId('ws-stage-panel')).toBeVisible()
  await page.screenshot({ path: 'test-results/lesson-workspace-375.png' })
})

test('mobile 375 first screen: stage preview + script + run + drawer entry + search, zoom reachable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(DEMO_A)
  const stageBox = await page.getByTestId('ws-stage-box').boundingBox()
  expect(stageBox).not.toBeNull()
  expect(stageBox!.height).toBeLessThanOrEqual(170)
  expect(stageBox!.y + stageBox!.height).toBeLessThan(812)
  const svgBox = await page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg').boundingBox()
  expect(svgBox).not.toBeNull()
  // Not just inside the 812px viewport: the fixed bottom nav covers
  // roughly the bottom 62px, so the canvas top must clear y=750 to be
  // genuinely visible to the child, not merely rendered behind the nav.
  expect(svgBox!.y).toBeLessThan(750)
  // Round 4 strengthening: the canvas itself must be tall enough to work
  // in (>= 220px), and a real rendered block must sit fully above the
  // bottom nav — not merely inside the 812px viewport behind it.
  expect(svgBox!.height).toBeGreaterThanOrEqual(220)
  const firstBlockBox = await page.locator('.blocklyBlockCanvas .blocklyDraggable').first().boundingBox()
  expect(firstBlockBox).not.toBeNull()
  expect(firstBlockBox!.y).toBeGreaterThanOrEqual(svgBox!.y)
  expect(firstBlockBox!.y + firstBlockBox!.height).toBeLessThanOrEqual(750)
  const runBox = await page.getByTestId('ws-run-toggle').boundingBox()
  expect(runBox).not.toBeNull()
  expect(runBox!.y + runBox!.height).toBeLessThanOrEqual(812)
  const paletteBox = await page.getByTestId('ws-palette-toggle').boundingBox()
  expect(paletteBox).not.toBeNull()
  expect(paletteBox!.y + paletteBox!.height).toBeLessThanOrEqual(812)
  await expect(page.getByTestId('ws-block-search')).toBeVisible()
  await expect(page.getByTestId('ws-sticky-run')).toBeVisible()
  // Editor zoom is a real tool below the canvas: scroll it into view and
  // prove the scale actually changes (not just a visible button).
  const readScale = async () => {
    const transform = await page.locator('.blocklyBlockCanvas').first().getAttribute('transform')
    const match = transform?.match(/scale\(([\d.]+)\)/)
    expect(match).not.toBeNull()
    return parseFloat(match![1])
  }
  const before = await readScale()
  await page.getByTestId('ws-editor-zoom-in').scrollIntoViewIfNeeded()
  await page.getByTestId('ws-editor-zoom-in').click()
  expect(await readScale()).toBeGreaterThan(before)
})

test('mobile 375: sticky run/stop mid-run, then run to pass and save/restore', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(DEMO_A)
  await page.getByTestId('ws-palette-toggle').click()
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-repeat').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  // Program: hat + right 30 + repeat 3 x right 50. The sticky run button
  // starts it; the first frame (x=30) proves mid-playback before stopping.
  await page.getByTestId('ws-sticky-run').click()
  await expect(page.getByTestId('ws-demo-stage-state')).toContainText('x=30')
  await page.getByTestId('ws-sticky-run').click()
  await expect(page.getByTestId('ws-demo-stage-state')).toContainText('分数=0')
  await expect(page.getByTestId('ws-stage-state')).toContainText('未运行')
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByTestId('ws-run-script').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveText('结论：已完成，已掌握', {
    timeout: 15000,
  })
  await page.getByTestId('ws-file-menu-button').click()
  await page.getByTestId('ws-file-save').click()
  await expect(page.getByTestId('ws-save-chip')).toHaveText('已保存到本机')
  await page.reload()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3, { timeout: 10000 })
})

test('mobile 375: roles strip starts collapsed and opens from the stage-head toggle', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(DEMO_A)
  await expect(page.getByTestId('ws-roles-panel')).toBeHidden()
  await page.getByTestId('ws-roles-toggle').click()
  await expect(page.getByTestId('ws-roles-panel')).toBeVisible()
  await page.getByTestId('ws-role-rabbit').click()
  await expect(page.getByTestId('ws-role-rabbit')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('ws-roles-toggle').click()
  await expect(page.getByTestId('ws-roles-panel')).toBeHidden()
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
  await expect(page.getByTestId('ws-demo-stage-state')).toContainText('x=30')
  await page.getByTestId('ws-run-toggle').click()
  await expect(page.getByTestId('ws-demo-stage-state')).toContainText('分数=0')
  await expect(page.getByTestId('ws-stage-state')).toContainText('未运行')
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByTestId('ws-run-toggle').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveText('结论：已完成，已掌握', {
    timeout: 15000,
  })
  await expect(page.getByTestId('ws-demo-stage-state')).toContainText('分数=1')
  await page.getByTestId('ws-run-toggle').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveText('结论：已完成，已掌握', {
    timeout: 15000,
  })
  await expect(page.getByTestId('ws-demo-stage-state')).toContainText('分数=1')
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
  await openDemoNav(page)
  await page.getByRole('link', { name: '演示 B：送篮子到果园' }).click()
  await expect(page.getByTestId('ws-topbar').locator('h1')).toHaveText('演示：送篮子到果园')
  // Goal strip shows only the current goal by default; expand for full text.
  await page.getByTestId('ws-goal-expand').click()
  await expect(page.getByTestId('ws-goal5')).toContainText('果园')
  await expect(page.getByTestId('ws-goal5')).not.toContainText('接住')
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await openDemoNav(page)
  await page.getByRole('link', { name: '演示 A：接住掉落水果' }).click()
  await expect(page.getByTestId('ws-topbar').locator('h1')).toHaveText('演示：接住掉落水果')
  await page.getByTestId('ws-goal-expand').click()
  await expect(page.getByTestId('ws-goal5')).toContainText('接住')
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3, { timeout: 10000 })
})

test('demo nav details starts collapsed and opens to real links', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  expect(await page.getByTestId('ws-demo-nav').evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false)
  await expect(page.getByRole('link', { name: '演示 B：送篮子到果园' })).toBeHidden()
  await openDemoNav(page)
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
  await expect(page.getByTestId('ws-demo-stage-state')).toContainText('x=230')
  // Delete the repeat (index 2): [hat, right 30, right 50] -> x=80, not caught.
  await page.getByTestId('ws-script-delete-2').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByTestId('ws-run-script').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('未合格', { timeout: 15000 })
  await expect(page.getByTestId('ws-demo-stage-state')).toContainText('x=80')
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
  // Palette starts collapsed below 1280px: open it, then insert.
  await page.getByTestId('ws-palette-toggle').click()
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-repeat').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByTestId('ws-run-script').click()
  await expect(page.getByTestId('ws-demo-stage-state')).toContainText('x=30')
  await page.getByTestId('ws-run-script').click()
  await expect(page.getByTestId('ws-stage-state')).toContainText('未运行')
  await expect(page.getByTestId('ws-demo-stage-state')).toContainText('分数=0')
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
  await expect(page.locator('[data-testid^="ws-script-item-1"]')).toContainText('向右走 30 步')
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
  await expect(page.locator('[data-testid^="ws-script-item-1"]')).toContainText('向右走 50 步')
})

test('icon rail drives a real category flyout; Blockly own column stays hidden; dead toolbox class absent', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
  // Three rail buttons, one per demo category; Blockly's own column hidden.
  await expect(page.getByTestId('ws-icon-rail')).toBeVisible()
  await expect(page.getByTestId('ws-rail-开始')).toBeVisible()
  await expect(page.getByTestId('ws-rail-控制')).toBeVisible()
  await expect(page.getByTestId('ws-rail-更多')).toBeVisible()
  await expect(page.locator('.blocklyToolbox')).toBeHidden()
  // The removed .blocklyToolboxDiv rule targeted a class this Blockly
  // bundle never renders: prove it in the live DOM, not by grep alone.
  expect(await page.locator('.blocklyToolboxDiv').count()).toBe(0)
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
  await expect(page.getByTestId('ws-sticky-run')).toBeVisible()
  // In-flow sticky, never a fixed overlay on the editor.
  const position = await page.evaluate(
    () => getComputedStyle(document.querySelector('.ws-sticky-actions')!).position,
  )
  expect(position).toBe('sticky')
  await page.getByTestId('ws-palette-toggle').click()
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-repeat').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  await page.getByTestId('ws-sticky-run').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveText('结论：已完成，已掌握', {
    timeout: 15000,
  })
})

test('summary wide layout: task left, editor wide, honest empty feedback, no stage or run', async ({
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
  // No stage, no roles, no run button, honest empty state.
  expect(await page.getByTestId('ws-stage-panel').count()).toBe(0)
  expect(await page.getByTestId('ws-roles-panel').count()).toBe(0)
  expect(await page.getByTestId('ws-run-script').count()).toBe(0)
  await expect(page.getByTestId('ws-feedback')).toContainText('暂无检查结果')
})

test('summary demo: React editor slot mounts, types, saves, restores; no stage or run button', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_S)
  await expect(page.getByTestId('ws-demo-summary-editor')).toBeVisible()
  expect(await page.getByTestId('ws-stage-panel').count()).toBe(0)
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

test('summary tablet + mobile: editor stays wide, task via drawer, type/save/restore on phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(DEMO_S)
  await expect(page.getByTestId('ws-demo-summary-editor')).toBeVisible()
  const tabletEditor = await page.getByTestId('ws-summary-textarea').boundingBox()
  expect(tabletEditor).not.toBeNull()
  expect(tabletEditor!.width).toBeGreaterThan(280)
  await expect(page.getByTestId('ws-task-panel')).toBeVisible()
  expect(await page.getByTestId('ws-stage-panel').count()).toBe(0)
  expect(await page.getByTestId('ws-run-script').count()).toBe(0)

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(DEMO_S)
  await expect(page.getByTestId('ws-demo-summary-editor')).toBeVisible()
  const phoneEditor = await page.getByTestId('ws-summary-textarea').boundingBox()
  expect(phoneEditor).not.toBeNull()
  expect(phoneEditor!.width).toBeGreaterThan(300)
  expect(await page.getByTestId('ws-stage-panel').count()).toBe(0)
  expect(await page.getByTestId('ws-run-script').count()).toBe(0)
  // Full teaching content is one tap away in the drawer, not a tab page.
  await page.getByTestId('ws-task-button').click()
  await expect(page.getByTestId('ws-task-drawer')).toBeVisible()
  await page.getByTestId('ws-task-button').click()
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

/* ---------------- Round 4: approved-layout implementation ---------------- */

test('round4 layout budget default: stage/run/materials/task in view, svg height targets, first block fully in view', async ({
  page,
}) => {
  for (const [width, height, minSvg] of [
    [1440, 900, 0],
    [768, 1024, 300],
    [375, 812, 220],
  ] as const) {
    await page.setViewportSize({ width, height })
    await page.goto(DEMO_A)
    await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
    const inView = async (testid: string) => {
      const box = await page.getByTestId(testid).boundingBox()
      expect(box).not.toBeNull()
      expect(box!.y).toBeGreaterThanOrEqual(0)
      expect(box!.y + box!.height).toBeLessThanOrEqual(height)
    }
    await inView('ws-stage-box')
    await inView('ws-run-toggle')
    await inView('ws-palette-toggle')
    await inView('ws-task-button')
    const svgBox = await page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg').boundingBox()
    expect(svgBox).not.toBeNull()
    expect(svgBox!.y).toBeLessThan(height)
    expect(svgBox!.height).toBeGreaterThanOrEqual(minSvg)
    const firstBlockBox = await page.locator('.blocklyBlockCanvas .blocklyDraggable').first().boundingBox()
    expect(firstBlockBox).not.toBeNull()
    expect(firstBlockBox!.y).toBeGreaterThanOrEqual(svgBox!.y)
    expect(firstBlockBox!.y + firstBlockBox!.height).toBeLessThanOrEqual(height)
  }
})

test('round4 fix 1: folded stage keeps run/stop reachable via the sticky row (desktop + tablet)', async ({
  page,
}) => {
  for (const [width, height] of [
    [1440, 900],
    [768, 1024],
  ] as const) {
    await page.setViewportSize({ width, height })
    await page.goto(DEMO_A)
    await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
    await page.getByTestId('ws-stage-toggle').click()
    await expect(page.getByTestId('ws-stage-hidden-note')).toBeVisible()
    // The stage run bar is gone with the stage; the sticky row must be
    // visible in the first screen instead (it is hidden >= 768px by
    // default and only appears when the stage is hidden).
    await expect(page.getByTestId('ws-sticky-run')).toBeVisible()
    const stickyBox = await page.getByTestId('ws-sticky-run').boundingBox()
    expect(stickyBox).not.toBeNull()
    expect(stickyBox!.y + stickyBox!.height).toBeLessThanOrEqual(height)
    // Regression guard (round 4 measurement finding): a hidden stage
    // must not collapse the script column into the 56px rail column.
    const mountBox = await page.getByTestId('ws-blockly-mount').boundingBox()
    expect(mountBox).not.toBeNull()
    expect(mountBox!.width).toBeGreaterThanOrEqual(500)
    await page.getByTestId('ws-sticky-run').click()
    await expect(page.getByTestId('ws-sticky-run')).toHaveText('停止')
    await page.getByTestId('ws-sticky-run').click()
    await expect(page.getByTestId('ws-sticky-run')).toHaveText('运行作品')
    await page.screenshot({ path: `test-results/lesson-workspace-folded-${width}.png` })
    // Unfolding restores the stage and hides the sticky row again.
    await page.getByTestId('ws-stage-toggle').click()
    await expect(page.getByTestId('ws-stage-panel')).toBeVisible()
    await expect(page.getByTestId('ws-sticky-run')).toBeHidden()
  }
})

test('round4 fix 2: one material surface at a time (rail flyout vs palette drawer)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
  // Desktop default: palette drawer open, flyout closed.
  await expect(page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right')).toBeVisible()
  expect(await page.locator('.blocklyFlyout .blocklyDraggable').count()).toBe(0)
  // Opening the rail closes the drawer and opens the flyout.
  await page.getByTestId('ws-rail-开始').click()
  await expect(page.locator('.blocklyFlyout .blocklyDraggable').first()).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right')).toBeHidden()
  // Opening the drawer closes the flyout again.
  await page.getByTestId('ws-palette-toggle').click()
  await expect(page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right')).toBeVisible()
  await expect(page.locator('.blocklyFlyout .blocklyDraggable').first()).toBeHidden({ timeout: 10000 })
  await page.screenshot({ path: 'test-results/lesson-workspace-drawer-1440.png' })
  // Drawer chips still insert for real.
  await page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right').click()
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)

  // Mobile: the rail is hidden by CSS, so the drawer is the only surface;
  // opening it must not summon a flyout.
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(DEMO_A)
  await page.getByTestId('ws-palette-toggle').click()
  await expect(page.getByTestId('ws-script-panel').getByTestId('ws-drawer-move-right')).toBeVisible()
  expect(await page.locator('.blocklyFlyout .blocklyDraggable').count()).toBe(0)
  await page.screenshot({ path: 'test-results/lesson-workspace-drawer-375.png' })
})

test('round4 mobile touch: touchscreen taps open the drawer, add a block, and run to pass', async ({
  page,
}) => {
  // Touchscreen.tap needs a touch context; the desktop/tablet projects
  // skip honestly instead of faking a tap with a mouse click.
  const touchPoints = await page.evaluate(() => navigator.maxTouchPoints)
  test.skip(touchPoints === 0, 'needs a touch-capable browser context')
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(DEMO_A)
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(2)
  const tap = async (testid: string) => {
    const box = await page.getByTestId(testid).boundingBox()
    expect(box).not.toBeNull()
    await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2)
  }
  await tap('ws-palette-toggle')
  await expect(page.getByTestId('ws-script-panel').getByTestId('ws-drawer-repeat')).toBeVisible()
  await tap('ws-drawer-repeat')
  await expect(page.locator('[data-testid^="ws-script-item-"]')).toHaveCount(3)
  // Sticky run is first-screen on phones: tap it, run to a real pass.
  await tap('ws-sticky-run')
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveText('结论：已完成，已掌握', {
    timeout: 15000,
  })
})

test('round4 fix 3: file menu audit — blockly shows all five, scratch hides new/reset', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await page.getByTestId('ws-file-menu-button').click()
  for (const item of ['ws-file-new', 'ws-file-save', 'ws-file-export', 'ws-file-import', 'ws-file-reset']) {
    await expect(page.getByTestId(item)).toBeVisible()
  }
  await page.goto(DEMO_SCRATCH)
  await expect(page.locator('[data-testid="ws-scratch-mount"] iframe')).toHaveCount(1)
  await page.getByTestId('ws-file-menu-button').click()
  expect(await page.getByTestId('ws-file-new').count()).toBe(0)
  expect(await page.getByTestId('ws-file-reset').count()).toBe(0)
  for (const item of ['ws-file-save', 'ws-file-export', 'ws-file-import']) {
    await expect(page.getByTestId(item)).toBeVisible()
  }
  // Scratch save is a real draft write (of the current, possibly empty,
  // project state) — it must report the true outcome, never a fake one.
  await page.getByTestId('ws-file-save').click()
  await expect(page.getByTestId('ws-save-chip')).toHaveText('已保存到本机')
  // Scratch export without a ready engine is an honest failure, not a
  // silent no-op: the notice carries the real reason, whichever honest
  // path fires here (VM unavailable, load timeout, not ready, no project).
  await page.getByTestId('ws-file-menu-button').click()
  await page.getByTestId('ws-file-export').click()
  await expect(page.getByTestId('ws-notice')).toHaveText(/Scratch.*(就绪|挂载|加载)/)
})
