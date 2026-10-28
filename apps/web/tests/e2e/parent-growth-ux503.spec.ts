import { expect, test } from '@playwright/test'

// UX-503: parent growth report, browser gate.
// The growth section only renders for a logged-in parent (server page,
// session-scoped queries). CI has no Supabase session harness, so this
// spec proves the real browser gate: logged-out visitors are redirected
// to bind and no growth report leaks to them. The logged-in rendering —
// knowledge groups, unregistered lessons, work links, consent card and
// three viewports — is proven by the page render tests
// (src/app/parent/overview/page.test.tsx, two accounts) and by the live
// real-account browser run on the InstaBox machine documented in
// docs/roadmap/evidence/UX-503/README.md, following the UX-303 precedent
// of live real-account verification outside CI.
test('Logged-out: redirected to bind, no growth report leaks', async ({
  page,
}) => {
  await page.goto('/parent/overview')
  await page.waitForURL('**/auth/bind')

  await expect(page).toHaveURL(/\/auth\/bind$/)
  await expect(page.getByTestId('growth-knowledge-report')).toHaveCount(0)
  await expect(page.getByTestId('growth-knowledge-group')).toHaveCount(0)
})
