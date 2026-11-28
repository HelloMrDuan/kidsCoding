import { expect, test, type BrowserContext, type Page } from '@playwright/test'

/**
 * Formal-entry consistency for 《小狐狸出场》 (PR #573 review A/B) and
 * owner isolation for the home/learning-map continue entries (review C).
 *
 * lesson-01 has exactly one official entry: the V3 studio workspace. The
 * historical URL stays bookmarkable via a compat redirect.
 *
 * OPS-056: lesson-02…12 now also have one official entry each, the shared V3
 * launch studio `/studio/blockly/launch/<id>` (launchLessonHref); their old
 * `/learn/lesson/<id>` URLs 308 there. So every continue href that used to be
 * `/learn/lesson/lesson-02-forest-greeting` is asserted as LAUNCH_02 (same
 * lesson, same owner isolation, only the route changed).
 */

const V3 = '/studio/blockly/lesson-01-forest-hello'
const OLD = '/learn/lesson/lesson-01-forest-hello'
const LAUNCH_02 = '/studio/blockly/launch/lesson-02-forest-greeting'

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

test('OPS-052: no top-level 编程课堂 menu in the sidebar, icon rail or bottom bar', async ({ page }) => {
  const ownerRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/lesson-draft-owner')) ownerRequests.push(request.url())
  })
  // The bottom bar is display:none on desktop, so count DOM links, not
  // accessible ones; the sidebar/icon rail/bottom bar are the same markup at
  // every breakpoint.
  for (const path of ['/', '/learn/catalog']) {
    await page.goto(path)
    await expect(page.getByTestId('kc-app-shell')).toBeVisible()
    await expect(page.getByTestId('kc-nav-lesson')).toHaveCount(0)
    await expect(page.locator('.kc-sidebar')).not.toContainText('编程课堂')
    const bottom = page.locator('.kc-mobile-bottom')
    await expect(bottom.locator('a')).toHaveCount(4)
    await expect(bottom).not.toContainText('课堂')
  }
  // The shell no longer resolves identity just to build a menu link. `/` is
  // not used for this check: the home page's own 「继续学习」 entry resolves the
  // owner for its progress card (kept, owner-isolated). The catalog page reads
  // no progress, so any request there could only come from the shell.
  ownerRequests.length = 0
  await page.goto('/learn/catalog')
  await expect(page.getByTestId('kc-app-shell')).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(ownerRequests).toEqual([])
})

test('OPS-052: 课程体系 course card → 试玩 entry still opens the catalog lesson workspace', async ({ page }) => {
  await page.goto('/learn/catalog?track=G1')
  const card = page.getByTestId('catalog-lesson-G1-U1-L01')
  await expect(card).toHaveAttribute('href', '/learn/catalog/G1-U1-L01')
  await card.click()
  await expect(page).toHaveURL(/\/learn\/catalog\/G1-U1-L01$/)
  const trial = page.getByTestId('story-trial-entry')
  await expect(trial).toHaveAttribute('href', '/learn/story-lab/G1-U1-L01/golden')
  await trial.click()
  await expect(page).toHaveURL(/\/learn\/story-lab\/G1-U1-L01\/golden$/)
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
})

/**
 * OPS-056: lesson-02…12 moved to the shared V3 launch studio. The old URL
 * 308-redirects to `/studio/blockly/launch/<id>`; the page must be the launch
 * slot (not lesson-01's forest slot, not the old three-zone classroom), and a
 * reload must stay there with no redirect cycle.
 */
test('old lesson-02 URL compat-redirects to the V3 launch studio (no lesson-01 spill-over, no loop)', async ({ page }) => {
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  for (let pass = 0; pass < 2; pass++) {
    if (pass === 1) await page.reload()
    await expect(page).toHaveURL(new RegExp(`${LAUNCH_02}$`))
    await expect(page.getByTestId('studio-shell')).toBeVisible()
    await expect(page.getByTestId('launch-v3-slot')).toHaveAttribute('data-lesson-id', 'lesson-02-forest-greeting', { timeout: 30_000 })
    await expect(page.getByTestId('forest-hello-slot')).toHaveCount(0)
    await expect(page.getByTestId('lesson-three-zone-grid')).toHaveCount(0)
  }
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

  // OPS-052: there is no global 编程课堂 menu any more.
  await page.goto('/')
  await expect(page.getByTestId('kc-nav-lesson')).toHaveCount(0)

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
    LAUNCH_02,
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
    LAUNCH_02,
  )
  await expect(page.getByTestId('home-next-lesson')).toContainText('小狐狸打招呼')
  await page.goto('/learn/map')
  await expect(page.getByTestId('learning-map-primary-cta')).toHaveAttribute(
    'href',
    LAUNCH_02,
  )
})

test('same-page A → B re-check is fail-closed while the owner API is delayed', async ({ page }) => {
  // A's record would be readable if the hook kept using A's owner while the
  // re-check is in flight; the delayed API makes that window observable.
  await seedProgress(page, {
    currentLessonId: 'lesson-02-forest-greeting',
    completedLessonIds: ['lesson-01-forest-hello'],
    completedProjectIds: [],
    projectSnapshots: [],
  })

  const identity = { owner: 'guest:family-a' }
  const control: {
    gate: Promise<void> | null
    release: (() => void) | null
    started: (() => void) | null
  } = { gate: null, release: null, started: null }

  await page.route('**/api/lesson-draft-owner', async (route) => {
    const started = control.started
    control.started = null
    started?.()
    if (control.gate) await control.gate
    await route.fulfill({ json: { owner: identity.owner } })
  })

  const switchTo = async (owner: string) => {
    identity.owner = owner
    control.gate = new Promise<void>((resolve) => {
      control.release = resolve
    })
    const started = new Promise<void>((resolve) => {
      control.started = resolve
    })
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await started
    return () => {
      control.gate = null
      control.release?.()
      control.release = null
    }
  }

  await page.goto('/')
  await expect(page.getByTestId('home-continue')).toHaveAttribute(
    'href',
    LAUNCH_02,
  )

  // A → B: while the identity API is held open, nothing of A may be shown.
  const releaseB = await switchTo('guest:family-b')
  await expect(page.getByTestId('home-continue')).toHaveCount(0)
  await expect(page.getByTestId('home-start')).toBeVisible()
  await expect(page.getByTestId('home-next-lesson')).toContainText('小狐狸出场')
  releaseB()
  await expect(page.getByTestId('home-start')).toBeVisible()
  await expect(page.getByTestId('home-continue')).toHaveCount(0)
  // B's read must not destroy A's saved envelope.
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('kc-progress') ?? '{}').currentLessonId,
    ),
  ).toBe('lesson-02-forest-greeting')

  // B → A: still fail-closed while delayed, then A's own entry returns.
  const releaseA = await switchTo('guest:family-a')
  await expect(page.getByTestId('home-continue')).toHaveCount(0)
  releaseA()
  await expect(page.getByTestId('home-continue')).toHaveAttribute(
    'href',
    LAUNCH_02,
  )
})
