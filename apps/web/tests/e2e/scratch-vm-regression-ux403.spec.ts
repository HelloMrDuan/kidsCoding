// UX-403: real-VM regression evidence — repeated green flags, clone
// clearing, recovery after a refused bad .sb3, and proof the lab loads
// with the old CDN host unreachable (OPS-024: the VM runtime is
// self-hosted from the app's own origin).
import { expect, test, type Page } from '@playwright/test'

async function waitForLoaded(page: Page) {
  await expect(page.getByTestId('scratch-vm-status')).toContainText('已加载项目', {
    timeout: 60_000,
  })
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
}

function characterStats(page: Page, name: string) {
  return page.locator('[data-testid="scratch-character-stats"]', { hasText: name })
}

async function runGreenFlagAndExpectCounts(page: Page) {
  await page.getByTestId('scratch-green-flag').click()
  await expect(page.getByTestId('scratch-created-total')).toHaveText('16', { timeout: 30_000 })
  await expect(characterStats(page, '流星')).toContainText('已创建 10')
  await expect(characterStats(page, '星星')).toContainText('已创建 6')
  await page.getByTestId('scratch-stop').click()
  await expect(page.getByTestId('scratch-live-clones')).toHaveText('0')
}

test('green flag repeats three times with fresh counts and full clone clearing', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await waitForLoaded(page)
  await runGreenFlagAndExpectCounts(page)
  await runGreenFlagAndExpectCounts(page)
  await runGreenFlagAndExpectCounts(page)
})

test('after a refused bad .sb3 the good project still runs', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await waitForLoaded(page)
  await page.getByTestId('scratch-import-sb3').setInputFiles('tests/e2e/fixtures/scratch-illegal-opcode.sb3')
  await expect(page.getByTestId('scratch-vm-status')).toContainText('导入 Scratch 项目失败', { timeout: 50_000 })
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
  await runGreenFlagAndExpectCounts(page)
})

test('Scratch VM loads with the old CDN host unreachable (self-hosted)', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile',
    'network independence is not viewport-level; desktop suffices',
  )
  test.setTimeout(120_000)
  // OPS-024: block the old CDN host outright. The VM must load from the
  // app's own origin, and no request to jsDelivr may happen at all.
  const cdnRequests: string[] = []
  await page.route('https://cdn.jsdelivr.net/**', (route) => {
    cdnRequests.push(route.request().url())
    return route.abort()
  })
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-vm-status')).toContainText('已加载项目', {
    timeout: 60_000,
  })
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
  await runGreenFlagAndExpectCounts(page)
  expect(cdnRequests).toEqual([])
})
