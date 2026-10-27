import { expect, test } from '@playwright/test'

// UX-411: Python 实验室三域布局（任务/编辑/输出）在三断点下可读、无横向溢出。
// 本 spec 只验证布局可见性与溢出，不点击运行（本地浏览器沙箱无法到达 Pyodide CDN，
// 执行能力由既有 python-lab / python-multi spec 在 CI 的真实浏览器里覆盖）。
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
] as const

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth }
  })
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
}

for (const vp of VIEWPORTS) {
  test(`trial lab three domains readable at ${vp.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/learn/python-lab/P0-U1-L01')
    await expect(page.getByRole('heading', { name: '第1课 · 让计算机说你好' })).toBeVisible()
    await expect(page.getByText('1 · 编写代码')).toBeVisible()
    await expect(page.getByText('2 · 查看运行结果')).toBeVisible()
    await expect(page.getByText('3 · 练习 B：改成自己的问候语')).toBeVisible()
    await expect(page.getByTestId('python-source')).toBeVisible()
    await expect(page.getByTestId('python-output')).toBeVisible()
    await expect(page.getByTestId('python-feedback')).toBeVisible()
    const editorBox = await page.getByTestId('python-source').boundingBox()
    expect(editorBox).not.toBeNull()
    expect(editorBox!.width).toBeGreaterThanOrEqual(280)
    await assertNoHorizontalOverflow(page)
    await page.screenshot({ path: testInfo.outputPath(`trial-${vp.name}.png`), fullPage: true })
  })

  test(`multi lab three domains readable at ${vp.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/learn/python-lab/P0-U1-L02')
    await expect(page.getByText('1 · 编写函数')).toBeVisible()
    await expect(page.getByText('2 · 真实 Python 测试反馈')).toBeVisible()
    await expect(page.getByText('3 · 练习 B：自选输入实验')).toBeVisible()
    await expect(page.getByTestId('python-multi-source')).toBeVisible()
    await expect(page.getByTestId('python-multi-feedback')).toBeVisible()
    await expect(page.getByTestId('python-multi-count')).toBeVisible()
    await expect(page.getByTestId('python-case-0')).toBeVisible()
    const editorBox = await page.getByTestId('python-multi-source').boundingBox()
    expect(editorBox).not.toBeNull()
    expect(editorBox!.width).toBeGreaterThanOrEqual(280)
    await assertNoHorizontalOverflow(page)
    await page.screenshot({ path: testInfo.outputPath(`multi-${vp.name}.png`), fullPage: true })
  })
}
