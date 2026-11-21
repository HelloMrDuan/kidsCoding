import { expect, test, type Page } from '@playwright/test'
import { showLessonPane } from './lesson-pane-helpers'

/**
 * Select the classroom zone that owns the control under test.
 * Golden arrivals (G0-U3-L05) use their own shell; every other grid/event
 * lesson uses the three-zone GuidedLessonShell. On desktops both helpers are
 * a no-op because all zones stay visible.
 */
async function lessonPane(page: Page, pane: 'task' | 'code' | 'stage') {
  if (await page.getByTestId('golden-lesson').count()) {
    await fencePane(page, pane)
    return
  }
  await showLessonPane(page, pane)
}

async function codeClick(page: Page, testId: string) {
  await lessonPane(page, 'code')
  await page.getByTestId(testId).click()
}

async function stageClick(page: Page, testId: string) {
  await lessonPane(page, 'stage')
  await page.getByTestId(testId).click()
}

/**
 * Prediction and goal choices live in the stage column of the three-zone
 * shell but inside the collapsible task panel of the golden arrival shell.
 */
async function taskToolsClick(page: Page, testId: string) {
  await lessonPane(page, (await page.getByTestId('golden-lesson').count()) ? 'task' : 'stage')
  await page.getByTestId(testId).click()
}

async function add(page: Page, type: string, times = 1) {
  await lessonPane(page, 'code')
  await openFenceTools(page)
  for (let i = 0; i < times; i += 1) await page.getByTestId(`lesson-add-${type}`).click()
}

async function openFenceTools(page: Page) {
  const tools = page.getByTestId('golden-block-tools')
  if (await tools.isVisible() && !await tools.evaluate(el => el.parentElement?.hasAttribute('open'))) await tools.click()
}
async function runAndExpect(page: Page, tone: 'success' | 'error', text?: string) {
  await lessonPane(page, 'stage')
  await stageClick(page, 'grid-run')
  const feedback = page.getByTestId('grid-feedback')
  await expect(feedback).toHaveAttribute('data-tone', tone, { timeout: 15_000 })
  if (text) await expect(feedback).toContainText(text)
}
async function next(page: Page) {
  await page.getByTestId('lesson-complete-step').click()
}

const fenceId = 'G0-U3-L05'
const fenceUrl = '/learn/grid-lab/' + fenceId
const oldFenceKey = 'kids-grid-lesson-v1:' + fenceId
const fenceKey = 'kids-lesson-owner-v1:guest:' + oldFenceKey

async function fencePane(page: Page, pane: 'task' | 'code' | 'stage') {
  if (await page.getByTestId('lesson-mobile-tabs').isVisible()) {
    const shell = page.getByTestId('golden-lesson')
    const tab = page.getByTestId('lesson-mobile-tab-' + pane)
    await tab.click()
    // The tab is in the SSR HTML before hydration binds it, and a tap right
    // after a Blockly touch drag can land before the pane commits. Verify the
    // pane really switched, click again once, then assert for real.
    try {
      await expect(shell).toHaveAttribute('data-pane', pane, { timeout: 5_000 })
    } catch {
      await tab.click()
      await expect(shell).toHaveAttribute('data-pane', pane)
    }
  } else if ((page.viewportSize()?.width ?? 0) >= 768 && (page.viewportSize()?.width ?? 0) < 1200) {
    const open = await page.getByTestId('golden-lesson').getAttribute('data-tablet-task-open') === 'true'
    if (open !== (pane === 'task')) await page.getByTestId('golden-task-toggle').click()
  }
}

async function openFence(page: Page) {
  await page.goto('/learn/catalog/' + fenceId)
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await expect(page.getByTestId('grid-trial-entry')).toContainText('开始画围栏')
  await page.getByTestId('grid-trial-entry').click()
  await expect(page.locator('svg.blocklySvg')).toBeVisible()
  await expect(page.getByTestId('lesson-cloud-privacy-note')).toHaveCount(0)
}

async function enterFenceCorner(page: Page) {
  await fencePane(page, 'task')
  await taskToolsClick(page, 'grid-predict-choice-1')
  await fencePane(page, 'stage')
  await runAndExpect(page, 'error', '左边还留着一个缺口')
  await fencePane(page, 'code')
  await openFenceTools(page)
  await codeClick(page, 'lesson-repeat-times-4')
  await fencePane(page, 'stage')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('lesson-task-card')).toContainText('先走一边，再转弯')
}

async function dragFenceTurn(page: Page, touch: boolean) {
  const editor = page.locator('svg.blocklySvg')
  const turn = editor.locator('.blocklyBlockCanvas .blocklyDraggable.turn_right').first()
  const lastForward = page.locator('.blocklyBlockCanvas .blocklyDraggable.move_forward').last().locator(':scope > .blocklyPath')
  const centerEditor = () => editor.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }))
  await centerEditor()
  const path = turn.locator(':scope > .blocklyPath:not(.blocklyPathSelected)').first()
  const box = await path.boundingBox()
  expect(box).toBeTruthy()
  const start = { x: box!.x + 22, y: box!.y + box!.height / 2 }
  const tailBefore = (await lastForward.boundingBox())!
  const end = { x: start.x + 48, y: start.y + 35 }
  const client = touch ? await page.context().newCDPSession(page) : null
  const drag = async (from: typeof start, to: typeof end) => {
    expect(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.blocklyDraggable.turn_right'), from)).toBe(true)
    if (client) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
      for (let i = 1; i <= 10; i++) {
        const point = { x: from.x + (to.x - from.x) * i / 10, y: from.y + (to.y - from.y) * i / 10 }
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] })
      }
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } else {
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(to.x, to.y, { steps: 12 })
      await page.mouse.up()
    }
  }
  const canvas = page.locator('svg.blocklySvg .blocklyBlockCanvas')
  await drag(start, end)
  await expect(canvas.locator(':scope > g.blocklyDraggable')).toHaveCount(2)
  await fencePane(page, 'stage')
  await runAndExpect(page, 'error', '掉队')
  await fencePane(page, 'code')
  await centerEditor()
  const dropped = (await path.boundingBox())!
  const tailAfter = (await lastForward.boundingBox())!
  const from = { x: dropped.x + 22, y: dropped.y + dropped.height / 2 }
  await drag(from, { x: tailAfter.x + start.x - tailBefore.x, y: tailAfter.y + start.y - tailBefore.y })
  await expect(canvas.locator(':scope > g.blocklyDraggable')).toHaveCount(1)
  await expect.poll(() => page.evaluate(key => {
    const draft = JSON.parse(localStorage.getItem(key) ?? '{}')
    return draft.programs?.['one-corner']?.map((item: { type: string }) => item.type)
  }, fenceKey)).toEqual(['when_start', 'move_forward', 'move_forward', 'turn_right'])
  await client?.detach()
}

async function dragFenceTurnFromToolbox(page: Page) {
  const editor = page.locator('svg.blocklySvg')
  const tail = editor.locator('.blocklyBlockCanvas .blocklyDraggable.move_forward').last().locator(':scope > .blocklyPath')
  await editor.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await page.locator('.blocklyToolboxCategory', { hasText: '移动' }).click()
  const flyout = page.locator('svg.blocklyFlyout .blocklyDraggable.turn_right > .blocklyPath')
  await expect(flyout).toBeVisible()
  const from = (await flyout.boundingBox())!
  const last = (await tail.boundingBox())!
  const surface = (await editor.boundingBox())!
  await page.mouse.move(from.x + 22, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(surface.x + surface.width * 0.75, from.y + from.height / 2 + 14, { steps: 10 })
  await page.mouse.move(last.x + 22, last.y + last.height - 7 + from.height / 2, { steps: 14 })
  await page.mouse.up()
  await expect.poll(() => page.evaluate(key => {
    const draft = JSON.parse(localStorage.getItem(key) ?? '{}')
    return draft.programs?.['one-corner']?.map((item: { type: string }) => item.type)
  }, fenceKey)).toEqual(['when_start', 'move_forward', 'move_forward', 'turn_right'])
}

test('G0-U3-L05 fence: five steps, three hints, failed storage retry, portfolio and continued editing', async ({ page }) => {
  test.setTimeout(150_000)
  await openFence(page)
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await enterFenceCorner(page)

  await runAndExpect(page, 'error', '箭头')
  await expect(page.getByTestId('lesson-hint')).toContainText('不会移动')
  await stageClick(page, 'grid-more-hint')
  await expect(page.getByTestId('lesson-hint')).toContainText('走到角上')
  await stageClick(page, 'grid-more-hint')
  await expect(page.getByTestId('lesson-hint')).toContainText('开始时 →')
  await lessonPane(page, 'code')
  await dragFenceTurnFromToolbox(page)
  await dragFenceTurn(page, false)
  await lessonPane(page, 'task')
  await page.getByTestId('golden-file-tools').click()
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByTestId('golden-export').click()])
  const downloaded = await file.path()
  expect(downloaded).toBeTruthy()
  await lessonPane(page, 'code')
  await openFenceTools(page)
  await codeClick(page, 'lesson-clear-program')
  await page.getByTestId('golden-import').setInputFiles(downloaded!)
  await expect(page.getByTestId('golden-file-status')).toContainText('积木已导入')
  await page.getByTestId('golden-import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') })
  await expect(page.getByTestId('golden-file-status')).toContainText('这一关')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('grid-stage')).toHaveAttribute('data-fox-facing', 'down')
  await next(page)

  const fileMenu = page.getByTestId('golden-file-tools')
  await lessonPane(page, 'task')
  if (!await fileMenu.evaluate(el => el.parentElement?.hasAttribute('open'))) await fileMenu.click()
  await page.getByTestId('golden-import').setInputFiles({
    name: 'previous-nested-program.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({
      schema: 1, lessonId: fenceId, stepId: 'nested-square',
      blocks: [{ type: 'when_start' }, { type: 'repeat_times', times: 4, body: [
        { type: 'repeat_times', times: 2, body: [{ type: 'move_forward' }] }, { type: 'turn_right' },
      ] }],
    })),
  })
  await expect(page.getByTestId('golden-file-status')).toContainText('积木已导入')
  await runAndExpect(page, 'error', '只用一层重复')
  await lessonPane(page, 'code')
  await openFenceTools(page)
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await add(page, 'move_forward', 2)
  await add(page, 'turn_right')
  await codeClick(page, 'lesson-repeat-times-4')
  await runAndExpect(page, 'success')
  await next(page)

  await runAndExpect(page, 'error', '箭头')
  await add(page, 'turn_right')
  await runAndExpect(page, 'success')
  await next(page)

  await stageClick(page, 'grid-run')
  await expect(page.getByTestId('grid-feedback')).toContainText('先选围栏的边长')
  await taskToolsClick(page, 'grid-goal-choice-1')
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await add(page, 'move_forward', 3)
  await add(page, 'turn_right')
  await page.evaluate(key => {
    const saved = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Course storage test', 'QuotaExceededError')
      saved.call(this, name, value)
    }
    window.addEventListener('restore-course-storage', () => { Storage.prototype.setItem = saved }, { once: true })
  }, fenceKey)
  await codeClick(page, 'lesson-repeat-times-4')
  await expect(page.getByTestId('lesson-save-local')).toContainText('本机保存失败')
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('link', { name: '返回课程' }).click()
  await expect(page).toHaveURL(new RegExp(fenceUrl + '$'))
  await page.evaluate(() => window.dispatchEvent(new Event('restore-course-storage')))
  await page.getByTestId('lesson-save-retry').click()
  await expect(page.getByTestId('lesson-save-local')).toContainText('已保存到本机')
  await page.reload()
  await expect(page.getByTestId('grid-goal-choice-1')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('lesson-repeat-times-4')).toHaveAttribute('aria-pressed', 'true')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('grid-stage')).toHaveAttribute('data-fox-cell', '1,0')
  await expect(page.getByTestId('grid-stage')).toHaveAttribute('data-fox-facing', 'right')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await expect(page.getByTestId('grid-completion-badge')).toHaveText('本机成就 · 围栏工程师')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')
  await page.getByRole('link', { name: '查看作品中心' }).click()
  const work = page.getByTestId('portfolio-work-' + fenceId)
  await expect(work).toContainText('我的花圃围栏')
  await work.locator('a[href="' + fenceUrl + '"]').click()
  await expect(page.getByTestId('grid-completion-badge')).toHaveText('本机成就 · 围栏工程师')
  await expect(page.getByTestId('grid-project-status')).toContainText('围栏已闭合')
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-play')).toBeEnabled({ timeout: 15_000 })
  await expect(page.locator('[data-grid-item="route-trace"]')).toBeVisible()
  if (process.env.KC_FENCE_EVIDENCE_DIR) {
    await page.getByTestId('grid-project-card').screenshot({ path: `${process.env.KC_FENCE_EVIDENCE_DIR}/reopened-project.png` })
  }
  await page.getByTestId('grid-replay-my-fence').click()
  await lessonPane(page, 'code')
  await openFenceTools(page)
  await codeClick(page, 'lesson-repeat-times-3')
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('先按')
  await runAndExpect(page, 'error')

  await page.evaluate(({ scoped, legacy }) => localStorage.setItem(legacy, localStorage.getItem(scoped)!), { scoped: fenceKey, legacy: oldFenceKey })
  await page.context().addCookies([{ name: 'kc_guest_id', value: 'another-learner', url: new URL(page.url()).origin }])
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText(/当前账号无法确认，课堂草稿已锁定/)).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('lesson-task-card')).toContainText('观察少掉的一边')
  await page.goto('/learn/portfolio')
  await expect(page.getByTestId('portfolio-work-' + fenceId)).toHaveCount(0)
  await page.context().clearCookies({ name: 'kc_guest_id' })
  await page.goto('/learn/portfolio')
  await expect(page.getByTestId('portfolio-work-' + fenceId)).toBeVisible()
})

test('G0-U3-L05 golden desktop frees editor space, keeps the workspace and stops without progress', async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await openFence(page)
  const editor = page.locator('svg.blocklySvg')
  const scene = page.getByTestId('grid-stage')
  const shell = page.getByTestId('golden-lesson')
  const mount = await editor.elementHandle()
  const initialSize = (await editor.boundingBox())!
  expect(initialSize.height).toBeGreaterThan(540)
  await expect(page.getByTestId('lesson-add-turn_right')).toBeHidden()
  await page.getByTestId('golden-task-toggle').click()
  await expect(shell).toHaveAttribute('data-task-open', 'false')
  await expect.poll(async () => (await editor.boundingBox())!.width).toBeGreaterThan(initialSize.width + 190)
  const collapsedSize = (await editor.boundingBox())!
  await expect(scene).toBeVisible()
  await test.info().attach('editor geometry', { contentType: 'application/json', body: JSON.stringify({ beforeHeight: 420, expanded: initialSize, collapsed: collapsedSize }) })
  if (process.env.KC_FENCE_EVIDENCE_DIR) {
    await page.screenshot({ path: `${process.env.KC_FENCE_EVIDENCE_DIR}/1440x900-task-collapsed.png` })
  }
  expect(await editor.evaluate((current, prior) => current.isSameNode(prior), mount)).toBe(true)
  await page.getByTestId('golden-fullscreen').click()
  await expect(page.getByTestId('golden-fullscreen')).toHaveText('退出全屏')
  expect(await editor.evaluate((current, prior) => current.isSameNode(prior), mount)).toBe(true)
  await page.getByTestId('golden-fullscreen').click()
  await expect(page.getByTestId('golden-fullscreen')).toHaveText('全屏')
  await stageClick(page, 'grid-run')
  await expect(page.getByTestId('grid-stop')).toBeEnabled()
  await page.getByTestId('grid-stop').click()
  await expect(scene).toHaveAttribute('data-fox-cell', '0,0')
  await expect(page.getByTestId('grid-feedback')).toContainText('已停止')
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('先按原样运行')
  await page.getByTestId('golden-save').click()
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
})

for (const [width, height] of [[1440, 900], [1366, 768], [768, 1024], [375, 812]]) {
  test(`G0-U3-L05 viewport ${width}x${height} edits and runs connected Blockly`, async ({ browser }) => {
    test.setTimeout(70_000)
    const touch = width <= 768
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: width === 375 })
    try {
      const page = await context.newPage()
      await page.goto(fenceUrl)
      await enterFenceCorner(page)
      await fencePane(page, 'code')
      const svg = page.locator('svg.blocklySvg')
      await expect(svg).toBeVisible()
      const original = await svg.elementHandle()
      if (touch) {
        await openFenceTools(page)
        await page.getByTestId('lesson-add-turn_right').tap()
      }
      else await add(page, 'turn_right')
      await dragFenceTurn(page, touch)
      if (width === 375) {
        await expect(page.getByTestId('golden-save')).toBeInViewport()
        await expect(page.getByTestId('grid-run')).toBeInViewport()
      }
      await fencePane(page, 'stage')
      await runAndExpect(page, 'success')
      await expect(page.getByTestId('grid-stage')).toHaveAttribute('data-fox-facing', 'down')
      expect(await svg.evaluate((current, prior) => current.isSameNode(prior), original)).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      if (process.env.KC_FENCE_EVIDENCE_DIR) {
        await page.getByTestId('grid-lab-title-row').scrollIntoViewIfNeeded()
        await page.screenshot({ path: `${process.env.KC_FENCE_EVIDENCE_DIR}/${width}x${height}.png` })
        if (width === 375) {
          await fencePane(page, 'code')
          await page.getByTestId('grid-lab-title-row').scrollIntoViewIfNeeded()
          await page.screenshot({ path: `${process.env.KC_FENCE_EVIDENCE_DIR}/375x812-blockly.png` })
        }
      }
    } finally {
      await context.close()
    }
  })
}

test('G0-U1-L01 formal course: error lab, two practices, creative remake, review, saved and reopened', async ({ page }) => {
  test.setTimeout(150_000)
  await page.goto('/learn/catalog/G0-U1-L01')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('grid-trial-entry').click()
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  // Original story scenery: the fox leaves a real illustrated treehouse, not a placeholder.
  await lessonPane(page, 'stage')
  await expect(page.locator('[data-grid-item="treehouse"]')).toBeVisible()
  // TQ-010: “回到起点” uses the decorative SVG icon, not the “↺” glyph; its name is the plain text.
  const reset = page.getByTestId('grid-reset')
  await expect(reset.locator('svg[data-testid="reset-icon"]')).toHaveAttribute('aria-hidden', 'true')
  await expect(reset).not.toContainText('↺')
  await expect(page.getByRole('button', { name: '回到起点', exact: true })).toHaveAttribute('data-testid', 'grid-reset')

  // Step 1 — error lab. Can't skip, and fixing before seeing the mistake doesn't count.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toHaveAttribute('data-tone', 'warning')
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await add(page, 'when_start')
  await stageClick(page, 'grid-run')
  await expect(page.getByTestId('grid-feedback')).toHaveAttribute('data-tone', 'warning', { timeout: 15_000 })
  await next(page)
  await expect(page.getByTestId('lesson-complete-step')).toBeVisible()
  await expect(page.getByTestId('grid-feedback')).toContainText('先按原样运行一次')
  // Recover the planned mistake, predict (wrongly — never blocks), run, compare expected vs actual.
  await stageClick(page, 'grid-restore-starter')
  await stageClick(page, 'grid-predict-choice-0')
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('猜错也没关系')
  await expect(page.getByTestId('grid-feedback')).toContainText('一动不动')
  await lessonPane(page, 'task')
  await expect(page.getByText(/第 1 层/)).toBeVisible()
  await stageClick(page, 'grid-more-hint')
  await lessonPane(page, 'task')
  await expect(page.getByText(/第 2 层/)).toBeVisible()
  await add(page, 'when_start')
  await runAndExpect(page, 'success')
  await next(page)

  // Step 2: either arrow type works; one short is a specific failure.
  await add(page, 'when_start')
  await add(page, 'move_forward', 2)
  await runAndExpect(page, 'error', '还没到蘑菇屋')
  await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: overshooting falls into the river.
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 3)
  await runAndExpect(page, 'error', '小河')
  await codeClick(page, 'lesson-remove-last')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: a loose block from the starter program is reported, then fixed.
  await runAndExpect(page, 'error', '掉队')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 3)
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: must place the house first; then the child's own route to the child's own map.
  await expect(page.getByTestId('grid-creative')).toBeVisible()
  await stageClick(page, 'grid-run')
  await expect(page.getByTestId('grid-feedback')).toContainText('先选一格')
  await stageClick(page, 'grid-goal-choice-2') // 第 5 格 → 4 arrows
  await expect(page.getByTestId('grid-stage')).toBeVisible()
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 3)
  await runAndExpect(page, 'error', '还没到蘑菇屋')
  await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘 lists the mistakes this child really met; what-if answer on demand.
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('忘了“开始时”')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('掉进小河')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('再接一块箭头')
  await expect(page.getByTestId('grid-project-status')).toHaveText('真实运行能走到蘑菇屋')
  await expect(page.getByTestId('grid-project-steps').locator('li')).toHaveCount(5)

  // EDU-105: one-tap reflection is judged and saved with the lesson.
  await page.getByTestId('grid-reflection-option-1').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'false')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the work, its map, the review and the reflection all come back.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await expect(page.getByTestId('grid-reflection-option-0')).toHaveAttribute('data-chosen', 'true')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('掉进小河')
  await expect(page.getByTestId('grid-project-status')).toHaveText('真实运行能走到蘑菇屋')
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-card').getByTestId('grid-stage')).toHaveAttribute('data-fox-cell', '4,0', { timeout: 15_000 })

  // Modify after reopening: move the house; the old route no longer counts until re-run.
  await page.getByTestId('grid-replay-my-start-card').click()
  await expect(page.getByTestId('grid-goal-choice-2')).toHaveAttribute('data-chosen', 'true')
  await stageClick(page, 'grid-goal-choice-1') // 第 4 格
  await runAndExpect(page, 'error')
  await codeClick(page, 'lesson-remove-last')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
})

test('G0-U1-L02 formal course: wrong-way error lab, two practices, pick a friend, review, saved and reopened', async ({ page }) => {
  test.setTimeout(150_000)
  await page.goto('/learn/grid-lab/G0-U1-L02')
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  // Original story scenery: the forest post office with its four-way signpost.
  await lessonPane(page, 'stage')
  await expect(page.locator('[data-grid-item="signpost"]')).toBeVisible()

  // Step 1 — error lab: the starter walks DOWN although the house is UP. Predict (wrongly), run as-is, compare.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await stageClick(page, 'grid-predict-choice-0')
  await expect(page.getByTestId('grid-predict-choice-0')).toHaveAttribute('aria-pressed', 'true')
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('猜错也没关系')
  await expect(page.getByTestId('grid-feedback')).toContainText('走出了地图')
  await lessonPane(page, 'task')
  await expect(page.getByText(/第 1 层/)).toBeVisible()
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'move_up', 2)
  await runAndExpect(page, 'success')
  await next(page)

  // Guided: one cell too far is a specific failure, then the corner route passes.
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 3)
  await add(page, 'move_up', 2)
  await runAndExpect(page, 'error', '还没到')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'move_up', 2)
  await add(page, 'move_right_cell', 2)
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: cutting through the river fails; the dry route passes.
  await add(page, 'when_start')
  await add(page, 'move_up')
  await add(page, 'move_right_cell')
  await runAndExpect(page, 'error', '小河')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'move_up', 3)
  await add(page, 'move_right_cell', 4)
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: the friend's route crashes into the river; rebuild it.
  await runAndExpect(page, 'error', '小河')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 3)
  await add(page, 'move_up', 2)
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: pick who gets the letter first; a route for one friend doesn't reach another.
  await expect(page.getByTestId('grid-creative')).toContainText('这封信送给谁')
  await stageClick(page, 'grid-run')
  await expect(page.getByTestId('grid-feedback')).toContainText('先选一格')
  await stageClick(page, 'grid-goal-choice-0') // 小熊 · 右上角
  await expect(page.getByTestId('grid-goal-choice-0')).toHaveAttribute('aria-pressed', 'true')
  await add(page, 'when_start')
  await add(page, 'move_up', 2)
  await runAndExpect(page, 'error', '还没到')
  await stageClick(page, 'grid-goal-choice-1') // 小兔 · 正上方
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘: the mistakes this child really met, plus the what-if answer.
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('走出了地图')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('掉进小河')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('向左走一格')
  await expect(page.getByTestId('grid-project-status')).toHaveText('真实运行能走到蘑菇屋')
  await expect(page.getByTestId('grid-project-steps').locator('li')).toHaveCount(3)
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the work and its chosen friend come back and replay for real.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('走出了地图')
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-card').getByTestId('grid-stage')).toHaveAttribute('data-fox-cell', '0,0', { timeout: 15_000 })

  // Modify after reopening: send to 小熊 instead; the old route no longer counts until rebuilt.
  await page.getByTestId('grid-replay-my-route-card').click()
  await expect(page.getByTestId('grid-goal-choice-1')).toHaveAttribute('data-chosen', 'true')
  await stageClick(page, 'grid-goal-choice-0')
  await runAndExpect(page, 'error')
  await add(page, 'move_right_cell', 3)
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
})

test('G0-U1-L03 formal course: one-short error lab, two practices, place the house either side, review, saved and reopened', async ({ page }) => {
  test.setTimeout(150_000)
  await page.goto('/learn/grid-lab/G0-U1-L03')
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  // Original story scenery: the squirrel's counting board with three acorns.
  await lessonPane(page, 'stage')
  await expect(page.locator('[data-grid-item="counting"]')).toBeVisible()

  // Step 1 — error lab: two blocks for a three-cell walk. Predict, run as-is, compare, add the missing block.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await stageClick(page, 'grid-predict-choice-0')
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('猜错也没关系')
  await expect(page.getByTestId('grid-feedback')).toContainText('前面一格')
  await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Guided: five cells; one short is diagnosed, then fixed.
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 4)
  await runAndExpect(page, 'error', '位置不对')
  await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: facing left, “向右” walks off the map; “向前” follows the face.
  await add(page, 'when_start')
  await add(page, 'move_right_cell')
  await runAndExpect(page, 'error', '出了地图')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'move_forward', 2)
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: one step too far; undo the last block.
  await runAndExpect(page, 'error', '位置不对')
  await codeClick(page, 'lesson-remove-last')
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: put the house on the LEFT; counting to the right lands on the wrong cell, counting left passes.
  await stageClick(page, 'grid-run')
  await expect(page.getByTestId('grid-feedback')).toContainText('先选一格')
  await stageClick(page, 'grid-goal-choice-1') // 第 1 格（左边 3 格）
  await expect(page.getByTestId('grid-goal-choice-1')).toHaveAttribute('aria-pressed', 'true')
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 3)
  await runAndExpect(page, 'error', '位置不对')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'move_left', 3)
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘: the mistakes this child really met.
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('没走到目标')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('走出了地图')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('撤回最后一块')
  await expect(page.getByTestId('grid-project-status')).toHaveText('真实运行能走到蘑菇屋')
  await expect(page.getByTestId('grid-project-steps').locator('li')).toHaveCount(4)
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the card replays for real to the child's own house.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-card').getByTestId('grid-stage')).toHaveAttribute('data-fox-cell', '0,0', { timeout: 15_000 })

  // Modify after reopening: move the house one cell closer; the old count is one too many.
  await page.getByTestId('grid-replay-my-count-card').click()
  await expect(page.getByTestId('grid-goal-choice-1')).toHaveAttribute('data-chosen', 'true')
  await stageClick(page, 'grid-goal-choice-3') // 第 2 格（左边 2 格）
  await runAndExpect(page, 'error')
  await codeClick(page, 'lesson-remove-last')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
})

test('G0-U1-L04 formal course: turn-in-place error lab, two practices, detour to a friend, review, saved and reopened', async ({ page }) => {
  test.setTimeout(170_000)
  await page.goto('/learn/catalog/G0-U1-L04')
  await page.getByTestId('grid-trial-entry').click()
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  // Original story scenery: the crossroads turn sign beside a small rock.
  await lessonPane(page, 'stage')
  await expect(page.locator('[data-grid-item="turnsign"]')).toBeVisible()

  // Step 1 — error lab: a lone “向左转” turns the fox but it never walks.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await stageClick(page, 'grid-predict-choice-0')
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('猜错也没关系')
  await expect(page.getByTestId('grid-feedback')).toContainText('站在原地')
  await expect(page.getByTestId('grid-stage')).toHaveAttribute('data-fox-facing', 'up')
  await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await next(page)

  // Guided: straight ahead hits the rock; the detour passes.
  await add(page, 'when_start')
  await add(page, 'move_forward', 2)
  await runAndExpect(page, 'error', '撞到石头')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start'); await add(page, 'move_forward'); await add(page, 'turn_left'); await add(page, 'move_forward'); await add(page, 'turn_right'); await add(page, 'move_forward', 3)
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: only the middle row has a bridge.
  await add(page, 'when_start')
  await add(page, 'move_forward', 2)
  await runAndExpect(page, 'error', '小河')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start'); await add(page, 'turn_left'); await add(page, 'move_forward'); await add(page, 'turn_right'); await add(page, 'move_forward', 4); await add(page, 'turn_left'); await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: the friend's turns are swapped; rebuild with the right turns.
  await runAndExpect(page, 'error', '撞到石头')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start'); await add(page, 'move_forward'); await add(page, 'turn_left'); await add(page, 'move_forward'); await add(page, 'turn_right'); await add(page, 'move_forward', 3)
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: pick the friend behind the rock; straight hits the rock, the detour passes.
  await stageClick(page, 'grid-run')
  await expect(page.getByTestId('grid-feedback')).toContainText('先选一格')
  await stageClick(page, 'grid-goal-choice-0') // 小熊 · 石头后面
  await add(page, 'when_start')
  await add(page, 'move_forward', 2)
  await runAndExpect(page, 'error', '撞到石头')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start'); await add(page, 'move_forward'); await add(page, 'turn_left'); await add(page, 'move_forward'); await add(page, 'turn_right'); await add(page, 'move_forward', 2); await add(page, 'turn_right'); await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘: the mistakes this child really met.
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('撞到石头')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('掉进小河')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('没走到目标')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('向右转')
  await expect(page.getByTestId('grid-project-steps').locator('li')).toHaveCount(9)
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the card replays for real behind the rock.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-card').getByTestId('grid-stage')).toHaveAttribute('data-fox-cell', '3,2', { timeout: 20_000 })

  // Modify after reopening: visit 小兔 instead; the old route no longer counts until rebuilt.
  await page.getByTestId('grid-replay-my-turn-card').click()
  await expect(page.getByTestId('grid-goal-choice-0')).toHaveAttribute('data-chosen', 'true')
  await stageClick(page, 'grid-goal-choice-1') // 小兔 · 上排第二格
  await runAndExpect(page, 'error')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start'); await add(page, 'turn_left'); await add(page, 'move_forward', 2); await add(page, 'turn_right'); await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
})

test('G0-U1-L05 formal course: locked-door error lab, two practices, a friend behind the door, review, saved and reopened', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/learn/grid-lab/G0-U1-L05')
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  // Original story scenery: the key hook board (key → lock).
  await lessonPane(page, 'stage')
  await expect(page.locator('[data-grid-item="keyhook"]')).toBeVisible()

  // Step 1 — error lab: walking straight into the locked door.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await stageClick(page, 'grid-predict-choice-0')
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('猜错也没关系')
  await expect(page.getByTestId('grid-feedback')).toContainText('锁着的门')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'pick_key'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Guided: picking up where there is no key is diagnosed; the detour for the key passes.
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'pick_key')
  await runAndExpect(page, 'error', '这里没有钥匙')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_up'); await add(page, 'pick_key'); await add(page, 'move_down'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: opening without the key fails; the long way round passes.
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'open_door')
  await runAndExpect(page, 'error', '没有钥匙')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start'); await add(page, 'move_down'); await add(page, 'move_down'); await add(page, 'move_right_cell'); await add(page, 'pick_key'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: the friend walked past the key; put “捡起钥匙” in the right place.
  await runAndExpect(page, 'error', '没有钥匙')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'pick_key'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: a friend behind the door; rushing at the door fails, key → open → walk passes.
  await stageClick(page, 'grid-run')
  await expect(page.getByTestId('grid-feedback')).toContainText('先选一格')
  await stageClick(page, 'grid-goal-choice-0') // 小熊 · 门正对面
  // Story-named choices wrap two per row and never clip their label.
  for (let i = 0; i < 4; i += 1) {
    const clipped = await page.getByTestId(`grid-goal-choice-${i}`).evaluate(el => el.scrollWidth > el.clientWidth + 1)
    expect(clipped, `choice ${i}`).toBe(false)
  }
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'error', '门还锁着')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_up'); await add(page, 'pick_key'); await add(page, 'move_down'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘: the mistakes this child really met.
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('门还锁着')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('这里没有钥匙')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('没拿钥匙就开门')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('先捡钥匙')
  await expect(page.getByTestId('grid-project-steps').locator('li')).toHaveCount(10)
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the card replays for real through the opened door.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-card').getByTestId('grid-stage')).toHaveAttribute('data-fox-cell', '5,1', { timeout: 25_000 })

  // Modify after reopening: visit 小兔 instead; the old route stops one cell short until extended.
  await page.getByTestId('grid-replay-my-key-card').click()
  await expect(page.getByTestId('grid-goal-choice-0')).toHaveAttribute('data-chosen', 'true')
  await stageClick(page, 'grid-goal-choice-1') // 小兔 · 右上角
  await runAndExpect(page, 'error')
  await add(page, 'move_up')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
})

test('G0-U1-L06 unit project formal course: wrong-order error lab, two practices, own forest card for a new friend, review, saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  await page.goto('/learn/grid-lab/G0-U1-L06')
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  // Original story scenery: the forest guide's hand-drawn map.
  await lessonPane(page, 'stage')
  await expect(page.locator('[data-grid-item="guidemap"]')).toBeVisible()

  // Step 1 — error lab: the right blocks in the wrong order (“向上” before “捡起钥匙”).
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await stageClick(page, 'grid-predict-choice-0')
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('猜错也没关系')
  await expect(page.getByTestId('grid-feedback')).toContainText('顺序错一块')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'pick_key'); await add(page, 'move_up'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Guided: rock on top, river below — the middle row is the way.
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'error', '石头')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start'); await add(page, 'move_down'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'move_up')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: the big map — forgetting the key is diagnosed, then the full route passes.
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'open_door')
  await runAndExpect(page, 'error', '捡起钥匙')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'pick_key'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: fix the friend's card (missing key).
  await runAndExpect(page, 'error', '捡起钥匙')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_right_cell'); await add(page, 'pick_key'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Unit work: a card for 小刺猬 at the bottom behind the door — the top-row card stops short, three more steps down pass.
  await stageClick(page, 'grid-run')
  await expect(page.getByTestId('grid-feedback')).toContainText('先选一格')
  await stageClick(page, 'grid-goal-choice-3') // 小刺猬 · 门后最下面
  await add(page, 'when_start'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_right_cell'); await add(page, 'pick_key'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'error', '还没到蘑菇屋')
  await add(page, 'move_down', 3)
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘: the mistakes this child really met.
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('这里没有钥匙')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('撞到石头')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('没拿钥匙就开门')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('向下')
  const card = page.getByTestId('grid-project-card')
  await expect(card).toBeVisible()
  await expect(page.getByTestId('grid-project-status')).toContainText('真实运行能走到')
  await expect(page.getByTestId('grid-project-steps').locator('li')).toHaveCount(14)

  // Close and reopen: the unit work is still there and replays for real to 小刺猬's house.
  await page.reload()
  await expect(card).toBeVisible()
  await page.getByTestId('grid-project-play').click()
  await expect(card.getByTestId('grid-stage')).toHaveAttribute('data-fox-cell', '5,3', { timeout: 30_000 })
  await expect(page.getByTestId('grid-project-play')).toHaveText('▶ 播放我的森林寻路卡', { timeout: 15_000 })

  // Modify after reopening: give the card to 小熊 on the top row instead; drop the three “向下”.
  await page.getByTestId('grid-replay-my-forest-card').click()
  await expect(page.getByTestId('grid-goal-choice-3')).toHaveAttribute('data-chosen', 'true')
  await stageClick(page, 'grid-goal-choice-0')
  await runAndExpect(page, 'error')
  for (let i = 0; i < 3; i += 1) await codeClick(page, 'lesson-remove-last')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
})

// G0-U2 event lessons run on the event stage (/learn/event-lab); their E2E lives here because this spec is in CI.
test('G0-U2-L01 formal course on the event stage: hat-below error lab, order, click-only wake, debug the woken rabbit, pick a friend, saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  const q = async (...types: string[]) => { for (const t of types) await add(page, t) }
  await page.goto('/learn/catalog/G0-U2-L01')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('event-trial-entry').click()
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await lessonPane(page, 'stage')
  await expect(page.locator('[data-grid-item="morning-glade"]')).toBeVisible()
  const fox = page.getByTestId('event-actor-fox')
  await expect(fox).toHaveAttribute('data-awake', 'false')
  // Characters stand inside the stage, never spilling onto the buttons below it.
  const stageBox = (await page.getByTestId('event-stage').first().boundingBox())!
  for (const id of ['fox', 'rabbit']) {
    const box = (await page.getByTestId(`event-actor-${id}`).first().boundingBox())!
    expect(box.y + box.height).toBeLessThanOrEqual(stageBox.y + stageBox.height + 1)
  }

  // Step 1 — error lab: “开始时” sits below the actions, so the start flag never reaches them.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await stageClick(page, 'grid-predict-choice-0')
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('猜错也没关系')
  await expect(page.getByTestId('grid-feedback')).toContainText('还在睡')
  await expect(fox).toHaveAttribute('data-awake', 'false')
  await codeClick(page, 'lesson-clear-program')
  await q('when_start', 'wake_up', 'say_hello')
  await runAndExpect(page, 'success')
  await expect(fox).toHaveAttribute('data-awake', 'true')
  await expect(fox).toHaveAttribute('data-said', 'true')
  await next(page)

  // Guided: speaking before waking is the wrong order.
  await q('when_start', 'say_hello', 'wake_up')
  await runAndExpect(page, 'error', '顺序反了')
  await codeClick(page, 'lesson-clear-program')
  await q('when_start', 'wake_up', 'say_hello')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: only a click wakes the fox; with “开始时” it wakes too early.
  await q('when_start', 'wake_up', 'say_hello')
  await runAndExpect(page, 'error', '还没点')
  await codeClick(page, 'lesson-clear-program')
  await q('when_clicked', 'wake_up', 'say_hello')
  // Free play before checking: the start flag does nothing, tapping the fox wakes it.
  await stageClick(page, 'event-flag')
  await expect(fox).toHaveAttribute('data-awake', 'false')
  await lessonPane(page, 'stage')
  await fox.click()
  await expect(fox).toHaveAttribute('data-awake', 'true')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: the rabbit's own script wakes it at the start flag; clear the rabbit's script.
  await runAndExpect(page, 'error', '多了不该有的动作')
  await expect(page.getByTestId('grid-feedback')).toContainText('小兔子')
  await codeClick(page, 'event-edit-rabbit')
  await codeClick(page, 'lesson-clear-program')
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: pick the bird; blocks on the fox do nothing for the bird; blocks on the bird pass.
  await stageClick(page, 'grid-run')
  await expect(page.getByTestId('grid-feedback')).toContainText('先在上面选好')
  await stageClick(page, 'grid-goal-choice-2') // 小鸟
  await codeClick(page, 'event-edit-fox')
  await q('when_clicked', 'wake_up', 'say_hello')
  await runAndExpect(page, 'error', '什么都没发生')
  await codeClick(page, 'lesson-clear-program')
  await codeClick(page, 'event-edit-bird')
  await q('when_clicked', 'wake_up', 'say_hello')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘: the mistakes this child really met, and the what-if.
  const mistakes = page.getByTestId('grid-review-mistakes')
  for (const m of ['事件没放在最上面', '动作顺序反了', '还没触发就先动了', '多了不该有的动作', '触发了却没反应']) await expect(mistakes).toContainText(m)
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('开始旗')
  await expect(page.getByTestId('grid-project-status')).toContainText('点小鸟才会醒')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the card replays for real — only the bird wakes.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await page.getByTestId('grid-project-play').click()
  const card = page.getByTestId('grid-project-card')
  await expect(card.getByTestId('event-actor-bird')).toHaveAttribute('data-awake', 'true', { timeout: 15_000 })
  await expect(card.getByTestId('event-actor-fox')).toHaveAttribute('data-awake', 'false')

  // Modify after reopening: pick the rabbit instead; the bird card no longer counts until rebuilt.
  await page.getByTestId('grid-replay-my-wake-card').click()
  await expect(page.getByTestId('grid-goal-choice-2')).toHaveAttribute('data-chosen', 'true')
  await stageClick(page, 'grid-goal-choice-1') // 小兔子
  await runAndExpect(page, 'error')
  await codeClick(page, 'event-edit-bird')
  await codeClick(page, 'lesson-clear-program')
  await codeClick(page, 'event-edit-rabbit')
  await q('when_clicked', 'wake_up', 'say_hello')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
})

test('G0-U2-L02 formal course on the opening stage: flag-first error lab, start-flag opening, invite the bird, two start hats, pick a host, saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  const q = async (...types: string[]) => { for (const t of types) await add(page, t) }
  const flag = () => page.locator('[data-grid-item="stage-flags"]').first()
  await page.goto('/learn/catalog/G0-U2-L02')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('event-trial-entry').click()
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await lessonPane(page, 'stage')
  await expect(flag()).toHaveAttribute('data-flag-up', 'false')
  const fox = page.getByTestId('event-actor-fox')

  // Step 1 — error lab: “升起彩旗” sits above the opening words, so the flag goes up first.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await stageClick(page, 'grid-predict-choice-0')
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('彩旗先升起')
  await codeClick(page, 'lesson-clear-program')
  await q('when_start', 'say_hello', 'raise_flag')
  await runAndExpect(page, 'success')
  await expect(flag()).toHaveAttribute('data-flag-up', 'true')
  await expect(fox).toHaveAttribute('data-said', 'true')
  await next(page)

  // Guided: a click-hat opening never starts on the start flag.
  await expect(flag()).toHaveAttribute('data-flag-up', 'false')
  await q('when_clicked', 'say_hello', 'raise_flag')
  await runAndExpect(page, 'error', '什么都没发生')
  await codeClick(page, 'lesson-clear-program')
  await q('when_start', 'say_hello', 'raise_flag')
  // Free play: tapping the host changes nothing; the start flag runs the opening.
  await lessonPane(page, 'stage')
  await fox.click()
  await expect(flag()).toHaveAttribute('data-flag-up', 'false')
  await stageClick(page, 'event-flag')
  await expect(flag()).toHaveAttribute('data-flag-up', 'true', { timeout: 10_000 })
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: the host opens on the start flag; the bird only comes on when tapped.
  await q('when_start', 'say_hello', 'raise_flag')
  await codeClick(page, 'event-edit-bird')
  await q('when_start', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'error', '还没到时候')
  await codeClick(page, 'lesson-clear-program')
  await q('when_clicked', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('event-actor-bird')).toHaveAttribute('data-said', 'true')
  await next(page)

  // Practice B: the rabbit's own start hat raises the flag before the host speaks; clear the rabbit.
  await runAndExpect(page, 'error', '互相抢')
  await expect(page.getByTestId('grid-feedback')).toContainText('小兔子')
  await codeClick(page, 'event-edit-rabbit')
  await codeClick(page, 'lesson-clear-program')
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: the rabbit hosts; an opening on the fox does not count for the rabbit.
  await stageClick(page, 'grid-goal-choice-1') // 小兔子
  await codeClick(page, 'event-edit-fox')
  await q('when_start', 'say_hello', 'raise_flag')
  await runAndExpect(page, 'error')
  await codeClick(page, 'lesson-clear-program')
  await codeClick(page, 'event-edit-rabbit')
  await q('when_start', 'say_hello', 'raise_flag')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  const mistakes = page.getByTestId('grid-review-mistakes')
  for (const m of ['动作顺序反了', '触发了却没反应', '还没触发就先动了', '多了不该有的动作']) await expect(mistakes).toContainText(m)
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('开始时')
  await expect(page.getByTestId('grid-project-status')).toContainText('小兔子主持')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the programme replays for real — the rabbit speaks, then the flag goes up.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  const card = page.getByTestId('grid-project-card')
  await expect(card.locator('[data-grid-item="stage-flags"]')).toHaveAttribute('data-flag-up', 'false')
  await page.getByTestId('grid-project-play').click()
  await expect(card.locator('[data-grid-item="stage-flags"]')).toHaveAttribute('data-flag-up', 'true', { timeout: 15_000 })
  await expect(card.getByTestId('event-actor-rabbit')).toHaveAttribute('data-said', 'true')
  await expect(card.getByTestId('event-actor-fox')).toHaveAttribute('data-said', 'false')
})

test('G0-U2-L03 formal course at the bell tree: swapped sender/receiver error lab, ring for the rabbit, one bell two friends, surprise too early, pick a listener, saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  const q = async (...types: string[]) => { for (const t of types) await add(page, t) }
  const bell = () => page.locator('[data-grid-item="bell-tree"]').first()
  await page.goto('/learn/catalog/G0-U2-L03')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('event-trial-entry').click()
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await lessonPane(page, 'stage')
  await expect(bell()).toHaveAttribute('data-bell-rung', 'false')
  const squirrel = page.getByTestId('event-actor-squirrel')
  const rabbit = page.getByTestId('event-actor-rabbit')

  // Step 1 — error lab: the squirrel waits for the bell and the rabbit waits for a tap, so nobody rings.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await stageClick(page, 'grid-predict-choice-0')
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('没有人先摇铃')
  await expect(bell()).toHaveAttribute('data-bell-rung', 'false')
  await codeClick(page, 'lesson-clear-program')
  await q('when_clicked', 'send_bell')
  await codeClick(page, 'event-edit-rabbit')
  await codeClick(page, 'lesson-clear-program')
  await q('when_bell', 'show_surprise')
  await runAndExpect(page, 'success')
  await expect(bell()).toHaveAttribute('data-bell-rung', 'true')
  await expect(rabbit).toHaveAttribute('data-surprised', 'true')
  await next(page)

  // Guided: a start-hat rabbit is surprised before any bell.
  await q('when_clicked', 'send_bell')
  await codeClick(page, 'event-edit-rabbit')
  await q('when_start', 'show_surprise')
  await runAndExpect(page, 'error', '还没摇铃')
  await codeClick(page, 'lesson-clear-program')
  await q('when_bell', 'show_surprise')
  // Free play: tapping the rabbit does nothing; tapping the squirrel rings and the rabbit answers.
  await lessonPane(page, 'stage')
  await rabbit.click()
  await expect(rabbit).toHaveAttribute('data-surprised', 'false')
  await lessonPane(page, 'stage')
  await squirrel.click()
  await expect(rabbit).toHaveAttribute('data-surprised', 'true', { timeout: 10_000 })
  await expect(squirrel).toHaveAttribute('data-rang', 'true')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: one bell, two listeners; the fox on a click hat misses the bell.
  await q('when_clicked', 'send_bell')
  await codeClick(page, 'event-edit-rabbit')
  await q('when_bell', 'show_surprise')
  await codeClick(page, 'event-edit-fox')
  await q('when_clicked', 'wake_up', 'say_hello')
  await runAndExpect(page, 'error', '还有朋友没回应')
  await codeClick(page, 'lesson-clear-program')
  await q('when_bell', 'wake_up', 'say_hello')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('event-actor-fox')).toHaveAttribute('data-awake', 'true')
  await next(page)

  // Practice B: the rabbit is surprised at the start flag; give it the bell hat.
  await runAndExpect(page, 'error', '还没摇铃')
  await codeClick(page, 'event-edit-rabbit')
  await codeClick(page, 'lesson-clear-program')
  await q('when_bell', 'show_surprise')
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: the fox listens; a second listener (the rabbit) is one too many.
  await stageClick(page, 'grid-goal-choice-1') // 小狐狸
  await codeClick(page, 'event-edit-squirrel')
  await q('when_clicked', 'send_bell')
  await codeClick(page, 'event-edit-fox')
  await q('when_bell', 'show_surprise')
  await codeClick(page, 'event-edit-rabbit')
  await q('when_bell', 'show_surprise')
  await runAndExpect(page, 'error', '多了不该有的动作')
  await codeClick(page, 'lesson-clear-program')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  const mistakes = page.getByTestId('grid-review-mistakes')
  for (const m of ['触发了却没反应', '还没触发就先动了', '少了一个动作', '多了不该有的动作']) await expect(mistakes).toContainText(m)
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('听到铃铛时')
  await expect(page.getByTestId('grid-project-status')).toContainText('小狐狸听到才惊喜')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the card replays for real — the bell rings and only the fox is surprised.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  const card = page.getByTestId('grid-project-card')
  await page.getByTestId('grid-project-play').click()
  await expect(card.getByTestId('event-actor-fox')).toHaveAttribute('data-surprised', 'true', { timeout: 15_000 })
  await expect(card.locator('[data-grid-item="bell-tree"]')).toHaveAttribute('data-bell-rung', 'true')
  await expect(card.getByTestId('event-actor-rabbit')).toHaveAttribute('data-surprised', 'false')
})

test('G0-U2-L04 formal course in the forest theatre: script on the wrong friend, fox first, two turns, nobody came, pick the second act, saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  const q = async (...types: string[]) => { for (const t of types) await add(page, t) }
  await page.goto('/learn/catalog/G0-U2-L04')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('event-trial-entry').click()
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await lessonPane(page, 'stage')
  await expect(page.locator('[data-grid-item="two-doors"]').first()).toBeVisible()
  const fox = page.getByTestId('event-actor-fox')
  const bird = page.getByTestId('event-actor-bird')
  await expect(fox).toHaveAttribute('data-onstage', 'false')

  // Step 1 — error lab: the fox's opening was built under the bird, so the bird rushes on first.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await stageClick(page, 'grid-predict-choice-0')
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('小鸟抢先上台')
  await expect(bird).toHaveAttribute('data-onstage', 'true')
  await expect(fox).toHaveAttribute('data-onstage', 'false')
  await q('when_start', 'enter_stage', 'say_hello') // on the fox (selected first)
  await codeClick(page, 'event-edit-bird')
  await codeClick(page, 'lesson-clear-program')
  await q('when_clicked', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'success')
  await next(page)

  // Guided: built under the bird, the wrong friend comes on.
  await codeClick(page, 'event-edit-bird')
  await q('when_start', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'error', '上台的不是该上台的那位')
  await codeClick(page, 'lesson-clear-program')
  await codeClick(page, 'event-edit-fox')
  await q('when_start', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'success')
  await expect(fox).toHaveAttribute('data-onstage', 'true')
  await expect(bird).toHaveAttribute('data-onstage', 'false')
  await next(page)

  // Practice A: two turns; a start-hat bird collides with the fox.
  await q('when_start', 'enter_stage', 'say_hello')
  await codeClick(page, 'event-edit-bird')
  await q('when_start', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'error', '小鸟抢在小狐狸前面')
  await codeClick(page, 'lesson-clear-program')
  await q('when_clicked', 'enter_stage', 'say_hello')
  // Free play: the start flag brings only the fox; tapping the bird brings it on next.
  await stageClick(page, 'event-flag')
  await expect(fox).toHaveAttribute('data-onstage', 'true', { timeout: 10_000 })
  await expect(bird).toHaveAttribute('data-onstage', 'false')
  await lessonPane(page, 'stage')
  await bird.click()
  await expect(bird).toHaveAttribute('data-onstage', 'true', { timeout: 10_000 })
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: the fox has no hat and the bird waits for a bell nobody rings — both need fixing.
  await runAndExpect(page, 'error', '没有事件')
  await codeClick(page, 'lesson-clear-program')
  await q('when_start', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'error', '没人上台')
  await codeClick(page, 'event-edit-bird')
  await codeClick(page, 'lesson-clear-program')
  await q('when_clicked', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: the frog is the second act; the frog's blocks under the rabbit do nothing.
  await stageClick(page, 'grid-goal-choice-2') // 小青蛙 (picking a friend switches the editor to it)
  await expect(page.getByTestId('event-edit-frog')).toHaveAttribute('aria-selected', 'true')
  await codeClick(page, 'event-edit-fox')
  await q('when_start', 'enter_stage', 'say_hello')
  await codeClick(page, 'event-edit-rabbit')
  await q('when_clicked', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'error')
  await codeClick(page, 'lesson-clear-program')
  await codeClick(page, 'event-edit-frog')
  await q('when_clicked', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  const mistakes = page.getByTestId('grid-review-mistakes')
  for (const m of ['还没触发就先动了', '动的不是要动的角色', '忘了事件积木', '触发了却没反应']) await expect(mistakes).toContainText(m)
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('两个不同的事件')
  await expect(page.getByTestId('grid-project-status')).toContainText('点小青蛙它再上台')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the programme replays — the fox, then the frog; the bird and rabbit stay backstage.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  const card = page.getByTestId('grid-project-card')
  await page.getByTestId('grid-project-play').click()
  await expect(card.getByTestId('event-actor-frog')).toHaveAttribute('data-onstage', 'true', { timeout: 15_000 })
  await expect(card.getByTestId('event-actor-fox')).toHaveAttribute('data-onstage', 'true')
  await expect(card.getByTestId('event-actor-bird')).toHaveAttribute('data-onstage', 'false')
  await expect(card.getByTestId('event-actor-rabbit')).toHaveAttribute('data-onstage', 'false')
})

test('G0-U2-L05 formal course in the apple orchard: event on the tree, only the apple, apple tells the rabbit, wrong spot drops, pick who is surprised, saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  const q = async (...types: string[]) => { for (const t of types) await add(page, t) }
  await page.goto('/learn/catalog/G0-U2-L05')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('event-trial-entry').click()
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await lessonPane(page, 'stage')
  await expect(page.locator('[data-grid-item="apple-tree"]').first()).toBeVisible()
  const apple = page.getByTestId('event-actor-apple')
  const tree = page.getByTestId('event-actor-tree')
  const fox = page.getByTestId('event-actor-fox')
  await expect(apple).toHaveAttribute('data-fallen', 'false')

  // Step 1 — error lab: the click event sits on the tree, so tapping the apple does nothing.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await stageClick(page, 'grid-predict-choice-0')
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('苹果一动不动')
  await expect(apple).toHaveAttribute('data-fallen', 'false')
  await codeClick(page, 'lesson-clear-program') // the tree's blocks
  await codeClick(page, 'event-edit-apple')
  await q('when_clicked', 'fall_down')
  await runAndExpect(page, 'success')
  await expect(apple).toHaveAttribute('data-fallen', 'true')
  await next(page)

  // Guided: a start-hat apple falls by itself.
  await codeClick(page, 'event-edit-apple')
  await q('when_start', 'fall_down')
  await runAndExpect(page, 'error', '苹果就自己掉下来了')
  await codeClick(page, 'lesson-clear-program')
  await q('when_clicked', 'fall_down')
  // Free play: tapping the tree or the fox leaves the apple hanging; tapping the apple drops it.
  await lessonPane(page, 'stage')
  await tree.click({ position: { x: 20, y: 60 } })
  await lessonPane(page, 'stage')
  await fox.click()
  await expect(apple).toHaveAttribute('data-fallen', 'false')
  await lessonPane(page, 'stage')
  await apple.click()
  await expect(apple).toHaveAttribute('data-fallen', 'true', { timeout: 10_000 })
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: the apple falls and rings; the rabbit answers the bell (a click hat misses it).
  await q('when_clicked', 'fall_down', 'send_bell')
  await codeClick(page, 'event-edit-rabbit')
  await q('when_clicked', 'show_surprise')
  await runAndExpect(page, 'error', '还少一步')
  await codeClick(page, 'lesson-clear-program')
  await q('when_bell', 'show_surprise')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('event-actor-rabbit')).toHaveAttribute('data-surprised', 'true')
  await next(page)

  // Practice B: the apple waits for a bell the fox rings — fix the apple, then the fox.
  await runAndExpect(page, 'error', '没有落下')
  await codeClick(page, 'event-edit-apple')
  await codeClick(page, 'lesson-clear-program')
  await q('when_clicked', 'fall_down')
  await runAndExpect(page, 'error', '点了别的地方也有反应')
  await codeClick(page, 'event-edit-fox')
  await codeClick(page, 'lesson-clear-program')
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: the bird is surprised; a second surprised friend is one too many.
  await stageClick(page, 'grid-goal-choice-2') // 小鸟
  await codeClick(page, 'event-edit-apple')
  await q('when_clicked', 'fall_down', 'send_bell')
  await codeClick(page, 'event-edit-bird')
  await q('when_bell', 'show_surprise')
  await codeClick(page, 'event-edit-fox')
  await q('when_bell', 'show_surprise')
  await runAndExpect(page, 'error', '多了不该有的动作')
  await codeClick(page, 'lesson-clear-program')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  const mistakes = page.getByTestId('grid-review-mistakes')
  for (const m of ['触发了却没反应', '还没触发就先动了', '少了一个动作', '点错角色也有反应', '多了不该有的动作']) await expect(mistakes).toContainText(m)
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('拼在谁名下')
  await expect(page.getByTestId('grid-project-status')).toContainText('小鸟听到铃铛惊喜')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the card replays — the apple falls and only the bird is surprised.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  const card = page.getByTestId('grid-project-card')
  await page.getByTestId('grid-project-play').click()
  await expect(card.getByTestId('event-actor-bird')).toHaveAttribute('data-surprised', 'true', { timeout: 15_000 })
  await expect(card.getByTestId('event-actor-apple')).toHaveAttribute('data-fallen', 'true')
  await expect(card.getByTestId('event-actor-fox')).toHaveAttribute('data-surprised', 'false')
})

test('G0-U2-L06 unit project at the meet-and-greet: everyone on start, open and call, bell brings the guest, only tested start, pick a guest, saved and reopened', async ({ page }) => {
  test.setTimeout(240_000)
  const q = async (...types: string[]) => { for (const t of types) await add(page, t) }
  const edit = async (id: string) => { await lessonPane(page, 'code'); await page.getByTestId(`event-edit-${id}`).click() }
  const clear = async () => { await codeClick(page, 'lesson-clear-program') }
  await page.goto('/learn/catalog/G0-U2-L06')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('event-trial-entry').click()
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await lessonPane(page, 'stage')
  await expect(page.locator('[data-grid-item="meeting-stage"]').first()).toBeVisible()
  const fox = page.getByTestId('event-actor-fox')
  const rabbit = page.getByTestId('event-actor-rabbit')
  const bird = page.getByTestId('event-actor-bird')

  // Step 1 — error lab: all three listen to the start flag, so everyone moves at once.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await stageClick(page, 'grid-predict-choice-0')
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('三位一起动起来了')
  await expect(bird).toHaveAttribute('data-onstage', 'true')
  await edit('rabbit'); await clear(); await q('when_clicked', 'show_surprise', 'send_bell')
  await edit('bird'); await clear(); await q('when_bell', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'success')
  await next(page)

  // Guided: open on the start flag, the audience taps the rabbit.
  await edit('fox'); await q('when_start', 'enter_stage', 'say_hello')
  await edit('rabbit'); await q('when_start', 'show_surprise')
  await runAndExpect(page, 'error', '还没轮到就先动了')
  await clear(); await q('when_clicked', 'show_surprise')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: the full meeting; a click-hat bird never hears the bell.
  await edit('fox'); await q('when_start', 'enter_stage', 'say_hello')
  await edit('rabbit'); await q('when_clicked', 'show_surprise', 'send_bell')
  await edit('bird'); await q('when_clicked', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'error', '有一段没演出来')
  await clear(); await q('when_bell', 'enter_stage', 'say_hello')
  // Free play: start flag opens; tapping the rabbit rings and the bird comes on.
  await stageClick(page, 'event-flag')
  await expect(fox).toHaveAttribute('data-onstage', 'true', { timeout: 10_000 })
  await expect(bird).toHaveAttribute('data-onstage', 'false')
  await lessonPane(page, 'stage')
  await rabbit.click()
  await expect(bird).toHaveAttribute('data-onstage', 'true', { timeout: 10_000 })
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: only the start flag was tested; the rabbit never rings.
  await runAndExpect(page, 'error', '有一段没演出来')
  await edit('rabbit'); await q('send_bell')
  await runAndExpect(page, 'success')
  await next(page)

  // Unit project: the squirrel is the guest; inviting the frog too is one guest too many.
  await stageClick(page, 'grid-goal-choice-2') // 松鼠
  await edit('fox'); await q('when_start', 'enter_stage', 'say_hello')
  await edit('rabbit'); await q('when_clicked', 'show_surprise', 'send_bell')
  await edit('squirrel'); await q('when_bell', 'enter_stage', 'say_hello')
  await edit('frog'); await q('when_bell', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'error', '多了不该有的表演')
  await clear()
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  const mistakes = page.getByTestId('grid-review-mistakes')
  for (const m of ['还没触发就先动了', '少了一个动作', '多了不该有的动作']) await expect(mistakes).toContainText(m)
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('每种触发都要亲手测一遍')
  await expect(page.getByTestId('grid-project-status')).toContainText('松鼠上台问好')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the meeting replays — fox opens, rabbit rings, only the squirrel comes on.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  const card = page.getByTestId('grid-project-card')
  await page.getByTestId('grid-project-play').click()
  await expect(card.getByTestId('event-actor-squirrel')).toHaveAttribute('data-onstage', 'true', { timeout: 20_000 })
  await expect(card.getByTestId('event-actor-fox')).toHaveAttribute('data-onstage', 'true')
  await expect(card.getByTestId('event-actor-frog')).toHaveAttribute('data-onstage', 'false')
  await expect(card.getByTestId('event-actor-bird')).toHaveAttribute('data-onstage', 'false')
})

test('EDU-105: instructions and diagnoses are read aloud in Chinese and point at the failing block', async ({ page }) => {
  test.setTimeout(60_000)
  await page.addInitScript(() => {
    const spoken: string[] = []
    ;(window as unknown as { __spoken: string[] }).__spoken = spoken
    class Utterance { lang = ''; rate = 1; pitch = 1; voice = null; onend: (() => void) | null = null; onerror = null; constructor(public text: string) {} }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true })
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel() {}, getVoices: () => [], speak(u: Utterance) { spoken.push(u.lang + '|' + u.text); setTimeout(() => u.onend?.(), 50) } } })
  })
  // Error labs show “expected vs actual” instead, so this uses L05 step 2 (error lab already done in a saved draft).
  await page.goto('/learn/grid-lab/G0-U1-L05')
  await page.evaluate(() => localStorage.setItem('kids-grid-lesson-v1:G0-U1-L05', JSON.stringify({ stepIndex: 1, passed: ['locked-door'], observed: ['locked-door'], programs: {}, savedAt: null })))
  await page.reload()
  await stageClick(page, 'grid-read-instruction')
  await add(page, 'when_start')
  await add(page, 'move_right_cell')
  await add(page, 'move_up')
  await add(page, 'move_right_cell')
  await add(page, 'pick_key')
  await runAndExpect(page, 'error', '问题出在第 4 块')
  await stageClick(page, 'grid-read-feedback')
  const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)
  expect(spoken[0]).toMatch(/^zh-CN\|第 2 关，钥匙不在路上/)
  expect(spoken[1]).toMatch(/^zh-CN\|.*问题出在第 4 块/)
})

test('G0-U3-L01 mushroom path pattern: only two pairs, find the unit, repeat four pairs, swapped colours, my rhythm path saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  const stage = page.getByTestId('grid-stage').first()
  await page.goto('/learn/grid-lab/G0-U3-L01')
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await lessonPane(page, 'stage')
  // Original story scenery (the bear's mushroom signpost) and the faded footprints to copy.
  await expect(page.locator('[data-grid-item="mushroompath"]')).toBeVisible()
  await expect(page.locator('[data-grid-item="ghost-paw"]')).toHaveCount(8)

  // Step 1 — error lab: “repeat 2 times” only stamps two pairs. Predict, run as-is, compare, then change only the count.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await stageClick(page, 'grid-predict-choice-0')
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('只印了 4 个脚印')
  await expect(stage).toHaveAttribute('data-stamps', 'rbrb', { timeout: 15_000 })
  await expect(page.getByTestId('lesson-repeat-times-2')).toHaveAttribute('aria-pressed', 'true')
  await codeClick(page, 'lesson-repeat-times-4')
  await runAndExpect(page, 'success')
  await expect(stage).toHaveAttribute('data-stamps', 'rbrbrbrb', { timeout: 15_000 })
  await next(page)

  // Guided: one unit. Blue first is a pattern mistake; red, forward, blue, forward is right.
  await add(page, 'when_start')
  await add(page, 'stamp_blue')
  await add(page, 'move_forward')
  await add(page, 'stamp_red')
  await add(page, 'move_forward')
  await runAndExpect(page, 'error', '颜色顺序乱了')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'stamp_red')
  await add(page, 'move_forward')
  await add(page, 'stamp_blue')
  await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: tap blocks into the repeat's mouth, then try counts until the path is full.
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await expect(page.getByTestId('lesson-repeat-target-inside')).toHaveAttribute('aria-pressed', 'true')
  await add(page, 'stamp_red')
  await add(page, 'move_forward')
  await add(page, 'stamp_blue')
  await add(page, 'move_forward')
  await runAndExpect(page, 'error', '脚印还不够')
  await codeClick(page, 'lesson-repeat-times-3')
  await runAndExpect(page, 'error', '脚印还不够')
  await codeClick(page, 'lesson-repeat-times-4')
  await runAndExpect(page, 'success')
  await expect(stage).toHaveAttribute('data-stamps', 'rbrbrbrb', { timeout: 15_000 })
  await next(page)

  // Practice B: the given loop stamps blue first; rebuild the loop red-first, count unchanged at 4.
  await runAndExpect(page, 'error', '颜色顺序乱了')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await add(page, 'stamp_red')
  await add(page, 'move_forward')
  await add(page, 'stamp_blue')
  await add(page, 'move_forward')
  await codeClick(page, 'lesson-repeat-times-4')
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: pick the red-red-blue rhythm; the red-blue loop no longer fits, red-red-blue × 2 does.
  await stageClick(page, 'grid-run')
  await expect(page.getByTestId('grid-feedback')).toContainText('先选一种脚印节奏')
  await stageClick(page, 'grid-goal-choice-1')
  await expect(page.locator('[data-grid-item="ghost-paw"]')).toHaveCount(6)
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await add(page, 'stamp_red')
  await add(page, 'move_forward')
  await add(page, 'stamp_blue')
  await add(page, 'move_forward')
  await runAndExpect(page, 'error')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await add(page, 'stamp_red')
  await add(page, 'move_forward')
  await add(page, 'stamp_red')
  await add(page, 'move_forward')
  await add(page, 'stamp_blue')
  await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await expect(stage).toHaveAttribute('data-stamps', 'rrbrrb', { timeout: 15_000 })
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘: the mistakes this child really met, the what-if, the one-tap check.
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('脚印放得不够')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('脚印规律乱了')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('次数')
  await expect(page.getByTestId('grid-project-status')).toHaveText('真实运行能走到蘑菇屋')
  await expect(page.getByTestId('grid-project-steps')).toContainText('重复 2 次')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the rhythm path (repeat body included) replays for real.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-card').getByTestId('grid-stage')).toHaveAttribute('data-stamps', 'rrbrrb', { timeout: 15_000 })
})

test('G0-U3-L02 puddle hops: only one hop, one hop, repeat two hops, hop then step, my puddle road saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  const stage = page.getByTestId('grid-stage').first()
  await page.goto('/learn/grid-lab/G0-U3-L02')
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await lessonPane(page, 'stage')
  await expect(page.locator('[data-grid-item="puddlesign"]')).toBeVisible()
  await expect(page.locator('[data-character-art="rabbit"]').first()).toBeVisible()

  // Step 1 — error lab: one hop stops between the puddles; repeat the hop 2 times.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await stageClick(page, 'grid-predict-choice-0')
  await runAndExpect(page, 'error', '预想')
  await expect(stage).toHaveAttribute('data-fox-cell', '2,1', { timeout: 15_000 })
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await add(page, 'jump_forward')
  await runAndExpect(page, 'success')
  await expect(stage).toHaveAttribute('data-fox-cell', '4,1', { timeout: 15_000 })
  await next(page)

  // Guided: walking lands in the puddle; one hop is right.
  await add(page, 'when_start')
  await add(page, 'move_forward')
  await runAndExpect(page, 'error', '掉进水坑')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'jump_forward')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: count the puddles; 3 is too many, 2 is right.
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await add(page, 'jump_forward')
  await codeClick(page, 'lesson-repeat-times-3')
  await runAndExpect(page, 'error', '跳过头')
  await codeClick(page, 'lesson-repeat-times-2')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: walk-then-hop falls in at the door; rebuild hop-then-walk.
  await runAndExpect(page, 'error', '掉进水坑')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await add(page, 'jump_forward')
  await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await expect(stage).toHaveAttribute('data-fox-cell', '6,1', { timeout: 15_000 })
  await next(page)

  // Creative remake: 3 puddles; 2 hops stop short, 3 hops get home.
  await stageClick(page, 'grid-run')
  await expect(page.getByTestId('grid-feedback')).toContainText('先选有几个水坑')
  await stageClick(page, 'grid-goal-choice-1')
  await expect(page.locator('[data-grid-item="water"]')).toHaveCount(3)
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await add(page, 'jump_forward')
  await runAndExpect(page, 'error', '还没到家')
  await codeClick(page, 'lesson-repeat-times-3')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  await expect(page.getByTestId('grid-review-mistakes')).toContainText('掉进小河')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('没走到目标')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('次数')
  await expect(page.getByTestId('grid-project-steps')).toContainText('重复 3 次')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-card').getByTestId('grid-stage')).toHaveAttribute('data-fox-cell', '6,1', { timeout: 15_000 })
})

test('G0-U3-L03 garden watering: three rounds, one pot, four pots, spaced pots, my garden saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  const stage = page.getByTestId('grid-stage').first()
  await page.goto('/learn/grid-lab/G0-U3-L03')
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await lessonPane(page, 'stage')
  await expect(page.locator('[data-grid-item="wateringplan"]')).toBeVisible()
  await expect(page.locator('[data-character-art="robot"]').first()).toBeVisible()

  // Step 1 — error lab: repeat 3 times leaves the last pot dry; change only the count to 4.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await stageClick(page, 'grid-predict-choice-0')
  await runAndExpect(page, 'error', '预想')
  await expect(stage).toHaveAttribute('data-watered', '3', { timeout: 15_000 })
  await codeClick(page, 'lesson-repeat-times-4')
  await runAndExpect(page, 'success')
  await expect(stage).toHaveAttribute('data-watered', '4', { timeout: 15_000 })
  await next(page)

  // Guided: water before walking spills on the ground; walk then water.
  await add(page, 'when_start')
  await add(page, 'water_plant')
  await add(page, 'move_forward')
  await runAndExpect(page, 'error', '洒在了没有花盆')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'move_forward')
  await add(page, 'water_plant')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: only walking in the loop misses the pots; walk + water x4.
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await add(page, 'move_forward')
  await codeClick(page, 'lesson-repeat-times-4')
  await runAndExpect(page, 'error', '没喝到水')
  await add(page, 'water_plant')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: the copied loop waters bare ground; walk two cells per round.
  await runAndExpect(page, 'error', '洒在了没有花盆')
  await codeClick(page, 'lesson-clear-program')
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await add(page, 'move_forward')
  await add(page, 'move_forward')
  await add(page, 'water_plant')
  await codeClick(page, 'lesson-repeat-times-4')
  await runAndExpect(page, 'success')
  await expect(stage).toHaveAttribute('data-fox-cell', '8,1', { timeout: 15_000 })
  await next(page)

  // Creative remake: 5 pots in a row; 4 rounds miss one, 5 rounds water all.
  await stageClick(page, 'grid-run')
  await expect(page.getByTestId('grid-feedback')).toContainText('先选要浇哪一种花园')
  await stageClick(page, 'grid-goal-choice-1')
  await expect(page.locator('[data-grid-item="pot"]')).toHaveCount(5)
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await add(page, 'move_forward')
  await add(page, 'water_plant')
  await codeClick(page, 'lesson-repeat-times-4')
  await runAndExpect(page, 'error', '没喝到水')
  await codeClick(page, 'lesson-repeat-times-5')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  await expect(page.getByTestId('grid-review-mistakes')).toContainText('有花盆漏浇了')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('在没有花盆的地方浇水')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('次数改成 6')
  await expect(page.getByTestId('grid-project-steps')).toContainText('重复 5 次')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-card').getByTestId('grid-stage')).toHaveAttribute('data-watered', '5', { timeout: 15_000 })
})

test('G0-U3-L04 firefly show: only on, one flash, three rounds, catch the beat, my firefly show saved and reopened', async ({ page }) => {
  test.setTimeout(240_000)
  const q = async (...types: string[]) => { for (const t of types) await add(page, t) }
  const edit = async (id: string) => { await lessonPane(page, 'code'); await page.getByTestId(`event-edit-${id}`).click() }
  const clear = async () => { await codeClick(page, 'lesson-clear-program') }
  await page.goto('/learn/catalog/G0-U3-L04')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('event-trial-entry').click()
  await lessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await lessonPane(page, 'stage')
  await expect(page.locator('[data-grid-item="firefly-night"]').first()).toBeVisible()
  const a = page.getByTestId('event-actor-firefly_a')
  const b = page.getByTestId('event-actor-firefly_b')
  const c = page.getByTestId('event-actor-firefly_c')

  // Step 1 — error lab: repeat 3 × light up never goes dark; add “熄灭” inside the repeat.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await stageClick(page, 'grid-predict-choice-0')
  await runAndExpect(page, 'error', '预想')
  await expect(a).toHaveAttribute('data-glow-log', '111', { timeout: 15_000 })
  await expect(a).toHaveAttribute('data-glowing', 'true')
  await q('glow_off')
  await runAndExpect(page, 'success')
  await expect(a).toHaveAttribute('data-glow-log', '101010', { timeout: 15_000 })
  await expect(a).toHaveAttribute('data-glowing', 'false')
  await next(page)

  // Guided: light only stays lit; light then dark is one flash.
  await q('when_start', 'glow_on')
  await runAndExpect(page, 'error', '灯还亮着')
  await q('glow_off')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: 闪闪 with 2 rounds misses one; 3 rounds keeps in step with 亮亮.
  await q('when_start', 'repeat_times', 'glow_on', 'glow_off')
  await runAndExpect(page, 'error', '少闪了一轮')
  await codeClick(page, 'lesson-repeat-times-3')
  await runAndExpect(page, 'success')
  await expect(b).toHaveAttribute('data-glow-log', '101010', { timeout: 15_000 })
  await next(page)

  // Practice B: 点点 is a beat behind; rebuild its loop body light-then-dark.
  await runAndExpect(page, 'error', '没跟上节拍')
  await expect(c).toHaveAttribute('data-glow-log', '010101', { timeout: 15_000 })
  await clear()
  await q('when_start', 'repeat_times', 'glow_on', 'glow_off')
  await codeClick(page, 'lesson-repeat-times-3')
  await runAndExpect(page, 'success')
  await expect(c).toHaveAttribute('data-glow-log', '101010', { timeout: 15_000 })
  await next(page)

  // Creative remake: 5 rounds; changing only one firefly misses rounds, changing both passes.
  await stageClick(page, 'grid-goal-choice-2')
  await edit('firefly_a'); await codeClick(page, 'lesson-repeat-times-5')
  await runAndExpect(page, 'error', '少闪了一轮')
  await edit('firefly_b'); await codeClick(page, 'lesson-repeat-times-5')
  await runAndExpect(page, 'success')
  await expect(b).toHaveAttribute('data-glow-log', '1010101010', { timeout: 15_000 })
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('表演完灯还亮着')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('有角色没跟上节奏')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('改成 6')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await expect(page.getByTestId('grid-project-card')).toContainText('闪 5 轮')
})
