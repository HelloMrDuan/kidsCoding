import { expect, test } from '@playwright/test'

// UX-303: portfolio cloud isolation, presentation layer.
// Server scoping (session user filter on GET, session-bound user_id on PUT)
// and table-layer RLS isolation are proven separately by live real-account
// A/B tests and route-code review; this spec proves the UI layer renders
// per-session server data without leaking across accounts, explains the
// logged-out state, and holds at three breakpoints. Cloud responses here
// are mocked with page.route; no real Supabase account is needed for the
// presentation assertions.
const PYTHON_DRAFT_KEY = 'kids-python-local-practice-v1:P0-U1-L02'
const PYTHON_CODE = 'def greet(name):\n    return "你好，" + name'
const CLOUD_ONLY_LESSON = 'P0-U1-L03'

test('Logged-out: local works shown, cloud section explains login, no cloud data', async ({ page }) => {
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, { key: PYTHON_DRAFT_KEY, value: { source: PYTHON_CODE, passed: false, savedAt: '2026-10-27T09:00:00.000Z' } })
  await page.route('**/api/practice/drafts', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({ status: 401, json: { error: 'authentication-required' } })
    } else {
      await route.fulfill({ status: 401, json: { error: 'authentication-required' } })
    }
  })
  await page.goto('/learn/portfolio')
  await expect(page.getByTestId('practice-item-P0-U1-L02')).toBeVisible()
  await expect(page.getByTestId('practice-item-P0-U1-L02')).toContainText('本机保存')
  await expect(page.getByTestId('cloud-drafts-status')).toContainText('需要登录账号后才能使用')
  await expect(page.getByTestId('cloud-drafts-status')).toContainText('不保存正式成绩')
  await page.getByTestId('cloud-upload-drafts').click()
  await expect(page.getByTestId('cloud-drafts-status')).toContainText('请先登录账号')
  await expect(page.locator('a[href="/auth/bind"]')).toBeVisible()
  await expect(page.getByText('仅在账号云端')).toHaveCount(0)
})

test('Cloud drafts render per-session: A view shows own cloud card, B view shows none of it', async ({ page }) => {
  let cloudDrafts: Array<{ lessonId: string; source: string; updatedAt: string }> = [
    { lessonId: CLOUD_ONLY_LESSON, source: 'print("cloud-a")', updatedAt: '2026-10-27T09:00:00.000Z' },
  ]
  await page.route('**/api/practice/drafts', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({ json: { drafts: cloudDrafts } })
    } else {
      await route.fulfill({ json: { ok: true } })
    }
  })
  await page.goto('/learn/portfolio')
  await expect(page.getByTestId(`practice-item-${CLOUD_ONLY_LESSON}`)).toBeVisible()
  await expect(page.getByTestId(`practice-item-${CLOUD_ONLY_LESSON}`)).toContainText('仅在账号云端')
  // Simulate switching to account B: the server now returns no drafts.
  cloudDrafts = []
  await page.reload()
  await expect(page.getByTestId(`practice-item-${CLOUD_ONLY_LESSON}`)).toHaveCount(0)
  await expect(page.getByText('仅在账号云端')).toHaveCount(0)
})

test('Portfolio holds at 1440, 768 and 375 with no horizontal overflow', async ({ page }, testInfo) => {
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, { key: PYTHON_DRAFT_KEY, value: { source: PYTHON_CODE, passed: false, savedAt: '2026-10-27T09:00:00.000Z' } })
  await page.route('**/api/practice/drafts', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({ json: { drafts: [{ lessonId: CLOUD_ONLY_LESSON, source: 'print("cloud-a")', updatedAt: '2026-10-27T09:00:00.000Z' }] } })
    } else {
      await route.fulfill({ json: { ok: true } })
    }
  })
  await page.goto('/learn/portfolio')
  for (const [width, height] of [[1440, 900], [768, 1024], [375, 812]] as const) {
    await page.setViewportSize({ width, height })
    await expect(page.getByTestId('practice-item-P0-U1-L02')).toBeVisible()
    await expect(page.getByTestId(`practice-item-${CLOUD_ONLY_LESSON}`)).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
    await page.screenshot({ path: testInfo.outputPath(`portfolio-ux303-${width}x${height}.png`) })
  }
})
