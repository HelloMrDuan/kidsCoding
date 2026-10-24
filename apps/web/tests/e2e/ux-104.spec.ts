import { expect, test } from '@playwright/test'

// UX-104, adjudicated scheme A (2026-10-15): the frozen V2 mobile map
// stays THREE columns — the prototype's .map-steps is
// grid-template-columns: repeat(3, minmax(0, 1fr)) even at <=600px.
// The task acceptance "mobile single-column map" is NOT implemented:
// switching to one column would redesign frozen V2.
// The other two acceptance items were verified to already hold, so
// this spec is regression proof, not a redesign: zero visual change,
// zero CSS, zero production code.
//
// What it pins:
//  1. No horizontal overflow at 1440 / 768 / 375.
//  2. Back-navigation from a lesson restores the map scroll position.
//  3. The mobile steps grid stays 3 columns (the frozen layout).
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

function seedProgress(progress: unknown) {
  return `window.localStorage.setItem('kc-progress', ${JSON.stringify(JSON.stringify(progress))})`
}

for (const [name, width, height] of [
  ['desktop', 1440, 900],
  ['tablet', 768, 1024],
  ['mobile', 375, 812],
] as const) {
  test(`UX-104 no horizontal overflow on ${name}`, async ({
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
    await expect(page.getByTestId('adventure-map')).toBeVisible()

    // Nothing may overflow the viewport horizontally.
    const overflow = await page.evaluate(() => ({
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(overflow.docScrollWidth).toBe(overflow.innerWidth)
    expect(overflow.bodyScrollWidth).toBe(overflow.innerWidth)

    // The full 12-node path renders: 3 cards per unit, 4 units.
    const steps = page.getByTestId('adventure-map-steps')
    const unitIds = [
      'unit-1-forest-meetup',
      'unit-2-meadow-journey',
      'unit-3-garden-interaction',
      'unit-4-graduation-show',
    ]
    // Zero-change proof: capture the default unit-1 view BEFORE
    // switching units, so the desktop shot is byte-comparable with
    // the UX-101/102/103 real-desktop evidence.
    await page.screenshot({
      path: testInfo.outputPath(`ux-104-real-${name}.png`),
      fullPage: true,
    })
    const seen = new Set<string>()
    for (const unitId of unitIds) {
      await page
        .getByTestId(`adventure-map-unit-${unitId}`)
        .click()
      const cards = steps.locator('[data-testid^="lesson-card-"]')
      await expect(cards).toHaveCount(3)
      for (let i = 0; i < 3; i += 1) {
        const testId = await cards.nth(i).getAttribute('data-testid')
        if (testId) seen.add(testId.replace('lesson-card-', ''))
      }
    }
    expect(seen.size).toBe(12)

    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await context.close()
  })

  test(`UX-104 back-navigation restores map scroll on ${name}`, async ({
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
    await expect(page.getByTestId('adventure-map')).toBeVisible()

    // Scroll to the bottom, leave for a lesson, come back: the scroll
    // position must be restored, not reset to the top.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const before = await page.evaluate(() => window.scrollY)
    expect(before).toBeGreaterThan(0)
    const card = page.getByTestId('lesson-card-lesson-03-forest-story')
    if (name === 'mobile') {
      await card.tap()
    } else {
      await card.click()
    }
    await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()
    // A real click may scroll the card into view before navigating. The
    // departure-time position persisted by the app is the restore target.
    const departureOffset = await page.evaluate(() =>
      Number(sessionStorage.getItem('kc-scroll-restore:learn-map')),
    )
    expect(departureOffset).toBeGreaterThan(0)
    await page.goBack()
    await expect(page.getByTestId('adventure-map')).toBeVisible()
    // Assert exact restoration once hydration has settled, rather than
    // sampling at an arbitrary fixed delay or relaxing pixel tolerance.
    await expect.poll(async () =>
      page.evaluate(() => Math.round(window.scrollY)),
      { timeout: 4000 },
    ).toBe(departureOffset)

    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await context.close()
  })
}

test('UX-104 mobile steps grid stays three columns (frozen V2)', async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 375, height: 812 },
    hasTouch: true,
  })
  await context.addInitScript(seedProgress(PARTIAL_PROGRESS))
  const page = await context.newPage()
  await page.goto('/learn/map')
  await expect(page.getByTestId('adventure-map')).toBeVisible()

  // Frozen V2: 3 columns even at <=600px — NOT single-column.
  const columns = await page
    .getByTestId('adventure-map-steps')
    .evaluate((el) => window.getComputedStyle(el).gridTemplateColumns)
  expect(columns.trim().split(/\s+/)).toHaveLength(3)

  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await context.close()
})
