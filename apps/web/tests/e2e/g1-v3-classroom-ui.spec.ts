import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * G1 V3 classroom UI (PR #573 review, issuecomment-7077289847):
 * the seven gates must be real buttons with visible pill boundaries and
 * current/completed/incomplete states, and 运行/保存作品 must be a real V2
 * primary/secondary pair (≥44px touch target). Style, visibility and
 * interaction are asserted at 1440×900, 768×1024 and 375×812 — element
 * presence alone is not evidence.
 *
 * G1's V3 classroom is the route the catalog card opens:
 * /learn/story-lab/G1-U1-L01/golden.
 */
const ROUTE = '/learn/story-lab/G1-U1-L01/golden'
const DRAFT_KEY = 'kids-lesson-owner-v1:guest:kidscoding-draft:G1-U1-L01'

type Box = { x: number; y: number; width: number; height: number; right: number; left: number }

async function box(locator: Locator): Promise<Box> {
  const value = await locator.boundingBox()
  expect(value).not.toBeNull()
  const rect = value as { x: number; y: number; width: number; height: number }
  // Playwright's boundingBox() has no left/right; derive them so edge
  // assertions compare real numbers instead of undefined.
  return { ...rect, left: rect.x, right: rect.x + rect.width }
}

async function style(locator: Locator) {
  return locator.evaluate((el) => {
    const computed = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    return {
      tag: el.tagName,
      background: computed.backgroundColor,
      color: computed.color,
      borderWidth: parseFloat(computed.borderTopWidth),
      radius: parseFloat(computed.borderTopLeftRadius),
      outlineStyle: computed.outlineStyle,
      outlineWidth: parseFloat(computed.outlineWidth),
      height: rect.height,
      width: rect.width,
      left: rect.left,
      right: rect.right,
    }
  })
}

async function openTaskPane(page: Page, width: number) {
  if (width <= 1040) await page.getByTestId('golden-story-pane-task').click()
}

async function openCodePane(page: Page, width: number) {
  if (width <= 1040) await page.getByTestId('golden-story-pane-code').click()
}

/** Seven gate buttons in the step bar, in lesson order. */
function gates(page: Page): Locator {
  return page.getByTestId('v3-stepbar').locator('[data-testid^="g1-u1-l01-goto-"]')
}

for (const { width, height } of [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
]) {
  test(`G1 V3 classroom UI is real and reachable at ${width}×${height}`, async ({ browser }, testInfo) => {
    // Each iteration opens its own context at its own viewport, so the matrix
    // runs once — in the desktop project — instead of being duplicated by the
    // mobile project. Never skip a width: all three breakpoints are evidence.
    test.skip(testInfo.project.name !== 'desktop', `viewport matrix runs once, in the desktop project`)
    test.setTimeout(240_000)
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width <= 768 })
    const page = await context.newPage()
    try {
      await page.goto(ROUTE)
      await expect(page.locator('svg.blocklySvg')).toBeVisible({ timeout: 30_000 })

      // ---------- seven gates: real buttons, visible pill boundary ----------
      const stepbar = page.getByTestId('v3-stepbar')
      const pills = gates(page)
      await expect(pills).toHaveCount(7)
      const bar = await box(stepbar)
      const minTapHeight = width <= 670 ? 40 : 36
      for (let index = 0; index < 7; index += 1) {
        const pill = pills.nth(index)
        const s = await style(pill)
        expect(s.tag, `gate ${index + 1} is a real button`).toBe('BUTTON')
        expect(s.borderWidth, `gate ${index + 1} has a visible border`).toBeGreaterThanOrEqual(1)
        expect(s.background, `gate ${index + 1} has a visible pill background`).not.toBe('rgba(0, 0, 0, 0)')
        expect(s.radius, `gate ${index + 1} is a pill, not bare text`).toBeGreaterThanOrEqual(8)
        expect(s.height, `gate ${index + 1} keeps its tap height`).toBeGreaterThanOrEqual(minTapHeight)
      }
      // No gate is clipped by the step bar's overflow guard.
      const last = await box(pills.nth(6))
      expect(last.right, 'the seventh gate is fully inside the step bar').toBeLessThanOrEqual(bar.right + 1)

      // Current / incomplete / completed must be visually distinct.
      await expect(stepbar.locator('button.is-active')).toHaveCount(1)
      const active = await style(stepbar.locator('button.is-active'))
      const idle = await style(pills.nth(1))
      expect(active.background, 'current gate differs from an incomplete gate').not.toBe(idle.background)
      expect(active.color, 'current gate text colour differs').not.toBe(idle.color)

      // Hover is a real state change, not decoration in the CSS only. The
      // background transitions over .15s, so poll instead of reading the
      // first frame (which still equals the idle colour).
      await pills.nth(1).hover()
      await expect.poll(async () => (await style(pills.nth(1))).background,
        { message: 'hover changes the pill background' }).not.toBe(idle.background)
      await page.mouse.move(1, 1)

      // Keyboard: Tab reaches a gate button and its focus ring is visible.
      let reachedGate = false
      for (let tab = 0; tab < 80; tab += 1) {
        await page.keyboard.press('Tab')
        const testId = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '')
        if (testId.startsWith('g1-u1-l01-goto-')) {
          reachedGate = true
          const focused = await page.evaluate(() => {
            const computed = getComputedStyle(document.activeElement as Element)
            return { style: computed.outlineStyle, width: parseFloat(computed.outlineWidth) }
          })
          expect(focused.style, 'keyboard focus draws a focus-visible ring').toBe('solid')
          expect(focused.width).toBeGreaterThanOrEqual(2)
          break
        }
      }
      expect(reachedGate, 'Tab reaches the gate buttons').toBe(true)

      // Real navigation: click gate 5, its state moves, gate 1 loses it.
      await pills.nth(4).click()
      await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 5 关')
      await expect(pills.nth(4)).toHaveClass(/is-active/)
      await expect(pills.nth(0)).not.toHaveClass(/is-active/)

      // Completed gate: finish gate 1, the pill turns green with a ✓ dot.
      await pills.nth(0).click()
      await openTaskPane(page, width)
      await page.getByTestId('g1-u1-l01-complete-step').click()
      const completed = page.getByTestId('v3-stepbar').locator('button.is-complete')
      await expect(completed).toHaveCount(1)
      const completedDot = await completed.locator('.kc-v3-step-dot').textContent()
      expect(completedDot?.trim()).toBe('✓')
      await expect.poll(async () => (await style(completed)).background,
        { message: 'completed gate settles on a distinct colour' }).not.toBe(idle.background)
      const completedStyle = await style(completed)
      expect(completedStyle.background, 'completed gate is green, not current blue').not.toBe(active.background)
      expect(completedStyle.background, 'completed gate is not incomplete white').not.toBe(idle.background)

      // ---------- task panel: current gate visible, course extras folded ----------
      // Still on the task pane; gate 2 is current after completing gate 1.
      const extras = page.getByTestId('ws-task-extras')
      await expect(extras).toBeVisible()
      expect(await extras.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false)
      await expect(page.getByTestId('ws-task-content')).toContainText('任务简报')
      await extras.locator('summary').click()
      await expect(extras).toHaveAttribute('open', '')
      await expect(extras.getByTestId('ws-method-steps')).toBeVisible()
      await expect(page.getByTestId('ws-hint-reveal-1')).toBeVisible()
      await extras.locator('summary').click()

      // ---------- run / save: V2 primary + secondary, ≥44px ----------
      // Gate 5 carries the move-only starter program (real failing run).
      await page.getByTestId('v3-stepbar').getByTestId('g1-u1-l01-goto-error-lab').click()
      await openCodePane(page, width)
      const run = page.getByTestId('g1-u1-l01-run')
      const save = page.getByTestId('g1-u1-l01-save')
      await expect(run).toBeVisible()
      await expect(save).toBeVisible()

      const runStyle = await style(run)
      const saveStyle = await style(save)
      expect(runStyle.height, 'run button is at least 44px tall').toBeGreaterThanOrEqual(44)
      expect(saveStyle.height, 'save button is at least 44px tall').toBeGreaterThanOrEqual(44)
      expect(runStyle.background, 'run is the V2 blue primary').toBe('rgb(36, 99, 235)')
      expect(runStyle.color).toBe('rgb(255, 255, 255)')
      expect(runStyle.radius).toBeGreaterThanOrEqual(9)
      expect(saveStyle.background, 'save is the white outline secondary').toBe('rgb(255, 255, 255)')
      expect(saveStyle.borderWidth).toBeGreaterThanOrEqual(1)
      expect(saveStyle.radius).toBeGreaterThanOrEqual(9)
      const runBox = await box(run)
      const saveBox = await box(save)
      expect(saveBox.left - runBox.right, 'primary and secondary are spaced apart').toBeGreaterThanOrEqual(6)

      await run.hover()
      await expect.poll(async () => (await style(run)).background,
        { message: 'run hover darkens the primary' }).not.toBe(runStyle.background)
      await page.mouse.move(1, 1)

      // Keyboard focus ring on the real run button.
      let reachedRun = false
      for (let tab = 0; tab < 90; tab += 1) {
        await page.keyboard.press('Tab')
        const focused = await page.evaluate(() => {
          if (document.activeElement?.getAttribute('data-testid') !== 'g1-u1-l01-run') return null
          const computed = getComputedStyle(document.activeElement as Element)
          return { style: computed.outlineStyle, width: parseFloat(computed.outlineWidth) }
        })
        if (focused) {
          reachedRun = true
          expect(focused.style).toBe('solid')
          expect(focused.width).toBeGreaterThanOrEqual(2)
          break
        }
      }
      expect(reachedRun, 'Tab reaches the run button').toBe(true)

      // Real run: the button toggles, and at ≤1040 the classroom switches to
      // the stage pane so the failing judgment is actually visible.
      await run.click()
      if (width > 1040) {
        // The one-frame starter plays for ~450ms: observe the running state
        // within that window, then let the same run finish so the failing
        // judgment is actually produced (stopping early yields no verdict).
        await expect(run).toHaveAttribute('data-running', 'true')
      }
      await expect(page.getByTestId('ws-grid')).toHaveAttribute('data-pane', width > 1040 ? /./ : 'stage')
      await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('未合格', { timeout: 20_000 })
      if (width > 1040) {
        await expect(run).toHaveAttribute('data-running', 'false')
        await expect(run).toContainText('运行')
      }
      await page.screenshot({ path: `test-results/g1-v3-ui-${width}-run.png` })

      // Save: real handler, saved state on the button, then reload restores.
      await openCodePane(page, width)
      await save.click()
      await expect(save).toHaveAttribute('data-save-state', 'saved')
      await expect(save).toContainText('已保存')
      await expect.poll(() => page.evaluate((key) => {
        const parsed = JSON.parse(window.localStorage.getItem(key) ?? '{}') as {
          script?: { programs?: Record<string, unknown[]> }
        }
        return parsed.script?.programs?.['error-lab']?.length ?? -1
      }, DRAFT_KEY)).toBe(2)

      await page.reload()
      await expect(page.locator('svg.blocklySvg')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByTestId('g1-u1-l01-step-title')).toContainText('第 5 关')
      await expect(page.getByTestId('v3-stepbar').locator('button.is-complete')).toHaveCount(1)
      await openCodePane(page, width)
      await expect(page.getByTestId('g1-u1-l01-run')).toBeVisible()
      const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
      expect(noOverflow, 'no horizontal overflow at this viewport').toBe(true)
      await page.screenshot({ path: `test-results/g1-v3-ui-${width}-final.png` })
    } finally {
      await context.close()
    }
  })
}
