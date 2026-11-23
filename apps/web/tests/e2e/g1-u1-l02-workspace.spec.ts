import * as fs from 'node:fs'
import * as path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * G1-U1-L02《与兔子轮流说话》统一 LessonWorkspace E2E（实验课，非正式课程）：
 * 桌面 1440x900、平板 768x1024、手机 375x812 三断点；加载、真实拖拽、
 * 运行/停止/重跑、错误态全覆盖、双台词、保存失败 fail-closed、文件菜单、
 * 编辑失效判定、课节隔离、画布 Gate 1。
 *
 * 照抄 g1-u1-l01-workspace.spec.ts 的结构（11 test，E1–E10，E7 拆
 * tablet/mobile），只改 L02 语义：
 * - 正确程序是 4 块（开始 → 狐狸说“你好” → 切换角色 → 兔子说“很高兴见到你”），
 *   不是 L01 的 3 块；E7 测量对象是本课实际的 4 块程序。
 * - 错误实验的失败码是 reversed_order（兔子先说、狐狸后说）。
 * - 舞台是狐狸 + 兔子双角色，无移动；气泡标明说话人。
 * - 课节隔离（E5）：L01 路由在本课已存在（同路由按 lessonId 分支），
 *   故 404 断言只对不存在的课节号（G1-U1-L99）成立；L01 与 L02 之间
 *   断言的是双向隔离（对方草稿键不动、回本课草稿原样恢复且仍能运行），
 *   不再把“访问 L01 得 404”当作断言——那在双课并存的路由下是假命题。
 */
const ROUTE = '/learn/story-lab/G1-U1-L02'
const L01_ROUTE = '/learn/story-lab/G1-U1-L01'
const KEY = 'kidscoding-draft:G1-U1-L02'
const L01_KEY = 'kidscoding-draft:G1-U1-L01'
const LEGACY_KEY = 'kids-story-lesson-v1:G1-U1-L02'
// Evidence is resolved relative to this spec file so it works on any
// machine (CI Runner included), not just the author's workstation:
// apps/web/test-results/g1-u1-l02-evidence.
const EVIDENCE = path.resolve(__dirname, '../../test-results/g1-u1-l02-evidence')
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
  await page.getByTestId('g1-u1-l02-complete-step').click()
}

async function goToStep(page: Page, stepId: string) {
  await page.getByTestId(`g1-u1-l02-goto-${stepId}`).click()
}

async function draftProgramLength(page: Page, stepId: string, key: string = KEY) {
  return page.evaluate(
    ({ key: k, stepId: id }) => {
      const raw = window.localStorage.getItem(k)
      if (!raw) return -1
      const parsed = JSON.parse(raw) as { script?: { programs?: Record<string, unknown[]> } }
      return parsed.script?.programs?.[id]?.length ?? -1
    },
    { key, stepId },
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

/**
 * 拼出本课正确程序（4 块）：开始 → 狐狸说“你好” → 切换角色 →
 * 兔子说“很高兴见到你”。新加的 say_line 默认取上次所选行（“你好”），
 * 所以第二块说一句话须经插槽逐块列表改成“很高兴见到你”。
 */
async function buildCorrectProgram(page: Page, stepId: string) {
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'say_line')
  await add(page, 'switch_character')
  await add(page, 'say_line')
  await expect.poll(() => draftProgramLength(page, stepId)).toBe(4)
  // New say blocks default to the last chosen line; pin both lines
  // explicitly — a global choice made by an earlier case (e.g. “glad”)
  // would otherwise leak into the first say block here.
  await page.getByTestId('g1-u1-l02-block-line-1').selectOption('hello')
  await page.getByTestId('g1-u1-l02-block-line-3').selectOption('glad')
}

test('E1 desktop 1440x900: build, real drag, run, error lab, save and reopen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop viewport runs once, on desktop')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  await expect(page.getByTestId('story-lab-title-row')).toContainText('与兔子轮流说话')
  await expect(page.getByTestId('ws-topbar')).toContainText('与兔子轮流说话')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await expect(page.getByTestId('ws-stage-box')).toBeVisible()
  // Real illustrated fox and rabbit, never coloured-circle placeholders.
  await expect(page.locator('[data-character-art="fox"]')).toBeVisible()
  await expect(page.locator('[data-character-art="rabbit"]')).toBeVisible()
  await expect(page.getByTestId('g1-u1-l02-bubble-empty')).toContainText('狐狸和兔子还没打招呼')
  await page.screenshot({ path: `${EVIDENCE}/e1-desktop-start.png` })

  // Guided + design are thinking stages: completing them needs no run.
  await next(page)
  await next(page)
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 3 关')

  // Build stage: the starter already holds when_start; add say + switch + say.
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(1)
  await add(page, 'say_line')
  await add(page, 'switch_character')
  await add(page, 'say_line')
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(4)
  // The second say block defaults to the last chosen line (“你好”); give it
  // the rabbit reply through the slot per-block list.
  await page.getByTestId('g1-u1-l02-block-line-3').selectOption('glad')

  // Real drag: drag the whole when_start stack inside the main workspace
  // (scoped to svg.blocklySvg so the flyout's own when_start block is never
  // the drag source) and drop it; the program (4 blocks, one stack) must survive.
  const block = page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable.when_start')
  await block.scrollIntoViewIfNeeded()
  const box = await block.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + 12)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + 60, box!.y + 12 + 40, { steps: 10 })
  await page.mouse.up()
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(4)
  await expect.poll(() => page.locator('svg.blocklySvg .blocklyBlockCanvas > g').count()).toBe(1)

  await runAndExpect(page, true, '两句对白按狐狸→兔子的顺序出现')
  await expect(page.getByTestId('ws-feedback-task')).toContainText('任务判定：通过')
  await expect(page.getByTestId('ws-feedback-stage')).toContainText('狐狸先说“你好”')
  await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('知识证据：通过')
  await expect(page.getByTestId('g1-u1-l02-bubble')).toContainText('兔子说：')
  await expect(page.getByTestId('g1-u1-l02-bubble')).toContainText('很高兴见到你')
  await page.screenshot({ path: `${EVIDENCE}/e1-desktop-pass.png` })
  await next(page)
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 4 关')

  // Run-verify stage: rebuild from empty, run, then reload and re-run the
  // restored program without rebuilding (save + reopen proof).
  await buildCorrectProgram(page, 'run-verify')
  await runAndExpect(page, true)
  await waitForShellSaved(page)
  await page.reload()
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 4 关')
  await runAndExpect(page, true)
  await expect(page.getByTestId('g1-u1-l02-bubble')).toContainText('很高兴见到你')
  await next(page)
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 5 关')

  // Error lab: the starter is the reversed program; run it, see the real failure
  // and the tiered hints (shell drawer, cumulative reveal), then fix it and pass.
  await runAndExpect(page, false, '顺序颠倒了')
  await page.getByTestId('ws-task-button').click()
  const drawer = page.getByTestId('ws-task-drawer')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByTestId('ws-hint-reveal-3')).toBeDisabled()
  await drawer.getByTestId('ws-hint-reveal-1').click()
  await expect(drawer).toContainText('先辨认题目需要变化的对象和目标')
  await drawer.getByTestId('ws-hint-reveal-2').click()
  await expect(drawer).toContainText('把问题缩小到关键动作')
  await page.getByTestId('ws-task-button').click()
  await buildCorrectProgram(page, 'error-lab')
  await runAndExpect(page, true)
  await next(page)
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 6 关')

  // Creative stage: the starter is already a passing program; run and complete.
  await runAndExpect(page, true)
  await next(page)
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 7 关')

  // Review: the correct reflection answer, then finish; finish survives reload.
  await page.getByTestId('g1-u1-l02-reflection-option-0').click()
  await expect(page.getByTestId('g1-u1-l02-reflection-result')).toHaveAttribute('data-correct', 'true')
  await next(page)
  await expect(page.getByTestId('g1-u1-l02-finished')).toBeVisible()
  await expect(page.getByTestId('g1-u1-l02-finished')).toContainText('只保存在本机')
  await waitForShellSaved(page)
  await page.reload()
  await expect(page.getByTestId('g1-u1-l02-finished')).toBeVisible()
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

  await page.getByTestId('g1-u1-l02-complete-step').tap()
  await page.getByTestId('g1-u1-l02-complete-step').tap()
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 3 关')
  await page.getByTestId('lesson-add-say_line').tap()
  await page.getByTestId('lesson-add-switch_character').tap()
  await page.getByTestId('lesson-add-say_line').tap()
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(4)
  await page.getByTestId('g1-u1-l02-block-line-3').selectOption('glad')
  // Run from inside the script area (sticky run row), no tab switch.
  await page.getByTestId('ws-sticky-run').tap()
  await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('已完成', { timeout: 20_000 })
  await expect(page.getByTestId('g1-u1-l02-bubble')).toContainText('兔子说：')
  await expect(page.getByTestId('g1-u1-l02-bubble')).toContainText('很高兴见到你')
  await page.screenshot({ path: `${EVIDENCE}/e2-mobile-pass.png` })
  await noOverflow(page)

  // Save + reopen: reload on the same stage and re-run without rebuilding.
  await waitForShellSaved(page)
  await page.reload()
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 3 关')
  await page.getByTestId('ws-sticky-run').tap()
  await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('已完成', { timeout: 20_000 })
  await page.screenshot({ path: `${EVIDENCE}/e2-mobile-stage.png` })
})

test('E3 desktop: error states — reversed order, wrong actor, wrong text, missing start, missing line, disconnected say', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop viewport runs once, on desktop')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  await next(page)
  await next(page)
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 3 关')

  async function rebuild(types: string[]) {
    await page.getByTestId('lesson-clear-program').click()
    for (const type of types) await add(page, type)
    await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(types.length)
  }

  // Reversed order: rabbit speaks first, fox answers.
  await rebuild(['when_start', 'switch_character', 'say_line', 'switch_character', 'say_line'])
  await page.getByTestId('g1-u1-l02-block-line-2').selectOption('glad')
  await page.getByTestId('g1-u1-l02-block-line-4').selectOption('hello')
  await runAndExpect(page, false, '顺序颠倒了')

  // Wrong actor: both lines belong to the fox (no switch in between).
  await rebuild(['when_start', 'say_line', 'say_line'])
  await page.getByTestId('g1-u1-l02-block-line-1').selectOption('hello')
  await page.getByTestId('g1-u1-l02-block-line-2').selectOption('glad')
  await runAndExpect(page, false, '对白给错人')

  // Wrong text: the global button rewrites every say line to the same line;
  // repairing the first line per block fixes it for real.
  await buildCorrectProgram(page, 'build-turn-taking')
  await page.getByTestId('lesson-say-line-glad').click()
  await runAndExpect(page, false, '对白说错了')
  await page.getByTestId('g1-u1-l02-block-line-1').selectOption('hello')
  await runAndExpect(page, true)

  // Missing start: say + switch + say with no start event at all.
  await rebuild(['say_line', 'switch_character', 'say_line'])
  await runAndExpect(page, false, '缺少开始事件')

  // Missing second line: only the fox line, no rabbit reply. Pin the first
  // line explicitly: a global choice from the wrong-text case above would
  // otherwise make the added say block default to the wrong line.
  await rebuild(['when_start', 'say_line'])
  await page.getByTestId('g1-u1-l02-block-line-1').selectOption('hello')
  await runAndExpect(page, false, '缺少对白')

  // Disconnected: tear the last say block off the main stack with a short drag
  // that keeps it inside the canvas. It stays in the workspace as a second
  // top-level block, and the draft keeps it (4 blocks, the last flagged
  // disconnected) — but the run ignores the loose block.
  await buildCorrectProgram(page, 'build-turn-taking')
  const lastSay = page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable.say_line').last()
  await lastSay.scrollIntoViewIfNeeded()
  const sayBox = await lastSay.boundingBox()
  expect(sayBox).not.toBeNull()
  await page.mouse.move(sayBox!.x + sayBox!.width / 2, sayBox!.y + sayBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(sayBox!.x + sayBox!.width / 2 + 80, sayBox!.y + sayBox!.height / 2 + 60, { steps: 10 })
  await page.mouse.up()
  await expect.poll(() => page.locator('svg.blocklySvg .blocklyBlockCanvas > g').count()).toBe(2)
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(4)
  await runAndExpect(page, false, '缺少对白')
})

test('E4 tablet 768x1024: build, run, save and reopen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'tablet viewport runs inside the desktop project')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(ROUTE)
  await expect(page.getByTestId('story-lab-title-row')).toContainText('与兔子轮流说话')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await expect(page.getByTestId('ws-stage-box')).toBeVisible()
  await expect(page.locator('[data-character-art="fox"]')).toBeVisible()
  await expect(page.locator('[data-character-art="rabbit"]')).toBeVisible()
  await noOverflow(page)
  await next(page)
  await next(page)
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 3 关')
  await add(page, 'say_line')
  await add(page, 'switch_character')
  await add(page, 'say_line')
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(4)
  await page.getByTestId('g1-u1-l02-block-line-3').selectOption('glad')
  await noOverflow(page)
  await runAndExpect(page, true, '两句对白按狐狸→兔子的顺序出现')
  await expect(page.getByTestId('g1-u1-l02-bubble')).toContainText('很高兴见到你')
  await page.screenshot({ path: `${EVIDENCE}/e4-tablet-pass.png` })
  await waitForShellSaved(page)
  await page.reload()
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 3 关')
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
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 3 关')
  await add(page, 'say_line')
  await add(page, 'switch_character')
  await add(page, 'say_line')
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(4)
  await page.getByTestId('g1-u1-l02-block-line-3').selectOption('glad')
  await waitForShellSaved(page)
  // The saved program must carry both lines (fox “你好”, rabbit “很高兴见到你”);
  // the length-only poll above cannot catch a lost line. Poll the saved draft
  // itself: the shell autosave is debounced and the chip can still show the
  // previous 'saved' state while the line change is pending, so a single
  // read right after waitForShellSaved is racy.
  await expect
    .poll(async () =>
      page.evaluate((key) => {
        const raw = window.localStorage.getItem(key)
        const parsed = JSON.parse(raw!) as {
          script?: { programs?: Record<string, { type: string; line?: string }[]> }
        }
        return parsed.script?.programs?.['build-turn-taking']?.map((b) => b.line ?? b.type)
      }, KEY),
    )
    .toEqual(['when_start', 'hello', 'switch_character', 'glad'])
  const saved = await page.evaluate((key) => window.localStorage.getItem(key), KEY)
  expect(saved).not.toBeNull()

  // The route guard still 404s for a lesson that does not exist.
  const resp = await page.goto('/learn/story-lab/G1-U1-L99')
  expect(resp?.status()).toBe(404)
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), KEY)).toBe(saved)
  // The legacy key is abandoned (Q9 option A): it is never written.
  expect(await page.evaluate((key) => window.localStorage.getItem(key), LEGACY_KEY)).toBeNull()

  // The sibling lesson loads on its own route without touching this draft.
  await page.goto(L01_ROUTE)
  await expect(page.getByTestId('story-lab-title-row')).toContainText('给狐狸一个开场')
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), KEY)).toBe(saved)
  expect(await page.evaluate((key) => window.localStorage.getItem(key), L01_KEY)).toBeNull()

  // Back on this lesson the draft is restored intact and still runs.
  await page.goto(ROUTE)
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 3 关')
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(4)
  await runAndExpect(page, true)
  // The passing run legitimately records the step as passed and re-saves,
  // so re-capture the draft before comparing it across the reverse leg.
  const savedAfterRun = await page.evaluate((key) => window.localStorage.getItem(key), KEY)
  expect(savedAfterRun).not.toBeNull()

  // Reverse direction: build an L01 draft, visit this lesson, and the L01
  // draft must survive untouched; back on L01 it still runs.
  await page.goto(L01_ROUTE)
  await page.getByTestId('g1-u1-l01-complete-step').click()
  await page.getByTestId('g1-u1-l01-complete-step').click()
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')
  await page.getByTestId('lesson-add-say_line').click()
  await page.getByTestId('lesson-add-move_right').click()
  await expect.poll(() => draftProgramLength(page, 'build-opening', L01_KEY)).toBe(3)
  await expect(page.getByTestId('ws-save-chip')).toContainText('已保存到本机', { timeout: 10_000 })
  const l01Saved = await page.evaluate((key) => window.localStorage.getItem(key), L01_KEY)
  expect(l01Saved).not.toBeNull()
  await page.goto(ROUTE)
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 3 关')
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), L01_KEY)).toBe(l01Saved)
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), KEY)).toBe(savedAfterRun)
  await page.goto(L01_ROUTE)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')
  await expect.poll(() => draftProgramLength(page, 'build-opening', L01_KEY)).toBe(3)
  await page.getByTestId('ws-run-toggle').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('已完成', { timeout: 20_000 })
})

test('E6 desktop: run, stop, re-run — stop cancels playback, script survives, re-run agrees', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop viewport runs once, on desktop')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  await next(page)
  await next(page)
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 3 关')
  await add(page, 'say_line')
  await add(page, 'switch_character')
  await add(page, 'say_line')
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(4)
  await page.getByTestId('g1-u1-l02-block-line-3').selectOption('glad')

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
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(4)

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
// reachability, noOverflow, first block + all four blocks above the
// line, E7 four-block bottoms).
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
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 3 关')
  await add(page, 'say_line')
  await add(page, 'switch_character')
  await add(page, 'say_line')
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(4)
  await page.getByTestId('g1-u1-l02-block-line-3').selectOption('glad')
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
  // E7 strengthened: assert EVERY block of the 4-block stack, not just the
  // first — the stack bottom is the last block's bottom. Tablet leg: every
  // block bottom must be within the viewport (1024). L02 has 4 blocks,
  // not L01's 3; the measurement must cover the real program.
  const blocks = page.locator('.blocklyBlockCanvas .blocklyDraggable')
  await expect(blocks).toHaveCount(4)
  const blockBottoms: number[] = []
  for (let i = 0; i < 4; i++) {
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

test('E7 mobile 375x812: canvas Gate 1 visible height ≥220, four blocks above 750', async ({ page }, testInfo) => {
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
  await goToStep(page, 'creative-farewell')
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 6 关')
  // Creative starter is already [when_start, say(hello), switch, say(glad)];
  // add a third say block. It defaults to the last chosen line (hello).
  await add(page, 'say_line')
  await expect.poll(() => draftProgramLength(page, 'creative-farewell')).toBe(5)
  // Per-block dropdown on the canvas: the 5th block's own LINE field.
  // Two say blocks show “你好” at first; click the last one.
  const helloTexts = page.locator('svg.blocklySvg text', { hasText: '你好' })
  await helloTexts.last().click({ timeout: 10_000 })
  const dropdown = page.locator('.blocklyDropDownDiv')
  await expect(dropdown).toBeVisible({ timeout: 10_000 })
  await dropdown.getByText('很高兴见到你').click()
  await expect.poll(() => draftProgramLength(page, 'creative-farewell')).toBe(5)
  // The canvas now shows the third say block with its own line: two blocks
  // read “很高兴见到你” (the rabbit reply and the new third line).
  await expect(page.locator('svg.blocklySvg').getByText('很高兴见到你')).toHaveCount(2)
  await runAndExpect(page, true)
  await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('拓展也做到了')
  await expect(page.getByTestId('g1-u1-l02-run-log')).toContainText('兔子说：很高兴见到你')

  // Global button rewrites ALL say lines: all three become “你好” now.
  await page.getByTestId('lesson-say-line-hello').click()
  await runAndExpect(page, false, '对白说错了')
  // Repair per block with the slot list selects: first say stays “你好”,
  // second and third say back to “很高兴见到你”.
  await page.getByTestId('g1-u1-l02-block-line-3').selectOption('glad')
  await page.getByTestId('g1-u1-l02-block-line-4').selectOption('glad')
  await expect(page.getByTestId('g1-u1-l02-block-line-3')).toHaveValue('glad')
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
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 3 关')
  await add(page, 'say_line')
  await add(page, 'switch_character')
  await add(page, 'say_line')
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(4)
  await page.getByTestId('g1-u1-l02-block-line-3').selectOption('glad')
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
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 3 关')
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(4)

  // File menu: export downloads the slot data JSON.
  const downloadPromise = page.waitForEvent('download')
  await openFileMenu(page)
  await page.getByTestId('ws-file-export').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('G1-U1-L02-data.json')

  // Invalid import (valid JSON, invalid shape) is rejected; the program is untouched.
  await page.getByTestId('ws-file-input').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 2, lessonId: 'G1-U1-L02' })),
  })
  await expect(page.getByTestId('ws-notice')).toContainText('导入文件数据无效，原作品未变', { timeout: 10_000 })
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(4)
  // Malformed JSON is rejected the same way (no crash, no wipe).
  await page.getByTestId('ws-file-input').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{not json'),
  })
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(4)

  // File menu: reset restores the initial lesson (step 1, starter programs).
  await openFileMenu(page)
  await page.getByTestId('ws-file-reset').click()
  await waitForShellSaved(page)
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 1 关')
  await goToStep(page, 'build-turn-taking')
  await expect.poll(() => draftProgramLength(page, 'build-turn-taking')).toBe(1)
})

test('E10 desktop: editing after a pass invalidates the shell judgment', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop viewport runs once, on desktop')
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  await next(page)
  await next(page)
  await expect(page.getByTestId('g1-u1-l02-step-title')).toContainText('第 3 关')
  await buildCorrectProgram(page, 'build-turn-taking')
  await runAndExpect(page, true)
  await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('已完成')
  // Any edit invalidates the old judgment: stale note shows, conclusion is gone.
  await page.getByTestId('g1-u1-l02-block-down-1').click()
  await expect(page.getByTestId('ws-judgment-stale')).toContainText('旧判定已失效，修改后请重新运行')
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
  // Move it back up and re-run to pass again.
  await page.getByTestId('g1-u1-l02-block-up-2').click()
  await runAndExpect(page, true)
})
