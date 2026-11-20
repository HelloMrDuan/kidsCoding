import * as fs from 'node:fs'
import * as path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * G1-U1-L01《给狐狸一个开场》统一 LessonWorkspace E2E（实验课，非正式课程）：
 * 桌面 1440x900、平板 768x1024、手机 375x812 三断点；加载、真实拖拽、
 * 运行/停止/重跑、错误态全覆盖、双台词、保存失败 fail-closed、文件菜单、
 * 编辑失效判定、课节隔离、画布 Gate 1。
 *
 * 旧文件 g1-u1-story-lab.spec.ts 已退役：它断言的是 GuidedLessonShell 的
 * testid 与页签结构（lesson-mobile-tab-*、lesson-*-column、story-run、
 * story-feedback），在新壳中全部不存在。旧文件头“浏览器里无法配两句”
 * 的注释已订正：逐块下拉框（每块 say_line 自带的 LINE 字段）就是浏览器
 * 里的逐块路径，见 E8。
 */
const ROUTE = '/learn/story-lab/G1-U1-L01'
const KEY = 'kidscoding-draft:G1-U1-L01'
const LEGACY_KEY = 'kids-story-lesson-v1:G1-U1-L01'
// Evidence is resolved relative to this spec file so it works on any
// machine (CI Runner included), not just the author's workstation:
// apps/web/test-results/g1-u1-l01-evidence — inside the
// apps/web/test-results/ tree the OPS-032 g1-u1-l01-check job uploads
// as the g1-u1-l01-chrome-evidence artifact. (2026-11-13: the previous
// absolute workstation path did not exist on the Runner, so screenshot
// writes failed ENOENT and the spec exited 1.)
const EVIDENCE = path.resolve(__dirname, '../../test-results/g1-u1-l01-evidence')
fs.mkdirSync(EVIDENCE, { recursive: true })

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}

async function noOverflow(page: Page) {
  await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
}

async function waitForShellSaved(page: Page) {
  // Shell autosave is debounced (1000ms); only reload after the chip says saved,
  // otherwise a reload can drop the last edit before the timer fires.
  await expect(page.getByTestId('ws-save-chip')).toContainText('已保存到本机', { timeout: 10_000 })
}

async function add(page: Page, type: string) {
  await page.getByTestId(`lesson-add-${type}`).click()
}

async function runAndExpect(page: Page, passed: boolean, text?: string) {
  await clickRun(page)
  const conclusion = page.getByTestId('ws-feedback-conclusion')
  await expect(conclusion).toContainText(passed ? '已完成' : '未合格', { timeout: 20_000 })
  if (text) await expect(conclusion).toContainText(text)
}

// Run entry differs by viewport by shell design (lesson-workspace.tsx):
// >= 768px the sticky row is display:none and the stage runbar
// (ws-run-toggle) is the run entry; < 768px the sticky row (ws-sticky-run)
// is the in-flow run entry. Click whichever is visible.
async function clickRun(page: Page) {
  if (await page.getByTestId('ws-run-toggle').isVisible()) {
    await page.getByTestId('ws-run-toggle').click()
  } else {
    await page.getByTestId('ws-sticky-run').click()
  }
}

async function next(page: Page) {
  await page.getByTestId('g1-u1-l01-complete-step').click()
}

async function goToStep(page: Page, stepId: string) {
  await page.getByTestId(`g1-u1-l01-goto-${stepId}`).click()
}

async function draftProgramLength(page: Page, stepId: string) {
  return page.evaluate(
    ({ key, stepId: id }) => {
      const raw = window.localStorage.getItem(key)
      if (!raw) return -1
      const parsed = JSON.parse(raw) as { script?: { programs?: Record<string, unknown[]> } }
      return parsed.script?.programs?.[id]?.length ?? -1
    },
    { key: KEY, stepId },
  )
}

async function openFileMenu(page: Page) {
  await page.getByTestId('ws-file-menu-button').click()
}

async function canvasVisibleHeight(page: Page, viewportHeight: number) {
  const svgBox = await page.getByTestId('ws-editor-slot').locator('svg.blocklySvg').boundingBox()
  expect(svgBox).not.toBeNull()
  return Math.max(0, Math.min(viewportHeight, svgBox!.y + svgBox!.height) - Math.max(0, svgBox!.y))
}

test('E1 desktop 1440x900: build, real drag, run, error lab, save and reopen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop viewport runs once, on desktop')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  await expect(page.getByTestId('story-lab-title-row')).toContainText('给狐狸一个开场')
  await expect(page.getByTestId('ws-topbar')).toContainText('给狐狸一个开场')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await expect(page.getByTestId('ws-stage-box')).toBeVisible()
  // Real illustrated fox, never a coloured-circle placeholder.
  await expect(page.locator('[data-character-art="fox"]')).toBeVisible()
  await expect(page.getByTestId('g1-u1-l01-bubble-empty')).toContainText('狐狸还没说话')
  await page.screenshot({ path: `${EVIDENCE}/e1-desktop-start.png` })

  // Guided + design are thinking stages: completing them needs no run.
  await next(page)
  await next(page)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')

  // Build stage: the starter already holds when_start; add say + move.
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(1)
  await add(page, 'say_line')
  await add(page, 'move_right')
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)

  // Real drag: drag the whole when_start stack inside the main workspace
  // (scoped to svg.blocklySvg so the flyout's own when_start block is never
  // the drag source) and drop it; the program (3 blocks, one stack) must survive.
  const block = page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable.when_start')
  await block.scrollIntoViewIfNeeded()
  const box = await block.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + 12)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + 60, box!.y + 12 + 40, { steps: 10 })
  await page.mouse.up()
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)
  await expect.poll(() => page.locator('svg.blocklySvg .blocklyBlockCanvas > g').count()).toBe(1)

  await runAndExpect(page, true, '先打招呼再移动')
  await expect(page.getByTestId('ws-feedback-task')).toContainText('任务判定：通过')
  await expect(page.getByTestId('ws-feedback-stage')).toContainText('狐狸位置 100')
  await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('知识证据：通过')
  await expect(page.getByTestId('g1-u1-l01-fox')).toHaveAttribute('data-fox-position', '100', { timeout: 20_000 })
  await expect(page.getByTestId('g1-u1-l01-bubble')).toContainText('欢迎来到森林剧场')
  await page.screenshot({ path: `${EVIDENCE}/e1-desktop-pass.png` })
  await next(page)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 4 关')

  // Run-verify stage: rebuild from empty, run, then reload and re-run the
  // restored program without rebuilding (save + reopen proof).
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'say_line')
  await add(page, 'move_right')
  await runAndExpect(page, true)
  await waitForShellSaved(page)
  await page.reload()
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 4 关')
  await runAndExpect(page, true)
  await expect(page.getByTestId('g1-u1-l01-fox')).toHaveAttribute('data-fox-position', '100', { timeout: 20_000 })
  await next(page)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 5 关')

  // Error lab: the starter is move-only; run it, see the real failure and
  // the tiered hints (shell drawer, cumulative reveal), then fix it and pass.
  await runAndExpect(page, false, '只有移动没有对白')
  await page.getByTestId('ws-task-button').click()
  const drawer = page.getByTestId('ws-task-drawer')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByTestId('ws-hint-reveal-3')).toBeDisabled()
  await drawer.getByTestId('ws-hint-reveal-1').click()
  await expect(drawer).toContainText('先辨认题目需要变化的对象和目标')
  await drawer.getByTestId('ws-hint-reveal-2').click()
  await expect(drawer).toContainText('把问题缩小到关键动作')
  await page.getByTestId('ws-task-button').click()
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'say_line')
  await add(page, 'move_right')
  await runAndExpect(page, true)
  await next(page)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 6 关')

  // Creative stage: the starter is already a passing program; run and complete.
  await runAndExpect(page, true)
  await next(page)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 7 关')

  // Review: the correct reflection answer, then finish; finish survives reload.
  await page.getByTestId('g1-u1-l01-reflection-option-0').click()
  await expect(page.getByTestId('g1-u1-l01-reflection-result')).toHaveAttribute('data-correct', 'true')
  await next(page)
  await expect(page.getByTestId('g1-u1-l01-finished')).toBeVisible()
  await expect(page.getByTestId('g1-u1-l01-finished')).toContainText('只保存在本机')
  await waitForShellSaved(page)
  await page.reload()
  await expect(page.getByTestId('g1-u1-l01-finished')).toBeVisible()
  await page.screenshot({ path: `${EVIDENCE}/e1-desktop-finished.png` })
})

test('E2 mobile 375x812: single-screen touch workspace, build, run, save and reopen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'tap() needs a touch project')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(ROUTE)
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible({ timeout: 20_000 })
  // No old tab pages anymore: single-screen touch workspace.
  await expect(page.getByTestId('lesson-mobile-tab-code')).toHaveCount(0)
  await expect(page.getByTestId('lesson-mobile-tab-stage')).toHaveCount(0)
  // First screen: stage preview + script + run row + task entry, no scrolling needed.
  const stageBox = await page.getByTestId('ws-stage-box').boundingBox()
  expect(stageBox).not.toBeNull()
  expect(stageBox!.y + stageBox!.height).toBeLessThanOrEqual(812)
  const stickyRun = await page.getByTestId('ws-sticky-run').boundingBox()
  expect(stickyRun).not.toBeNull()
  expect(stickyRun!.y + stickyRun!.height).toBeLessThanOrEqual(812)
  const taskButton = await page.getByTestId('ws-task-button').boundingBox()
  expect(taskButton).not.toBeNull()
  expect(taskButton!.y + taskButton!.height).toBeLessThanOrEqual(812)
  const editorSlot = await page.getByTestId('ws-editor-slot').boundingBox()
  expect(editorSlot).not.toBeNull()
  expect(editorSlot!.y).toBeLessThan(812)
  await noOverflow(page)

  await page.getByTestId('g1-u1-l01-complete-step').tap()
  await page.getByTestId('g1-u1-l01-complete-step').tap()
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')
  await page.getByTestId('lesson-add-say_line').tap()
  await page.getByTestId('lesson-add-move_right').tap()
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)
  // Run from inside the script area (sticky run row), no tab switch.
  await page.getByTestId('ws-sticky-run').tap()
  await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('已完成', { timeout: 20_000 })
  await expect(page.getByTestId('g1-u1-l01-fox')).toHaveAttribute('data-fox-position', '100', { timeout: 20_000 })
  await page.screenshot({ path: `${EVIDENCE}/e2-mobile-pass.png` })
  await noOverflow(page)

  // Save + reopen: reload on the same stage and re-run without rebuilding.
  await waitForShellSaved(page)
  await page.reload()
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')
  await page.getByTestId('ws-sticky-run').tap()
  await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('已完成', { timeout: 20_000 })
  await page.screenshot({ path: `${EVIDENCE}/e2-mobile-stage.png` })
})

test('E3 desktop: error states — wrong actor, wrong text, missing start, say after move, disconnected move', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop viewport runs once, on desktop')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  await next(page)
  await next(page)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')

  async function rebuild(types: string[]) {
    await page.getByTestId('lesson-clear-program').click()
    for (const type of types) await add(page, type)
    await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(types.length)
  }

  // Wrong actor: switch to the audience before the opening line.
  await rebuild(['when_start', 'switch_character', 'say_line', 'move_right'])
  await runAndExpect(page, false, '对白给错人')

  // Wrong text: the say line is the extension question, not the opening line;
  // switching the preset back to the opening line fixes it for real.
  await rebuild(['when_start', 'say_line', 'move_right'])
  await page.getByTestId('lesson-say-line-ready').click()
  await runAndExpect(page, false, '开场对白不是欢迎来到森林剧场')
  await page.getByTestId('lesson-say-line-opening').click()
  await runAndExpect(page, true)

  // Missing start: say + move with no start event at all.
  await rebuild(['say_line', 'move_right'])
  await runAndExpect(page, false, '缺少开始事件')

  // Say after move: the fox moves before saying the opening line.
  await rebuild(['when_start', 'move_right', 'say_line'])
  await runAndExpect(page, false, '先打招呼再移动')

  // Disconnected: tear the move block off the main stack with a short drag
  // that keeps it inside the canvas. It stays in the workspace as a second
  // top-level block, and the draft keeps it (3 blocks, the last flagged
  // disconnected) — but the run ignores the loose block.
  await rebuild(['when_start', 'say_line', 'move_right'])
  const moveBlock = page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable.move_right')
  await moveBlock.scrollIntoViewIfNeeded()
  const moveBox = await moveBlock.boundingBox()
  expect(moveBox).not.toBeNull()
  await page.mouse.move(moveBox!.x + moveBox!.width / 2, moveBox!.y + moveBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(moveBox!.x + moveBox!.width / 2 + 80, moveBox!.y + moveBox!.height / 2 + 60, { steps: 10 })
  await page.mouse.up()
  await expect.poll(() => page.locator('svg.blocklySvg .blocklyBlockCanvas > g').count()).toBe(2)
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)
  await runAndExpect(page, false, '缺少移动')
})

test('E4 tablet 768x1024: build, run, save and reopen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'tablet viewport runs inside the desktop project')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(ROUTE)
  await expect(page.getByTestId('story-lab-title-row')).toContainText('给狐狸一个开场')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await expect(page.getByTestId('ws-stage-box')).toBeVisible()
  await expect(page.locator('[data-character-art="fox"]')).toBeVisible()
  await noOverflow(page)
  await next(page)
  await next(page)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')
  await add(page, 'say_line')
  await add(page, 'move_right')
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)
  await noOverflow(page)
  await runAndExpect(page, true, '先打招呼再移动')
  await expect(page.getByTestId('g1-u1-l01-fox')).toHaveAttribute('data-fox-position', '100', { timeout: 20_000 })
  await expect(page.getByTestId('g1-u1-l01-bubble')).toContainText('欢迎来到森林剧场')
  await page.screenshot({ path: `${EVIDENCE}/e4-tablet-pass.png` })
  await waitForShellSaved(page)
  await page.reload()
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')
  await runAndExpect(page, true)
  await noOverflow(page)
})

test('E5 desktop: switching lessonId does not pollute the saved draft', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop viewport runs once, on desktop')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  await next(page)
  await next(page)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')
  await add(page, 'say_line')
  await add(page, 'move_right')
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)
  await waitForShellSaved(page)
  const saved = await page.evaluate((key) => window.localStorage.getItem(key), KEY)
  expect(saved).not.toBeNull()

  // G1-U1-L02 is a real lesson since PR #530, so the 404 probe must use a
  // lessonId that truly does not exist; the intent (switching lessonId
  // must not pollute the saved draft) is unchanged.
  const resp = await page.goto('/learn/story-lab/G1-U1-L99')
  expect(resp?.status()).toBe(404)
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), KEY)).toBe(saved)
  expect(await page.evaluate(() => window.localStorage.getItem('kidscoding-draft:G1-U1-L02'))).toBeNull()
  // The legacy key is abandoned (Q9 option A): it is never written.
  expect(await page.evaluate((key) => window.localStorage.getItem(key), LEGACY_KEY)).toBeNull()

  await page.goto(ROUTE)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)
  await runAndExpect(page, true)
})

test('E6 desktop: run, stop, re-run — stop cancels playback, script survives, re-run agrees', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop viewport runs once, on desktop')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  await next(page)
  await next(page)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')
  await add(page, 'say_line')
  await add(page, 'move_right')
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)

  // Desktop run entry is the stage runbar (ws-run-toggle); the sticky row
  // is display:none at >= 768px by shell design.
  const runButton = page.getByTestId('ws-run-toggle')
  await runButton.click()
  await expect(runButton).toHaveText('停止', { timeout: 5_000 })
  await runButton.click()
  await expect(runButton).toHaveText('运行作品', { timeout: 5_000 })
  // Stopping cancels the pending judgment: no conclusion is shown.
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
  await expect(page.getByTestId('ws-stage-state')).toContainText('未运行')
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)

  // Re-run agrees with the first run; running again still passes once.
  await runAndExpect(page, true)
  await runAndExpect(page, true)
})

// E7 canvas Gate 1 — split into two viewport-specific tests (2026-11-13,
// SYS-108 §2.2): the old single test looped over 768 and 375 inside one
// test on the desktop project, so no --grep/--project partition could put
// the 768 leg in the tablet shard and the 375 leg in the mobile shard
// without duplicating the test or omitting a leg. The two tests share one
// helper; every assertion is preserved (visible heights, run/task
// reachability, noOverflow, first block + all three blocks above the
// line, E7 three-block bottoms).
async function gate1Canvas(page: Page, width: number, height: number, minVisible: number) {
  await page.setViewportSize({ width, height })
  await page.goto(ROUTE)
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible({ timeout: 20_000 })
  // Gate 1 is a load-time layout budget (same formulation as
  // lesson-workspace.spec.ts 'gate1 layout budget default'): measured at
  // scroll 0, before any click scrolls the page. A fresh load starts with
  // an empty canvas by design (the draft starts empty), so there is no
  // first block to check at load; the "one complete block group visible
  // and operable" part is verified below, after building, back at
  // scroll 0.
  const svgBox = await page.getByTestId('ws-editor-slot').locator('svg.blocklySvg').boundingBox()
  expect(svgBox).not.toBeNull()
  const visibleAtLoad = Math.max(0, Math.min(height, svgBox!.y + svgBox!.height) - Math.max(0, svgBox!.y))
  expect(visibleAtLoad).toBeGreaterThanOrEqual(minVisible)
  // Mobile only: the fixed bottom nav covers roughly the bottom 62px
  // (shell spec 'mobile 375 first screen'), so the canvas top must
  // clear y=750 to be genuinely visible, not merely rendered behind
  // the nav. Tablet has no bottom nav.
  if (width === 375) expect(svgBox!.y).toBeLessThan(750)
  // E7 FIXED (2026-11-12, OPS-033 + lesson layer, measured — do not
  // weaken this bound): the 3-block stack was ~189px from a canvas top
  // of ~608, ending ~810, 60px past the 750 nav line. Closed by
  // (a) lesson layer: route eyebrow hidden <md, back link icon-only
  // <md so the h1 fits one line (title row 85.2 -> 36.6px), passed
  // marker '（已通过）' -> ' ✓' so the step header never wraps to
  // 2 lines after passing; (b) shell layer (OPS-033): phone-only
  // vertical spacing compression in lesson-workspace.tsx (topbar /
  // goalstrip / panel / sticky padding + margins, -30px total, no
  // content or control removed, stage stays 140px, buttons full
  // size). Re-measured 2026-11-12: canvas top 529.7, stack
  // 541.7–731.1, 18.9px clear of the 750 line; canvas visible
  // 282.3px at step 3 (>= 220). The bare shell demo passes because
  // its starter program is only ~110px tall from a canvas top of 566.
  // Run and task entries reachable without scrolling.
  for (const testid of ['ws-run-toggle', 'ws-task-button']) {
    const box = await page.getByTestId(testid).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.y + box!.height).toBeLessThanOrEqual(height)
  }
  await noOverflow(page)
  // Build the program, then re-verify the scroll-independent part of
  // the gate: the canvas keeps >= minVisible visible height even after
  // the page has scrolled to the palette. Back at scroll 0, the first
  // block group must sit fully inside the viewport and inside the
  // canvas (not cut off by the canvas edge or the fold).
  await next(page)
  await next(page)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')
  await add(page, 'say_line')
  await add(page, 'move_right')
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)
  await page.evaluate(() => window.scrollTo(0, 0))
  const svgBoxAfter = await page.getByTestId('ws-editor-slot').locator('svg.blocklySvg').boundingBox()
  expect(svgBoxAfter).not.toBeNull()
  const firstBlock = page.locator('.blocklyBlockCanvas .blocklyDraggable').first()
  await expect(firstBlock).toBeVisible({ timeout: 10_000 })
  const firstBox = await firstBlock.boundingBox()
  expect(firstBox).not.toBeNull()
  expect(firstBox!.y).toBeGreaterThanOrEqual(0)
  expect(firstBox!.y).toBeGreaterThanOrEqual(svgBoxAfter!.y)
  // Mobile: the block must sit fully above the bottom nav (y=750),
  // not merely inside the 812px viewport behind it (shell spec).
  expect(firstBox!.y + firstBox!.height).toBeLessThanOrEqual(width === 375 ? 750 : height)
  // E7 strengthened (2026-11-13, OPS-032 fix): assert EVERY block of
  // the 3-block stack, not just the first — the stack bottom is the
  // last block's bottom, and the original failure was the stack bottom
  // (~810) past the 750 nav line while the first block was fine.
  // Tablet leg: every block bottom must be within the viewport (1024).
  const blocks = page.locator('.blocklyBlockCanvas .blocklyDraggable')
  await expect(blocks).toHaveCount(3)
  const blockBottoms: number[] = []
  for (let i = 0; i < 3; i++) {
    const box = await blocks.nth(i).boundingBox()
    expect(box).not.toBeNull()
    blockBottoms.push(box!.y + box!.height)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.y).toBeGreaterThanOrEqual(svgBoxAfter!.y)
    expect(box!.y + box!.height).toBeLessThanOrEqual(width === 375 ? 750 : height)
  }
  const visibleAfterBuild = await canvasVisibleHeight(page, height)
  expect(visibleAfterBuild).toBeGreaterThanOrEqual(minVisible)
  console.log(`E7 ${width}x${height}: visibleAtLoad=${visibleAtLoad} visibleAfterBuild=${visibleAfterBuild} firstBlockY=${Math.round(firstBox!.y)} firstBlockBottom=${Math.round(firstBox!.y + firstBox!.height)} blockBottoms=[${blockBottoms.map((b) => Math.round(b)).join(', ')}]`)
  await noOverflow(page)
  await page.evaluate(() => window.localStorage.clear())
}

test('E7 tablet 768x1024: canvas Gate 1 visible height ≥300', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'tablet viewport runs inside the desktop project')
  test.setTimeout(240_000)
  await gate1Canvas(page, 768, 1024, 300)
})

test('E7 mobile 375x812: canvas Gate 1 visible height ≥220, three blocks above 750', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile viewport runs on the mobile project')
  test.setTimeout(240_000)
  await gate1Canvas(page, 375, 812, 220)
})

test('E8 desktop: two say lines, one each — per-block dropdowns, global rewrite is repairable per block', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop viewport runs once, on desktop')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  // 第 6 关须先通过第 3 关（搭建关须运行通过才能完成），连点“完成这一关”
  // 无法越过它：用关间导航直接跳到创意关（真实 UI 入口，不绕过判定）。
  await goToStep(page, 'creative-encore')
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 6 关')
  // Creative starter is already [when_start, say(opening), move]; add a
  // second say block. It defaults to the last chosen line (opening).
  await add(page, 'say_line')
  await expect.poll(() => draftProgramLength(page, 'creative-encore')).toBe(4)
  // Per-block dropdown on the canvas: the 4th block's own LINE field.
  // Both say blocks show the opening text at first; click the last one.
  const openingTexts = page.locator('svg.blocklySvg text', { hasText: '欢迎来到森林剧场' })
  await openingTexts.last().click({ timeout: 10_000 })
  const dropdown = page.locator('.blocklyDropDownDiv')
  await expect(dropdown).toBeVisible({ timeout: 10_000 })
  await dropdown.getByText('你们准备好了吗？').click()
  await expect.poll(() => draftProgramLength(page, 'creative-encore')).toBe(4)
  // The canvas now shows each say block with its own line.
  await expect(page.locator('svg.blocklySvg').getByText('你们准备好了吗？')).toBeVisible()
  await runAndExpect(page, true)
  await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('拓展也做到了')
  await expect(page.getByTestId('g1-u1-l01-run-log')).toContainText('狐狸说：你们准备好了吗？')

  // Global button rewrites ALL say lines: both become the question now.
  await page.getByTestId('lesson-say-line-ready').click()
  await runAndExpect(page, false, '开场对白不是欢迎来到森林剧场')
  // Repair per block with the slot list selects: first say back to opening,
  // second say stays the question.
  await page.getByTestId('g1-u1-l01-block-line-1').selectOption('opening')
  await expect(page.getByTestId('g1-u1-l01-block-line-3')).toHaveValue('ready')
  await runAndExpect(page, true)
  await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('拓展也做到了')
})

test('E9 desktop: save failure is fail-closed; file menu new / reset / export / invalid import', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop viewport runs once, on desktop')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  await next(page)
  await next(page)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')
  await add(page, 'say_line')
  await add(page, 'move_right')
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)
  await waitForShellSaved(page)

  // Save failure: make every localStorage write throw, then save explicitly.
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    }
  })
  await openFileMenu(page)
  await page.getByTestId('ws-file-save').click()
  await expect(page.getByTestId('ws-save-chip')).toContainText('未能保存')
  await expect(page.getByTestId('ws-save-message')).toContainText('未能保存')
  // A reload clears the injected failure; the saved draft is intact.
  await page.reload()
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)

  // File menu: export downloads the slot data JSON.
  const downloadPromise = page.waitForEvent('download')
  await openFileMenu(page)
  await page.getByTestId('ws-file-export').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('G1-U1-L01-data.json')

  // Invalid import (valid JSON, invalid shape) is rejected; the program is untouched.
  await page.getByTestId('ws-file-input').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 2, lessonId: 'G1-U1-L01' })),
  })
  await expect(page.getByTestId('ws-notice')).toContainText('导入文件数据无效，原作品未变', { timeout: 10_000 })
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)
  // Malformed JSON is rejected the same way (no crash, no wipe).
  await page.getByTestId('ws-file-input').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{not json'),
  })
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(3)

  // File menu: reset restores the initial lesson (step 1, starter programs).
  await openFileMenu(page)
  await page.getByTestId('ws-file-reset').click()
  await waitForShellSaved(page)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 1 关')
  await goToStep(page, 'build-opening')
  await expect.poll(() => draftProgramLength(page, 'build-opening')).toBe(1)
})

test('E10 desktop: editing after a pass invalidates the shell judgment', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop viewport runs once, on desktop')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  await next(page)
  await next(page)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')
  await add(page, 'say_line')
  await add(page, 'move_right')
  await runAndExpect(page, true)
  await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('已完成')
  // Any edit invalidates the old judgment: stale note shows, conclusion is gone.
  await page.getByTestId('g1-u1-l01-block-down-1').click()
  await expect(page.getByTestId('ws-judgment-stale')).toContainText('旧判定已失效，修改后请重新运行')
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
  // Move it back up and re-run to pass again.
  await page.getByTestId('g1-u1-l01-block-up-2').click()
  await runAndExpect(page, true)
})
