import { expect, test } from '@playwright/test'

test('loads a real .sb3 using Scratch VM, executes clones and moves them, then stops', async ({ page }) => {
  test.setTimeout(180_000)
  page.on('console',message=>console.log('SCRATCH_CONSOLE',message.type(),message.text().slice(0,800)))
  page.on('pageerror',error=>console.log('SCRATCH_PAGEERROR',error.message.slice(0,1000)))
  page.on('requestfailed',request=>console.log('SCRATCH_REQUEST_FAILED',request.url(),request.failure()?.errorText))
  await page.goto('/learn/catalog/G3-U1-L02')
  await page.getByTestId('scratch-trial-entry').click()
  await expect(page.getByTestId('scratch-vm-status')).toContainText('已加载项目',{timeout:60_000})
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
  await page.getByTestId('scratch-green-flag').click()
  await expect(page.getByTestId('scratch-clone-observed')).toHaveText('是',{timeout:30_000})
  await expect(page.getByTestId('scratch-movement-observed')).toHaveText('是',{timeout:30_000})
  await page.getByTestId('scratch-stop').click()
  await expect(page.getByTestId('scratch-vm-status')).toContainText('停止',{timeout:8_000})
})

test('Scratch engine is only exposed as a controlled trial, no published learner grade', async ({ page }) => {
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByText('不保存正式成绩')).toBeVisible()
  await expect(page.getByTestId('scratch-vm-status')).toContainText('已加载项目',{timeout:60_000})
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
  await expect(page.getByRole('heading',{name:'流星分身雨'})).toBeVisible()
})
