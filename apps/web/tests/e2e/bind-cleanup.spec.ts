import { expect, test } from '@playwright/test'

import {
  ONBOARDING_SESSION_STORAGE_KEY,
  GUEST_PROGRESS_STORAGE_KEY,
  seedGuestProgress,
  seedOnboardingSession,
} from './_fixtures/progress'

async function mockSupabaseAuthSuccess(page: import('@playwright/test').Page) {
  // The GoTrue client fetches settings on init and appends query strings to
  // otp/verify, so match by path via RegExp rather than exact glob.
  await page.route(/\/auth\/v1\/settings/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ external: { email: true, phone: true } }),
    })
  })
  await page.route(/\/auth\/v1\/otp/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
  await page.route(/\/auth\/v1\/verify/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'fake-access-token',
        refresh_token: 'fake-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: { id: 'fake-user-id', email: 'family@example.com' },
      }),
    })
  })
}

test.describe('bind account local cleanup', () => {
  test('clears kc-progress and kc-onboarding after a successful bind', async ({
    page,
  }) => {
    await seedGuestProgress(page)
    await seedOnboardingSession(page)
    await mockSupabaseAuthSuccess(page)

    await page.route(/\/api\/bind-account$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.goto('/auth/bind')

    await page.getByLabel('邮箱或手机号').fill('family@example.com')
    await page.getByRole('button', { name: '发送验证码' }).click()
    await expect(page.getByTestId('bind-account-submit')).toBeVisible()

    await page.getByLabel('验证码').fill('123456')
    await page.getByTestId('bind-account-submit').click()

    await page.waitForURL('**/parent/overview', { timeout: 10_000 })

    expect(
      await page.evaluate(
        (k) => window.localStorage.getItem(k),
        GUEST_PROGRESS_STORAGE_KEY,
      ),
    ).toBeNull()
    expect(
      await page.evaluate(
        (k) => window.localStorage.getItem(k),
        ONBOARDING_SESSION_STORAGE_KEY,
      ),
    ).toBeNull()
  })

  test('keeps local data when the bind-account API fails', async ({ page }) => {
    await seedGuestProgress(page)
    await seedOnboardingSession(page)
    await mockSupabaseAuthSuccess(page)

    await page.route(/\/api\/bind-account$/, async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'missing-guest-snapshot' }),
      })
    })

    await page.goto('/auth/bind')

    await page.getByLabel('邮箱或手机号').fill('family@example.com')
    await page.getByRole('button', { name: '发送验证码' }).click()
    await page.getByLabel('验证码').fill('123456')
    await page.getByTestId('bind-account-submit').click()

    await expect(page.getByTestId('bind-account-error')).toBeVisible()

    expect(
      await page.evaluate(
        (k) => window.localStorage.getItem(k),
        GUEST_PROGRESS_STORAGE_KEY,
      ),
    ).not.toBeNull()
    expect(
      await page.evaluate(
        (k) => window.localStorage.getItem(k),
        ONBOARDING_SESSION_STORAGE_KEY,
      ),
    ).not.toBeNull()
  })

  test('keeps local data when otp verification fails', async ({ page }) => {
    await seedGuestProgress(page)
    await seedOnboardingSession(page)

    await page.route(/\/auth\/v1\/settings/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ external: { email: true, phone: true } }),
      })
    })
    await page.route(/\/auth\/v1\/otp/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.route(/\/auth\/v1\/verify/, async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
    })

    await page.goto('/auth/bind')

    await page.getByLabel('邮箱或手机号').fill('family@example.com')
    await page.getByRole('button', { name: '发送验证码' }).click()
    await page.getByLabel('验证码').fill('000000')
    await page.getByTestId('bind-account-submit').click()

    await expect(page.getByTestId('bind-account-error')).toBeVisible()

    expect(
      await page.evaluate(
        (k) => window.localStorage.getItem(k),
        GUEST_PROGRESS_STORAGE_KEY,
      ),
    ).not.toBeNull()
    expect(
      await page.evaluate(
        (k) => window.localStorage.getItem(k),
        ONBOARDING_SESSION_STORAGE_KEY,
      ),
    ).not.toBeNull()
  })
})
