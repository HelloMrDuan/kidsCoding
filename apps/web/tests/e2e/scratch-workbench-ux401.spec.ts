// UX-401: Scratch VM workbench layout — stage, observation, editor and trial
// labels verified on desktop and mobile, plus three-viewport screenshots.
//
// OPS-024: the Scratch VM runtime (scratch-vm@5.0.300) is self-hosted from
// the app's own origin (npm package + build-time copy), so no CDN is
// involved and no local workaround is needed. The 7.4 MB bundle is a build
// artefact, never checked in (SYS-105).
import { expect, test, type Page } from '@playwright/test'

async function waitForVmLoaded(page: Page) {
  await expect(page.getByTestId('scratch-vm-status')).toContainText('已加载项目', {
    timeout: 60_000,
  })
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled()
}

test('workbench domains and trial labels are visible, without horizontal overflow', async ({
  page,
}) => {
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await waitForVmLoaded(page)
  await expect(page.getByRole('heading', { name: '流星分身雨' })).toBeVisible()
  await expect(page.getByText('不保存正式成绩').first()).toBeVisible()
  await expect(page.getByTestId('scratch-limitations')).toContainText('只能改三个数字')
  await expect(page.getByTestId('scratch-live-stage')).toBeVisible()
  await expect(page.getByTestId('scratch-blockly-mount').locator('.blocklySvg')).toBeVisible()
  await expect(page.getByTestId('scratch-vm-status')).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
})

test('mobile green flag, clones, movement, deletion and stop are all observable by tap', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'mobile',
    'desktop green-flag flow is already covered by scratch-vm.spec.ts',
  )
  test.setTimeout(180_000)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await waitForVmLoaded(page)
  await page.getByTestId('scratch-green-flag').tap()
  await expect(page.getByTestId('scratch-clone-observed')).toHaveText('是', {
    timeout: 30_000,
  })
  await expect(page.getByTestId('scratch-movement-observed')).toHaveText('是', {
    timeout: 30_000,
  })
  await expect(page.getByTestId('scratch-deletion-observed')).toHaveText('是', {
    timeout: 30_000,
  })
  await page.getByTestId('scratch-stop').tap()
  await expect(page.getByTestId('scratch-live-clones')).toHaveText('0', { timeout: 8_000 })
  await expect(page.getByTestId('scratch-vm-status')).toContainText('停止', { timeout: 8_000 })
})

test('three viewports: workbench layout holds at 1440, 768 and 375 with screenshots', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile',
    'viewport sizes are driven explicitly; desktop project suffices',
  )
  test.setTimeout(120_000)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await waitForVmLoaded(page)
  for (const [width, height] of [
    [1440, 900],
    [768, 1024],
    [375, 812],
  ] as const) {
    await page.setViewportSize({ width, height })
    await expect(page.getByTestId('scratch-live-stage')).toBeVisible()
    await expect(page.getByTestId('scratch-blockly-mount').locator('.blocklySvg')).toBeVisible()
    await expect(page.getByTestId('scratch-limitations')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
    await page.screenshot({ path: testInfo.outputPath(`scratch-workbench-${width}.png`) })
  }
})
