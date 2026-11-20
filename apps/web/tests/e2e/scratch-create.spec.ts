import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { expect, test, type FrameLocator, type Locator, type Page } from '@playwright/test'
import JSZip from 'jszip'
import { cancelCreateLeave } from './_fixtures/cancel-create-leave'

const guiFrame = (page: Page) => page.frameLocator('iframe[title="Scratch 自由创作编辑器"]')
const sprite = (gui: FrameLocator) => gui.getByRole('button', { name: 'TestPet', exact: true })

function image(name: string, color: string) {
  return { name: name + '.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="31" fill="${color}"/></svg>`,
  ) }
}

function audio() {
  const pcm = Buffer.alloc(44 + 1600)
  pcm.write('RIFF')
  pcm.writeUInt32LE(pcm.length - 8, 4)
  pcm.write('WAVEfmt ', 8)
  pcm.writeUInt32LE(16, 16)
  pcm.writeUInt16LE(1, 20)
  pcm.writeUInt16LE(1, 22)
  pcm.writeUInt32LE(8000, 24)
  pcm.writeUInt32LE(16000, 28)
  pcm.writeUInt16LE(2, 32)
  pcm.writeUInt16LE(16, 34)
  pcm.write('data', 36)
  pcm.writeUInt32LE(1600, 40)
  for (let sample = 0; sample < 800; sample++) pcm.writeInt16LE(Math.round(Math.sin(sample * 0.25) * 7000), 44 + sample * 2)
  return { name: 'TestSound.wav', mimeType: 'audio/wav', buffer: pcm }
}

async function create(page: Page) {
  await page.goto('/create')
  await page.getByRole('button', { name: '新建空白作品' }).click()
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeEnabled({ timeout: 30000 })
  const gui = guiFrame(page)
  await expect(gui.getByRole('button', { name: 'Start project' })).toBeVisible()
  return gui
}

async function addSprite(gui: FrameLocator) {
  await gui.locator('input[accept*=".sprite3"]').setInputFiles(image('TestPet', '#4c47b1'))
  await expect(sprite(gui)).toBeVisible()
  await sprite(gui).click()
}

async function exportData(page: Page) {
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 .sb3' }).click()
  const download = await downloaded
  const file = await readFile((await download.path())!)
  const zip = await JSZip.loadAsync(file)
  const project = JSON.parse(await zip.file('project.json')!.async('string')) as {
    targets: Array<{
      name: string; isStage: boolean; x: number
      costumes: Array<{ name: string; md5ext: string }>
      sounds: Array<{ name: string; md5ext: string }>
      blocks: Record<string, { opcode: string; next?: string }>
    }>
  }
  return { project, file, zip }
}

async function pickBlock(gui: FrameLocator, category: RegExp, pattern: RegExp) {
  await gui.getByRole('treeitem', { name: category }).click()
  const block = gui.locator('.blocklyFlyout .blocklyDraggable').filter({ hasText: pattern }).first()
  await expect(block).toBeVisible()
  return block
}

async function drag(page: Page, block: Locator, x: number, y: number, touch = false) {
  const bounds = (await block.boundingBox())!
  const start = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  const end = { x: x + bounds.width / 2, y }
  if (!touch) {
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 24 })
    await page.mouse.up()
    return
  }
  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
    for (let n = 1; n <= 24; n++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
        x: start.x + (end.x - start.x) * n / 24, y: start.y + (end.y - start.y) * n / 24,
      }] })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await cdp.detach()
  }
}

async function program(page: Page, gui: FrameLocator, touch = false) {
  const workspace = gui.locator('svg.blocklySvg .blocklyBlockCanvas').first()
  const hat = await pickBlock(gui, /事件|Events/, /当.*被点击/)
  await hat.scrollIntoViewIfNeeded()
  const palette = (await gui.locator('.blocklyFlyout').first().boundingBox())!
  const flyoutRight = palette.x + palette.width
  const block = (await hat.boundingBox())!
  await drag(page, hat, flyoutRight + (touch ? 24 : 5), block.y + 80, touch)
  const placed = workspace.locator('.blocklyDraggable').filter({ hasText: /当.*被点击/ }).first()
  await expect(placed).toBeVisible()
  const move = await pickBlock(gui, /运动|Motion/, /移动.*步/)
  const anchor = (await placed.boundingBox())!
  const motion = (await move.boundingBox())!
  // In narrow mode the flyout overlaps part of the underlying canvas. Leave
  // room below and beside the hat for the first gesture, then snap on canvas.
  const dropX = touch ? Math.max(anchor.x, flyoutRight + 26) : anchor.x
  const dropY = anchor.y + anchor.height + motion.height / 2 + (touch ? 28 : -4)
  await drag(page, move, dropX, dropY, touch)
  const placedMove = workspace.locator('.blocklyDraggable').filter({ hasText: /移动.*步/ }).first()
  await expect(placedMove).toBeVisible()
  if (touch) {
    const { project } = await exportData(page)
    const pet = project.targets.find((target) => target.name === 'TestPet')!
    if (!Object.values(pet.blocks).some((block) => block.opcode === 'event_whenflagclicked' && block.next)) {
      // Connect the two visible blocks with a second, canvas-only gesture if
      // the first gesture placed the motion block beside the stack.
      const stack = (await placed.boundingBox())!
      const loose = (await placedMove.boundingBox())!
      await drag(page, placedMove, stack.x, stack.y + stack.height + loose.height / 2 - 4, true)
    }
  }
}

test('real Scratch GUI saves, restores and exports a complete independently editable project', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const gui = await create(page)
  const originalUrl = page.url()
  expect((await exportData(page)).project.targets).toHaveLength(1)
  await addSprite(gui)
  await gui.locator('input[accept*=".svg"]:not([accept*=".sprite3"])').setInputFiles(image('TestBackdrop', '#78a645'))
  await expect.poll(async () => (await exportData(page)).project.targets.find((target) => target.isStage)?.costumes.map((item) => item.name)).toContain('TestBackdrop')
  await sprite(gui).click()
  await gui.getByRole('tab', { name: '造型' }).click()
  await gui.getByRole('tabpanel').locator('input[type=file]').setInputFiles(image('TestCostume', '#b85476'))
  await expect(gui.getByText('TestCostume', { exact: true }).first()).toBeVisible()
  await gui.getByRole('tab', { name: '声音' }).click()
  await gui.getByRole('tabpanel').locator('input[type=file]').setInputFiles(audio())
  await expect(gui.getByText('TestSound', { exact: true }).first()).toBeVisible()
  await gui.getByRole('tab', { name: '代码' }).click()
  await program(page, gui)
  const before = (await exportData(page)).project.targets.find((target) => target.name === 'TestPet')!
  const hat = Object.values(before.blocks).find((block) => block.opcode === 'event_whenflagclicked')!
  expect(before.blocks[hat.next!].opcode).toEqual('motion_movesteps')
  await gui.getByRole('button', { name: 'Start project' }).click()
  await expect.poll(async () => (await exportData(page)).project.targets.find((target) => target.name === 'TestPet')!.x).toBeGreaterThan(before.x)
  await gui.getByRole('button', { name: 'Stop project' }).click()
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('已保存到本机', { exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('1440x900-editor.png') })
  const { file, project, zip } = await exportData(page)
  const saved = project.targets.find((target) => target.name === 'TestPet')!
  const backdrops = project.targets.find((target) => target.isStage)!.costumes
  expect(saved.costumes.map((item) => item.name)).toContain('TestCostume')
  expect(saved.sounds.map((item) => item.name)).toContain('TestSound')
  for (const asset of [...backdrops, ...saved.costumes, ...saved.sounds]) expect(zip.file(asset.md5ext)).not.toBeNull()
  expect(backdrops.map((item) => item.name)).toContain('TestBackdrop')
  await page.reload()
  await expect(sprite(gui)).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeEnabled()
  expect((await exportData(page)).project).toMatchObject(project)

  await page.getByTestId('studio-back').click()
  const original = page.getByTestId('scratch-work-row').filter({ hasText: '我的 Scratch 作品' })
  await original.getByRole('button', { name: '重命名' }).click()
  await page.getByRole('textbox', { name: '作品名称' }).fill('会动的精灵')
  await page.getByRole('button', { name: '确认' }).click()
  const renamed = page.getByTestId('scratch-work-row').filter({ hasText: '会动的精灵' })
  await renamed.getByRole('button', { name: '复制' }).click()
  const duplicate = page.getByTestId('scratch-work-row').filter({ hasText: '副本' })
  await expect(duplicate).toBeVisible()
  await duplicate.getByRole('link', { name: '继续编辑' }).click()
  await expect(sprite(gui)).toBeVisible()
  const motion = gui.locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable').filter({ hasText: /移动.*步/ }).first()
  await motion.click()
  await page.keyboard.press('Delete')
  await expect.poll(async () => Object.values((await exportData(page)).project.targets.find((target) => target.name === 'TestPet')!.blocks)
    .some((block) => block.opcode === 'motion_movesteps')).toBe(false)
  await sprite(gui).getByRole('button', { name: 'Delete' }).click()
  await expect(sprite(gui)).toHaveCount(0)
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('已保存到本机', { exact: true })).toBeVisible()
  await page.getByTestId('studio-back').click()
  page.once('dialog', (dialog) => dialog.accept())
  await duplicate.getByRole('button', { name: '删除' }).click()
  await expect(duplicate).toHaveCount(0)
  await page.getByRole('link', { name: '导入 .sb3' }).click()
  await expect(page.getByRole('button', { name: '导入 .sb3' })).toBeEnabled({ timeout: 30000 })
  await page.locator('input[type=file]').setInputFiles({ name: '损坏.sb3', mimeType: 'application/zip', buffer: Buffer.from('invalid') })
  await expect(page.getByTestId('scratch-create-status')).toHaveAttribute('role', 'alert')
  await page.locator('input[type=file]').setInputFiles({ name: '导入作品.sb3', mimeType: 'application/zip', buffer: file })
  await expect(page.getByTestId('studio-title')).toHaveText('导入作品')
  await expect(sprite(gui)).toBeVisible()
  await gui.getByRole('button', { name: 'Start project' }).click()
  let importedX = saved.x
  await expect.poll(async () => {
    importedX = (await exportData(page)).project.targets.find((target) => target.name === 'TestPet')!.x
    return importedX
  }).toBeGreaterThan(saved.x)
  expect(page.url()).not.toEqual(originalUrl)
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('已保存到本机', { exact: true })).toBeVisible()
  await create(page)
  expect((await exportData(page)).project.targets).toHaveLength(1)
  await page.getByTestId('studio-back').click()
  await expect(page.getByTestId('scratch-work-row')).toHaveCount(3)
  await page.screenshot({ path: info.outputPath('1440x900-hub.png') })
  await page.goto(originalUrl)
  await expect(sprite(gui)).toBeVisible()
  expect((await exportData(page)).project.targets.find((target) => target.name === 'TestPet')!.x).toEqual(saved.x)
  await writeFile(info.outputPath('roundtrip.json'), JSON.stringify({
    sha256: createHash('sha256').update(file).digest('hex'),
    bytes: file.length,
    backdrops: backdrops.map((asset) => asset.name),
    sprite: saved.name,
    costumes: saved.costumes.map((asset) => asset.name),
    sounds: saved.sounds.map((asset) => asset.name),
    connectedOpcodes: [hat.opcode, before.blocks[hat.next!].opcode],
    x: { beforeRun: before.x, afterSave: saved.x, afterImportedRun: importedX },
    verified: ['refresh restored the project', 'copied project edited independently', 'corrupt import rejected', 'new blank project unaffected', 'original project restored without changes'],
  }, null, 2) + '\n')
})

test('a failed IndexedDB save keeps the live project available for a retry', async ({ page }) => {
  await page.addInitScript(() => {
    const real = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args) {
      if (sessionStorage.getItem('fail-save') && this.transaction.db.name === 'kidscoding-create' && this.name === 'works') {
        const request = real.apply(this, args)
        this.transaction.abort()
        return request
      }
      return real.apply(this, args)
    }
  })
  const gui = await create(page)
  await addSprite(gui)
  await page.evaluate(() => sessionStorage.setItem('fail-save', 'yes'))
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByTestId('scratch-create-status')).toContainText('本机作品')
  await expect(sprite(gui)).toBeVisible()
  await page.evaluate(() => sessionStorage.removeItem('fail-save'))
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('已保存到本机', { exact: true })).toBeVisible()
  await page.reload()
  await expect(sprite(gui)).toBeVisible()
})

test('Scratch confirms backing out, returning, reloading and closing when a native edit is unsaved', async ({ page }) => {
  const gui = await create(page)
  const address = page.url()
  await addSprite(gui)
  await expect(page.getByText('未保存', { exact: true })).toBeVisible()
  await cancelCreateLeave(page, () => page.evaluate(() => { setTimeout(() => history.back(), 0) }))
  await expect(page).toHaveURL(address)
  await expect(sprite(gui)).toBeVisible()
  await cancelCreateLeave(page, () => page.getByTestId('studio-back').click())
  await cancelCreateLeave(page, () => page.evaluate(() => { setTimeout(() => location.reload(), 0) }))
  await cancelCreateLeave(page, () => page.close({ runBeforeUnload: true }))
  await expect(sprite(gui)).toBeVisible()
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('已保存到本机', { exact: true })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/create$/)
  await page.goForward()
  await expect(sprite(gui)).toBeVisible()
})

test('an older Scratch editor cannot overwrite newer saved work and can export its own version', async ({ page, context }) => {
  const original = await create(page)
  const other = await context.newPage()
  await other.goto(page.url())
  const second = guiFrame(other)
  await expect(second.getByRole('button', { name: 'Start project' })).toBeVisible()
  await addSprite(original)
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('已保存到本机', { exact: true })).toBeVisible()
  await other.getByRole('button', { name: '保存', exact: true }).click()
  await expect(other.getByTestId('scratch-create-status')).toContainText('另一窗口已保存')
  expect((await exportData(other)).project.targets).toHaveLength(1)
  await other.reload()
  await expect(sprite(second)).toBeVisible()
})

for (const size of [{ width: 1366, height: 768 }, { width: 768, height: 1024 }, { width: 375, height: 812 }]) {
  test(`real GUI is usable at ${size.width}×${size.height}`, async ({ browser }, info) => {
    const touch = size.width < 1000
    const context = await browser.newContext({ viewport: size, isMobile: touch, hasTouch: touch })
    try {
      const page = await context.newPage()
      const gui = await create(page)
      await addSprite(gui)
      await program(page, gui, touch)
      if (touch) {
        const targetPanel = gui.locator('[class*="gui_target-wrapper"]')
        const targetBounds = (await targetPanel.boundingBox())!
        const spriteBounds = (await sprite(gui).boundingBox())!
        expect(spriteBounds.y + spriteBounds.height).toBeLessThanOrEqual(targetBounds.y + targetBounds.height + 1)
      }
      await page.screenshot({ path: info.outputPath(`${size.width}x${size.height}-editor.png`) })
      const width = await gui.locator('html').evaluate((html) => [html.scrollWidth, html.clientWidth])
      expect(width[0]).toBeLessThanOrEqual(width[1])
      if (touch) await gui.getByRole('button', { name: 'Start project' }).tap()
      else await gui.getByRole('button', { name: 'Start project' }).click()
      const { project } = await exportData(page)
      const pet = project.targets.find((target) => target.name === 'TestPet')!
      const hat = Object.values(pet.blocks).find((block) => block.opcode === 'event_whenflagclicked')!
      expect(pet.blocks[hat.next!].opcode).toEqual('motion_movesteps')
      await expect(page.getByRole('button', { name: '保存', exact: true })).toBeInViewport({ ratio: 1 })
      if (touch) await page.getByRole('button', { name: '保存', exact: true }).tap()
      else await page.getByRole('button', { name: '保存', exact: true }).click()
      await expect(page.getByText('已保存到本机', { exact: true })).toBeVisible()
      await page.getByTestId('studio-back').click()
      await expect(page.getByRole('link', { name: '继续编辑' })).toBeVisible()
    } finally {
      await context.close()
    }
  })
}
