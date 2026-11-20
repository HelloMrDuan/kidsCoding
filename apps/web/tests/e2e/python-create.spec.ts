import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { cancelCreateLeave } from './_fixtures/cancel-create-leave'

const codeBox = (page: Page) => page.getByRole('textbox', { name: 'Python 代码' })
const run = (page: Page) => page.getByRole('button', { name: '运行', exact: true })
const save = (page: Page) => page.getByRole('button', { name: '保存', exact: true })
const output = (page: Page) => page.getByTestId('python-create-output')
const contents = (page: Page) => expect.poll(async () => (await codeBox(page).locator('.cm-line').allTextContents()).join('\n'))
const program = [
  'from math import sqrt',
  'name = input("你叫什么名字？")',
  'print("你好，" + name)',
  'for i in range(1, 6):',
  '    print("第", i, "次运行")',
  'print(sqrt(81))',
].join('\n')

async function create(page: Page) {
  await page.goto('/create')
  await page.getByRole('button', { name: '新建 Python 作品' }).click()
  await expect(page).toHaveURL(/\/create\/python\/[\da-f-]+$/)
  await expect(codeBox(page)).toBeVisible()
}

async function enterAndRun(page: Page, source: string) {
  await codeBox(page).fill(source)
  await run(page).click()
}

async function sendAnswer(page: Page, answer: string) {
  await page.getByLabel('你叫什么名字？').fill(answer)
  await page.getByRole('button', { name: '发送' }).click()
  await expect(page.getByText('运行结束', { exact: true })).toBeVisible()
}

test('real Python input, execution, save, reopen, isolation, and .py round trip', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await create(page)
  const original = page.url()
  await expect(codeBox(page).locator('.cm-line')).toHaveCount(1)
  await expect(codeBox(page).getByText('在这里写下你的第一行 Python 代码')).toBeVisible()
  await enterAndRun(page, program)
  await sendAnswer(page, '小星')
  await expect(output(page)).toContainText('你好，小星')
  await expect(output(page)).toContainText('第 5 次运行')
  await expect(output(page)).toContainText('9.0')
  await save(page).click()
  await expect(page.getByText('已保存到本机', { exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('1440x900-python.png') })
  await page.reload()
  await contents(page).toBe(program)
  await page.getByTestId('studio-back').click()
  const existing = page.getByTestId('python-work-row').filter({ hasText: '我的 Python 作品' })
  await existing.getByRole('button', { name: '重命名' }).click()
  await page.getByRole('textbox', { name: '作品名称' }).fill('会问名字的程序')
  await page.getByRole('button', { name: '确认' }).click()
  const renamed = page.getByTestId('python-work-row').filter({ hasText: '会问名字的程序' })
  await renamed.getByRole('button', { name: '复制' }).click()
  const copy = page.getByTestId('python-work-row').filter({ hasText: '副本' })
  await copy.getByRole('link', { name: '继续编辑' }).click()
  await contents(page).toBe(program)
  await codeBox(page).fill('print("副本")')
  await save(page).click()
  await expect(page.getByText('已保存到本机', { exact: true })).toBeVisible()
  await page.getByTestId('studio-back').click()
  page.once('dialog', (dialog) => dialog.accept())
  await copy.getByRole('button', { name: '删除' }).click()
  await expect(copy).toHaveCount(0)
  await page.getByRole('group', { name: '筛选作品语言' }).getByRole('button', { name: 'Scratch' }).click()
  await expect(page.getByTestId('python-work-row')).toHaveCount(0)
  await page.getByRole('group', { name: '筛选作品语言' }).getByRole('button', { name: 'Python' }).click()
  await page.getByTestId('python-work-row').getByRole('link', { name: '继续编辑' }).click()
  await expect(page).toHaveURL(original)
  await contents(page).toBe(program)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 .py' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('会问名字的程序.py')
  const bytes = await readFile((await file.path())!)
  expect(bytes.toString()).toBe(program)
  await page.getByLabel('导入 Python 文件').setInputFiles({ name: '导入练习.py', mimeType: 'text/x-python', buffer: bytes })
  await expect(page.getByTestId('studio-title')).toHaveText('导入练习')
  expect(page.url()).not.toBe(original)
  await contents(page).toBe(program)
  await run(page).click()
  await sendAnswer(page, '小宇')
  await expect(output(page)).toContainText('你好，小宇')
  await writeFile(info.outputPath('python-roundtrip.json'), JSON.stringify({
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.byteLength,
    program,
    reopened: true,
    importedOutput: await output(page).innerText(),
  }, null, 2) + '\n')
})

test('reports stderr and actual exception lines, stops loops and restarts an isolated Worker', async ({ page, browser }) => {
  await create(page)
  await enterAndRun(page, 'import sys\nprint("提示", file=sys.stderr)\n1 / 0')
  await expect(output(page).locator('[data-channel="stderr"]')).toContainText('提示')
  const error = page.getByTestId('python-create-exception')
  await expect(error).toContainText('ZeroDivisionError')
  await error.getByRole('button', { name: '查看第 3 行' }).click()
  await expect(codeBox(page)).toBeFocused()
  await enterAndRun(page, 'if True\n    print(1)')
  await expect(error).toContainText('SyntaxError')
  await expect(error.getByRole('button', { name: '查看第 1 行' })).toBeVisible()
  const chrome = await browser.newBrowserCDPSession()
  try {
    const workers = async () => (await chrome.send('Target.getTargets')).targetInfos
      .filter((target) => target.type === 'worker' && target.url.startsWith('blob:null'))
      .map((target) => target.targetId)
    const startLoop = async () => {
      const previous = new Set(await workers())
      await enterAndRun(page, 'while True:\n    pass')
      await expect(page.getByText('正在运行', { exact: true })).toBeVisible()
      const current = (await workers()).find((target) => !previous.has(target))
      expect(current).toBeDefined()
      return current!
    }
    const manual = await startLoop()
    await page.getByRole('button', { name: '停止', exact: true }).click()
    await expect(page.getByText('已停止', { exact: true })).toBeVisible()
    await expect.poll(workers, { timeout: 5000 }).not.toContain(manual)
    const automatic = await startLoop()
    await expect(error).toContainText('程序运行超时', { timeout: 22000 })
    await expect.poll(workers, { timeout: 5000 }).not.toContain(automatic)
  } finally { await chrome.detach() }
  await enterAndRun(page, 'print("secret" in globals())\nsecret = 1\nprint({"a": [1, 2]})')
  await expect(output(page)).toContainText('False')
  await expect(output(page)).toContainText("{'a': [1, 2]}")
  await run(page).click()
  await expect(page.getByText('运行结束', { exact: true })).toBeVisible()
  await expect(output(page)).toContainText('False')
  await page.getByRole('button', { name: '重置环境' }).click()
  await expect(page.getByText('等待运行', { exact: true })).toBeVisible()
})

test('preserves unsaved source on back and reload and recovers from IndexedDB failure', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args) {
      if (sessionStorage.getItem('fail-save') && this.transaction.db.name === 'kidscoding-create' && this.name === 'works') {
        const request = put.apply(this, args)
        this.transaction.abort()
        return request
      }
      return put.apply(this, args)
    }
  })
  await create(page)
  await codeBox(page).fill('print("留在这里")')
  await expect(page.getByText('未保存', { exact: true })).toBeVisible()
  await cancelCreateLeave(page, () => page.evaluate(() => { setTimeout(() => history.back(), 0) }))
  await cancelCreateLeave(page, () => page.evaluate(() => { setTimeout(() => location.reload(), 0) }))
  await cancelCreateLeave(page, () => page.getByTestId('studio-back').click())
  await expect(codeBox(page)).toHaveText('print("留在这里")')
  await page.evaluate(() => sessionStorage.setItem('fail-save', '1'))
  await save(page).click()
  await expect(page.getByText('未能保存', { exact: true })).toBeVisible()
  await page.evaluate(() => sessionStorage.removeItem('fail-save'))
  await save(page).click()
  await expect(page.getByText('已保存到本机', { exact: true })).toBeVisible()
  await page.reload()
  await expect(codeBox(page)).toHaveText('print("留在这里")')
})

test('reports runtime initialization failure, keeps the source, and limits memory and host access', async ({ page }) => {
  await create(page)
  const wasm = '**/python-create-runtime/pyodide.asm.wasm'
  await page.route(wasm, (route) => route.fulfill({ status: 503, body: 'unavailable' }))
  const source = 'import js\nprint(hasattr(js, "fetch"), hasattr(js, "indexedDB"))\nbytearray(300 * 1024 * 1024)'
  await enterAndRun(page, source)
  await expect(page.getByTestId('python-create-exception')).toContainText('无法读取 Python 引擎文件')
  await contents(page).toBe(source)
  await page.unroute(wasm)
  await run(page).click()
  await expect(output(page)).toContainText('False False')
  await expect(page.getByTestId('python-create-exception')).toContainText(/MemoryError|异常退出/)
  await enterAndRun(page, 'print("恢复后运行")')
  await expect(output(page)).toContainText('恢复后运行')
})

for (const size of [{ width: 1366, height: 768 }, { width: 768, height: 1024 }, { width: 375, height: 812 }]) {
  test('Python editing and execution at ' + size.width + '×' + size.height, async ({ browser }, info) => {
    const touch = size.width < 860
    const context = await browser.newContext({ viewport: size, isMobile: touch, hasTouch: touch })
    try {
      const page = await context.newPage()
      await create(page)
      const editor = codeBox(page)
      if (touch) await editor.tap()
      else await editor.click()
      await page.keyboard.insertText('print')
      await page.keyboard.type('(')
      await page.keyboard.insertText('"你好"')
      await expect(editor).toHaveText('print("你好")')
      await page.getByRole('button', { name: '撤销', exact: true }).click()
      await page.getByRole('button', { name: '重做', exact: true }).click()
      await expect(editor).toHaveText('print("你好")')
      await page.getByRole('button', { name: '查找', exact: true }).click()
      await expect(page.getByRole('textbox', { name: '查找', exact: true })).toBeVisible()
      await page.keyboard.press('Escape')
      await page.getByLabel('代码字号').selectOption('20')
      if (touch) await run(page).tap()
      else await run(page).click()
      await expect(output(page)).toContainText('你好')
      await expect(save(page)).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('button', { name: '导出 .py' })).toBeInViewport({ ratio: 1 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(size.width)
      if (touch) await save(page).tap()
      else await save(page).click()
      await expect(page.getByText('已保存到本机', { exact: true })).toBeVisible()
      await page.screenshot({ path: info.outputPath(size.width + 'x' + size.height + '-python.png') })
    } finally { await context.close() }
  })
}
