import { expect, test, type Page } from '@playwright/test'

// UX-102: map nodes derive locked from the REAL access rule
// (resolveCourseAccess over lesson phase + /api/course-access
// entitlement), never from lesson order. The lesson page enforces the
// same rule before rendering the playable workspace.
//
// Real production data has all 12 lessons phase 'trial', so no node
// is locked in production. The locked scenarios below vary ONE datum
// in the test (a lesson's phase, via route interception of the real
// /api/curriculum/launch payload) to prove the mechanism; they never
// claim a fake production lock.
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

const LOCKED_FIRST_PROGRESS = {
  ...PARTIAL_PROGRESS,
  completedLessonIds: [
    'lesson-01-forest-hello',
    'lesson-02-forest-greeting',
    'lesson-03-forest-story',
  ],
  currentLessonId: 'lesson-04-meadow-scene',
}

function seedProgress(progress: unknown) {
  return `window.localStorage.setItem('kc-progress', ${JSON.stringify(JSON.stringify(progress))})`
}

async function withCourseAccess(page: Page, hasLaunchPack: boolean) {
  await page.route('**/api/course-access', async (route) => {
    await route.fulfill({ json: { hasLaunchPack } })
  })
}

async function withLessonPhase(
  page: Page,
  lessonId: string,
  phase: string | undefined,
) {
  await page.route('**/api/curriculum/launch', async (route) => {
    const response = await route.fetch()
    const data = (await response.json()) as {
      lessons: Array<Record<string, unknown>>
    }
    const lessons = data.lessons.map((lesson) => {
      if (lesson.id !== lessonId) return lesson
      if (phase === undefined) {
        const rest = { ...lesson }
        delete rest.phase
        return rest
      }
      return { ...lesson, phase }
    })
    await route.fulfill({ response, json: { ...data, lessons } })
  })
}

for (const [name, width, height] of [
  ['desktop', 1440, 900],
  ['mobile', 375, 812],
] as const) {
  test(`UX-102 real data: no fake locking, completed lesson re-studies on ${name}`, async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width, height },
      hasTouch: name === 'mobile',
    })
    await context.addInitScript(seedProgress(PARTIAL_PROGRESS))
    const page = await context.newPage()
    await withCourseAccess(page, false)
    await page.goto('/learn/map')

    const map = page.getByTestId('adventure-map')
    await expect(map).toBeVisible()
    // No entitlement, yet no locked nodes: all 12 real lessons are
    // trial, so the real rule allows all of them.
    await expect(map.getByText('已锁定')).toHaveCount(0)
    await expect(map.getByText('未开放')).toHaveCount(0)

    // Page CTA points at the first incomplete playable lesson.
    await expect(page.getByTestId('learning-map-primary-cta')).toHaveAttribute(
      'href',
      '/learn/lesson/lesson-03-forest-story',
    )

    // Completed lesson re-study: the node links to the lesson page,
    // and the lesson page renders the playable workspace (not the
    // lock screen).
    await map
      .getByTestId('lesson-card-lesson-01-forest-hello')
      .click()
    await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()
    await expect(page.getByText('看看高阶升级内容')).toHaveCount(0)

    // Back on the map, the real route is unchanged (V2 layout intact).
    await page.goto('/learn/map')
    await expect(map).toBeVisible()
    if (name === 'desktop') {
      await page.screenshot({
        path: testInfo.outputPath(`ux-102-real-${name}.png`),
        fullPage: true,
      })
    }
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await context.close()
  })

  test(`UX-102 locked course lesson: map node, CTA skip, direct URL lock on ${name}`, async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width, height },
      hasTouch: name === 'mobile',
    })
    await context.addInitScript(seedProgress(LOCKED_FIRST_PROGRESS))
    const page = await context.newPage()
    await withCourseAccess(page, false)
    await withLessonPhase(page, 'lesson-04-meadow-scene', 'course')
    await page.goto('/learn/map')

    const map = page.getByTestId('adventure-map')
    await expect(map).toBeVisible()
    // Default unit follows the recommended lesson (unit 2).
    await expect(
      map.getByRole('heading', { name: '第二单元 · 小动物去旅行' }),
    ).toBeVisible()

    // Locked node: non-focusable span, no link, never a navigation target.
    const locked = map.getByTestId('lesson-card-lesson-04-meadow-scene')
    await expect(locked).toContainText('已锁定')
    expect(await locked.evaluate((el) => el.tagName)).toBe('SPAN')
    await expect(locked).toHaveAttribute('aria-disabled', 'true')
    expect(await locked.getAttribute('href')).toBeNull()

    // Trial siblings in the same unit stay playable.
    const sibling = map.getByTestId('lesson-card-lesson-05-meadow-order')
    await expect(sibling).toContainText('可以开始')
    await expect(sibling).toHaveAttribute(
      'href',
      '/learn/lesson/lesson-05-meadow-order',
    )

    // Unit bottom action and page CTA both skip the locked lesson.
    await expect(map.getByTestId('adventure-map-next-lesson')).toHaveAttribute(
      'href',
      '/learn/lesson/lesson-05-meadow-order',
    )
    await expect(page.getByTestId('learning-map-primary-cta')).toHaveAttribute(
      'href',
      '/learn/lesson/lesson-05-meadow-order',
    )

    if (name === 'desktop') {
      await page.screenshot({
        path: testInfo.outputPath('ux-102-locked-map-desktop.png'),
        fullPage: true,
      })
    }

    // Direct URL cannot bypass the map: the lesson page enforces the
    // same rule and renders the lock screen, never the workspace.
    await page.goto('/learn/lesson/lesson-04-meadow-scene')
    await expect(
      page.getByText('这节高阶内容会在启蒙毕业后开启'),
    ).toBeVisible()
    await expect(page.getByTestId('lesson-workbench-shell')).toHaveCount(0)
    await expect(page.getByTestId('lesson-complete-step')).toHaveCount(0)
    await expect(page.getByText('看看高阶升级内容')).toBeVisible()
    if (name === 'desktop') {
      await page.screenshot({
        path: testInfo.outputPath('ux-102-lock-screen-desktop.png'),
        fullPage: true,
      })
    }
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await context.close()
  })

  test(`UX-102 entitled: course lesson unlocks on ${name}`, async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width, height },
      hasTouch: name === 'mobile',
    })
    await context.addInitScript(seedProgress(LOCKED_FIRST_PROGRESS))
    const page = await context.newPage()
    await withCourseAccess(page, true)
    await withLessonPhase(page, 'lesson-04-meadow-scene', 'course')
    await page.goto('/learn/map')

    const map = page.getByTestId('adventure-map')
    const card = map.getByTestId('lesson-card-lesson-04-meadow-scene')
    await expect(card).toContainText('当前练习')
    await expect(card).toHaveAttribute(
      'href',
      '/learn/lesson/lesson-04-meadow-scene',
    )

    await card.click()
    await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await context.close()
  })
}

test('UX-102 abnormal data fails closed and permission change re-derives', async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 1440, height: 900 },
  })
  await context.addInitScript(seedProgress(LOCKED_FIRST_PROGRESS))
  const page = await context.newPage()

  // Abnormal data: lesson-05 arrives with no phase at all.
  await withCourseAccess(page, false)
  await withLessonPhase(page, 'lesson-05-meadow-order', undefined)
  await page.goto('/learn/map')
  const map = page.getByTestId('adventure-map')
  const abnormal = map.getByTestId('lesson-card-lesson-05-meadow-order')
  await expect(abnormal).toContainText('已锁定')
  expect(await abnormal.evaluate((el) => el.tagName)).toBe('SPAN')

  // Access API failure: trial lessons stay playable, nothing crashes.
  // (Default unit is unit 2, which holds the recommended lesson.)
  await page.unroute('**/api/course-access')
  await page.route('**/api/course-access', async (route) => {
    await route.fulfill({ status: 500, body: 'entitlement unavailable' })
  })
  await page.reload()
  await expect(
    map.getByTestId('lesson-card-lesson-06-meadow-story'),
  ).toContainText('可以开始')

  // Permission change: lesson-04 becomes course-phase without
  // entitlement (locked), then the entitlement flips on and a window
  // focus re-fetch unlocks it without a reload.
  await page.unroute('**/api/curriculum/launch')
  await withLessonPhase(page, 'lesson-04-meadow-scene', 'course')
  await page.unroute('**/api/course-access')
  await withCourseAccess(page, false)
  await page.reload()
  const locked = map.getByTestId('lesson-card-lesson-04-meadow-scene')
  await expect(locked).toContainText('已锁定')

  await page.unroute('**/api/course-access')
  await withCourseAccess(page, true)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(locked).toContainText('当前练习')
  await expect(locked).toHaveAttribute(
    'href',
    '/learn/lesson/lesson-04-meadow-scene',
  )

  // Refresh keeps the new permission state.
  await page.reload()
  await expect(
    map.getByTestId('lesson-card-lesson-04-meadow-scene'),
  ).toContainText('当前练习')
  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await context.close()
})
