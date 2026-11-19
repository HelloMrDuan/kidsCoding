import * as fs from 'node:fs'
import * as path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * OPS-047《小狐狸打招呼》studio 路由 E2E — 真实 Chromium，生产构建。
 *
 * 新路由 /studio/blockly/lesson-02-forest-greeting（StudioShell +
 * LessonWorkspace chrome='studio'，课程自有 GreetingEditorSlot /
 * GreetingStageSlot，运行与判定唯一来源 GreetingRunAdapter）。旧路由
 * /learn/lesson/lesson-02-forest-greeting 不动，由旧 spec 回归。
 *
 * 核心断言：狐狸按实际积木顺序先移动、再在对应位置显示所选对白
 * （不是静态演示）；四关不刷新连续通关（跨关状态不泄漏）；第 3 关
 * 预测先行；第 4 关错误实验先说后走（say-too-early）观察、答题、
 * 修序后通过；完成本课云同步失败有可见横幅与重试（不静默）。
 * 积木添加走 palette 的 lesson-add-* 按钮（真实路径），E2 另做一次
 * 工具箱 flyout 真实拖拽。不用固定时长 sleep 同步：等待都是条件期望。
 * 用临时 Playwright config（独立端口）运行；playwright.config.ts 不动。
 */
const ROUTE = '/studio/blockly/lesson-02-forest-greeting'
const KEY = 'kidscoding-draft:lesson-02-forest-greeting'
const EVIDENCE = path.resolve(__dirname, '../../test-results/forest-greeting-evidence')
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
const SAY = { type: 'say_line' }
const SAY_HI_ALL = { type: 'say_line', line: 'hi-all' }
const WRONG_TYPES = ['when_start', 'say_line', 'move_right']
const FIXED_TYPES = ['when_start', 'move_right', 'say_line']

type GreetingDraftSeed = {
  version: number
  lessonId: string
  stepIndex: number
  programs: Record<string, Array<{ type: string; line?: string }>>
  passed: string[]
  failures: number
}

function emptyDraft(stepIndex = 0): GreetingDraftSeed {
  return {
    version: 1,
    lessonId: 'lesson-02-forest-greeting',
    stepIndex,
    programs: {
      'step-1': [],
      'step-2': [],
      'step-3': [],
      'step-4': [START, SAY, MOVE],
    },
    passed: [],
    failures: 0,
  }
}

async function seedDraft(page: Page, draft: GreetingDraftSeed) {
  await page.addInitScript(
    ({ key, draft: data }) => {
      // 只在键不存在时播种：addInitScript 会在每次导航（含 reload）时
      // 重新执行；无此守卫时刷新用例会把已保存的程序用种子覆盖。
      if (window.localStorage.getItem(key) === null) {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            lessonId: 'lesson-02-forest-greeting',
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

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}

async function waitForShellSaved(page: Page) {
  await expect(page.getByTestId('studio-save-chip')).toContainText('已保存到本机', { timeout: 10_000 })
}

async function add(page: Page, type: string) {
  await page.getByTestId(`lesson-add-${type}`).click()
}

async function clickRun(page: Page) {
  if (await page.getByTestId('ws-run-toggle').isVisible()) {
    await page.getByTestId('ws-run-toggle').click()
  } else {
    await page.getByTestId('ws-sticky-run').click()
  }
}

async function runAndExpect(page: Page, passed: boolean, text?: string) {
  await clickRun(page)
  const conclusion = page.getByTestId('ws-feedback-conclusion')
  await expect(conclusion).toContainText(passed ? '已完成' : '未合格', { timeout: 20_000 })
  if (text) await expect(conclusion).toContainText(text)
}

async function complete(page: Page) {
  await page.getByTestId('forest-greeting-complete-step').click()
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

async function draftProgramTypes(page: Page, stepId: string) {
  const program = (await draftProgram(page, stepId)) as Array<{ type: string }> | null
  return program?.map((block) => block.type) ?? null
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
  expect(topbarBox!.height, 'slim topbar height in 48–56px').toBeGreaterThanOrEqual(48)
  expect(topbarBox!.height, 'slim topbar height in 48–56px').toBeLessThanOrEqual(56)
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

/** 真实拖拽（与 lesson-01 E6 同款连接点对齐算法）：打开工具箱分类 flyout，把第一块积木拖到现有 when_start 栈正下方接链。 */
async function dragToolboxBlock(page: Page, categoryLabel: string) {
  const category = page.getByRole('treeitem', { name: categoryLabel }).first()
  await category.click()
  const flyoutBlock = page.locator('.blocklyFlyout .blocklyDraggable').first()
  await flyoutBlock.waitFor({ state: 'visible', timeout: 10_000 })
  const box = await flyoutBlock.boundingBox()
  expect(box).not.toBeNull()
  const canvas = page.locator('[data-testid="ws-editor-slot"] svg.blocklySvg')
  await canvas.waitFor({ state: 'visible', timeout: 10_000 })
  const lastBlock = page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable.when_start').first()
  const lastBox = await lastBlock.boundingBox().catch(() => null)
  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()
  const canvasTransform = await page
    .locator('svg.blocklySvg .blocklyBlockCanvas')
    .evaluate((el) => el.getAttribute('transform') ?? '')
  const scale = Number.parseFloat(/scale\(([\d.]+)\)/.exec(canvasTransform)?.[1] ?? '1') || 1
  const dropX = lastBox ? lastBox.x + box!.width / 2 : canvasBox!.x + canvasBox!.width / 2
  const dropY = lastBox
    ? lastBox.y + lastBox.height - 8 * scale + box!.height / 2
    : canvasBox!.y + 80
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(dropX, dropY, { steps: 20 })
  await page.waitForTimeout(300)
  await page.mouse.up()
}

test('E1 desktop 1440: continuous playthrough of all 4 steps without refresh', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTE)
  await expect(page.getByTestId('forest-greeting-slot')).toBeVisible()
  await expect(page.getByTestId('forest-greeting-step-progress')).toContainText('第 1 / 4 关')
  await expect(page.getByTestId('forest-greeting-step-title')).toContainText('先让小狐狸出场')
  await expect(page.getByTestId('ws-stage-box')).toBeVisible()
  await assertShellInvariants(page)
  await page.screenshot({ path: `${EVIDENCE}/e1-step1-start.png` })

  // —— 第 1 关：先出场（开始 + 移动）——
  await add(page, 'when_start')
  await add(page, 'move_right')
  await runAndExpect(page, true)
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100', { timeout: 20_000 })
  await complete(page)
  await expect(page.getByTestId('forest-greeting-step-title')).toContainText('第 2 关')

  // —— 第 2 关：出场后选一句对白再说话 ——
  await add(page, 'when_start')
  await add(page, 'move_right')
  await add(page, 'say_line')
  await page.getByTestId('lesson-say-line-hi-all').click()
  await expect.poll(() => draftProgram(page, 'step-2')).toEqual([START, MOVE, SAY_HI_ALL])
  await runAndExpect(page, true, '大家好呀')
  // 狐狸先走到 100 步，气泡里是所选对白（不是默认句、不是静态文案）。
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100', { timeout: 20_000 })
  await expect(page.getByTestId('stage-character-main')).toContainText('大家好呀！')
  await expect(page.getByTestId('ws-feedback-stage')).toContainText('大家好呀')
  await page.screenshot({ path: `${EVIDENCE}/e1-step2-said.png` })
  await complete(page)
  await expect(page.getByTestId('forest-greeting-step-title')).toContainText('第 3 关')

  // —— 第 3 关：先预测，再原地打招呼 ——
  await expect(page.getByTestId('practice-task')).toBeVisible()
  await complete(page)
  await expect(page.getByTestId('forest-greeting-notice')).toContainText('先在舞台上猜一猜')
  await page.getByTestId('practice-answer-stay').click()
  await expect(page.getByTestId('practice-answer-reply')).toContainText('猜好啦')
  await add(page, 'when_start')
  await add(page, 'say_line')
  await runAndExpect(page, true)
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '0', { timeout: 20_000 })
  // 第 2 关选过的对白会保留到第 3 关（选句器仍显示“大家好呀！”为选中），
  // 所以原地说的仍是那句——这是选句状态的正常延续，不是默认值。
  await expect(page.getByTestId('stage-character-main')).toContainText('大家好呀！')
  await expect(page.getByTestId('practice-done')).toBeVisible()
  await complete(page)
  await expect(page.getByTestId('forest-greeting-step-title')).toContainText('第 4 关')

  // —— 第 4 关：错误实验（先说后走）→ 观察 → 答题 → 修序 → 通过 ——
  await expect(page.getByTestId('mistake-task')).toBeVisible()
  await expect.poll(() => draftProgramTypes(page, 'step-4')).toEqual(WRONG_TYPES)
  await clickRun(page)
  await expect(page.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code', 'say-too-early', { timeout: 20_000 })
  await expect(page.getByTestId('stage-run-error')).toHaveCount(0)
  await expect(page.getByTestId('mistake-observed')).toBeVisible()
  // 错误程序的真实舞台：先在 0 步说话（气泡出现），这不是失败惩罚。
  await expect(page.getByTestId('stage-character-main')).toContainText('你好！')
  await page.screenshot({ path: `${EVIDENCE}/e1-step4-mistake.png` })
  await complete(page)
  await expect(page.getByTestId('forest-greeting-notice')).toContainText('先回答舞台上的问题')
  await page.getByTestId('mistake-answer-before-walk').click()
  await expect(page.getByTestId('mistake-fix')).toBeVisible()
  // 修序：把“说一句话”（第 2 块）下移到移动之后。
  await page.getByTestId('forest-greeting-block-down-1').click()
  await expect.poll(() => draftProgramTypes(page, 'step-4')).toEqual(FIXED_TYPES)
  await runAndExpect(page, true)
  await expect(page.getByTestId('mistake-fixed')).toBeVisible()
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100', { timeout: 20_000 })
  await complete(page)
  await expect(page).toHaveURL(/\/project\/lesson-02-forest-greeting\/complete/, { timeout: 20_000 })
  await page.screenshot({ path: `${EVIDENCE}/e1-complete.png` })
})

test('E2 desktop 1440: real toolbox flyout drag connects the move block, then say passes', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const draft = emptyDraft(1)
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await expect(page.getByTestId('forest-greeting-step-title')).toContainText('第 2 关')
  await add(page, 'when_start')
  await expect.poll(() => draftProgramTypes(page, 'step-2')).toEqual(['when_start'])
  await dragToolboxBlock(page, '移动')
  await expect.poll(() => draftProgramTypes(page, 'step-2')).toEqual(['when_start', 'move_right'])
  await add(page, 'say_line')
  await runAndExpect(page, true)
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100', { timeout: 20_000 })
  await expect(page.getByTestId('stage-character-main')).toContainText('你好！')
})

test('E3 desktop 1440: save + refresh restores step 2 with the chosen line', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const draft = emptyDraft(1)
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await add(page, 'when_start')
  await add(page, 'move_right')
  await add(page, 'say_line')
  await page.getByTestId('lesson-say-line-lets-play').click()
  await expect.poll(() => draftProgram(page, 'step-2')).toEqual([
    START,
    MOVE,
    { type: 'say_line', line: 'lets-play' },
  ])
  await runAndExpect(page, true)
  await waitForShellSaved(page)
  await page.reload()
  await expect(page.getByTestId('forest-greeting-step-title')).toContainText('第 2 关')
  await expect.poll(() => draftProgram(page, 'step-2')).toEqual([
    START,
    MOVE,
    { type: 'say_line', line: 'lets-play' },
  ])
  await runAndExpect(page, true, '一起来玩吧')
  await expect(page.getByTestId('stage-character-main')).toContainText('一起来玩吧！')
})

for (const size of SIZES) {
  test(`E4 ${size.name}: first screen — no AppShell, no outer scroll, topbar fits, canvas Gate 1`, async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: size.width, height: size.height })
    await page.goto(ROUTE)
    await expect(page.getByTestId('ws-editor-slot').locator('svg.blocklySvg')).toBeVisible({ timeout: 30_000 })
    await assertShellInvariants(page)
    await assertTopbarFits(page, size.width)
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
    const visible = await canvasVisibleHeight(page, size.height)
    if (size.width === 768) expect(visible).toBeGreaterThanOrEqual(300)
    if (size.width === 375) expect(visible).toBeGreaterThanOrEqual(220)
    const stageBox = await page.getByTestId('ws-stage-box').boundingBox()
    expect(stageBox).not.toBeNull()
    expect(stageBox!.y).toBeLessThan(size.height)
    const runToggle = page.getByTestId('ws-run-toggle')
    const runEntry = (await runToggle.isVisible()) ? runToggle : page.getByTestId('ws-sticky-run')
    const runBox = await runEntry.boundingBox()
    expect(runBox).not.toBeNull()
    expect(runBox!.y).toBeLessThan(size.height)
    await page.screenshot({ path: `${EVIDENCE}/e4-first-${size.name}.png` })
  })
}

test('N1 desktop 1440: cloud sync failure on completion shows the banner with retry (never silent)', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (url.includes('/api/guest')) {
        return Promise.resolve(new Response(JSON.stringify({ error: 'offline' }), { status: 500 }))
      }
      return originalFetch(input, init)
    }
  })
  const draft = emptyDraft(3)
  draft.passed = ['step-1', 'step-2', 'step-3']
  await seedDraft(page, draft)
  await page.goto(ROUTE)
  await expect(page.getByTestId('forest-greeting-step-title')).toContainText('第 4 关')
  // 先观察错误实验并答题。
  await clickRun(page)
  await expect(page.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code', 'say-too-early', { timeout: 20_000 })
  await page.getByTestId('mistake-answer-before-walk').click()
  await expect(page.getByTestId('mistake-fix')).toBeVisible()
  // 清空重拼为正确顺序并跑通。
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'move_right')
  await add(page, 'say_line')
  await runAndExpect(page, true)
  await complete(page)
  // 云端 500：必须出现失败横幅与重试/仅本机入口，且不跳转、不静默。
  await expect(page.getByTestId('forest-greeting-cloud-failed')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('forest-greeting-retry-cloud-sync')).toBeVisible()
  await expect(page.getByTestId('forest-greeting-continue-local-only')).toBeVisible()
  await expect(page).toHaveURL(new RegExp(ROUTE.replaceAll('/', '\\/')))
  await page.screenshot({ path: `${EVIDENCE}/n1-cloud-failed.png` })
})

test('N2 desktop 1440: legacy old-route draft is offered and imports with its chosen line', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => {
    const at = new Date().toISOString()
    window.sessionStorage.setItem(
      'kc-lesson-draft:lesson-02-forest-greeting:0',
      JSON.stringify({ schemaVersion: 1, lessonId: 'lesson-02-forest-greeting', stepIndex: 0, blocks: [{ type: 'when_start' }], updatedAt: at }),
    )
    window.sessionStorage.setItem(
      'kc-lesson-draft:lesson-02-forest-greeting:1',
      JSON.stringify({
        schemaVersion: 1,
        lessonId: 'lesson-02-forest-greeting',
        stepIndex: 1,
        blocks: [{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line: 'nice-to-meet' }],
        updatedAt: at,
      }),
    )
  })
  await page.goto(ROUTE)
  await expect(page.getByTestId('forest-greeting-legacy-import')).toBeVisible()
  await page.getByTestId('forest-greeting-import-legacy').click()
  await expect(page.getByTestId('forest-greeting-step-title')).toContainText('第 2 关')
  await expect.poll(() => draftProgram(page, 'step-2')).toEqual([
    START,
    MOVE,
    { type: 'say_line', line: 'nice-to-meet' },
  ])
})

test('N10 desktop 1440 (OPS-047 F1): retry sync succeeds but navigation is blocked — navigation-failed banner and a working fallback entry', async ({ page }) => {
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
  await expect(page.getByTestId('forest-greeting-step-title')).toContainText('第 4 关')
  // 先观察错误实验并答题。
  await clickRun(page)
  await expect(page.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code', 'say-too-early', { timeout: 20_000 })
  await page.getByTestId('mistake-answer-before-walk').click()
  await expect(page.getByTestId('mistake-fix')).toBeVisible()
  // 清空重拼为正确顺序并跑通。
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'move_right')
  await add(page, 'say_line')
  await runAndExpect(page, true)
  await complete(page)
  await expect(page.getByTestId('forest-greeting-cloud-failed')).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: `${EVIDENCE}/n10-cloud-failed-first.png` })

  // Phase 2: the cloud recovers, but soft navigation to the complete
  // page is blocked (every request for it hangs forever).
  // 注入方式（hello N10 两轮实测结论）：abort 或 500 会让 Next 把软
  // 导航回退成整页硬导航、页面反而成功跳走；只有让完成页的请求一直
  // 挂起，软导航才既不成功也不回退，页面留在原地——这正是生产环境
  // 里“导航请求挂死”时孩子的真实处境，由到达核验兜底出横幅。
  await page.evaluate(() => {
    ;(window as unknown as { __kcCloudDown?: boolean }).__kcCloudDown = false
  })
  await page.route('**/project/lesson-02-forest-greeting/complete**', () => {})
  await page.getByTestId('forest-greeting-retry-cloud-sync').click()
  // The sync succeeded (cloud banner gone for good) but the page never
  // arrives: the navigation-failed banner with the fallback entry is
  // the only acceptable outcome — never silence (F1).
  await expect(page.getByTestId('forest-greeting-navigation-failed')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('forest-greeting-cloud-failed')).toHaveCount(0)
  const fallback = page.getByTestId('forest-greeting-open-complete-page')
  await expect(fallback).toBeVisible()
  await expect(fallback).toHaveAttribute('href', '/project/lesson-02-forest-greeting/complete')
  await expect(page).toHaveURL(/\/studio\/blockly\/lesson-02-forest-greeting/)
  await page.screenshot({ path: `${EVIDENCE}/n10-navigation-failed.png` })

  // Phase 3: the fallback entry is a plain full-page link — it works
  // even though client-side navigation is broken. The click is issued
  // via DOM click + waitForURL: a locator click that starts a full-page
  // navigation can race Playwright's actionability retries (the anchor
  // detaches as the page leaves and the click never returns — observed
  // as a 240s timeout under load, with the navigation actually started).
  await page.unroute('**/project/lesson-02-forest-greeting/complete**')
  await Promise.all([
    page.waitForURL(/\/project\/lesson-02-forest-greeting\/complete/, { timeout: 20_000 }),
    fallback.evaluate((el) => (el as HTMLAnchorElement).click()),
  ])
  await expect(page).toHaveURL(/\/project\/lesson-02-forest-greeting\/complete/)
})
