import { expect, test, type Page } from '@playwright/test'

// 本地 Pyodide 镜像（仅 PYODIDE_LOCAL_MIRROR=1 时生效）：把沙箱从 jsDelivr 拉的 5 个
// 核心文件在本地 fulfill，URL 不变故 CSP/CORS 不受影响；CI 不设该变量，走真实 CDN。
// 注意 pyodide.asm.js 不可少：pyodide.js 加载器会再 importScripts 它，缺失即引擎失败。
const PYODIDE_MIRROR = '/home/hatch/workspace/pyodide-local'
async function useLocalPyodideMirror(page: Page) {
  if (!process.env.PYODIDE_LOCAL_MIRROR) return
  for (const file of ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']) {
    await page.route(`https://cdn.jsdelivr.net/pyodide/v0.27.7/full/${file}`, (route) =>
      route.fulfill({ path: `${PYODIDE_MIRROR}/${file}` }),
    )
  }
}

// UX-412：Python 错误调试分层提示与源码保存。
// - 真实 TypeError（试用版直出、多题版逐案）与失败案例三层提示：必须用真实 Pyodide，
//   本地浏览器沙箱到不了 jsDelivr，走引擎失败路径，故这两条以 CI 真实浏览器为准，
//   与既有 python-lab / python-multi 执行 spec 同款约束。
// - 断线：拦截 jsDelivr 确定性模拟网络中断，本地与 CI 均可跑通：引擎三层提示、
//   运行按钮恢复可重试、失败后草稿重载仍在。
test('trial lab real TypeError shows three ordered hint layers', async ({ page }) => {
  test.setTimeout(180_000)
  await useLocalPyodideMirror(page)
  await page.goto('/learn/python-lab/P0-U1-L01')
  await expect(page.getByTestId('python-run')).toBeEnabled({ timeout: 15_000 })
  await page.getByTestId('python-source').fill('print("你好" + 1)')
  await page.getByTestId('python-run').click()
  const hints = page.getByTestId('python-error-hints')
  await expect(hints).toBeVisible({ timeout: 90_000 })
  await expect(hints).toContainText('TypeError')
  await expect(hints).toContainText('现象：')
  await expect(hints).toContainText('可能原因：')
  await expect(hints).toContainText('动手修复：')
  await expect(page.getByTestId('python-passed')).toHaveCount(0)
})

test('multi lab per-case TypeError shows three ordered hint layers', async ({ page }) => {
  test.setTimeout(180_000)
  await useLocalPyodideMirror(page)
  await page.goto('/learn/python-lab/P0-U1-L02')
  await expect(page.getByTestId('python-multi-run')).toBeEnabled({ timeout: 15_000 })
  await page.getByTestId('python-multi-source').fill('def introduce(name, hobby):\n    return name + 1')
  await page.getByTestId('python-multi-run').click()
  const hints = page.getByTestId('python-error-hints')
  await expect(hints).toBeVisible({ timeout: 90_000 })
  await expect(hints).toContainText('TypeError')
  await expect(hints).toContainText('现象：')
  await expect(hints).toContainText('可能原因：')
  await expect(hints).toContainText('动手修复：')
  await expect(page.getByTestId('python-multi-count')).toHaveText('0/3')
})

test('trial lab wrong output shows wrong-output three layers', async ({ page }) => {
  test.setTimeout(180_000)
  await useLocalPyodideMirror(page)
  await page.goto('/learn/python-lab/P0-U1-L01')
  await expect(page.getByTestId('python-run')).toBeEnabled({ timeout: 15_000 })
  await page.getByTestId('python-run').click()
  const hints = page.getByTestId('python-error-hints')
  await expect(hints).toBeVisible({ timeout: 90_000 })
  await expect(hints).toContainText('结果和目标不一样')
  await expect(hints).toContainText('动手修复：')
  await expect(page.getByTestId('python-passed')).toHaveCount(0)
})

test('disconnect shows engine hints, retry re-enables, draft survives reload', async ({ page }) => {
  test.setTimeout(120_000)
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort())
  await page.goto('/learn/python-lab/P0-U1-L01')
  await expect(page.getByTestId('python-run')).toBeEnabled({ timeout: 15_000 })
  await page.getByTestId('python-source').fill('print("断线测试")')
  await page.getByTestId('python-run').click()
  const hints = page.getByTestId('python-error-hints')
  await expect(hints).toBeVisible({ timeout: 90_000 })
  await expect(hints).toContainText('Python 引擎没能加载或执行')
  await expect(hints).toContainText('动手修复：')
  await expect(hints).toContainText('jsDelivr')
  await expect(page.getByTestId('python-feedback')).toContainText('程序报错了')
  await expect(page.getByTestId('python-run')).toBeEnabled()
  await expect(page.getByTestId('python-local-save')).toContainText('已在本机保存')
  await page.reload()
  await expect(page.getByTestId('python-source')).toHaveValue('print("断线测试")')
})
