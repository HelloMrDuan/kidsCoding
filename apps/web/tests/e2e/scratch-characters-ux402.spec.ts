// UX-402: multi-character Scratch workbench — character area, per-character
// programs, separate runs, save/reload, negative cases, single-character
// compatibility. Uses the real Scratch VM in a real browser.
//
// Local-only CDN workaround (same as the UX-401 spec): this sandbox's
// browser tunnel cannot reach jsDelivr, so when SCRATCH_VM_LOCAL_CDN=1 the
// pinned production script (scratch-vm@5.0.300, downloaded verbatim) is
// served from a local file via route interception. CI never sets this
// variable and always exercises the real CDN path.
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

function characterCard(page: Page, name: string) {
  return page.locator('[data-testid="scratch-character-card"]', { hasText: name })
}

function characterStats(page: Page, name: string) {
  return page.locator('[data-testid="scratch-character-stats"]', { hasText: name })
}

async function selectCharacter(page: Page, name: string) {
  await characterCard(page, name).getByTestId('scratch-select-character').click()
  await expect(page.getByRole('heading', { name: `自己改一改${name}程序` })).toBeVisible()
}

async function applyProgram(page: Page, spawn: string, fall: string) {
  await page.getByTestId('scratch-edit-spawn-count').fill(spawn)
  await page.getByTestId('scratch-edit-fall-step').fill(fall)
  await page.getByTestId('scratch-apply-blocks').click()
}

test('two characters load with independent programs and a character area', async ({ page }) => {
  await maybeInterceptLocalCdn(page)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await waitForLoaded(page)
  await expect(page.getByTestId('scratch-character-list')).toBeVisible()
  await expect(characterCard(page, '流星')).toBeVisible()
  await expect(characterCard(page, '星星')).toBeVisible()
  await expect(characterCard(page, '流星')).toContainText('当前角色')
  await expect(characterCard(page, '流星')).toContainText('10颗 / 每步13 / 每0.3秒')
  await expect(characterCard(page, '星星')).toContainText('6颗 / 每步12 / 每0.5秒')
  await expect(characterCard(page, '星星')).toContainText('造型：星星')
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('10颗 / 每步13 / 每0.3秒')
})

test('switching characters swaps the editor to that character program', async ({ page }) => {
  await maybeInterceptLocalCdn(page)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await waitForLoaded(page)
  await selectCharacter(page, '星星')
  await expect(page.getByTestId('scratch-edit-spawn-count')).toHaveValue('6')
  await expect(page.getByTestId('scratch-edit-fall-step')).toHaveValue('12')
  await expect(page.getByTestId('scratch-edit-spawn-interval')).toHaveValue('0.5')
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('6颗 / 每步12 / 每0.5秒')
  await expect(characterCard(page, '星星')).toContainText('当前角色')
  await selectCharacter(page, '流星')
  await expect(page.getByTestId('scratch-edit-spawn-count')).toHaveValue('10')
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('10颗 / 每步13 / 每0.3秒')
})

test('editing one character never overwrites the other', async ({ page }) => {
  test.setTimeout(180_000)
  await maybeInterceptLocalCdn(page)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await waitForLoaded(page)
  await applyProgram(page, '4', '18')
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('4颗 / 每步18 / 每0.3秒')
  await selectCharacter(page, '星星')
  await expect(page.getByTestId('scratch-edit-spawn-count')).toHaveValue('6')
  await expect(page.getByTestId('scratch-edit-fall-step')).toHaveValue('12')
  await applyProgram(page, '9', '20')
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('9颗 / 每步20 / 每0.5秒')
  await selectCharacter(page, '流星')
  await expect(page.getByTestId('scratch-edit-spawn-count')).toHaveValue('4')
  await expect(page.getByTestId('scratch-edit-fall-step')).toHaveValue('18')
  await expect(characterCard(page, '流星')).toContainText('4颗 / 每步18 / 每0.3秒')
  await expect(characterCard(page, '星星')).toContainText('9颗 / 每步20 / 每0.5秒')
})

test('each character runs separately on the real VM', async ({ page }) => {
  test.setTimeout(180_000)
  await maybeInterceptLocalCdn(page)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await waitForLoaded(page)
  await characterCard(page, '星星').getByTestId('scratch-run-character').click()
  await expect(page.getByTestId('scratch-vm-status')).toContainText('正在单独执行星星')
  const firstClone = page.getByTestId('scratch-live-clone').first()
  await expect(firstClone).toBeVisible({ timeout: 10_000 })
  const icons = await page.getByTestId('scratch-live-clone').allTextContents()
  expect(icons.length).toBeGreaterThan(0)
  expect(icons.every((t) => t.includes('⭐'))).toBe(true)
  await expect(characterStats(page, '星星')).toContainText('已创建 6', { timeout: 18_000 })
  await expect(characterStats(page, '流星')).toContainText('已创建 0')
  await page.getByTestId('scratch-stop').click()
  await expect(page.getByTestId('scratch-live-clones')).toHaveText('0')
  await characterCard(page, '流星').getByTestId('scratch-run-character').click()
  await expect(characterStats(page, '流星')).toContainText('已创建 10', { timeout: 18_000 })
  await expect(characterStats(page, '星星')).toContainText('已创建 0')
  await page.getByTestId('scratch-stop').click()
  await expect(page.getByTestId('scratch-live-clones')).toHaveText('0')
})

test('save, reload and reimport restore both characters', async ({ page }) => {
  test.setTimeout(180_000)
  await maybeInterceptLocalCdn(page)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await waitForLoaded(page)
  await applyProgram(page, '4', '18')
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('4颗 / 每步18 / 每0.3秒')
  await selectCharacter(page, '星星')
  await applyProgram(page, '9', '20')
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('9颗 / 每步20 / 每0.5秒')
  await expect(page.getByTestId('scratch-local-save-status')).toContainText('已在本机自动保存', { timeout: 45_000 })
  await page.reload()
  await expect(page.getByTestId('scratch-vm-status')).toContainText('已从本机草稿恢复', { timeout: 60_000 })
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('4颗 / 每步18 / 每0.3秒')
  await selectCharacter(page, '星星')
  await expect(page.getByTestId('scratch-edit-spawn-count')).toHaveValue('9')
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('9颗 / 每步20 / 每0.5秒')
  const downloading = page.waitForEvent('download', { timeout: 60_000 })
  await page.getByTestId('scratch-export-sb3').click()
  const downloaded = await downloading
  const savedPath = await downloaded.path()
  expect(savedPath).not.toBeNull()
  const saved = readFileSync(savedPath!)
  await selectCharacter(page, '流星')
  await applyProgram(page, '2', '25')
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('2颗 / 每步25 / 每0.3秒')
  await page.getByTestId('scratch-import-sb3').setInputFiles({
    name: 'restored.sb3',
    mimeType: 'application/octet-stream',
    buffer: saved,
  })
  await expect(page.getByTestId('scratch-vm-status')).toContainText('已重新导入作品', { timeout: 50_000 })
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('4颗 / 每步18 / 每0.3秒')
  await selectCharacter(page, '星星')
  await expect(page.getByTestId('scratch-edit-spawn-count')).toHaveValue('9')
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('9颗 / 每步20 / 每0.5秒')
})

test('illegal projects are refused with specific reasons and the good project survives', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await maybeInterceptLocalCdn(page)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await waitForLoaded(page)
  const cases: Array<[string, string]> = [
    ['tests/e2e/fixtures/scratch-unknown-character.sb3', '角色不在允许名单'],
    ['tests/e2e/fixtures/scratch-illegal-opcode.sb3', '不允许的积木类型'],
    ['tests/e2e/fixtures/scratch-out-of-range.sb3', '数字积木超过允许范围'],
    ['tests/e2e/fixtures/scratch-bad-zip-path.sb3', 'ZIP 条目路径非法'],
  ]
  for (const [fixture, reason] of cases) {
    await page.getByTestId('scratch-import-sb3').setInputFiles(fixture)
    await expect(page.getByTestId('scratch-vm-status')).toContainText('导入 Scratch 项目失败', { timeout: 50_000 })
    await expect(page.getByTestId('scratch-vm-status')).toContainText(reason)
    await expect(page.getByTestId('scratch-applied-program')).toHaveText('10颗 / 每步13 / 每0.3秒')
    await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
  }
})

test('single-character old project still loads and runs', async ({ page }) => {
  test.setTimeout(180_000)
  await maybeInterceptLocalCdn(page)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await waitForLoaded(page)
  await page.getByTestId('scratch-import-sb3').setInputFiles('tests/e2e/fixtures/scratch-single-character.sb3')
  await expect(page.getByTestId('scratch-vm-status')).toContainText('已重新导入作品', { timeout: 50_000 })
  await expect(page.getByTestId('scratch-character-card')).toHaveCount(1)
  await expect(characterCard(page, '流星')).toBeVisible()
  await page.getByTestId('scratch-green-flag').click()
  await expect(page.getByTestId('scratch-created-total')).toHaveText('10', { timeout: 18_000 })
  await page.getByTestId('scratch-stop').click()
  await expect(page.getByTestId('scratch-live-clones')).toHaveText('0')
})

test('three viewports: character area and editor hold at 1440, 768 and 375', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile',
    'viewport sizes are driven explicitly; desktop project suffices',
  )
  test.setTimeout(120_000)
  await maybeInterceptLocalCdn(page)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await waitForLoaded(page)
  for (const [width, height] of [
    [1440, 900],
    [768, 1024],
    [375, 812],
  ] as const) {
    await page.setViewportSize({ width, height })
    await expect(page.getByTestId('scratch-character-list')).toBeVisible()
    await expect(characterCard(page, '流星')).toBeVisible()
    await expect(characterCard(page, '星星')).toBeVisible()
    await expect(page.getByTestId('scratch-blockly-mount').locator('.blocklySvg')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
    await page.screenshot({ path: testInfo.outputPath(`scratch-characters-${width}.png`) })
  }
})
