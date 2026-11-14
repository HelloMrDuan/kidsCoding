import { expect, test } from '@playwright/test'

import { routeLocalScratchVm } from './scratch-g2-helpers'

// G3-U1-L01 pen trial (PR #260 web-classroom access). Same local-CDN
// workaround as the other Scratch specs: this sandbox's browser tunnel
// cannot reach jsDelivr, so when SCRATCH_VM_LOCAL_CDN=1 the pinned
// production scripts are served from local files via route interception.
// CI never sets this variable and always exercises the real CDN path.
test.beforeEach(async ({ page }) => {
  await routeLocalScratchVm(page)
})

test('G3-U1-L01 pen trial runs the real VM project and draws six stars', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/learn/scratch-lab/G3-U1-L01')
  await expect(page.getByTestId('pen-stage')).toBeVisible()
  await expect(page.getByTestId('pen-status')).toContainText('已加载本课主项目', { timeout: 60_000 })
  await expect(page.getByTestId('pen-run')).toBeEnabled()
  await page.getByTestId('pen-run').click()
  // The VM's own pen output: 6 stars, 30 line segments, end x=160.
  await expect(page.getByTestId('pen-summary')).toContainText('画线 30 段', { timeout: 30_000 })
  await expect(page.getByTestId('pen-line')).toHaveCount(30)
  await expect(page.getByTestId('pen-summary')).toContainText('终点 x=160')

  // Recovery: resetting restores the initial project with no stale lines,
  // and a second run draws the same 30 segments again.
  await page.getByTestId('pen-reset').click()
  await expect(page.getByTestId('pen-status')).toContainText('已加载本课主项目', { timeout: 60_000 })
  await expect(page.getByTestId('pen-line')).toHaveCount(0)
  await page.getByTestId('pen-run').click()
  await expect(page.getByTestId('pen-summary')).toContainText('画线 30 段', { timeout: 30_000 })
  await expect(page.getByTestId('pen-line')).toHaveCount(30)
})

test('G3-U1-L01 is reachable from its catalog page as an experimental trial', async ({ page }) => {
  await page.goto('/learn/catalog/G3-U1-L01')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  const entry = page.getByTestId('scratch-trial-entry')
  await expect(entry).toHaveAttribute('href', '/learn/scratch-lab/G3-U1-L01')
  await entry.click()
  await expect(page.getByTestId('pen-stage')).toBeVisible()
})

test('Pen trial never claims a published grade', async ({ page }) => {
  await page.goto('/learn/scratch-lab/G3-U1-L01')
  await expect(page.getByText('不保存正式成绩').first()).toBeVisible()
  await expect(page.getByTestId('pen-status')).toContainText('已加载本课主项目', { timeout: 60_000 })
  await expect(page.getByTestId('pen-run')).toBeEnabled()
  await expect(page.getByRole('heading', { name: '用自制积木画图' })).toBeVisible()
})
