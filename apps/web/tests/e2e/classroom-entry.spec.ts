import { expect, test, type BrowserContext, type Page } from '@playwright/test'

/**
 * Formal-entry consistency for 《小狐狸出场》 (PR #573 review A/B) and
 * owner isolation for the home/learning-map continue entries (review C).
 *
 * lesson-01 has exactly one official entry: the V3 studio workspace. The
 * historical URL stays bookmarkable via a compat redirect; lesson-02…12 keep
 * their original three-column classroom unchanged.
 */

const V3 = '/studio/blockly/lesson-01-forest-hello'
const OLD = '/learn/lesson/lesson-01-forest-hello'

const seedProgress = (page: Page, progress: Record<string, unknown>) =>
  page.addInitScript((value) => {
    localStorage.setItem('kc-progress', JSON.stringify(value))
  }, progress)

const askedForV3Studio = async (page: Page) => {
  await expect(page).toHaveURL(new RegExp(`${V3}$`))
  await expect(page.getByTestId('studio-shell')).toBeVisible()
  await expect(page.getByTestId('forest-hello-slot')).toBeVisible()
  // The old three-zone classroom must not be the thing on screen.
  await expect(page.getByTestId('lesson-three-zone-grid')).toHaveCount(0)
}

async function switchGuest(context: BrowserContext, guestId: string) {
  await context.clearCookies()
  await context.addCookies([
    {
      name: 'kc_guest_id',
      value: guestId,
      url: 'http://127.0.0.1:3100',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
}

test('no learning record → 编程课堂 opens the course picker, not the V3 studio lesson', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByTestId('kc-nav-lesson')
  await expect(nav).toHaveAttribute('href', '/learn/catalog')
  await expect(nav).not.toHaveAttribute('href', V3)
})

test('recorded catalog lesson → 编程课堂 opens the same route the catalog card uses', async ({ page }) => {
  await seedProgress(page, {
    currentLessonId: 'G1-U1-L01',
    completedLessonIds: ['G1-U1-L01'],
    completedProjectIds: [],
    projectSnapshots: [],
  })
  await page.goto('/')
  const nav = page.getByTestId('kc-nav-lesson')
  await expect(nav).toHaveAttribute('href', '/learn/story-lab/G1-U1-L01/golden')
  // At phone widths the sidebar is a drawer; the bottom bar is the visible
  // 编程课堂 entry, and it must carry the same resolved route.
  const entry = (await nav.isVisible()) ? nav : page.locator('.kc-mobile-bottom').getByRole('link', { name: '课堂' })
  await expect(entry).toHaveAttribute('href', '/learn/story-lab/G1-U1-L01/golden')
  await entry.click()
  await expect(page).toHaveURL(/\/learn\/story-lab\/G1-U1-L01\/golden$/)
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
})

test('lesson-02 keeps the original three-column classroom (no lesson-01 spill-over)', async ({ page }) => {
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  await expect(page).toHaveURL(/\/learn\/lesson\/lesson-02-forest-greeting$/)
  await expect(page.getByTestId('lesson-three-zone-grid')).toBeVisible()
  await expect(page.getByTestId('studio-shell')).toHaveCount(0)
})

test('old lesson-01 URL compat-redirects to the V3 workspace, with no loop', async ({ page }) => {
  await page.goto(OLD)
  await askedForV3Studio(page)

  // Refresh keeps landing on the one official entry (no redirect cycle).
  await page.reload()
  await askedForV3Studio(page)
})

test('recorded lesson-01 → every formal entry resolves to the V3 workspace', async ({ page }) => {
  await seedProgress(page, {
    currentLessonId: 'lesson-01-forest-hello',
    completedLessonIds: ['lesson-02-forest-greeting'],
    completedProjectIds: [],
    projectSnapshots: [],
  })

  // Global nav continues the recorded lesson-01.
  await page.goto('/')
  await expect(page.getByTestId('kc-nav-lesson')).toHaveAttribute('href', V3)

  // Home "继续学习": next incomplete is lesson-01.
  await expect(page.getByTestId('home-continue')).toHaveAttribute('href', V3)

  // Learning map: hero CTA and the lesson card.
  await page.goto('/learn/map')
  await expect(page.getByTestId('learning-map-primary-cta')).toHaveAttribute('href', V3)
  await expect(page.getByTestId('lesson-card-lesson-01-forest-hello')).toHaveAttribute('href', V3)

  // The CTA really lands in the V3 workspace.
  await page.getByTestId('learning-map-primary-cta').click()
  await askedForV3Studio(page)

  // Remedial return link.
  await page.goto('/learn/remedial/remedial-start-sequence')
  await expect(page.getByRole('link', { name: '回到刚才的课程' })).toHaveAttribute(
    'href',
    V3,
  )

  // Completion page's locked-project return link.
  await page.goto('/project/lesson-01-forest-hello/complete')
  await expect(page.getByRole('link', { name: '回课堂完成这节课' })).toHaveAttribute(
    'href',
    V3,
  )
})

test('home and learning map keep guest A → B → A progress isolated', async ({ page, context }) => {
  await switchGuest(context, 'family-a')
  await page.goto('/')
  // Seed A's real record, then reload so the owner-scoped read claims it.
  await page.evaluate(() => {
    localStorage.setItem(
      'kc-progress',
      JSON.stringify({
        currentLessonId: 'lesson-02-forest-greeting',
        completedLessonIds: ['lesson-01-forest-hello'],
        completedProjectIds: [],
        projectSnapshots: [],
      }),
    )
  })
  await page.reload()
  await expect(page.getByTestId('home-continue')).toHaveAttribute(
    'href',
    '/learn/lesson/lesson-02-forest-greeting',
  )
  await expect(page.getByTestId('home-next-lesson')).toContainText('小狐狸打招呼')

  // B in the same browser: no inherited progress, and no jump into A's lesson.
  await switchGuest(context, 'family-b')
  await page.goto('/')
  await expect(page.getByTestId('home-start')).toBeVisible()
  await expect(page.getByTestId('home-continue')).toHaveCount(0)
  await expect(page.getByTestId('home-next-lesson')).toContainText('小狐狸出场')
  await page.goto('/learn/map')
  await expect(page.getByTestId('learning-map-primary-cta')).toHaveAttribute('href', V3)

  // Back to A: A's own record is restored exactly.
  await switchGuest(context, 'family-a')
  await page.goto('/')
  await expect(page.getByTestId('home-continue')).toHaveAttribute(
    'href',
    '/learn/lesson/lesson-02-forest-greeting',
  )
  await expect(page.getByTestId('home-next-lesson')).toContainText('小狐狸打招呼')
  await page.goto('/learn/map')
  await expect(page.getByTestId('learning-map-primary-cta')).toHaveAttribute(
    'href',
    '/learn/lesson/lesson-02-forest-greeting',
  )
})
