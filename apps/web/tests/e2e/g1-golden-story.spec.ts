import { expect, test, type Page } from '@playwright/test'

const route = '/learn/story-lab/G1-U1-L01/golden'
const draftKey = 'kids-lesson-owner-v1:guest:kidscoding-draft:G1-U1-L01'

async function moveStoryBlock(page: Page, touch: boolean) {
  const editor = page.locator('svg.blocklySvg')
  const path = editor.locator('.blocklyBlockCanvas .blocklyDraggable.move_right > .blocklyPath').first()
  const before = editor.locator('.blocklyBlockCanvas .blocklyDraggable.say_line > .blocklyPath').first()
  const scroll = () => editor.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await scroll()
  const from = (await path.boundingBox())!
  const previous = (await before.boundingBox())!
  const offset = { x: from.x - previous.x, y: from.y - previous.y }
  const point = (box: { x: number; y: number }) => ({ x: box.x + 22, y: box.y + 22 })
  const client = touch ? await page.context().newCDPSession(page) : undefined
  const drag = async (start: ReturnType<typeof point>, end: ReturnType<typeof point>) => {
    if (!client) {
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(end.x, end.y, { steps: 12 })
      await page.mouse.up()
      return
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
    for (let step = 1; step <= 12; step++) {
      const xy = { x: start.x + (end.x - start.x) * step / 12, y: start.y + (end.y - start.y) * step / 12 }
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [xy] })
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const stacks = editor.locator('.blocklyBlockCanvas > g.blocklyDraggable')
  await drag(point(from), point({ x: from.x + 40, y: from.y + 25 }))
  await expect(stacks).toHaveCount(2)
  await scroll()
  const tail = (await before.boundingBox())!
  await drag(point((await path.boundingBox())!), point({ x: tail.x + offset.x, y: tail.y + offset.y }))
  await expect(stacks).toHaveCount(1)
  await client?.detach()
}

async function addStoryBlock(page: Page, type: string) {
  const tools = page.getByTestId('golden-block-tools')
  if (!await tools.evaluate(el => el.parentElement?.hasAttribute('open'))) await tools.click()
  await page.getByTestId('lesson-add-' + type).click()
}

for (const [width, height] of [[1440, 900], [1366, 768], [768, 1024], [375, 812]]) {
  test(`G1-U1-L01 Golden keeps one editor at ${width}×${height}`, async ({ browser }) => {
    test.setTimeout(70_000)
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width <= 768 })
    try {
      const page = await context.newPage()
      await page.goto(route)
      const stage = page.getByTestId('g1-u1-l01-stage')
      const editor = page.locator('svg.blocklySvg')
      await expect(editor).toBeVisible()
      const mounted = await editor.elementHandle()
      const before = (await editor.boundingBox())!
      if (width >= 1200) {
        await expect(stage).toBeVisible()
        await page.getByRole('button', { name: '收起任务' }).click()
        await expect.poll(async () => (await editor.boundingBox())!.width).toBeGreaterThan(before.width + 180)
        // The step card lives in the mission column, so restore it before
        // the lesson flow continues.
        await page.getByRole('button', { name: '展开任务' }).click()
      } else if (width === 375) {
        await page.getByTestId('golden-story-pane-stage').tap()
        await expect(stage).toBeVisible()
        await expect(editor).toBeHidden()
        await page.getByTestId('golden-story-pane-code').tap()
      }
      expect(await editor.evaluate((current, original) => current.isSameNode(original), mounted)).toBe(true)
      // V3 pane mode: the step card (and its 完成这一关 button) lives in the
      // 任务 pane below 1040px, so open it first and come back to 编程.
      if (width <= 768) await page.getByTestId('golden-story-pane-task').tap()
      await page.getByTestId('g1-u1-l01-complete-step').click()
      await page.getByTestId('g1-u1-l01-complete-step').click()
      if (width <= 768) await page.getByTestId('golden-story-pane-code').tap()
      await addStoryBlock(page, 'say_line')
      await addStoryBlock(page, 'move_right')
      await moveStoryBlock(page, width <= 768)
      const lesson = page.getByTestId('golden-story')
      const save = lesson.getByRole('button', { name: '保存', exact: true })
      await expect.poll(() => page.evaluate(key => {
        const program = JSON.parse(localStorage.getItem(key) ?? '{}').script?.programs?.['build-opening']
        return program?.filter((block: { disconnected?: boolean }) => !block.disconnected)
          .map((block: { type: string }) => block.type) ?? []
      }, draftKey)).toEqual(['when_start', 'say_line', 'move_right'])
      if (width <= 768) {
        // V3 pane mode: the stage pane (and its ws-run-toggle) is hidden
        // while 编程 is selected, so the slot's own 运行 button is the
        // reachable entry; it runs through the same shell and reveals the
        // stage pane (data-pane="stage").
        await lesson.getByRole('button', { name: '运行', exact: true }).tap()
        await expect(lesson).toHaveAttribute('data-pane', 'stage')
      } else {
        await page.getByTestId('ws-run-toggle').click()
      }
      await expect(page.getByTestId('g1-u1-l01-fox')).toHaveAttribute('data-position', '100')
      await expect(page.getByTestId('g1-u1-l01-rabbit')).toHaveAttribute('data-position', '0')
      await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('结论：已完成')
      await save.click()
      await expect(lesson.getByRole('status').first()).toHaveText('已保存到本机')
      await page.reload()
      await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 3 关')
      await expect(editor.locator('.blocklyBlockCanvas .blocklyDraggable.say_line')).toHaveCount(1)
      if (process.env.KC_STORY_GOLDEN_EVIDENCE_DIR) {
        await page.screenshot({ path: `${process.env.KC_STORY_GOLDEN_EVIDENCE_DIR}/${width}x${height}.png` })
      }
    } finally {
      await context.close()
    }
  })
}

test('G1-U1-L01 Golden verifies wrong program, an independently edited encore and recovery', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/learn/catalog/G1-U1-L01')
  await page.getByTestId('story-trial-entry').click()
  await expect(page).toHaveURL(new RegExp(route + '$'))
  const run = () => page.getByTestId('ws-run-toggle').click()
  const verdict = page.getByTestId('ws-feedback-conclusion')
  const goTo = (id: string) => page.getByTestId('g1-u1-l01-goto-' + id).click()
  await goTo('review')
  await page.getByTestId('g1-u1-l01-complete-step').click()
  await expect(page.getByTestId('g1-u1-l01-notice')).toContainText('还要完成')

  await goTo('error-lab')
  await run()
  await expect(verdict).toContainText('只有移动没有对白')
  const taskPanel = page.getByTestId('ws-task-panel')
  for (const stage of [1, 2, 3]) await taskPanel.getByTestId('ws-hint-reveal-' + stage).click()
  await expect(taskPanel).toContainText('检查对白积木是否接在事件之后')

  for (const step of ['build-opening', 'run-verify', 'error-lab']) {
    await goTo(step)
    const tools = page.getByTestId('golden-block-tools')
    if (!await tools.evaluate(el => el.parentElement?.hasAttribute('open'))) await tools.click()
    await page.getByTestId('lesson-clear-program').click()
    for (const block of ['when_start', 'say_line', 'move_right']) await addStoryBlock(page, block)
    await run()
    await expect(verdict).toContainText('结论：已完成')
  }

  await goTo('creative-encore')
  await run()
  await expect(verdict).toContainText('请在狐狸移动之后')
  await addStoryBlock(page, 'switch_character')
  await addStoryBlock(page, 'say_line')
  await page.getByTestId('g1-u1-l01-block-line-4').selectOption('ready')
  await run()
  await expect(verdict).toContainText('拓展也做到了')
  await expect(page.getByTestId('g1-u1-l01-rabbit')).toHaveAttribute('data-speaking', 'true')
  await goTo('review')
  await page.getByTestId('g1-u1-l01-reflection-option-0').click()
  await page.getByTestId('g1-u1-l01-complete-step').click()
  await expect(page.getByTestId('golden-story-badge')).toBeVisible()
  await page.getByTestId('golden-story').getByRole('button', { name: '保存', exact: true }).click()
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').script?.finished ?? false, draftKey)).toBe(true)
  await page.reload()
  await expect(page.getByTestId('golden-story-badge')).toBeVisible()
  // The classic and Golden routes share the same owned story, even on one device.
  await page.goto('/learn/story-lab/G1-U1-L01')
  await expect(page.getByText(/给狐狸一个开场：7 关全部真的跑通了/)).toBeVisible()
  await page.evaluate(key => {
    localStorage.setItem('kidscoding-draft:G1-U1-L01', localStorage.getItem(key)!)
  }, draftKey)
  const origin = new URL(page.url()).origin
  await page.context().addCookies([{ name: 'kc_guest_id', value: 'another-story-family', url: origin }])
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText(/当前账号无法确认，课堂草稿已锁定/)).toBeVisible()
  await expect(page.locator('svg.blocklySvg')).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 1 关')
  await page.goto(route)
  await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 1 关')
  await expect(page.getByTestId('golden-story-badge')).toHaveCount(0)
  await page.context().clearCookies({ name: 'kc_guest_id' })
  await page.reload()
  await expect(page.getByTestId('golden-story-badge')).toBeVisible()

})
