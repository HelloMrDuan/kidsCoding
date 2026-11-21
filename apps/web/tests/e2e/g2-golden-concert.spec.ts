import { mkdir, readFile } from 'node:fs/promises'
import { expect, test, type FrameLocator, type Locator, type Page } from '@playwright/test'
import JSZip from 'jszip'
import { drag, pickBlock } from './_fixtures/scratch-block-drag'
import { cancelCreateLeave } from './_fixtures/cancel-create-leave'

const courseUrl = '/learn/scratch-lab/G2-U1-L03/golden'
const gui = (page: Page) => page.frameLocator('iframe[title="Scratch 完整课程编辑器"]')
const script = (frame: FrameLocator) => frame.locator('svg.blocklySvg .blocklyBlockCanvas').first()
const check = (page: Page) => page.getByRole('button', { name: '检查任务' })

async function openCourse(page: Page) {
  await page.goto(courseUrl)
  await expect(check(page)).toBeEnabled({ timeout: 45_000 })
  await expect(gui(page).getByRole('button', { name: 'Start project' })).toBeVisible()
}

async function editText(workspace: Locator, original: string, updated: string) {
  await workspace.getByText(original, { exact: true }).click()
  const input = gui(workspace.page()).locator('input.blocklyHtmlInput')
  await input.fill(updated)
  await input.press('Enter')
  await expect(workspace.getByText(updated, { exact: true })).toBeVisible()
}

async function selectMenu(workspace: Locator, original: string, updated: string) {
  await workspace.getByText(original, { exact: true }).click()
  await gui(workspace.page()).getByRole('option', { name: updated, exact: true }).click()
  await expect(workspace.getByText(updated, { exact: true })).toBeVisible()
}

async function exportProject(page: Page) {
  const received = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 .sb3' }).click()
  const download = await received
  return readFile((await download.path())!)
}

async function appendMotion(page: Page, touch: boolean) {
  const frame = gui(page)
  await frame.getByRole('button', { name: '小橘猫', exact: true }).click()
  const workspace = script(frame)
  const flag = await pickBlock(frame, /事件|Events/, /当.*被点击/)
  const palette = (await frame.locator('.blocklyFlyout').first().boundingBox())!
  const flyoutRight = palette.x + palette.width
  const hatSource = (await flag.boundingBox())!
  await drag(page, flag, flyoutRight + (touch ? 24 : 5), hatSource.y + 80, touch)
  const start = workspace.locator('.blocklyDraggable').filter({ hasText: /^当.*被点击$/ }).last()
  await expect(start).toBeVisible()
  const source = await pickBlock(frame, /运动|Motion/, /移动.*步/)
  const anchor = (await start.boundingBox())!
  const size = (await source.boundingBox())!
  const x = touch ? Math.max(anchor.x, flyoutRight + 26) : anchor.x
  await drag(page, source, x, anchor.y + anchor.height + size.height / 2 + (touch ? 28 : -4), touch)
  const placed = workspace.locator('.blocklyDraggable').filter({ hasText: /移动.*步/ }).last()
  await expect(placed).toBeVisible()
  const getNext = async () => {
    const archive = await JSZip.loadAsync(await exportProject(page))
    const project = JSON.parse(await archive.file('project.json')!.async('string'))
    const blocks: Record<string, { opcode: string; next: string | null }> =
      project.targets.find((target: { name: string }) => target.name === '小橘猫').blocks
    const hat = Object.values(blocks).find(block => block.opcode === 'event_whenflagclicked')
    return hat?.next ? blocks[hat.next]?.opcode : undefined
  }
  if (touch && await getNext() !== 'motion_movesteps') {
    const movedStart = (await start.boundingBox())!
    const unconnected = (await placed.boundingBox())!
    await drag(page, placed, movedStart.x, movedStart.y + movedStart.height + unconnected.height / 2 - 4, true)
  }
  expect(await getNext()).toBe('motion_movesteps')
}

async function advance(page: Page, feedback: string) {
  await check(page).click()
  await expect(page.getByRole('status')).toContainText(feedback, { timeout: 25_000 })
}

for (const [width, height] of [[1440, 900], [1366, 768], [768, 1024], [375, 812]]) {
  test(`G2 Golden displays native Scratch and checks the starter at ${width}×${height}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width, height }, hasTouch: width <= 768, deviceScaleFactor: 1,
      ...(width === 375 ? { isMobile: true } : {}),
    })
    try {
      const page = await context.newPage()
      await openCourse(page)
      await advance(page, '夜晚森林')
      await page.getByRole('button', { name: '收起指引' }).click()
      await appendMotion(page, width <= 768)
      if (width === 375 && process.env.GOLDEN_EVIDENCE_DIR) {
        await mkdir(process.env.GOLDEN_EVIDENCE_DIR, { recursive: true })
        await script(gui(page)).locator('.blocklyDraggable').filter({ hasText: /移动.*步/ }).last().scrollIntoViewIfNeeded()
        await page.screenshot({ path: `${process.env.GOLDEN_EVIDENCE_DIR}/375x812-code.png` })
      }
      const start = gui(page).getByRole('button', { name: 'Start project' })
      if (width <= 768) await start.tap()
      else await start.click()
      await expect(gui(page).getByRole('button', { name: 'Stop project' })).toBeVisible()
      await expect(gui(page).getByRole('region', { name: 'Stage', exact: true })).toBeVisible()
      const hostSize = await gui(page).locator('html').evaluate(node => ({ width: node.scrollWidth, viewport: node.clientWidth }))
      expect(hostSize.width).toBeLessThanOrEqual(hostSize.viewport)
      if (process.env.GOLDEN_EVIDENCE_DIR) {
        await mkdir(process.env.GOLDEN_EVIDENCE_DIR, { recursive: true })
        await page.screenshot({ path: `${process.env.GOLDEN_EVIDENCE_DIR}/${width}x${height}.png` })
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    } finally {
      await context.close()
    }
  })
}

test('G2 Golden judges native Scratch edits and opens the complete saved archive', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/learn/catalog/G2-U1-L03')
  await page.getByTestId('scratch-trial-entry').click()
  await expect(page).toHaveURL(new RegExp(courseUrl + '$'))
  await expect(check(page)).toBeEnabled({ timeout: 45_000 })
  const frame = gui(page)
  const workspace = script(frame)
  await advance(page, '夜晚森林')
  await page.getByRole('button', { name: '下一层提示' }).click()
  await page.getByRole('button', { name: '下一层提示' }).click()
  await page.getByRole('button', { name: '下一层提示' }).click()
  await expect(page.getByText(/提示 3/)).toBeVisible()
  await page.getByRole('button', { name: '收起指引' }).click()
  await frame.getByLabel('Target pane').getByText('舞台', { exact: true }).click()
  await selectMenu(workspace, '夜晚森林', '绿色草地')
  await advance(page, '真的换成了绿色草地')
  await page.getByRole('button', { name: '收起指引' }).click()
  await frame.getByRole('button', { name: '小鸟', exact: true }).click()
  await selectMenu(workspace, '叽叽', '啾啾')
  await advance(page, '播放了啾啾')
  await advance(page, '先选择你的预测')
  await page.getByLabel('按绿旗后，开幕铃响几次？').selectOption('响 1 次')
  await advance(page, '记录到三声开幕铃')
  await expect(page.getByRole('status')).toContainText('你的预测：响 1 次')
  await advance(page, '响了 3 次')
  await page.getByRole('button', { name: '收起指引' }).click()
  await frame.getByLabel('Target pane').getByText('舞台', { exact: true }).click()
  await editText(workspace, '3', '1')
  await advance(page, '只响了一声')
  await page.getByRole('button', { name: '收起指引' }).click()
  await frame.getByRole('button', { name: '小橘猫', exact: true }).click()
  await editText(workspace, '欢迎来到森林音乐会！', '森林的新朋友，欢迎你！')
  await advance(page, '主持人说出了你的开场词')
  if (process.env.GOLDEN_EVIDENCE_DIR) {
    await mkdir(process.env.GOLDEN_EVIDENCE_DIR, { recursive: true })
    await page.screenshot({ path: `${process.env.GOLDEN_EVIDENCE_DIR}/completed.png` })
  }
  const file = await exportProject(page)
  const archive = await JSZip.loadAsync(file)
  expect(Object.keys(archive.files).some(name => name.endsWith('.wav'))).toBe(true)
  expect(Object.keys(archive.files).some(name => name.endsWith('.svg'))).toBe(true)
  expect(await archive.file('project.json')!.async('string')).toContain('森林的新朋友，欢迎你！')

  await page.reload()
  await expect(check(page)).toBeEnabled({ timeout: 45_000 })
  await expect(page.getByText('音乐会已完成')).toBeVisible()
  await page.getByRole('link', { name: '返回' }).click()
  await openCourse(page)
  await expect(page.getByText('音乐会已完成')).toBeVisible()
  await expect((await JSZip.loadAsync(await exportProject(page))).file('project.json')!.async('string')).resolves.toContain('森林的新朋友，欢迎你！')

  await page.getByRole('button', { name: '收起指引' }).click()
  await frame.getByRole('button', { name: '小橘猫', exact: true }).click()
  await editText(workspace, '森林的新朋友，欢迎你！', '欢迎来到森林音乐会！')
  await expect(page.getByText(/当前作品待重新检查/)).toBeVisible()
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('作品已保存到本机')
  await page.reload()
  await expect(check(page)).toBeEnabled({ timeout: 45_000 })
  await expect(page.getByText(/历史成就/)).toBeVisible()
  await expect(page.getByText('音乐会已完成')).toHaveCount(0)
  await advance(page, '再让小橘猫说一句你自己写的主持词')
  await page.getByRole('button', { name: '收起指引' }).click()
  await frame.getByRole('button', { name: '小橘猫', exact: true }).click()
  await editText(workspace, '欢迎来到森林音乐会！', '森林的新朋友，欢迎你！')
  await advance(page, '主持人说出了你的开场词')
  await expect(page.getByText('音乐会已完成')).toBeVisible()
  await page.locator('input[accept=".sb3"]').setInputFiles({ name: 'saved.sb3', mimeType: 'application/octet-stream', buffer: file })
  await expect(page.getByRole('status')).toContainText('作品已导入')
  await advance(page, '真的换成了绿色草地')
})

test('G2 Golden reports a blocked local write and saves when retried', async ({ page }) => {
  await openCourse(page)
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof original>) {
      if (this.transaction.db.name === 'kidscoding-scratch-course-projects') {
        IDBObjectStore.prototype.put = original
        this.transaction.abort()
        return {} as ReturnType<typeof original>
      }
      return original.apply(this, args)
    }
  })
  const save = page.getByRole('button', { name: '保存', exact: true })
  await save.click()
  await expect(page.locator('.kc-scratch-course-status[role="alert"]')).toContainText('操作失败')
  await save.click()
  await expect(page.getByRole('status')).toContainText('作品已保存到本机')
  await page.reload()
  await expect(check(page)).toBeEnabled({ timeout: 45_000 })
  await advance(page, '夜晚森林')
})

test('G2 Golden protects an unsaved edit on Back, site navigation and reload', async ({ page }) => {
  await page.goto('/learn/catalog/G2-U1-L03')
  await page.getByTestId('scratch-trial-entry').click()
  await expect(check(page)).toBeEnabled({ timeout: 45_000 })
  const address = page.url()
  const frame = gui(page)
  await frame.getByLabel('Target pane').getByText('舞台', { exact: true }).click()
  await selectMenu(script(frame), '夜晚森林', '绿色草地')
  await expect(page.getByText(/有改动未保存/)).toBeVisible()
  await cancelCreateLeave(page, () => page.evaluate(() => { setTimeout(() => history.back(), 0) }))
  await cancelCreateLeave(page, () => page.getByTestId('kc-nav-map').click())
  await cancelCreateLeave(page, () => page.evaluate(() => { setTimeout(() => location.reload(), 0) }))
  await expect(page).toHaveURL(address)
  await expect(script(frame).getByText('绿色草地', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('作品已保存到本机')
  await page.goBack()
  await expect(page).toHaveURL(/\/learn\/catalog\/G2-U1-L03$/)
  await page.goForward()
  await expect(check(page)).toBeEnabled({ timeout: 45_000 })
  await advance(page, '真的换成了绿色草地')
})
