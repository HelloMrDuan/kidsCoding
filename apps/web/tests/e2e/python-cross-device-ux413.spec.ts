import { expect, test, type Page } from '@playwright/test'

// UX-413：Python 浏览器跨端完整回归。
// - 超时错误/恢复：无限循环触发 lab 侧运行超时（试用 6 秒/多题 8 秒）→ 超时状态文案 →
//   换正确代码重跑通过。超时现状只出状态文案、不出三层提示（提示层存在但未接渲染，
//   本任务先以现状测试为准，不擅自改动已验收的超时 UI）。
// - 键盘：真实键盘路径（键盘输入 + Tab 切焦 + Space 激活运行），三断点焦点态截图。
//   本地用 PYODIDE_LOCAL_MIRROR=1 的 Pyodide 镜像（与 UX-412 同款门控）；CI 走真实 CDN。
const PYODIDE_MIRROR = '/home/hatch/workspace/pyodide-local'
async function useLocalPyodideMirror(page: Page) {
  if (!process.env.PYODIDE_LOCAL_MIRROR) return
  for (const file of ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']) {
    await page.route(`https://cdn.jsdelivr.net/pyodide/v0.27.7/full/${file}`, (route) =>
      route.fulfill({ path: `${PYODIDE_MIRROR}/${file}` }),
    )
  }
}

test('trial lab infinite loop times out, then correct code recovers', async ({ page }) => {
  test.setTimeout(180_000)
  await useLocalPyodideMirror(page)
  await page.goto('/learn/python-lab/P0-U1-L01')
  await expect(page.getByTestId('python-run')).toBeEnabled({ timeout: 15_000 })
  await page.getByTestId('python-source').fill('while True:\n    pass')
  await page.getByTestId('python-run').click()
  await expect(page.getByTestId('python-feedback')).toContainText('已停止', { timeout: 60_000 })
  await expect(page.getByTestId('python-run')).toBeEnabled()
  await page.getByTestId('python-source').fill('print("你好，编程世界")')
  await page.getByTestId('python-run').click()
  await expect(page.getByTestId('python-passed')).toBeVisible({ timeout: 90_000 })
  await expect(page.getByTestId('python-output')).toHaveText('你好，编程世界')
})

test('multi lab infinite loop times out, then correct code recovers', async ({ page }) => {
  test.setTimeout(180_000)
  await useLocalPyodideMirror(page)
  await page.goto('/learn/python-lab/P0-U1-L02')
  await expect(page.getByTestId('python-multi-run')).toBeEnabled({ timeout: 15_000 })
  await page.getByTestId('python-multi-source').fill('def introduce(name, hobby):\n    while True:\n        pass')
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-feedback')).toContainText('运行超时', { timeout: 60_000 })
  await expect(page.getByTestId('python-multi-run')).toBeEnabled()
  await page.getByTestId('python-multi-source').fill('def introduce(name, hobby):\n    return f"我是{name}，喜欢{hobby}"')
  await page.getByTestId('python-multi-run').click()
  await expect(page.getByTestId('python-multi-passed')).toBeVisible({ timeout: 90_000 })
  await expect(page.getByTestId('python-multi-count')).toHaveText('3/3')
})

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
] as const

for (const vp of VIEWPORTS) {
  test(`multi lab keyboard run at ${vp.name} with focus screenshot`, async ({ page }, testInfo) => {
    test.setTimeout(180_000)
    await useLocalPyodideMirror(page)
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/learn/python-lab/P0-U1-L02')
    await expect(page.getByTestId('python-multi-run')).toBeEnabled({ timeout: 15_000 })
    await page.getByTestId('python-multi-source').click()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('Backspace')
    await page.keyboard.type('def introduce(name, hobby):\n    return f"我是{name}，喜欢{hobby}"')
    await expect(page.getByTestId('python-multi-source')).toHaveValue(
      'def introduce(name, hobby):\n    return f"我是{name}，喜欢{hobby}"',
    )
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset?.testid ?? '')
    expect(focused).toBe('python-multi-run')
    await page.screenshot({ path: testInfo.outputPath(`multi-keyboard-focus-${vp.name}.png`) })
    await page.keyboard.press('Space')
    await expect(page.getByTestId('python-multi-passed')).toBeVisible({ timeout: 90_000 })
    await expect(page.getByTestId('python-multi-count')).toHaveText('3/3')
  })
}

test('trial lab keyboard run on desktop', async ({ page }) => {
  test.setTimeout(180_000)
  await useLocalPyodideMirror(page)
  await page.goto('/learn/python-lab/P0-U1-L01')
  await expect(page.getByTestId('python-run')).toBeEnabled({ timeout: 15_000 })
  await page.getByTestId('python-source').click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('Backspace')
  await page.keyboard.type('print("你好，编程世界")')
  await expect(page.getByTestId('python-source')).toHaveValue('print("你好，编程世界")')
  await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset?.testid ?? '')
  expect(focused).toBe('python-run')
  await page.keyboard.press('Space')
  await expect(page.getByTestId('python-passed')).toBeVisible({ timeout: 90_000 })
  await expect(page.getByTestId('python-output')).toHaveText('你好，编程世界')
})
