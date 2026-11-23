import * as fs from 'node:fs'
import * as path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * OPS-041《小狐狸出场》studio 路由 E2E — 真实 Chrome，生产构建。
 *
 * 新路由 /studio/blockly/lesson-01-forest-hello（StudioShell +
 * LessonWorkspace chrome='studio'，课程自有 ForestEditorSlot /
 * ForestStageSlot，运行与判定唯一来源 ForestRunAdapter）。旧路由
 * /learn/lesson/lesson-01-forest-hello 不动，由原有 9 个旧 spec 回归。
 *
 * 正向 E1–E10 + 反向 N1–N9（plan.md §4；E10/N9 为 OPS-045，
 * N7/N8 为 OPS-046）；
 * 五视口 1920×1080 / 1440×900 / 1366×768 / 768×1024 / 375×812。积木添加走 palette
 * 的 lesson-add-* 按钮（与旧路由、L01 同款真实路径）；E6 另做一次
 * 常驻素材区真实拖拽（接成链并跑通）。其余测试按运行、保存与完成条件等待：
 * 每次等待都是条件期望（可见 testid、存储状态、文本）。
 * 用临时 Playwright config（独立端口）运行；playwright.config.ts 不动。
 */
const ROUTE = '/studio/blockly/lesson-01-forest-hello'
const KEY = 'kidscoding-draft:lesson-01-forest-hello'
const EVIDENCE = path.resolve(__dirname, '../../test-results/forest-hello-evidence')
fs.mkdirSync(EVIDENCE, { recursive: true })

const SIZES = [
  { name: '1920', width: 1920, height: 1080 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1366', width: 1366, height: 768 },
  { name: '768', width: 768, height: 1024 },
  { name: '375', width: 375, height: 812 },
] as const

const START = { type: 'when_start' }
const MOVE = { type: 'move_right' }

type ForestDraftSeed = {
  version: number
  lessonId: string
  stepIndex: number
  programs: Record<string, Array<{ type: string }>>
  passed: string[]
  failures: number
}

function emptyDraft(stepIndex = 0): ForestDraftSeed {
  return {
    version: 1,
    lessonId: 'lesson-01-forest-hello',
    stepIndex,
    programs: {
      'step-1': [],
      'step-2': [],
      'step-3': [],
      'step-4': [MOVE],
    },
    passed: [],
    failures: 0,
  }
}

async function seedDraft(page: Page, draft: ForestDraftSeed) {
  await page.addInitScript(
    ({ key, draft: data }) => {
      // 只在键不存在时播种：addInitScript 会在每次导航（含 reload）时
      // 重新执行；无此守卫时 E7 的 reload 会把已保存的程序用空种子覆盖。
      if (window.localStorage.getItem(key) === null) {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            lessonId: 'lesson-01-forest-hello',
            savedAt: new Date().toISOString(),
            script: data,
            version: 1,
          }),
        )
      }
    },
    { key: KEY, draft },
  )
}

async function seedLegacyDraft(page: Page) {
  await page.addInitScript(() => {
    const at = new Date().toISOString()
    window.sessionStorage.setItem(
      'kc-lesson-draft:lesson-01-forest-hello:0',
      JSON.stringify({ schemaVersion: 1, lessonId: 'lesson-01-forest-hello', stepIndex: 0, blocks: [{ type: 'when_start' }], updatedAt: at }),
    )
    window.sessionStorage.setItem(
      'kc-lesson-draft:lesson-01-forest-hello:1',
      JSON.stringify({ schemaVersion: 1, lessonId: 'lesson-01-forest-hello', stepIndex: 1, blocks: [{ type: 'when_start' }, { type: 'move_right' }], updatedAt: at }),
    )
  })
}

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}

async function waitForShellSaved(page: Page) {
  // Shell autosave is debounced (1000ms); only reload after the chip says saved.
  await expect(page.getByTestId('studio-save-chip')).toContainText('已保存到本机', { timeout: 10_000 })
}

async function add(page: Page, type: string) {
  await clickProgramTool(page, `lesson-add-${type}`)
}

async function clickProgramTool(page: Page, testId: string) {
  const assist = page.getByTestId('lesson-blockly-workspace').locator('details').first()
  if ((await assist.getAttribute('open')) === null) await assist.locator('summary').click()
  await page.getByTestId(testId).click()
  await assist.locator('summary').click()
}

async function clickRun(page: Page) {
  // Run entry differs by viewport by shell design: >= 768px the sticky row
  // is display:none and the stage runbar (ws-run-toggle) is the run entry;
  // < 768px the sticky row (ws-sticky-run) is the in-flow run entry.
  if (await page.getByTestId('ws-run-toggle').isVisible()) {
    await page.getByTestId('ws-run-toggle').click()
    return
  }
  if (await page.getByTestId('ws-sticky-run').isVisible()) {
    await page.getByTestId('ws-sticky-run').click()
    return
  }
  // V3 pane mode (<=1040px): the stage pane is hidden while 积木编程 is
  // selected, so the runbar is not reachable yet. Open the stage pane,
  // run, then come back to the editor pane the caller is working in.
  await page.getByTestId('v3-pane-stage').click()
  await page.getByTestId('ws-run-toggle').click()
  await page.getByTestId('v3-pane-code').click()
}

async function runAndExpect(page: Page, passed: boolean, text?: string) {
  await clickRun(page)
  const conclusion = page.getByTestId('ws-feedback-conclusion')
  await expect(conclusion).toContainText(passed ? '已完成' : '未合格', { timeout: 20_000 })
  if (text) await expect(conclusion).toContainText(text)
}

async function complete(page: Page) {
  await page.getByTestId('forest-hello-complete-step').click()
}

async function draftStepIndex(page: Page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key)
    if (!raw) return -1
    const parsed = JSON.parse(raw) as { script?: { stepIndex?: number } }
    return parsed.script?.stepIndex ?? -1
  }, KEY)
}

async function draftProgram(page: Page, stepId: string) {
  return page.evaluate(
    ({ key, id }) => {
      const raw = window.localStorage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { script?: { programs?: Record<string, unknown[]> } }
      return parsed.script?.programs?.[id] ?? null
    },
    { key: KEY, id: stepId },
  )
}

async function canvasVisibleHeight(page: Page, viewportHeight: number) {
  const svgBox = await page.getByTestId('ws-editor-slot').locator('svg.blocklySvg').boundingBox()
  expect(svgBox).not.toBeNull()
  return Math.max(0, Math.min(viewportHeight, svgBox!.y + svgBox!.height) - Math.max(0, svgBox!.y))
}

async function assertShellInvariants(page: Page) {
  await expect(page.locator('.kc-app')).toHaveCount(0)
  await expect(page.getByTestId('studio-topbar')).toBeVisible()
  await expect(page.getByTestId('ws-topbar')).toHaveCount(0)
  await expect(page.getByTestId('studio-save-chip')).toBeVisible()
  const overflowState = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    docScrollHeight: document.scrollingElement?.scrollHeight ?? 0,
    innerHeight: window.innerHeight,
  }))
  expect(overflowState.scrollWidth).toBeLessThanOrEqual(overflowState.innerWidth)
  expect(overflowState.docScrollHeight).toBeLessThanOrEqual(overflowState.innerHeight)
  await expect(page.getByTestId('studio-guide-drawer')).toHaveCount(0)
}

async function assertTopbarFits(page: Page, width: number) {
  const topbarBox = await page.getByTestId('studio-topbar').boundingBox()
  expect(topbarBox, 'topbar has a bounding box').not.toBeNull()
  // Approved V3 topbar: 67px desktop, 57px at <=670px.
  expect(topbarBox!.height, 'V3 topbar height').toBe(width <= 670 ? 57 : 67)
  for (const id of [
    'studio-back',
    'studio-title',
    'studio-progress',
    'studio-save-chip',
    'studio-file-menu-button',
    'studio-stage-toggle',
    'studio-help-button',
    'studio-guide-button',
  ]) {
    const box = await page.getByTestId(id).boundingBox()
    expect(box, `${id} has a bounding box`).not.toBeNull()
    expect(box!.x, `${id} left edge inside viewport`).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width, `${id} right edge inside viewport`).toBeLessThanOrEqual(width + 0.5)
  }
}

async function assertTouchTarget(control: Locator) {
  await expect(control).toBeInViewport({ ratio: 1 })
  const { width, height, receivesTouch } = await control.evaluate((element) => {
    const { x, y, width, height } = element.getBoundingClientRect()
    // Sample the middle of each edge as well as the center to catch clipping
    // or an overlay that leaves the center tappable but steals part of the hit area.
    const receivesTouch = [[.5, .5], [.1, .5], [.9, .5], [.5, .1], [.5, .9]].every(([dx, dy]) =>
      element.contains(document.elementFromPoint(x + width * dx, y + height * dy)),
    )
    return { width, height, receivesTouch }
  })
  expect(width, `${control} is at least 44px wide`).toBeGreaterThanOrEqual(44)
  expect(height, `${control} is at least 44px tall`).toBeGreaterThanOrEqual(44)
  expect(receivesTouch, `${control} has a clear touch area`).toBe(true)
}

async function assertTouchZoomClear(zoom: Locator, phase: string, ...blocks: Locator[]) {
  const controls = await zoom.getByRole('button').evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().toJSON()),
  )
  expect(controls).toHaveLength(3)
  for (const block of blocks) {
    const rect = await block.evaluate((element) => element.getBoundingClientRect().toJSON())
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)
    for (const button of controls) {
      const intersects = rect.left < button.right && rect.right > button.left &&
        rect.top < button.bottom && rect.bottom > button.top
      expect(intersects, `${phase}: ${block} stays clear of the zoom buttons`).toBe(false)
    }
  }
}

/**
 * 真实拖拽：切换常驻 flyout 的分类，把素材积木放到主画布现有程序栈下方。
 */
async function dragToolboxBlock(page: Page, categoryLabel: string, touch = false, inspectDrag?: () => Promise<void>) {
  const category = page.getByTestId('v3-categories').getByRole('button', { name: categoryLabel })
  if (touch) await category.tap()
  else await category.click()
  const flyoutBlock = page.locator('.blocklyFlyout .blocklyDraggable').first()
  await flyoutBlock.waitFor({ state: 'visible', timeout: 10_000 })
  const box = await flyoutBlock.boundingBox()
  expect(box).not.toBeNull()
  const canvas = page.locator('[data-testid="ws-editor-slot"] svg.blocklySvg')
  await canvas.waitFor({ state: 'visible', timeout: 10_000 })
  // The stack to extend is the main canvas's when_start block. Do NOT use
  // `.blocklyDraggable:last` here: the open flyout has its own
  // `.blocklyBlockCanvas`, so :last would pick the flyout's move block and
  // the drop would land by the toolbox instead of under the stack
  // (E6 前两轮：积木以 disconnected 散块落地，根因即落点取错).
  const lastBlock = page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable.when_start').first()
  const lastBox = await lastBlock.count() ? await lastBlock.boundingBox() : null
  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()
  // Drop so the dragged block's TOP connection lands on the existing
  // stack's bottom connection. Zelos statement connections sit at x=12
  // from the block's LEFT edge (not the block centre), and the stack's
  // bottom connection sits 8 workspace units above the stack's bottom
  // edge — so the dragged block must be LEFT-ALIGNED with the stack (same
  // left edge), not centred under it. The mouse holds the dragged block by
  // its centre, so dropX = stackLeft + draggedWidth/2 and dropY =
  // stackBottom - 8*scale + draggedHeight/2.
  // (E6 root cause, OPS-041 probes v4/v5: the old centre-aligned drop put
  // the real connection points 36.2 workspace units apart, outside
  // Blockly's snapRadius 28, so no candidate was found and the block was
  // bumped away unconnected. A connection-aligned drop connects first try;
  // the E6 assertion is unchanged and the drag is still a real mouse drag.)
  const canvasTransform = await page
    .locator('svg.blocklySvg .blocklyBlockCanvas')
    .evaluate((el) => el.getAttribute('transform') ?? '')
  const scale = Number.parseFloat(/scale\(([\d.]+)\)/.exec(canvasTransform)?.[1] ?? '1') || 1
  const dropX = lastBox ? lastBox.x + box!.width / 2 : canvasBox!.x + canvasBox!.width / 2
  const dropY = lastBox
    ? lastBox.y + lastBox.height - 8 * scale + box!.height / 2
    : canvasBox!.y + 80
  const startX = box!.x + box!.width / 2
  const startY = box!.y + box!.height / 2
  if (touch) {
    const cdp = await page.context().newCDPSession(page)
    try {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y: startY }] })
      for (let i = 1; i <= 20; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
          x: startX + (dropX - startX) * i / 20,
          y: startY + (dropY - startY) * i / 20,
        }] })
      }
      await inspectDrag?.()
    } finally {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await cdp.detach()
    }
    return
  }
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(dropX, dropY, { steps: 20 })
  // Let Blockly show the snap highlight before releasing; without this
  // the release can land before the drag surface evaluates the hover.
  await page.waitForTimeout(300)
  await page.mouse.up()
}

test('E1 desktop 1440: load, step-1 run (only when_start, fox stays), complete to step 2', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  await expect(page.getByTestId('forest-hello-slot')).toBeVisible()
  await expect(page.getByTestId('forest-hello-step-progress')).toContainText('第 1 / 4 关')
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('认识小狐狸和开始积木')
  await expect(page.getByTestId('forest-hello-voiceover')).toContainText('先放开始积木')
  await expect(page.getByTestId('ws-stage-box')).toBeVisible()
  await expect(page.getByTestId('stage-character-main').locator('[data-character-art="fox"]')).toBeVisible()
  await assertShellInvariants(page)
  await assertTopbarFits(page, 1440)
  await page.screenshot({ path: `${EVIDENCE}/e1-desktop-start.png` })
  // Step 1: only when_start — the fox staying put IS the expected result.
  await dragToolboxBlock(page, '开始')
  await expect.poll(() => draftProgram(page, 'step-1')).toEqual([START])
  await runAndExpect(page, true)
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '0')
  await expect(page.getByTestId('ws-feedback-stage')).toContainText('一动不动')
  await page.screenshot({ path: `${EVIDENCE}/e1-desktop-run.png` })
  await complete(page)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 2 关')
})

test('E2 desktop 1440: build step-2 (start + move), run to 100 steps, complete to step 3', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const draft = emptyDraft(1)
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 2 关')
  await add(page, 'when_start')
  await add(page, 'move_right')
  await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START, MOVE])
  await runAndExpect(page, true)
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100', { timeout: 20_000 })
  await expect(page.getByTestId('ws-feedback-task')).toContainText('任务判定：通过')
  await expect(page.getByTestId('ws-feedback-stage')).toContainText('100 步')
  await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('知识证据：通过')
  await page.screenshot({ path: `${EVIDENCE}/e2-desktop-pass.png` })
  await complete(page)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 3 关')
})

test('E3 desktop 1440: step-3 prediction first, then two moves to 200 steps', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const draft = emptyDraft(2)
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 3 关')
  await expect(page.getByTestId('practice-task')).toBeVisible()
  await expect(page.getByTestId('practice-need-guess')).toBeVisible()
  // A prediction is only a prediction when made before the run: completing
  // without one is blocked (the run button itself stays usable — the shell
  // owns it and the slot cannot disable it; the completion gate holds).
  await complete(page)
  await expect(page.getByTestId('forest-hello-notice')).toContainText('先在舞台上猜一猜')
  await page.getByTestId('practice-answer-beside-friend').click()
  await expect(page.getByTestId('practice-answer-reply')).toContainText('猜好啦')
  await add(page, 'when_start')
  await add(page, 'move_right')
  await add(page, 'move_right')
  await runAndExpect(page, true)
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '200', { timeout: 20_000 })
  await expect(page.getByTestId('practice-done')).toBeVisible()
  await complete(page)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 4 关')
})

test('E4 desktop 1440: step-4 mistake experiment, fix, complete the lesson', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const draft = emptyDraft(3)
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 4 关')
  await expect(page.getByTestId('mistake-task')).toBeVisible()
  await expect(page.getByTestId('mistake-setup')).toBeVisible()
  // The pre-built wrong program runs as the experiment, not a failure.
  await clickRun(page)
  await expect(page.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code', 'missing-start', { timeout: 20_000 })
  await expect(page.getByTestId('stage-run-error')).toHaveCount(0)
  await expect(page.getByTestId('mistake-observed')).toBeVisible()
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('哎呀')
  await page.screenshot({ path: `${EVIDENCE}/e4-desktop-mistake.png` })
  // Observed but not answered: completing is blocked.
  await complete(page)
  await expect(page.getByTestId('forest-hello-notice')).toContainText('先回答舞台上的问题')
  await page.getByTestId('mistake-answer-stayed').click()
  await expect(page.getByTestId('mistake-fix')).toBeVisible()
  // Fix it and run again: the real failure is gone, the fix is confirmed.
  await clickProgramTool(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'move_right')
  await runAndExpect(page, true)
  await expect(page.getByTestId('mistake-fixed')).toBeVisible()
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100', { timeout: 20_000 })
  await complete(page)
  // Completion navigates to the reward page (same as the old route).
  await expect(page).toHaveURL(/\/project\/lesson-01-forest-hello\/complete/, { timeout: 20_000 })
})

for (const size of SIZES) {
  test(`E5 ${size.name}: first screen — no AppShell, no outer scroll, topbar fits, canvas Gate 1`, async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: size.width, height: size.height })
    await page.goto(ROUTE)
    // 首屏加载时 Blockly 注入较慢（本机首访常 >5s）：给画布 30s，
    // 不是默认 5s；画布出现即继续，不用固定时长等待。
    await expect(page.getByTestId('ws-editor-slot').locator('svg.blocklySvg')).toBeVisible({ timeout: 30_000 })
    await assertShellInvariants(page)
    await assertTopbarFits(page, size.width)
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
    // Gate 1: visible height is the viewport ∩ canvas rect, NOT the
    // canvas's own height (which extends past the fold).
    const visible = await canvasVisibleHeight(page, size.height)
    if (size.width === 768) expect(visible).toBeGreaterThanOrEqual(300)
    if (size.width === 375) expect(visible).toBeGreaterThanOrEqual(220)
    // The stage and the run entry are reachable without scrolling the page.
    // (Desktop shows the stage column; <=1040px opens it as a pane tab, and
    // the in-flow sticky row is the fallback at <768px.)
    const runToggle = page.getByTestId('ws-run-toggle')
    const stickyRun = page.getByTestId('ws-sticky-run')
    let runBox: { x: number; y: number; width: number; height: number } | null = null
    if (await runToggle.isVisible()) {
      const stageBox = await page.getByTestId('ws-stage-box').boundingBox()
      expect(stageBox).not.toBeNull()
      expect(stageBox!.y).toBeLessThan(size.height)
      runBox = await runToggle.boundingBox()
    } else if (await stickyRun.isVisible()) {
      runBox = await stickyRun.boundingBox()
    } else {
      const stageTab = page.getByTestId('v3-pane-stage')
      await expect(stageTab).toBeVisible()
      await stageTab.click()
      await expect(runToggle).toBeVisible()
      const stageBox = await page.getByTestId('ws-stage-box').boundingBox()
      expect(stageBox).not.toBeNull()
      expect(stageBox!.y).toBeLessThan(size.height)
      runBox = await runToggle.boundingBox()
      await page.getByTestId('v3-pane-code').click()
    }
    expect(runBox).not.toBeNull()
    expect(runBox!.y).toBeLessThan(size.height)
    const categories = page.getByTestId('v3-categories')
    await expect(categories.getByRole('button')).toHaveCount(1)
    await expect(categories.getByRole('button', { name: '开始' })).toHaveAttribute('aria-pressed', 'true')
    const tile = page.locator('.kc-v3-engine .blocklyFlyout .when_start')
    await expect(tile).toBeInViewport()
    const mission = page.getByTestId('v3-mission')
    if (await mission.isVisible()) {
      await expect(mission).toBeInViewport()
    } else {
      // <=1040px pane mode: 学习任务 is a tab, still one tap away.
      await page.getByTestId('v3-pane-task').click()
      await expect(mission).toBeInViewport()
      await page.getByTestId('v3-pane-code').click()
    }
    if (size.width >= 1280) {
      // Approved V3 desktop grid: mission | editor (rail · flyout · canvas)
      // | stage. The editor head is one full-width bar, so the two inner
      // columns are measured from the flyout marker and the region edges.
      const missionBox = (await page.getByTestId('v3-mission').boundingBox())!
      const editorRegion = (await page.locator('.kc-v3-editor-region').boundingBox())!
      const stageRegion = (await page.getByTestId('v3-stage-region').boundingBox())!
      const material = (await page.getByTestId('v3-flyout').boundingBox())!
      const tileBounds = (await tile.boundingBox())!
      expect(missionBox.x + missionBox.width).toBeLessThanOrEqual(editorRegion.x)
      expect(editorRegion.x + editorRegion.width).toBeLessThanOrEqual(stageRegion.x)
      expect(material.width / editorRegion.width).toBeGreaterThan(0.12)
      const scriptWidth = editorRegion.x + editorRegion.width - (material.x + material.width)
      expect(scriptWidth / editorRegion.width).toBeGreaterThan(0.48)
      expect(tileBounds.x + tileBounds.width).toBeLessThan(editorRegion.x + editorRegion.width)
      await expect(page.getByTestId('ws-roles-panel')).toBeInViewport({ ratio: 1 })
    }
    await page.screenshot({ path: `${EVIDENCE}/e5-first-${size.name}.png` })
  })
}

test('E6 desktop 1440: real toolbox flyout drag connects the move block and passes', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const draft = emptyDraft(1)
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 2 关')
  await add(page, 'when_start')
  await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START])
  // Real drag: the move block comes from the toolbox flyout, not a button.
  await dragToolboxBlock(page, '移动')
  await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START, MOVE])
  await runAndExpect(page, true)
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100', { timeout: 20_000 })
})

for (const { width, height } of SIZES.filter((size) => size.width !== 1920)) {
  test(`V3 ${width}x${height}: expanded block controls and guidance do not overlap`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height })
    const draft = emptyDraft(1)
    draft.programs['step-2'] = [START, MOVE]
    await seedDraft(page, draft)
    await page.goto(ROUTE)
    await expect(page.locator('.kc-v3-engine .blocklyFlyout .move_right')).toBeVisible()
    await runAndExpect(page, true)

    const assist = page.locator('.kc-v3-assist')
    const guidance = page.locator('.kc-v3-editor-details')
    await assist.locator('summary').click()
    await guidance.locator('summary').click()
    const controls = assist.getByTestId('lesson-block-palette')
    const voiceover = guidance.getByTestId('forest-hello-voiceover')
    await expect(controls).toBeVisible()
    await expect(voiceover).toBeVisible()
    const assistBox = (await assist.boundingBox())!
    const controlsBox = (await controls.boundingBox())!
    const guideBox = (await guidance.boundingBox())!
    expect(controlsBox.y + controlsBox.height).toBeLessThanOrEqual(assistBox.y + assistBox.height + 1)
    expect(assistBox.y + assistBox.height).toBeLessThanOrEqual(guideBox.y + 1)
    const save = guidance.getByTestId('forest-hello-save')
    await save.click()
    await waitForShellSaved(page)
    await expect(page.getByTestId('studio-topbar').getByText('已保存到本机', { exact: true })).toHaveCount(1)
    await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100')
    await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START, MOVE])
    await assist.locator('summary').scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath('expanded-panels.png') })
  })
}

for (const size of [{ width: 768, height: 1024 }, { width: 375, height: 812 }]) {
  test(`V3 ${size.width}: touch-drag, connect and run without recreating the editor`, async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Runs with an explicit Chrome touch context and exact viewport')
    const context = await browser.newContext({ viewport: size, hasTouch: true, isMobile: true })
    try {
      const page = await context.newPage()
      const phone = size.width === 375
      const zoom = page.getByRole('group', { name: '脚本缩放' })
      const topbarControls = ['studio-back', 'studio-file-menu-button', 'studio-stage-toggle', 'studio-help-button', 'studio-guide-button']
      const draft = emptyDraft(1)
      draft.programs['step-2'] = [START]
      await seedDraft(page, draft)
      await page.goto(ROUTE)
      const svg = page.getByTestId('ws-editor-slot').locator('svg.blocklySvg')
      await expect(svg).toBeVisible({ timeout: 30_000 })
      const taskTab = page.getByTestId('v3-pane-task')
      const codeTab = page.getByTestId('v3-pane-code')
      const stageTab = page.getByTestId('v3-pane-stage')
      if (phone) {
        for (const id of topbarControls) await assertTouchTarget(page.getByTestId(id))
        const guide = page.getByTestId('studio-guide-drawer')
        const guideButton = page.getByTestId('studio-guide-button')
        await page.getByTestId('studio-help-button').tap()
        await expect(guide).toBeVisible()
        await assertTouchTarget(guideButton)
        await guideButton.tap()
        await expect(guide).toBeHidden()
        await guideButton.tap()
        await expect(guide).toBeVisible()
        await page.getByTestId('studio-guide-close').tap()
        await expect(guide).toBeHidden()
        // V3 pane mode: the stage column stays mounted and is shown/hidden
        // by the 舞台 pane tab (the topbar stage toggle is still reachable
        // and touch-sized, checked above).
        await stageTab.tap()
        await expect(page.locator('.kc-v3-stage-region')).toBeVisible()
        await codeTab.tap()
        await expect(page.locator('.kc-v3-stage-region')).toBeHidden()
        await stageTab.tap()
        await expect(page.locator('.kc-v3-stage-region')).toBeVisible()
        await expect(svg.locator('.blocklyZoom:visible')).toHaveCount(0)
      } else {
        await expect(zoom).toBeHidden()
        await expect(svg.locator('.blocklyZoom:visible')).toHaveCount(3)
      }
      // <=1040px each pane is complete on its own: the instruction card
      // lives in 任务, the run entry in 舞台.
      if (await taskTab.isVisible()) {
        await taskTab.tap()
        await expect(page.getByTestId('forest-hello-instruction')).toBeInViewport({ ratio: 1 })
        await expect(page.getByTestId('forest-hello-complete-step')).toBeInViewport({ ratio: 1 })
        await expect(page.getByTestId('studio-save-chip')).toBeInViewport({ ratio: 1 })
        await stageTab.tap()
        await expect(page.getByTestId('ws-run-toggle')).toBeInViewport({ ratio: 1 })
      } else {
        await expect(page.getByTestId('forest-hello-instruction')).toBeInViewport({ ratio: 1 })
        await expect(page.getByTestId('forest-hello-complete-step')).toBeInViewport({ ratio: 1 })
        await expect(page.getByTestId('studio-save-chip')).toBeInViewport({ ratio: 1 })
        await expect(page.getByTestId('ws-run-toggle')).toBeInViewport({ ratio: 1 })
      }
      const stage = page.locator('.kc-v3-stage-region .kc-stage-scene')
      const stageBox = (await stage.boundingBox())!
      expect(stageBox.width).toBeGreaterThanOrEqual(size.width === 768 ? 410 : 310)
      expect((await page.getByTestId('ws-run-toggle').boundingBox())!.height).toBeGreaterThanOrEqual(44)
      async function assertReadableStage() {
        const rects = await stage.locator([
          '[data-testid="stage-current-scene"]',
          '[data-testid="stage-walked-distance"]',
          '[data-testid="stage-friend-distance"]',
          '[data-testid="stage-character-main"]',
          '[data-testid="stage-character-friend"]',
        ].join(',')).evaluateAll((elements) => elements.map((element) => {
          const { top, left, bottom, right, width, height } = element.getBoundingClientRect()
          return { top, left, bottom, right, width, height }
        }))
        expect(rects).toHaveLength(5)
        for (const [index, rect] of rects.entries()) {
          expect(rect.width).toBeGreaterThan(0)
          expect(rect.height).toBeGreaterThan(0)
          expect(rect.left).toBeGreaterThanOrEqual(stageBox.x)
          expect(rect.right).toBeLessThanOrEqual(stageBox.x + stageBox.width)
          expect(rect.top).toBeGreaterThanOrEqual(stageBox.y)
          expect(rect.bottom).toBeLessThanOrEqual(stageBox.y + stageBox.height)
          for (const other of rects.slice(index + 1)) {
            const intersect = rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top
            expect(intersect, 'role and live scene/distance labels have separate paint areas').toBe(false)
          }
        }
      }
      await assertReadableStage()
      if (await codeTab.isVisible()) await codeTab.tap()
      const categories = page.getByTestId('v3-categories')
      await expect(categories.getByRole('button', { name: '移动' })).toHaveAttribute('aria-pressed', 'true')
      const move = page.locator('.kc-v3-engine .blocklyFlyout .move_right')
      const start = svg.locator('.blocklyBlockCanvas .when_start')
      const scriptMove = svg.locator('.blocklyBlockCanvas .move_right')
      const scale = () => start.evaluate((element: SVGGraphicsElement) => element.getScreenCTM()!.a)
      const heading = page.getByTestId('v3-editor-head')
      const fit = heading.getByRole('button', { name: '适合画面' })
      const undo = heading.getByRole('button', { name: '撤销' })
      const redo = heading.getByRole('button', { name: '重做' })
      if (phone) {
        const startCategory = categories.getByRole('button', { name: '开始' })
        const moveCategory = categories.getByRole('button', { name: '移动' })
        const zoomOut = zoom.getByRole('button', { name: '缩小脚本' })
        const zoomReset = zoom.getByRole('button', { name: '重置脚本缩放' })
        const zoomIn = zoom.getByRole('button', { name: '放大脚本' })
        for (const control of [startCategory, moveCategory, undo, redo, fit, zoomOut, zoomReset, zoomIn]) {
          await assertTouchTarget(control)
        }
        await startCategory.tap()
        await expect(page.locator('.kc-v3-engine .blocklyFlyout .when_start')).toBeInViewport({ ratio: 1 })
        await moveCategory.tap()
        await expect(move).toBeInViewport({ ratio: 1 })
        await fit.tap()
        const originalScale = await scale()
        await zoomOut.tap()
        await expect.poll(scale).toBeLessThan(originalScale)
        await zoomIn.tap()
        await expect.poll(scale).toBeCloseTo(originalScale, 2)
        await zoomIn.tap()
        await expect.poll(scale).toBeGreaterThan(originalScale)
        await zoomReset.tap()
        await expect.poll(scale).toBeCloseTo(.9, 2)
        await fit.tap()
        await expect(start).toBeInViewport({ ratio: 1 })
        await assertTouchZoomClear(zoom, 'before drag', move, start)
      }
      await expect(move).toBeInViewport({ ratio: 1 })
      const tile = (await move.boundingBox())!
      const flyoutColumn = (await page.getByTestId('v3-flyout').boundingBox())!
      // The palette tile sits inside the material column, left of the canvas.
      expect(tile.x + tile.width).toBeLessThanOrEqual(flyoutColumn.x + flyoutColumn.width + 1)
      const workspace = await svg.elementHandle()
      const scaleBeforeDrag = await scale()
      await dragToolboxBlock(page, '移动', true, phone ? async () => {
        const dragged = page.locator('.blocklyDragging.move_right')
        await expect(dragged).toBeVisible()
        await assertTouchZoomClear(zoom, 'during drag', start, dragged)
        expect(await scale()).toBeCloseTo(scaleBeforeDrag, 4)
        await page.screenshot({ path: testInfo.outputPath('mobile-drag-with-zoom-toolbar.png') })
      } : undefined)
      await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START, MOVE])
      if (phone) {
        await expect(scriptMove).toBeVisible()
        await assertTouchZoomClear(zoom, 'after connection', start, scriptMove)
        await undo.tap()
        await expect(scriptMove).toHaveCount(0)
        await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START])
        await redo.tap()
        await expect(scriptMove).toHaveCount(1)
        await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START, MOVE])
        await undo.tap()
        await expect(scriptMove).toHaveCount(0)
        await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START])
        await dragToolboxBlock(page, '移动', true)
        await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START, MOVE])
      }
      if (await stageTab.isVisible() && !await page.getByTestId('ws-run-toggle').isVisible()) await stageTab.tap()
      await page.getByTestId('ws-run-toggle').tap()
      await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100')
      await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('已完成')
      await expect(stage.getByTestId('stage-walked-distance')).toContainText('100 步')
      await expect(stage.getByTestId('stage-friend-distance')).toContainText('0 步')
      await assertReadableStage()
      await expect.poll(() => overflow(page)).toBe(false)
      const feedback = page.getByTestId('ws-feedback').getByText('查看学习反馈', { exact: true })
      await feedback.tap()
      await expect(page.getByTestId('ws-feedback-stage')).toBeInViewport({ ratio: 1 })
      await feedback.tap()
      await page.getByTestId('studio-file-menu-button').tap()
      const save = page.getByTestId('studio-file-save')
      await expect(save).toBeInViewport({ ratio: 1 })
      if (phone) await assertTouchTarget(save)
      await save.tap()
      await waitForShellSaved(page)
      await assertTopbarFits(page, size.width)
      if (phone) for (const id of topbarControls) await assertTouchTarget(page.getByTestId(id))
      await page.getByTestId('v3-reset-stage').tap()
      await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '0')
      await page.setViewportSize({ width: size.width + 15, height: size.height })
      await expect.poll(() => workspace!.evaluate((el) => el.isConnected)).toBe(true)
      await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START, MOVE])
      if (phone) {
        const back = page.getByTestId('studio-back')
        const href = await back.getAttribute('href')
        await back.tap()
        await expect(page).toHaveURL(new URL(href!, page.url()).href)
      }
    } finally {
      await context.close()
    }
  })
}

test('E7 desktop 1440: save + refresh restores the step and the program', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const draft = emptyDraft(1)
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await add(page, 'when_start')
  await add(page, 'move_right')
  await runAndExpect(page, true)
  await waitForShellSaved(page)
  await page.reload()
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 2 关')
  await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START, MOVE])
  await runAndExpect(page, true)
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100', { timeout: 20_000 })
})

test('E8 desktop 1440: guide drawer reveals goal5 + hints in order, toggle does not remount the editor', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  // 首屏加载时 Blockly 注入较慢（本机首访常 >5s）：给画布 30s。
  await expect(page.getByTestId('ws-editor-slot').locator('svg.blocklySvg')).toBeVisible({ timeout: 30_000 })
  // Drawer default closed; opening it must not remount the editor.
  const svgBefore = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="ws-editor-slot"] svg.blocklySvg')
    if (!svg) return null
    const probe = svg as unknown as { __forestProbe?: object }
    probe.__forestProbe = {}
    return probe.__forestProbe === (svg as unknown as { __forestProbe?: object }).__forestProbe
  })
  expect(svgBefore).toBe(true)
  await page.getByTestId('studio-guide-button').click()
  const drawer = page.getByTestId('studio-guide-drawer')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByTestId('studio-goal5')).toContainText('让小狐狸向右走 100 步')
  await expect(drawer).toContainText('小狐狸出场 · 玩法帮助')
  await drawer.getByTestId('studio-hint-reveal-1').click()
  await expect(drawer.getByTestId('studio-hint-1')).toContainText('先让小狐狸准备好出场')
  await drawer.getByTestId('studio-hint-reveal-2').click()
  await expect(drawer.getByTestId('studio-hint-2')).toContainText('把“开始时”放在最前面')
  await drawer.getByTestId('studio-hint-reveal-3').click()
  await expect(drawer.getByTestId('studio-hint-3')).toContainText('先看一个很短的示意')
  await page.screenshot({ path: `${EVIDENCE}/e8-desktop-drawer.png` })
  await page.getByTestId('studio-guide-close').click()
  await expect(page.getByTestId('studio-guide-drawer')).toHaveCount(0)
  const sameNode = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="ws-editor-slot"] svg.blocklySvg') as unknown as { __forestProbe?: object } | null
    return svg?.__forestProbe !== undefined
  })
  expect(sameNode).toBe(true)
  // File menu: new / export / import / reset are all present (contract opens all).
  await page.getByTestId('studio-file-menu-button').click()
  await expect(page.getByTestId('studio-file-menu')).toBeVisible()
  for (const id of ['studio-file-new', 'studio-file-save', 'studio-file-export', 'studio-file-import', 'studio-file-reset']) {
    await expect(page.getByTestId(id)).toBeVisible()
  }
})

test('E9 desktop 1440: a seeded step-2 draft restores both blocks into the canvas and stays intact', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  // OPS-041 修复回归：挂载时 store 采纳 effect 若读到 useSyncExternalStore
  // 的旧快照（初始空草稿），会把已加载的草稿短暂覆成空、再翻回来；翻转期
  // 间重建 effect（旧闭包 stepId + 实时 draftRef 混用）会把第 1 关的
  // [when_start] 重建成画布、再经快照持久化把第 2 关的 move_right 从
  // 存储里删掉（probe16/17/18）。本测试冷加载已保存的第 2 关草稿并断言
  // 画布与存储都完整，才算恢复成立。
  const draft = emptyDraft(1)
  draft.programs['step-1'] = [START]
  draft.programs['step-2'] = [START, MOVE]
  draft.passed = ['step-1']
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 2 关', { timeout: 30_000 })
  const canvas = page.getByTestId('ws-editor-slot').locator('svg.blocklySvg .blocklyBlockCanvas')
  await expect(canvas.locator('.blocklyDraggable.when_start')).toHaveCount(1, { timeout: 30_000 })
  await expect(canvas.locator('.blocklyDraggable.move_right')).toHaveCount(1, { timeout: 30_000 })
  // 自动保存窗口（1000ms 防抖）过后，存储里的第 2 关程序必须仍是两块。
  await page.waitForTimeout(2500)
  await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START, MOVE])
  // 再跑一次：恢复的程序必须真实通过。
  await runAndExpect(page, true)
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100', { timeout: 20_000 })
})

test('N1 desktop 1440: a disconnected move block fails the run, fox stays', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const draft = emptyDraft(1)
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await add(page, 'when_start')
  await add(page, 'move_right')
  // Tear the move block off the main stack with a short drag.
  const move = page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable.move_right').first()
  await move.scrollIntoViewIfNeeded()
  const box = await move.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + 120, box!.y + box!.height / 2 + 80, { steps: 10 })
  await page.mouse.up()
  await runAndExpect(page, false)
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '0')
  await expect(page.getByTestId('ws-feedback-task')).toContainText('未通过')
})

test('N2 desktop 1440: move without start fails (missing-start)', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const draft = emptyDraft(1)
  draft.programs['step-2'] = [MOVE]
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await runAndExpect(page, false)
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '0')
  await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('未合格')
})

test('N3 desktop 1440: only when_start on step 2 fails (fox never reaches 100)', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const draft = emptyDraft(1)
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await add(page, 'when_start')
  await runAndExpect(page, false)
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '0')
})

test('N4 desktop 1440: save failure is fail-closed (localStorage quota exhausted)', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const draft = emptyDraft(1)
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await add(page, 'when_start')
  await add(page, 'move_right')
  await waitForShellSaved(page)
  // Exhaust the origin's localStorage quota for real — precisely.
  // A coarse fill alone is NOT enough: overwriting the existing draft
  // key with a same-size value needs no new quota, so the save would
  // still succeed (N4 首轮：chip 始终“已保存到本机”). The binary-search
  // fine fill leaves < 1 byte free, so any growth of the draft throws.
  await page.evaluate(() => {
    const chunk = 'x'.repeat(1024 * 1024)
    let i = 0
    try {
      for (i = 0; i < 200; i += 1) {
        window.localStorage.setItem(`__forest-quota-fill-${i}`, chunk)
      }
    } catch {
      // Coarse fill done: free space is now < 1MB.
    }
    let lo = 0
    let hi = 1024 * 1024
    const probeKey = '__forest-quota-probe'
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2)
      try {
        window.localStorage.setItem(probeKey, 'x'.repeat(mid))
        lo = mid
      } catch {
        hi = mid - 1
      }
    }
    window.localStorage.setItem(probeKey, 'x'.repeat(lo))
  })
  // Dirty the draft so the next save must GROW it (+~24 bytes): with
  // < 1 byte free the write throws instead of silently overwriting.
  await add(page, 'move_right')
  // Trigger a real save through the shell: the chip must report failure,
  // never “已保存到本机”.
  await page.getByText('本关指引与积木顺序', { exact: true }).click()
  await page.getByTestId('forest-hello-save').click()
  await expect(page.getByTestId('studio-save-chip')).toContainText('未能保存', { timeout: 10_000 })
  await expect(page.getByTestId('studio-save-chip')).not.toContainText('已保存到本机')
})

test('N5 desktop 1440: editing after a pass invalidates the shell judgment', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const draft = emptyDraft(1)
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await add(page, 'when_start')
  await add(page, 'move_right')
  await runAndExpect(page, true)
  await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('已完成')
  // Editing the program must invalidate the pass.
  await add(page, 'move_right')
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0, { timeout: 10_000 })
  // Remove the extra block again (select it, then the always-available delete)
  // and re-run: the pass comes back.
  await page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable.move_right').last().click()
  await clickProgramTool(page, 'lesson-delete-selected')
  await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START, MOVE])
  await runAndExpect(page, true)
})

test('N6 desktop 1440: legacy draft import is offered once, imports, and keeps the original', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedLegacyDraft(page)
  await page.goto(ROUTE)
  await expect(page.getByTestId('forest-hello-legacy-import')).toBeVisible()
  await expect(page.getByTestId('forest-hello-legacy-import')).toContainText('到第 2 关')
  await page.getByTestId('forest-hello-import-legacy').click()
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 2 关')
  await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START, MOVE])
  await expect(page.getByTestId('forest-hello-legacy-import')).toHaveCount(0)
  // The original legacy draft is kept, never deleted.
  const legacyKept = await page.evaluate(
    () => window.sessionStorage.getItem('kc-lesson-draft:lesson-01-forest-hello:1') !== null,
  )
  expect(legacyKept).toBe(true)
})

test('E10 desktop 1440 (OPS-045): continuous 1->2->3->4 without refresh, step-3 prediction buttons stay enabled', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  const editor = page.getByTestId('ws-editor-slot').locator('svg.blocklySvg')
  await expect(editor).toBeVisible()
  const originalCanvas = await editor.elementHandle()
  // Step 1: only when_start — the fox staying put IS the expected result.
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 1 关')
  await add(page, 'when_start')
  await runAndExpect(page, true)
  await complete(page)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 2 关')
  // Step 2: start + one move to 100 steps.
  await add(page, 'when_start')
  await add(page, 'move_right')
  await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START, MOVE])
  await runAndExpect(page, true)
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100', { timeout: 20_000 })
  await complete(page)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 3 关')
  // P0-1 regression: after a successful step-2 run, the step-3 prediction
  // buttons must be enabled — the previous step's 'success' snapshot must
  // not leak into this step (practiceLocked). Before the fix both were
  // disabled here and completing step 3 was impossible without a refresh.
  const beside = page.getByTestId('practice-answer-beside-friend')
  const halfWay = page.getByTestId('practice-answer-half-way')
  await expect(beside).toBeEnabled()
  await expect(halfWay).toBeEnabled()
  // OPS-045 文案一致：进第 3 关时上一关的运行成功反馈不得残留——
  // 泄漏的 'success' 快照会同时点亮“运行成功了！先回答上面的问题”
  // 与“先选一个你的猜测，运行按钮就会亮起来”，自相矛盾。
  await expect(page.getByTestId('practice-need-answer')).toHaveCount(0)
  await expect(page.getByTestId('practice-need-guess')).toBeVisible()
  await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
  await page.screenshot({ path: `${EVIDENCE}/e10-continuous-step3.png` })
  await beside.click()
  await expect(page.getByTestId('practice-answer-reply')).toContainText('猜好啦')
  await add(page, 'when_start')
  await add(page, 'move_right')
  await add(page, 'move_right')
  await runAndExpect(page, true)
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '200', { timeout: 20_000 })
  // 选对猜测且运行成功后，回复翻为“猜对啦！”（OPS-045 验收）。
  await expect(page.getByTestId('practice-answer-reply')).toContainText('猜对啦！')
  await expect(page.getByTestId('practice-done')).toBeVisible()
  await complete(page)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 4 关')
  await expect.poll(() => originalCanvas!.evaluate((el) => el.isConnected)).toBe(true)
  // Step 4: mistake experiment, fix, complete the lesson.
  await clickRun(page)
  await expect(page.getByTestId('mistake-observed')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('mistake-answer-stayed').click()
  await expect(page.getByTestId('mistake-fix')).toBeVisible()
  await clickProgramTool(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'move_right')
  await runAndExpect(page, true)
  await expect(page.getByTestId('mistake-fixed')).toBeVisible()
  await complete(page)
  await expect(page).toHaveURL(/\/project\/lesson-01-forest-hello\/complete/, { timeout: 20_000 })
  await page.screenshot({ path: `${EVIDENCE}/e10-continuous-complete.png` })
})

test('N7 desktop 1440 (OPS-046): a hung /api/guest times out into a visible cloud failure, retry recovers', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  // Hang every cloud sync: the request never settles.
  await page.route('**/api/guest', () => {})
  const draft = emptyDraft(3)
  draft.passed = ['step-1', 'step-2', 'step-3']
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 4 关')
  await clickRun(page)
  await expect(page.getByTestId('mistake-observed')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('mistake-answer-stayed').click()
  await clickProgramTool(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'move_right')
  await runAndExpect(page, true)
  await expect(page.getByTestId('mistake-fixed')).toBeVisible()
  await complete(page)
  // The 10s sync timeout must surface a visible failure — never a button
  // stuck at “正在完成…” with no feedback (P0-2). No navigation yet.
  await expect(page.getByTestId('forest-hello-cloud-failed')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('forest-hello-retry-cloud-sync')).toBeVisible()
  await expect(page.getByTestId('forest-hello-continue-local-only')).toBeVisible()
  await expect(page.getByTestId('forest-hello-complete-step')).toContainText('完成本课')
  await expect(page).not.toHaveURL(/\/project\/lesson-01-forest-hello\/complete/)
  await page.screenshot({ path: `${EVIDENCE}/n7-cloud-failed.png` })
  // The cloud is back: retry syncs, clears the draft, and navigates.
  await page.unroute('**/api/guest')
  await page.getByTestId('forest-hello-retry-cloud-sync').click()
  await expect(page).toHaveURL(/\/project\/lesson-01-forest-hello\/complete/, { timeout: 20_000 })
})

test('N8 desktop 1440 (OPS-046): local progress write failure at completion is a visible notice, no silent stall', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  // Break only the progress key: draft saves (different key) keep working,
  // so the lesson itself stays usable and only the completion write fails.
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key: string, value: string) {
      // Block every progress envelope (legacy + owner-scoped), like a real quota failure.
      if (key.endsWith('kc-progress')) throw new Error('kc-progress write blocked (OPS-046 N8)')
      return original.call(this, key, value)
    }
  })
  const draft = emptyDraft(3)
  draft.passed = ['step-1', 'step-2', 'step-3']
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 4 关')
  await clickRun(page)
  await expect(page.getByTestId('mistake-observed')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('mistake-answer-stayed').click()
  await clickProgramTool(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'move_right')
  await runAndExpect(page, true)
  await expect(page.getByTestId('mistake-fixed')).toBeVisible()
  await complete(page)
  await expect(page.getByTestId('forest-hello-notice')).toContainText('本机存储失败', { timeout: 10_000 })
  await expect(page).not.toHaveURL(/\/project\/lesson-01-forest-hello\/complete/)
  // The guard is released: the button is clickable again, not stuck.
  await expect(page.getByTestId('forest-hello-complete-step')).toContainText('完成本课')
  await page.screenshot({ path: `${EVIDENCE}/n8-local-save-failed.png` })
})

test('N9 desktop 1440 (OPS-045): refresh mid-playthrough restores step 3 with prediction buttons enabled', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  await add(page, 'when_start')
  await runAndExpect(page, true)
  await complete(page)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 2 关')
  await add(page, 'when_start')
  await add(page, 'move_right')
  await runAndExpect(page, true)
  await complete(page)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 3 关')
  await expect(page.getByTestId('practice-answer-beside-friend')).toBeEnabled()
  // The step change must be persisted before the refresh, or the reload
  // would drop the player back to an earlier step.
  await expect.poll(() => draftStepIndex(page), { timeout: 10_000 }).toBe(2)
  await page.reload()
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 3 关')
  await expect(page.getByTestId('practice-answer-beside-friend')).toBeEnabled()
  await expect(page.getByTestId('practice-answer-half-way')).toBeEnabled()
  await expect(page.getByTestId('practice-task')).toBeVisible()
  await page.screenshot({ path: `${EVIDENCE}/n9-refresh-step3.png` })
})

test('N10 desktop 1440 (OPS-046 F1): retry sync succeeds but navigation is blocked — navigation-failed banner and a working fallback entry', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  // Phase 1: the cloud is down (every /api/guest POST answers 500), so
  // completing the lesson lands on the cloud-failed banner first. The
  // flag lives on window so the test can bring the cloud back later.
  await page.addInitScript(() => {
    const w = window as unknown as { __kcCloudDown?: boolean }
    w.__kcCloudDown = true
    const originalFetch = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (url.includes('/api/guest') && w.__kcCloudDown) {
        return Promise.resolve(new Response(JSON.stringify({ error: 'cloud down' }), { status: 500 }))
      }
      return originalFetch(input, init)
    }
  })
  const draft = emptyDraft(3)
  draft.passed = ['step-1', 'step-2', 'step-3']
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 4 关')
  await clickRun(page)
  await expect(page.getByTestId('mistake-observed')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('mistake-answer-stayed').click()
  await clickProgramTool(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'move_right')
  await runAndExpect(page, true)
  await expect(page.getByTestId('mistake-fixed')).toBeVisible()
  await complete(page)
  await expect(page.getByTestId('forest-hello-cloud-failed')).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: `${EVIDENCE}/n10-cloud-failed-first.png` })

  // Phase 2: the cloud recovers, but soft navigation to the complete
  // page is blocked (every non-document request for it is aborted).
  // router.push() returns no promise in the App Router, so nothing
  // throws — the arrival check must be what surfaces the failure.
  await page.evaluate(() => {
    ;(window as unknown as { __kcCloudDown?: boolean }).__kcCloudDown = false
  })
  // 注入方式（两轮实测结论）：abort 或 500 都会让 Next 把软导航回退
  // 成整页硬导航、页面反而成功跳走；只有让完成页的请求一直挂起，
  // 软导航才既不成功也不回退，页面留在原地——这正是生产环境里
  // “导航请求挂死”时孩子的真实处境，由到达核验兜底出横幅。
  await page.route('**/project/lesson-01-forest-hello/complete**', () => {})
  await page.getByTestId('forest-hello-retry-cloud-sync').click()
  // The sync succeeded (cloud banner gone for good) but the page never
  // arrives: the navigation-failed banner with the fallback entry is
  // the only acceptable outcome — never silence (F1).
  await expect(page.getByTestId('forest-hello-navigation-failed')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('forest-hello-cloud-failed')).toHaveCount(0)
  const fallback = page.getByTestId('forest-hello-open-complete-page')
  await expect(fallback).toBeVisible()
  await expect(fallback).toHaveAttribute('href', '/project/lesson-01-forest-hello/complete')
  await expect(page).toHaveURL(/\/studio\/blockly\/lesson-01-forest-hello/)
  await page.screenshot({ path: `${EVIDENCE}/n10-navigation-failed.png` })

  // Phase 3: the fallback entry is a plain full-page link — it works
  // even though client-side navigation is broken. The click is issued
  // via DOM click + waitForURL: a locator click that starts a full-page
  // navigation can race Playwright's actionability retries (the anchor
  // detaches as the page leaves and the click never returns — observed
  // as a 240s timeout under load, with the navigation actually started).
  await page.unroute('**/project/lesson-01-forest-hello/complete**')
  await Promise.all([
    page.waitForURL(/\/project\/lesson-01-forest-hello\/complete/, { timeout: 20_000 }),
    fallback.evaluate((el) => (el as HTMLAnchorElement).click()),
  ])
  await expect(page).toHaveURL(/\/project\/lesson-01-forest-hello\/complete/)
})
