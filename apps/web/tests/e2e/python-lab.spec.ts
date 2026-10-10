import { expect, test } from '@playwright/test'

test('real Pyodide evaluates the first Python lesson, then corrects a failure', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/learn/catalog/P0-U1-L01')
  await page.getByTestId('python-trial-entry').click()
  await expect(page.getByRole('heading', { name: '第1课 · 让计算机说你好' })).toBeVisible()
  const source = page.getByTestId('python-source')
  const run = page.getByTestId('python-run')
  await expect(run).toBeEnabled()
  await run.click()
  await expect(page.getByTestId('python-feedback')).toContainText('输出还不符合任务目标', {timeout:70_000})
  await expect(page.getByTestId('python-passed')).toHaveCount(0)
  await source.fill('print("你好，编程世界")')
  await run.click()
  await expect(page.getByTestId('python-passed')).toBeVisible({timeout:70_000})
  await expect(page.getByTestId('python-output')).toHaveText('你好，编程世界')
})

test('Python syntax errors cannot pass output assessment', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/learn/python-lab/P0-U1-L01')
  await expect(page.getByTestId('python-run')).toBeEnabled({timeout:15_000})
  await page.getByTestId('python-source').fill('print("缺失括号"')
  await page.getByTestId('python-run').click()
  await expect(page.getByTestId('python-feedback')).toContainText('程序报错了', {timeout:70_000})
  await expect(page.getByTestId('python-passed')).toHaveCount(0)
})
