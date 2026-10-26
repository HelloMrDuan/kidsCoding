// UX-403: real-VM regression evidence — repeated green flags, clone
// clearing, recovery after a refused bad .sb3, and CDN resource
// reachability recorded as observed (not assumed).
//
// The first two tests use the same local-only CDN workaround as the
// UX-401/UX-402 specs (SCRATCH_VM_LOCAL_CDN=1 serves the pinned
// scratch-vm@5.0.300 file). The reachability test deliberately does NOT
// intercept: it observes whether the real CDN loads in this environment
// and passes on either branch, logging which branch was taken. In CI the
// reachable branch runs; in this sandbox the browser tunnel fails and
// the failure-state branch runs. Both are real product behavior.
import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const LOCAL_VM_FILE =
  process.env.SCRATCH_VM_LOCAL_FILE ?? '/tmp/scratch-local/scratch-vm.min.js'

async function maybeInterceptLocalCdn(page: Page) {
  if (process.env.SCRATCH_VM_LOCAL_CDN !== '1') return
  const vmCode = readFileSync(LOCAL_VM_FILE)
  await page.route('https://cdn.jsdelivr.net/**', (route) =>
    route.fulfill({ body: vmCode, contentType: 'application/javascript' }),
  )
}

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
  await maybeInterceptLocalCdn(page)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await waitForLoaded(page)
  await runGreenFlagAndExpectCounts(page)
  await runGreenFlagAndExpectCounts(page)
  await runGreenFlagAndExpectCounts(page)
})

test('after a refused bad .sb3 the good project still runs', async ({ page }) => {
  test.setTimeout(180_000)
  await maybeInterceptLocalCdn(page)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await waitForLoaded(page)
  await page.getByTestId('scratch-import-sb3').setInputFiles('tests/e2e/fixtures/scratch-illegal-opcode.sb3')
  await expect(page.getByTestId('scratch-vm-status')).toContainText('导入 Scratch 项目失败', { timeout: 50_000 })
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
  await runGreenFlagAndExpectCounts(page)
})

test('CDN resource reachability is recorded as observed', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile',
    'reachability is network-level, not viewport-level; desktop suffices',
  )
  test.setTimeout(120_000)
  // No interception here on purpose: this test observes the real network.
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-vm-status')).toContainText(/已加载项目|下载失败/, {
    timeout: 60_000,
  })
  const status = await page.getByTestId('scratch-vm-status').textContent()
  if (status?.includes('已加载项目')) {
    console.log('UX403-REACHABILITY: cdn-reachable, real VM loaded from jsDelivr')
    await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
    await runGreenFlagAndExpectCounts(page)
  } else {
    console.log('UX403-REACHABILITY: cdn-unreachable, product shows download-failure state')
    await expect(page.getByTestId('scratch-retry-load')).toBeVisible()
  }
})
