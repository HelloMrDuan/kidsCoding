import { expect, test } from '@playwright/test'

// UX-103, adjudicated scheme A (2026-10-15): the frozen V2 connector
// stays a STRAIGHT line — the prototype's .map-steps:before
// (top 61px, left/right 8%, 2px, #d5dfed, hidden at <=600px). The
// task title's "curved connector" is NOT implemented: there is no
// curve in the frozen baseline, and changing it would redesign V2.
// "Key level" emphasis is the prototype's existing .step.current
// highlight (blue border + 5px ring), already implemented.
//
// This spec is regression proof, not a redesign: it pins the frozen
// connector geometry, the 12-node path across all four units, the
// current-lesson highlight, and that the highlight never blocks the
// touch target. Zero visual change is the expected outcome.
const PARTIAL_PROGRESS = {
  completedLessonIds: ['lesson-01-forest-hello', 'lesson-02-forest-greeting'],
  currentLessonId: 'lesson-03-forest-story',
  stars: 0,
  badgeIds: [],
  cardIds: [],
  streakDays: 1,
  completedProjectIds: [],
  projectSnapshots: [],
}

const ALL_LESSONS = [
  'lesson-01-forest-hello',
  'lesson-02-forest-greeting',
  'lesson-03-forest-story',
  'lesson-04-meadow-scene',
  'lesson-05-meadow-order',
  'lesson-06-meadow-story',
  'lesson-07-garden-click',
  'lesson-08-garden-dialogue',
  'lesson-09-garden-story',
  'lesson-10-second-friend',
  'lesson-11-duo-rehearsal',
  'lesson-12-graduation-show',
]

const UNIT_IDS = [
  'unit-1-forest-meetup',
  'unit-2-meadow-journey',
  'unit-3-garden-interaction',
  'unit-4-graduation-show',
]

function seedProgress(progress: unknown) {
  return `window.localStorage.setItem('kc-progress', ${JSON.stringify(JSON.stringify(progress))})`
}

async function connectorStyle(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const steps = document.querySelector('[data-testid="adventure-map-steps"]')
    if (!steps) return null
    const style = window.getComputedStyle(steps, '::before')
    const rect = steps.getBoundingClientRect()
    return {
      display: style.display,
      height: style.height,
      top: style.top,
      leftPx: Number.parseFloat(style.left),
      rightPx: Number.parseFloat(style.right),
      widthPx: rect.width,
      backgroundColor: style.backgroundColor,
    }
  })
}

for (const [name, width, height] of [
  ['desktop', 1440, 900],
  ['tablet', 768, 1024],
  ['mobile', 375, 812],
] as const) {
  test(`UX-103 frozen straight connector geometry on ${name}`, async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width, height },
      hasTouch: name === 'mobile',
    })
    await context.addInitScript(seedProgress(PARTIAL_PROGRESS))
    const page = await context.newPage()
    await page.goto('/learn/map')

    const map = page.getByTestId('adventure-map')
    await expect(map).toBeVisible()
    const steps = map.getByTestId('adventure-map-steps')

    if (name === 'mobile') {
      // Frozen V2 rule: no connector line at <=600px.
      const style = await connectorStyle(page)
      expect(style?.display).toBe('none')
    } else {
      // Frozen V2 geometry: 2px #d5dfed line at top 61px, inset 8%.
      const style = await connectorStyle(page)
      expect(style?.display).not.toBe('none')
      expect(style?.height).toBe('2px')
      expect(style?.top).toBe('61px')
      expect(style?.backgroundColor).toBe('rgb(213, 223, 237)')
      // left/right are 8% of the steps container width.
      const expected = (style?.widthPx ?? 0) * 0.08
      expect(Math.abs((style?.leftPx ?? -1) - expected)).toBeLessThanOrEqual(2)
      expect(Math.abs((style?.rightPx ?? -1) - expected)).toBeLessThanOrEqual(2)
      // The line sits behind the nodes (nodes carry z-index 1).
      const nodeZ = await steps
        .getByTestId('lesson-card-lesson-01-forest-hello')
        .evaluate((el) => window.getComputedStyle(el).zIndex)
      expect(nodeZ).toBe('1')
    }

    if (name === 'desktop') {
      // Zero visual change vs UX-101/UX-102: same seed, same viewport,
      // same default unit-1 view — capture BEFORE switching units.
      await page.screenshot({
        path: testInfo.outputPath('ux-103-real-desktop.png'),
        fullPage: true,
      })
    }
    if (name === 'mobile') {
      await page.screenshot({
        path: testInfo.outputPath('ux-103-real-mobile.png'),
        fullPage: true,
      })
    }

    // The connector persists across all four units (12-node path).
    const seen = new Set<string>()
    for (const unitId of UNIT_IDS) {
      await map.getByTestId(`adventure-map-unit-${unitId}`).click()
      const cards = steps.locator('[data-testid^="lesson-card-"]')
      await expect(cards).toHaveCount(3)
      for (let i = 0; i < 3; i += 1) {
        const testId = await cards.nth(i).getAttribute('data-testid')
        if (testId) seen.add(testId.replace('lesson-card-', ''))
      }
      if (name !== 'mobile') {
        const style = await connectorStyle(page)
        expect(style?.height).toBe('2px')
      }
    }
    expect([...seen].sort()).toEqual([...ALL_LESSONS].sort())

    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await context.close()
  })

  test(`UX-103 current-lesson highlight never blocks its touch target on ${name}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width, height },
      hasTouch: name === 'mobile',
    })
    await context.addInitScript(seedProgress(PARTIAL_PROGRESS))
    const page = await context.newPage()
    await page.goto('/learn/map')

    const map = page.getByTestId('adventure-map')
    const current = map.getByTestId('lesson-card-lesson-03-forest-story')
    await expect(current).toContainText('当前练习')
    // The highlight is paint-only (border + box-shadow ring): the node
    // stays a real link, and the ring must not shrink its hit area.
    expect(await current.evaluate((el) => el.tagName)).toBe('A')
    await expect(current).toHaveAttribute(
      'href',
      '/learn/lesson/lesson-03-forest-story',
    )
    const nodeStyle = await current
      .locator('.kc-step-node')
      .evaluate((el) => {
        const style = window.getComputedStyle(el)
        return {
          borderColor: style.borderColor,
          boxShadow: style.boxShadow,
        }
      })
    // UX-106 kid map: current node is the warm orange node with a soft halo ring.
    expect(nodeStyle.borderColor).toBe('rgb(255, 255, 255)')
    expect(nodeStyle.boxShadow).toContain('rgb(224, 134, 0)')

    // Completed node keeps the frozen done highlight.
    const doneStyle = await map
      .getByTestId('lesson-card-lesson-01-forest-hello')
      .locator('.kc-step-node')
      .evaluate((el) => window.getComputedStyle(el).backgroundColor)
    expect(doneStyle).toBe('rgb(63, 191, 106)')

    // Tapping the highlighted node reaches the lesson (desktop click,
    // mobile tap): the highlight does not swallow the gesture.
    if (name === 'mobile') {
      await current.tap()
    } else {
      await current.click()
    }
    await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()

    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await context.close()
  })
}
