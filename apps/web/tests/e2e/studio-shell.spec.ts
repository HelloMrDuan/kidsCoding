/**
 * StudioShell E2E — real Chrome, production build.
 *
 * OPS-039: the fullscreen classroom shell. Five sizes: 1920×1080,
 * 1440×900, 1366×768, 768×1024, 375×812. Every case asserts the
 * shell-level invariants (no AppShell, no outer horizontal scroll, no
 * document-level scroll, complete layout, drawer default closed) and the
 * drawer-toggle non-remount proof: a window-global probe holds the live
 * editor node (Blockly SVG / Scratch iframe) across drawer toggles and
 * the probe proves it is the SAME node afterwards — not just that an
 * editor is visible again.
 *
 * No fixed-duration sleep is used as a sync mechanism: every wait is a
 * conditional expectation (visible testid, storage state, evaluate).
 * Run via a TEMP Playwright config inside apps/web (own port); the temp
 * config is deleted after the run and playwright.config.ts is never
 * modified.
 */
import { expect, test, type Page } from '@playwright/test'

const DEMO_A = '/studio/demo/demo-a'
const DEMO_SCRATCH = '/studio/demo/demo-scratch'
const DEMO_SLOT = '/studio/demo/demo-slot'
const STUDIO_HOME = '/studio'

const SIZES = [
  { name: '1920', width: 1920, height: 1080 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1366', width: 1366, height: 768 },
  { name: '768', width: 768, height: 1024 },
  { name: '375', width: 375, height: 812 },
] as const

async function assertShellInvariants(page: Page) {
  // No AppShell anywhere on the page (no 222px sidebar, no site topbar,
  // no mobile bottom nav): the AppShell root class must not exist.
  await expect(page.locator('.kc-app')).toHaveCount(0)
  // StudioShell is the only topbar: the workspace's own topbar is gone.
  await expect(page.getByTestId('studio-topbar')).toBeVisible()
  await expect(page.getByTestId('ws-topbar')).toHaveCount(0)
  // The workspace reported its save state upward: the chip exists.
  await expect(page.getByTestId('studio-save-chip')).toBeVisible()
  // No outer horizontal scroll and no document-level scroll: the shell
  // is fixed 100dvh and the main area is the only scroll region.
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    docScrollHeight: document.scrollingElement?.scrollHeight ?? 0,
    innerHeight: window.innerHeight,
  }))
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth)
  expect(overflow.docScrollHeight).toBeLessThanOrEqual(overflow.innerHeight)
  // Rebuild (chief ruling 2026-11-15): the main area NEVER scrolls and
  // the editor fills it exactly — the main area is not a second scroll
  // region; inner regions (Blockly canvas, script wrap) scroll on their
  // own. The workspace root must end exactly at the main area's bottom.
  const fill = await page.evaluate(() => {
    const main = document.querySelector('[data-testid="studio-main"]') as HTMLElement
    const root = document.querySelector('[data-testid="ws-root"]') as HTMLElement | null
    const mainBox = main.getBoundingClientRect()
    const rootBox = root?.getBoundingClientRect()
    return {
      mainScrollHeight: main.scrollHeight,
      mainClientHeight: main.clientHeight,
      mainBottom: mainBox.bottom,
      mainHeight: mainBox.height,
      rootBottom: rootBox?.bottom ?? null,
      rootHeight: rootBox?.height ?? null,
    }
  })
  expect(fill.mainScrollHeight).toBeLessThanOrEqual(fill.mainClientHeight)
  if (fill.rootBottom !== null) {
    expect(Math.abs(fill.rootBottom - fill.mainBottom)).toBeLessThanOrEqual(2)
    expect(Math.abs((fill.rootHeight ?? 0) - fill.mainHeight)).toBeLessThanOrEqual(2)
  }
  // The drawer is closed by default.
  await expect(page.getByTestId('studio-guide-drawer')).toHaveCount(0)
}

async function assertTopbarFits(page: Page, width: number) {
  // Slim topbar (chief ruling 2026-11-15): ONE 52px row on every
  // viewport, total height inside 48–56px — no two-row fallback.
  const topbarBox = await page.getByTestId('studio-topbar').boundingBox()
  expect(topbarBox, 'topbar has a bounding box').not.toBeNull()
  expect(topbarBox!.height, 'slim topbar height in 48–56px').toBeGreaterThanOrEqual(48)
  expect(topbarBox!.height, 'slim topbar height in 48–56px').toBeLessThanOrEqual(56)
  // Every topbar control must be inside the viewport: overflow:hidden on
  // the shell would otherwise clip off-screen buttons while scrollWidth
  // still reads clean, and a collapsed title would still count as
  // "visible". This is the assertion that caught the 375px topbar
  // clipping (title width 0, file/stage/help/guide off-screen).
  for (const id of [
    'studio-back',
    'studio-title',
    'studio-progress',
    'studio-save-chip',
    'studio-file-menu-button',
    'studio-stage-toggle',
    'studio-help-button',
    'studio-guide-button',
  ]) {
    const box = await page.getByTestId(id).boundingBox()
    expect(box, `${id} has a bounding box`).not.toBeNull()
    expect(box!.x, `${id} left edge inside viewport`).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width, `${id} right edge inside viewport`).toBeLessThanOrEqual(width + 0.5)
  }
  const titleBox = await page.getByTestId('studio-title').boundingBox()
  expect(titleBox!.width, 'lesson title keeps a readable width').toBeGreaterThan(40)
}

for (const size of SIZES) {
  test(`studio ${size.name}: no AppShell, no outer scroll, complete layout, drawer default closed`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: size.width, height: size.height })
    await page.goto(DEMO_A)
    await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
    await assertShellInvariants(page)
    await assertTopbarFits(page, size.width)
    // Complete layout: title + progress + save chip in the topbar, stage
    // and script panels in the editing surface.
    await expect(page.getByTestId('studio-title')).toContainText('演示：接住掉落水果')
    await expect(page.getByTestId('studio-back')).toBeVisible()
    await expect(page.getByTestId('studio-progress')).toBeVisible()
    await expect(page.getByTestId('ws-stage-panel')).toBeVisible()
    await expect(page.getByTestId('ws-script-panel')).toBeVisible()
    // No run button in the topbar — run lives only inside the editor area.
    // (The step text mentions 运行, so scope to buttons, not raw text.)
    await expect(page.getByTestId('studio-topbar').getByRole('button', { name: /运行/ })).toHaveCount(0)
    // Flex-fill: the Blockly mount is a real, usable canvas that ends
    // inside the viewport — never truncated by a scrolling main area.
    const mountBox = await page.getByTestId('ws-blockly-mount').boundingBox()
    expect(mountBox, 'Blockly mount has a bounding box').not.toBeNull()
    expect(mountBox!.height, 'Blockly mount keeps a usable height').toBeGreaterThan(300)
    expect(mountBox!.y + mountBox!.height, 'Blockly mount ends inside the viewport').toBeLessThanOrEqual(size.height)
    await page.screenshot({ path: `test-results/studio-shell-${size.name}.png` })
  })
}

test('drawer toggle does not remount the Blockly editor (same SVG node)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  const svg = page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')
  await expect(svg).toBeVisible()
  // Hold the live node in a window global, with an expando mark.
  await page.evaluate(() => {
    const node = document.querySelector('[data-testid="ws-blockly-mount"] svg.blocklySvg') as HTMLElement & {
      __studioProbe?: string
    }
    ;(window as unknown as { __probeNode?: Element }).__probeNode = node
    node.__studioProbe = 'alive'
  })
  const mountBoxBefore = await page.getByTestId('ws-blockly-mount').boundingBox()
  expect(mountBoxBefore).not.toBeNull()
  await page.getByTestId('studio-guide-button').click()
  await expect(page.getByTestId('studio-guide-drawer')).toBeVisible()
  // The drawer is a floating overlay: it must not squeeze the editor.
  const mountBoxOpen = await page.getByTestId('ws-blockly-mount').boundingBox()
  expect(mountBoxOpen!.width).toBe(mountBoxBefore!.width)
  await page.getByTestId('studio-guide-close').click()
  await expect(page.getByTestId('studio-guide-drawer')).toHaveCount(0)
  await page.getByTestId('studio-guide-button').click()
  await expect(page.getByTestId('studio-guide-drawer')).toBeVisible()
  await page.getByTestId('studio-guide-button').click()
  await expect(page.getByTestId('studio-guide-drawer')).toHaveCount(0)
  // Same node, mark intact: the editor was never remounted.
  const probe = await page.evaluate(() => {
    const held = (window as unknown as { __probeNode?: Element }).__probeNode
    const live = document.querySelector('[data-testid="ws-blockly-mount"] svg.blocklySvg')
    return {
      sameNode: held === live,
      markIntact:
        (held as unknown as HTMLElement & { __studioProbe?: string }).__studioProbe === 'alive',
    }
  })
  expect(probe.sameNode).toBe(true)
  expect(probe.markIntact).toBe(true)
})

test('drawer toggle does not rebuild the Scratch iframe', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_SCRATCH)
  const frame = page.locator('[data-testid="ws-scratch-mount"] iframe')
  await expect(frame).toBeAttached({ timeout: 30000 })
  await page.evaluate(() => {
    const node = document.querySelector('[data-testid="ws-scratch-mount"] iframe') as HTMLElement & {
      __studioProbe?: string
    }
    ;(window as unknown as { __probeNode?: Element }).__probeNode = node
    node.__studioProbe = 'alive'
  })
  await page.getByTestId('studio-guide-button').click()
  await expect(page.getByTestId('studio-guide-drawer')).toBeVisible()
  await page.getByTestId('studio-guide-close').click()
  await expect(page.getByTestId('studio-guide-drawer')).toHaveCount(0)
  const probe = await page.evaluate(() => {
    const held = (window as unknown as { __probeNode?: Element }).__probeNode
    const live = document.querySelector('[data-testid="ws-scratch-mount"] iframe')
    return {
      sameNode: held === live,
      markIntact:
        (held as unknown as HTMLElement & { __studioProbe?: string }).__studioProbe === 'alive',
    }
  })
  expect(probe.sameNode).toBe(true)
  expect(probe.markIntact).toBe(true)
})

test('scratch editor fills the main area on desktop (no main-area scroll)', async ({ page }) => {
  // Chief ruling 2026-11-15: the desktop Scratch editor must not be
  // truncated by StudioShell main-area scrolling. The stage box IS the
  // editor for a Scratch course, so it flex-fills the main area (the old
  // zoom box was 240px on desktop); the main area never scrolls.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_SCRATCH)
  const frame = page.locator('[data-testid="ws-scratch-mount"] iframe')
  await expect(frame).toBeAttached({ timeout: 30000 })
  await assertShellInvariants(page)
  const mountBox = await page.getByTestId('ws-scratch-mount').boundingBox()
  expect(mountBox, 'Scratch mount has a bounding box').not.toBeNull()
  expect(mountBox!.height, 'Scratch editor fills past the old 240px zoom box').toBeGreaterThan(400)
  expect(mountBox!.width, 'Scratch editor takes the full width, not the 280px stage column').toBeGreaterThan(600)
  expect(mountBox!.y + mountBox!.height, 'Scratch mount ends inside the viewport').toBeLessThanOrEqual(900)
  const frameBox = await frame.boundingBox()
  expect(frameBox, 'Scratch iframe has a bounding box').not.toBeNull()
  expect(frameBox!.y + frameBox!.height, 'Scratch iframe ends inside the viewport').toBeLessThanOrEqual(900)
  await page.screenshot({ path: 'test-results/studio-shell-scratch.png' })
})

test('drawer on mobile 375: opens over the editor, closes, editor intact', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(DEMO_A)
  await expect(page.getByTestId('ws-blockly-mount').locator('svg.blocklySvg')).toBeVisible()
  await assertShellInvariants(page)
  await assertTopbarFits(page, 375)
  await page.evaluate(() => {
    const node = document.querySelector('[data-testid="ws-blockly-mount"] svg.blocklySvg') as HTMLElement & {
      __studioProbe?: string
    }
    ;(window as unknown as { __probeNode?: Element }).__probeNode = node
    node.__studioProbe = 'alive'
  })
  await page.getByTestId('studio-guide-button').click()
  await expect(page.getByTestId('studio-guide-drawer')).toBeVisible()
  // The drawer is a real 345px panel starting at the left edge — not a
  // sliver shifted off-screen by an auto-scroll (the earlier 375px
  // screenshot showed only a 75px strip because the off-screen guide
  // button had been scrolled into view before the click).
  const drawerBox = await page.getByTestId('studio-guide-drawer').boundingBox()
  expect(drawerBox).not.toBeNull()
  expect(drawerBox!.x).toBe(0)
  expect(drawerBox!.width).toBeGreaterThan(300)
  await expect(page.getByTestId('studio-goal5').locator('li')).toHaveCount(5)
  await page.screenshot({ path: 'test-results/studio-shell-375-drawer.png' })
  await page.getByTestId('studio-guide-close').click()
  await expect(page.getByTestId('studio-guide-drawer')).toHaveCount(0)
  const probe = await page.evaluate(() => {
    const held = (window as unknown as { __probeNode?: Element }).__probeNode
    const live = document.querySelector('[data-testid="ws-blockly-mount"] svg.blocklySvg')
    return {
      sameNode: held === live,
      markIntact:
        (held as unknown as HTMLElement & { __studioProbe?: string }).__studioProbe === 'alive',
    }
  })
  expect(probe.sameNode).toBe(true)
  expect(probe.markIntact).toBe(true)
})

test('guidance drawer: hints reveal progressively in the browser', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_SLOT)
  await expect(page.getByTestId('studio-save-chip')).toBeVisible()
  await page.getByTestId('studio-guide-button').click()
  await expect(page.getByTestId('studio-guide-drawer')).toBeVisible()
  await expect(page.getByTestId('studio-hint-1')).toHaveCount(0)
  await page.getByTestId('studio-hint-reveal-1').click()
  await expect(page.getByTestId('studio-hint-1')).toBeVisible()
  await expect(page.getByTestId('studio-hint-2')).toHaveCount(0)
  await page.getByTestId('studio-hint-reveal-2').click()
  await expect(page.getByTestId('studio-hint-2')).toBeVisible()
})

test('file menu in the topbar saves for real (chip turns 已保存到本机)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(DEMO_A)
  await expect(page.getByTestId('studio-save-chip')).toContainText('未保存')
  await page.getByTestId('studio-file-menu-button').click()
  await expect(page.getByTestId('studio-file-menu')).toBeVisible()
  // The menu is anchored below its button and inside the viewport.
  const buttonBox = await page.getByTestId('studio-file-menu-button').boundingBox()
  const menuBox = await page.getByTestId('studio-file-menu').boundingBox()
  expect(menuBox).not.toBeNull()
  expect(menuBox!.y).toBeGreaterThanOrEqual(buttonBox!.y + buttonBox!.height)
  expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(1440)
  await page.getByTestId('studio-file-save').click()
  await expect(page.getByTestId('studio-save-chip')).toContainText('已保存到本机')
})

test('save failure is fail-closed: chip reports 未能保存, no fake success', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${DEMO_A}?demoFailSave=1`)
  await expect(page.getByTestId('studio-save-chip')).toBeVisible()
  await page.getByTestId('studio-file-menu-button').click()
  await page.getByTestId('studio-file-save').click()
  await expect(page.getByTestId('studio-save-chip')).toContainText('未能保存')
})

test('studio home lists only connected courses and mounts no editor', async ({ page }) => {
  // OPS-040/042 connected real full-screen courses, so the old "no lessons
  // yet" copy is gone by design. The honest-state contract still holds:
  // only actually connected routes are linked, the page says it is
  // incremental, and no editor/workspace is mounted here.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(STUDIO_HOME)
  await expect(page.getByRole('heading', { name: '全屏课堂' })).toBeVisible()
  await expect(page.getByRole('link', { name: /创作中心（统一入口/ })).toHaveAttribute(
    'href',
    '/create',
  )
  await expect(page.getByRole('link', { name: '我的舞蹈秀（Scratch GUI 全屏创作）' })).toHaveAttribute(
    'href',
    '/studio/scratch/dance-show',
  )
  await expect(page.getByRole('link', { name: '接住掉落水果（Scratch GUI 全屏课堂）' })).toHaveAttribute(
    'href',
    '/studio/scratch/g2-u3-l02',
  )
  await expect(page.getByText('其他课程还在逐课接入中，这里先不列出。')).toBeVisible()
  await expect(page.getByTestId('studio-shell')).toHaveCount(0)
  await expect(page.getByTestId('ws-root')).toHaveCount(0)
})

test('unknown studio demo lesson returns 404, not a fake editor', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const response = await page.goto('/studio/demo/no-such-lesson')
  expect(response?.status()).toBe(404)
  await expect(page.getByTestId('ws-root')).toHaveCount(0)
})
