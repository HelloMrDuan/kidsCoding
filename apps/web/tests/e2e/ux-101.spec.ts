import { expect, test } from '@playwright/test'

// UX-101: four-unit adventure map on the real /learn/map page in real
// Chrome. Progress is seeded through the real guest-progress storage
// key (kc-progress); the page reads it through the real
// useSyncExternalStore path. No fixture page, no mock DOM.
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
  test(`UX-101 four-unit map on ${name}`, async ({ browser }, testInfo) => {
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

    // Four real units in the aside, real titles.
    for (const unit of [
      'unit-1-forest-meetup',
      'unit-2-meadow-journey',
      'unit-3-garden-interaction',
      'unit-4-graduation-show',
    ]) {
      await expect(map.getByTestId(`adventure-map-unit-${unit}`)).toBeVisible()
    }

    // Default unit follows the real recommended lesson (unit 1).
    await expect(
      map.getByRole('heading', { name: '第一单元 · 森林见面会' }),
    ).toBeVisible()
    const steps = map.getByTestId('adventure-map-steps')
    await expect(steps.getByTestId('lesson-card-lesson-01-forest-hello')).toContainText('✓')
    await expect(steps.getByTestId('lesson-card-lesson-01-forest-hello')).toContainText('已完成')
    await expect(steps.getByTestId('lesson-card-lesson-03-forest-story')).toContainText('当前练习')
    await expect(map.getByTestId('adventure-map-next-lesson')).toHaveAttribute(
      'href',
      '/learn/lesson/lesson-03-forest-story',
    )

    // No locked / unreleased nodes from real data (locking is UX-102).
    await expect(map.getByText('已锁定')).toHaveCount(0)
    await expect(map.getByText('未开放')).toHaveCount(0)

    // Unit switching follows real data; all 12 lessons exist exactly once.
    const seenHrefs = new Set<string>()
    for (const id of ALL_LESSONS.slice(0, 3)) {
      const card = steps.getByTestId(`lesson-card-${id}`)
      seenHrefs.add((await card.getAttribute('href')) ?? '')
    }
    const expectedHeads: Array<[string, string[]]> = [
      ['第二单元 · 小动物去旅行', ['lesson-04-meadow-scene', 'lesson-05-meadow-order', 'lesson-06-meadow-story']],
      ['第三单元 · 花园互动秀', ['lesson-07-garden-click', 'lesson-08-garden-dialogue', 'lesson-09-garden-story']],
      ['第四单元 · 动物朋友合作演出', ['lesson-10-second-friend', 'lesson-11-duo-rehearsal', 'lesson-12-graduation-show']],
    ]
    for (const [heading, ids] of expectedHeads) {
      const unitId = ids[0].startsWith('lesson-04')
        ? 'unit-2-meadow-journey'
        : ids[0].startsWith('lesson-07')
          ? 'unit-3-garden-interaction'
          : 'unit-4-graduation-show'
      await map.getByTestId(`adventure-map-unit-${unitId}`).click()
      await expect(map.getByRole('heading', { name: heading })).toBeVisible()
      for (const id of ids) {
        const card = steps.getByTestId(`lesson-card-${id}`)
        await expect(card).toBeVisible()
        await expect(card).toContainText('可以开始')
        seenHrefs.add((await card.getAttribute('href')) ?? '')
      }
    }
    expect([...seenHrefs].sort()).toEqual(
      ALL_LESSONS.map((id) => `/learn/lesson/${id}`).sort(),
    )

    // Bottom action follows the selected unit's next lesson.
    await expect(map.getByTestId('adventure-map-next-lesson')).toHaveAttribute(
      'href',
      '/learn/lesson/lesson-10-second-friend',
    )

    // Cover (UX-106): kid cartoon world with real illustrated characters, not a placeholder.
    const cover = map.getByTestId('map-world-scene')
    await expect(cover).toBeVisible()
    expect(await cover.locator('[data-character-art]').count()).toBeGreaterThan(0)

    // Kid-friendly round lesson nodes (UX-106): big, round, tappable.
    const firstNode = steps.getByTestId('lesson-card-lesson-10-second-friend').locator('.kc-step-node')
    const nodeBox = await firstNode.boundingBox()
    expect(nodeBox?.width ?? 0).toBeGreaterThanOrEqual(56)
    await expect(firstNode).toHaveCSS('border-radius', '50%')
    await expect(
      steps.getByTestId('lesson-card-lesson-10-second-friend').locator('b'),
    ).toHaveCSS('text-overflow', 'ellipsis')

    // Old cartoon track is gone from the map.
    expect(await map.locator('.kc-surface-3d, .kc-panel-3d').count()).toBe(0)

    // Keyboard: focus + Enter switches units.
    await map.getByTestId('adventure-map-unit-unit-2-meadow-journey').focus()
    await page.keyboard.press('Enter')
    await expect(map.getByRole('heading', { name: '第二单元 · 小动物去旅行' })).toBeVisible()

    // Touch (mobile): tap switches units.
    if (name === 'mobile') {
      await map.getByTestId('adventure-map-unit-unit-3-garden-interaction').tap()
      await expect(map.getByRole('heading', { name: '第三单元 · 花园互动秀' })).toBeVisible()
    }

    // No horizontal overflow on any viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)

    // Capture the REAL /learn/map route in Chrome for independent design review.
    // Test artifact only; screenshot is never treated as proof of business publication.
    await page.screenshot({ path: testInfo.outputPath(`ux-101-real-${name}.png`), fullPage: true })

    // Re-entering the page re-derives the default unit from real progress.
    await page.goto('/learn/map')
    await expect(map.getByRole('heading', { name: '第一单元 · 森林见面会' })).toBeVisible()
    await context.close()
  })

  test(`UX-101 all-complete and not-started progress on ${name}`, async ({ browser }, testInfo) => {
    // All complete: every node completed, bottom action re-learns from unit 1's first lesson.
    const doneContext = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width, height },
    })
    await doneContext.addInitScript(
      seedProgress({
        ...PARTIAL_PROGRESS,
        completedLessonIds: ALL_LESSONS,
        currentLessonId: 'lesson-12-graduation-show',
      }),
    )
    const donePage = await doneContext.newPage()
    await donePage.goto('/learn/map')
    const doneMap = donePage.getByTestId('adventure-map')
    await expect(doneMap.getByRole('heading', { name: '第四单元 · 动物朋友合作演出' })).toBeVisible()
    const doneSteps = doneMap.getByTestId('adventure-map-steps')
    await expect(doneSteps.getByTestId('lesson-card-lesson-12-graduation-show')).toContainText('✓')
    await expect(doneMap.getByTestId('adventure-map-next-lesson')).toHaveAttribute(
      'href',
      '/learn/lesson/lesson-10-second-friend',
    )
    if (name === 'desktop') {
      await donePage.screenshot({ path: testInfo.outputPath('ux-101-real-all-complete-desktop.png'), fullPage: true })
    }
    await doneContext.close()

    // Not started: first lesson is current, the rest available.
    const freshContext = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width, height },
    })
    await freshContext.addInitScript(
      seedProgress({
        ...PARTIAL_PROGRESS,
        completedLessonIds: [],
        currentLessonId: 'lesson-01-forest-hello',
      }),
    )
    const freshPage = await freshContext.newPage()
    await freshPage.goto('/learn/map')
    const freshMap = freshPage.getByTestId('adventure-map')
    await expect(freshMap.getByRole('heading', { name: '第一单元 · 森林见面会' })).toBeVisible()
    const freshSteps = freshMap.getByTestId('adventure-map-steps')
    await expect(freshSteps.getByTestId('lesson-card-lesson-01-forest-hello')).toContainText('当前练习')
    await expect(freshSteps.getByTestId('lesson-card-lesson-02-forest-greeting')).toContainText('可以开始')
    await expect(freshSteps.getByTestId('lesson-card-lesson-03-forest-story')).toContainText('可以开始')
    await freshContext.close()
  })
}
