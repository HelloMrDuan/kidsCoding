import { expect, test } from '@playwright/test'

// UX-105: real-browser visual regression for the learning map.
//
// Coverage audit (2026-10-15): the other acceptance items are already
// covered by real specs, so this file does NOT duplicate them:
//  - empty / partial / complete progress: ux-101.spec.ts
//    ("all-complete and not-started progress")
//  - locked map + lock screen: ux-102.spec.ts
//  - reward idempotency: reward-idempotency.spec.ts
//  - keyboard unit switching + CTA activation: ux-101 / v2-tokens
//  - touch on mobile + three viewports: ux-103 / ux-104
// This file covers the genuine gaps found by the audit:
//  1. Keyboard focus-visible + Enter activation on a LESSON node
//     (previous keyboard tests only covered unit buttons and the CTA).
//  2. Keyboard Tab order through the lesson nodes.
//  3. Touch on TABLET (previous touch tests only used mobile 375px).
//  4. Empty-progress visual evidence screenshot.
// No snapshot-baseline comparison is introduced: this repo has no
// committed-baseline mechanism (binary PNGs cannot go through the
// text API), so screenshots are captured as evidence and compared by
// hash locally, as in UX-101..UX-104. The focus-visible rule itself
// is frozen V2: outline 3px #84afff, offset 2px.
const EMPTY_PROGRESS = {
  completedLessonIds: [],
  currentLessonId: 'lesson-01-forest-hello',
  stars: 0,
  badgeIds: [],
  cardIds: [],
  streakDays: 0,
  completedProjectIds: [],
  projectSnapshots: [],
}

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

// Drive real keyboard Tabs until the given lesson card holds focus.
// Robust regardless of how many focusables precede the map.
async function tabToCard(
  page: import('@playwright/test').Page,
  testId: string,
) {
  for (let i = 0; i < 40; i += 1) {
    const focused = await page.evaluate(
      () =>
        (document.activeElement as HTMLElement | null)?.dataset?.testid ??
        null,
    )
    if (focused === testId) return
    await page.keyboard.press('Tab')
  }
  throw new Error(`never reached ${testId} via Tab`)
}

for (const [name, width, height] of [
  ['desktop', 1440, 900],
  ['tablet', 768, 1024],
] as const) {
  test(`UX-105 keyboard focus-visible + Enter opens lesson node on ${name}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width, height },
    })
    await context.addInitScript(seedProgress(PARTIAL_PROGRESS))
    const page = await context.newPage()
    await page.goto('/learn/map')
    await expect(page.getByTestId('adventure-map')).toBeVisible()

    const card = page.getByTestId('lesson-card-lesson-03-forest-story')
    await tabToCard(page, 'lesson-card-lesson-03-forest-story')
    // Frozen V2 focus-visible rule, applied to the <a> lesson card.
    const outline = await card.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return {
        width: style.outlineWidth,
        style: style.outlineStyle,
        color: style.outlineColor,
        offset: style.outlineOffset,
      }
    })
    expect(outline.width).toBe('3px')
    expect(outline.style).toBe('solid')
    expect(outline.color).toBe('rgb(132, 175, 255)')
    expect(outline.offset).toBe('2px')

    await page.keyboard.press('Enter')
    await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()

    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await context.close()
  })
}

test('UX-105 keyboard Tab order runs through the lesson nodes', async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 1440, height: 900 },
  })
  await context.addInitScript(seedProgress(PARTIAL_PROGRESS))
  const page = await context.newPage()
  await page.goto('/learn/map')
  await expect(page.getByTestId('adventure-map')).toBeVisible()

  await tabToCard(page, 'lesson-card-lesson-01-forest-hello')
  await page.keyboard.press('Tab')
  let focused = await page.evaluate(
    () =>
      (document.activeElement as HTMLElement | null)?.dataset?.testid ?? null,
  )
  expect(focused).toBe('lesson-card-lesson-02-forest-greeting')
  await page.keyboard.press('Tab')
  focused = await page.evaluate(
    () =>
      (document.activeElement as HTMLElement | null)?.dataset?.testid ?? null,
  )
  expect(focused).toBe('lesson-card-lesson-03-forest-story')

  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await context.close()
})

test('UX-105 tablet touch switches unit and opens a lesson', async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 768, height: 1024 },
    hasTouch: true,
  })
  await context.addInitScript(seedProgress(PARTIAL_PROGRESS))
  const page = await context.newPage()
  await page.goto('/learn/map')
  const map = page.getByTestId('adventure-map')
  await expect(map).toBeVisible()

  await map.getByTestId('adventure-map-unit-unit-2-meadow-journey').tap()
  await expect(
    map.getByRole('heading', { name: '第二单元 · 小动物去旅行' }),
  ).toBeVisible()
  await map.getByTestId('lesson-card-lesson-04-meadow-scene').tap()
  await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()

  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await context.close()
})

test('UX-105 empty-progress visual evidence', async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 1440, height: 900 },
  })
  await context.addInitScript(seedProgress(EMPTY_PROGRESS))
  const page = await context.newPage()
  await page.goto('/learn/map')
  const map = page.getByTestId('adventure-map')
  await expect(map).toBeVisible()

  // Empty progress: nothing completed, lesson 1 is the current node.
  const first = map.getByTestId('lesson-card-lesson-01-forest-hello')
  await expect(first).toContainText('当前练习')
  await expect(
    page.getByTestId('adventure-map-steps').getByText('已完成'),
  ).toHaveCount(0)

  await page.screenshot({
    path: testInfo.outputPath('ux-105-empty-desktop.png'),
    fullPage: true,
  })
  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await context.close()
})
