import { expect, test } from '@playwright/test'

// CLOUD-102: cross-device draft recovery, portfolio (Python) presentation layer.
// Server scoping (session user filter on GET, session-bound user_id on PUT)
// and table-layer cross-device reads (device 1 PUT, device 2 fresh login GET)
// are proven separately by live real-account A/B tests on the machine stack;
// this spec proves the UI layer: failure shows an explicit retry prompt with
// the button still clickable, and a device-2 session restores a newer cloud
// draft into local works. Cloud responses here are mocked with page.route;
// no real Supabase account is needed for the presentation assertions.
const PYTHON_DRAFT_KEY = 'kids-python-local-practice-v1:P0-U1-L02'
const PYTHON_CODE = 'def greet(name):\n    return "你好，" + name'
const CLOUD_ONLY_LESSON = 'P0-U1-L03'

test('Upload failure shows an explicit retry prompt and the button stays clickable', async ({ page }) => {
  page.on('dialog', (dialog) => void dialog.accept())
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, { key: PYTHON_DRAFT_KEY, value: { source: PYTHON_CODE, passed: false, savedAt: '2026-10-27T09:00:00.000Z' } })
  await page.route('**/api/practice/drafts', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({ json: { drafts: [] } })
    } else {
      await route.fulfill({ status: 503, json: { error: 'cloud-draft-storage-unavailable' } })
    }
  })
  await page.goto('/learn/portfolio')
  await expect(page.getByTestId('cloud-upload-drafts')).toBeEnabled()
  await page.getByTestId('cloud-upload-drafts').click()
  await expect(page.getByTestId('cloud-drafts-status')).toContainText('可再次点击上传重试')
  await expect(page.getByTestId('cloud-upload-drafts')).toBeEnabled()
})

test('Restore failure shows an explicit retry prompt and the button stays clickable', async ({ page }) => {
  page.on('dialog', (dialog) => void dialog.accept())
  await page.route('**/api/practice/drafts', async (route) => {
    await route.fulfill({ status: 503, json: { error: 'cloud-draft-storage-unavailable' } })
  })
  await page.goto('/learn/portfolio')
  await expect(page.getByTestId('cloud-restore-drafts')).toBeEnabled()
  await page.getByTestId('cloud-restore-drafts').click()
  await expect(page.getByTestId('cloud-drafts-status')).toContainText('可再次点击恢复重试')
  await expect(page.getByTestId('cloud-restore-drafts')).toBeEnabled()
})

test('Device 2 restores a newer cloud draft into local works', async ({ page }) => {
  page.on('dialog', (dialog) => void dialog.accept())
  await page.route('**/api/practice/drafts', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({ json: { drafts: [{ lessonId: CLOUD_ONLY_LESSON, source: 'print(device1)', updatedAt: '2026-10-27T10:00:00.000Z' }] } })
    } else {
      await route.fulfill({ json: { ok: true } })
    }
  })
  await page.goto('/learn/portfolio')
  await expect(page.getByTestId('cloud-restore-drafts')).toBeEnabled()
  await page.getByTestId('cloud-restore-drafts').click()
  await expect(page.getByTestId('cloud-drafts-status')).toContainText('已恢复 1 份较新的代码草稿')
  await expect(page.getByTestId(`practice-item-${CLOUD_ONLY_LESSON}`)).toBeVisible()
})
