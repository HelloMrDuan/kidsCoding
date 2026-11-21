import { mkdir, readFile } from 'node:fs/promises'
import { expect, test, type FrameLocator, type Locator, type Page } from '@playwright/test'
import JSZip from 'jszip'
import { drag, pickBlock } from './_fixtures/scratch-block-drag'

const url = '/learn/scratch-lab/G3-U1-L02/golden'
const gui = (page: Page) => page.frameLocator('iframe[title="Scratch 完整课程编辑器"]')
const workspace = (frame: FrameLocator) => frame.locator('svg.blocklySvg .blocklyBlockCanvas').first()
const check = (page: Page) => page.getByRole('button', { name: '检查任务' })
const collapse = (page: Page) => page.getByRole('button', { name: '收起指引' }).click()

async function open(page: Page) {
  await page.goto(url)
  await expect(check(page)).toBeEnabled({ timeout: 45_000 })
  await expect(gui(page).getByRole('button', { name: '流星', exact: true })).toBeVisible()
}

async function checkRun(page: Page, feedback: string) {
  await check(page).click()
  await expect(page.getByRole('status')).toContainText(feedback, { timeout: 30_000 })
}

async function predictPile(page: Page, answer = '会自动消失') {
  await page.getByLabel('原来的脚本跑完后，舞台会剩下流星吗？').selectOption(answer)
}

async function setCount(page: Page, touch = false) {
  const text = workspace(gui(page)).getByText('6', { exact: true })
  if (touch) await text.tap()
  else await text.click()
  const input = gui(page).locator('input.blocklyHtmlInput')
  await input.fill('10')
  await input.press('Enter')
  await expect(workspace(gui(page)).locator('[data-id="repeat"]').getByText('10', { exact: true })).toBeVisible()
}

async function exportBytes(page: Page) {
  const received = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 .sb3' }).click()
  return readFile((await (await received).path())!)
}

async function blocks(page: Page) {
  const archive = await JSZip.loadAsync(await exportBytes(page))
  const project = JSON.parse(await archive.file('project.json')!.async('string'))
  return project.targets.find((target: { name: string }) => target.name === '流星').blocks as Record<string, { opcode: string; next: string | null }>
}

async function below(page: Page, source: Locator, anchor: Locator, touch = false, fromPalette = false) {
  if (touch) {
    await anchor.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }))
  } else {
    await anchor.scrollIntoViewIfNeeded()
  }
  const target = (await anchor.boundingBox())!
  const grip = (await source.boundingBox())!
  let x = target.x
  if (touch && fromPalette) {
    const palette = (await gui(page).locator('.blocklyFlyout').first().boundingBox())!
    x = Math.max(x, palette.x + palette.width + 26)
  }
  await drag(page, source, x, target.y + target.height + grip.height / 2 - 4, touch)
}

async function revealFlyoutBlock(page: Page, block: Locator, touch: boolean) {
  const scrollbar = gui(page).locator('.blocklyFlyoutScrollbar')
  const handle = scrollbar.locator('.blocklyScrollbarHandle')
  const track = (await scrollbar.boundingBox())!
  const grip = (await handle.boundingBox())!
  const origin = (await block.boundingBox())!
  if (origin.y >= track.y && origin.y + origin.height <= track.y + track.height) return
  const distance = (origin.y - track.y - track.height * 0.62) * (grip.height / track.height)
  const start = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 }
  const end = { x: start.x, y: Math.max(track.y + 4, Math.min(track.y + track.height - 4, start.y + distance)) }
  if (!touch) {
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 10 })
    await page.mouse.up()
    return
  }
  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: start.x, y: start.y + (end.y - start.y) * i / 10 }],
      })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await cdp.detach()
  }
}

async function attachDelete(page: Page, touch = false) {
  const frame = gui(page)
  const script = workspace(frame)
  const anchor = script.locator('[data-id="down"]')
  const remove = await pickBlock(frame, /控制|Control/, /删除此克隆体/)
  await revealFlyoutBlock(page, remove, touch)
  await below(page, remove, anchor, touch, true)
  const nativeBlock = script.getByText('删除此克隆体', { exact: true })
  await expect(nativeBlock).toBeVisible()
  if (touch && !(await blocks(page)).down.next) {
    await below(page, script.locator('.blocklyDraggable').filter({ hasText: /^删除此克隆体$/ }).last(), anchor, true)
  }
  const stack = await blocks(page)
  expect(stack[stack.down.next!]?.opcode).toBe('control_delete_this_clone')
}

for (const [width, height] of [[1440, 900], [1366, 768], [768, 1024], [375, 812]]) {
  test(`G3 Golden keeps the stage and real Scratch controls at ${width}×${height}`, async ({ browser }) => {
    const touch = width <= 768
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 })
    try {
      const page = await context.newPage()
      await open(page)
      await setCount(page, touch)
      await checkRun(page, '生成了十颗流星')
      await predictPile(page)
      await checkRun(page, '舞台上还有 10 颗分身')
      await collapse(page)
      await attachDelete(page, touch)
      await checkRun(page, '到底后删除')
      await collapse(page)
      const start = gui(page).getByRole('button', { name: 'Start project' })
      if (touch) await start.tap()
      else await start.click()
      await expect(gui(page).getByRole('region', { name: 'Stage', exact: true })).toBeInViewport()
      if (process.env.GOLDEN_EVIDENCE_DIR) {
        await mkdir(process.env.GOLDEN_EVIDENCE_DIR, { recursive: true })
        await page.screenshot({ path: `${process.env.GOLDEN_EVIDENCE_DIR}/${width}x${height}.png` })
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toEqual(width)
    } finally {
      await context.close()
    }
  })
}

test('G3 Golden observes the bug, repairs clone deletion and verifies a custom block and saved project', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/learn/catalog/G3-U1-L02')
  await page.getByTestId('scratch-trial-entry').click()
  await expect(page).toHaveURL(new RegExp(url + '$'))
  await expect(check(page)).toBeEnabled({ timeout: 45_000 })
  await checkRun(page, '检测到 6 颗分身')
  const hint = page.getByRole('button', { name: '下一层提示' })
  await hint.click()
  await hint.click()
  await hint.click()
  await expect(page.getByText(/提示 3/)).toBeVisible()
  await collapse(page)
  await setCount(page)
  await checkRun(page, '生成了十颗流星')
  await checkRun(page, '先选择你的预测')
  await predictPile(page)
  await checkRun(page, '舞台上还有 10 颗分身')
  await expect(page.getByRole('status')).toContainText('你的预测：会自动消失')
  await checkRun(page, '结束时还有 10 颗分身')
  await collapse(page)
  await attachDelete(page)
  await checkRun(page, '到底后删除')
  await checkRun(page, '实际调用自制积木')
  await collapse(page)

  const frame = gui(page)
  const script = workspace(frame)
  await frame.getByRole('treeitem', { name: '自制积木' }).click()
  await frame.getByText('制作新的积木', { exact: true }).click()
  const dialog = frame.getByRole('dialog')
  const name = frame.locator('input.blocklyHtmlInput')
  await name.fill('安排下落')
  await name.press('Enter')
  await dialog.getByRole('button', { name: '完成' }).click()
  const definition = script.locator('.blocklyDraggable').filter({ hasText: '定义' }).filter({ hasText: '安排下落' }).first()
  await expect(definition).toBeVisible()
  const hat = (await definition.boundingBox())!
  await drag(page, definition, hat.x + 260, hat.y + hat.height / 2 + 70)
  await below(page, script.locator('[data-id="down"]'), definition)
  const call = await pickBlock(frame, /自制积木|My Blocks/, /安排下落/)
  await below(page, call, script.locator('[data-id="set_y"]'), false, true)
  await checkRun(page, '十颗流星完成下落')
  await expect(page.getByText('流星雨项目已完成')).toBeVisible()
  if (process.env.GOLDEN_EVIDENCE_DIR) {
    await mkdir(process.env.GOLDEN_EVIDENCE_DIR, { recursive: true })
    await page.screenshot({ path: `${process.env.GOLDEN_EVIDENCE_DIR}/completed.png` })
  }
  const archived = await exportBytes(page)
  expect((await blocks(page)).set_y.next).toBeTruthy()
  await page.reload()
  await expect(check(page)).toBeEnabled({ timeout: 45_000 })
  await expect(page.getByText('流星雨项目已完成')).toBeVisible()
  await page.getByRole('link', { name: '返回' }).click()
  await open(page)
  await checkRun(page, '十颗流星完成下落')
  await page.locator('input[accept=".sb3"]').setInputFiles({ name: 'meteor.sb3', buffer: archived, mimeType: 'application/octet-stream' })
  await expect(page.getByRole('status')).toContainText('作品已导入')
  await checkRun(page, '生成了十颗流星')
})
