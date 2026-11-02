import { expect, test } from '@playwright/test'

// A1-U1-L06: second-batch re-verification for the fruit classifier. The page
// runs real Pyodide Python in the shared sandboxed iframe against six FIXED
// synthetic samples (S1-S6), disjoint from the original 30-row table.
// Matrices are computed by the page from the sandbox's per-row printed
// judgments, never hand-filled. The taught rules run untouched are the
// untuned re-verification; edited rules are labelled practice records.
// S1-S6 are fixed synthetic re-verification data: they are NOT a strict
// blind test and NOT a generalization accuracy estimate.
const ROUTE = '/learn/ai-python-lab-u1-l06/A1-U1-L06'

test.describe('A1-U1-L06 second-batch re-verification', () => {
  test('page loads with its heading and the second-batch dataset', async ({ page }) => {
    await page.goto(ROUTE)
    await expect(page.getByTestId('ai-u1-l06-lab')).toBeVisible()
    await expect(page.getByTestId('ai-u1-l06-lesson-heading')).toContainText('A1-U1-L06')
    await expect(page.getByTestId('ai-u1-l06-dataset')).toBeVisible()
    await expect(page.getByTestId('ai-u1-l06-dataset')).toContainText('S1')
    await expect(page.getByTestId('ai-u1-l06-dataset')).toContainText('S6')
  })

  test('v2 untuned run produces the program-computed 5/6 second-batch matrix with the S2 miss', async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto(ROUTE)
    await expect(page.getByTestId('ai-u1-l06-run-v2')).toBeEnabled({ timeout: 15_000 })
    await page.getByTestId('ai-u1-l06-run-v2').click()
    await expect(page.getByTestId('ai-u1-l06-matrix-v2')).toContainText('第二批：5/6', { timeout: 70_000 })
    await expect(page.getByTestId('ai-u1-l06-matrix-v2')).toContainText('S2')
    await expect(page.getByTestId('ai-u1-l06-clean-label-v2')).toContainText('未用于调规则的复验')
  })

  test('v1 run produces 4/6 with the S1 and S2 misses', async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto(ROUTE)
    await expect(page.getByTestId('ai-u1-l06-run-v1')).toBeEnabled({ timeout: 15_000 })
    await page.getByTestId('ai-u1-l06-run-v1').click()
    await expect(page.getByTestId('ai-u1-l06-matrix-v1')).toContainText('第二批：4/6', { timeout: 70_000 })
    await expect(page.getByTestId('ai-u1-l06-matrix-v1')).toContainText('S1')
    await expect(page.getByTestId('ai-u1-l06-matrix-v1')).toContainText('S2')
  })

  test('draft restore keeps practice eligibility after refresh and reset-to-default', async ({ page }) => {
    await page.goto(ROUTE)
    await expect(page.getByTestId('ai-u1-l06-draft-status')).toContainText('规则 v1：未改动')
    await page.getByTestId('ai-u1-l06-rule-v1').fill('def classify(color, weight):\n    return "橙子"')
    await page.waitForFunction(
      () => (window.localStorage.getItem('a1-u1-l06-draft-v1') ?? '').includes('"v1":true'),
    )
    await page.reload()
    await expect(page.getByTestId('ai-u1-l06-draft-status')).toContainText('规则 v1：已改动（复验资格：练习记录）')
    await page.getByTestId('ai-u1-l06-reset-v1').click()
    await expect(page.getByTestId('ai-u1-l06-rule-v1')).toHaveValue(
      'def classify(color, weight):\n    if color == "黄":\n        return "香蕉"\n    if color == "橙":\n        return "橙子"\n    return "苹果"',
    )
    await expect(page.getByTestId('ai-u1-l06-draft-status')).toContainText('规则 v1：已改动（复验资格：练习记录）')
    await page.reload()
    await expect(page.getByTestId('ai-u1-l06-draft-status')).toContainText('规则 v1：已改动（复验资格：练习记录）')
  })

  test('storage failure shows a not-saved notice instead of silently dropping the edit', async ({ page }) => {
    await page.addInitScript(() => {
      const orig = Storage.prototype.setItem
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'a1-u1-l06-draft-v1') throw new Error('storage denied')
        return orig.call(this, key, value)
      }
    })
    await page.goto(ROUTE)
    await expect(page.getByTestId('ai-u1-l06-draft-status')).toContainText('规则 v1：未改动')
    await page.getByTestId('ai-u1-l06-rule-v1').fill('def classify(color, weight):\n    return "橙子"')
    await expect(page.getByTestId('ai-u1-l06-draft-status')).toContainText('未能保存')
  })
})

test.describe('A1-U1-L06 narrow-screen overflow regression', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true })

  test('CDN failure on a narrow screen shows the error without horizontal overflow', async ({ page }) => {
    // Regression: the CDN-failure error text contains a 58-char unbroken
    // jsDelivr URL. Without break-words it spills out of the error box and
    // pushes document scrollWidth to 380 on a 375 viewport.
    await page.route('**/cdn.jsdelivr.net/**', (route) => route.abort())
    await page.goto(ROUTE)
    await expect(page.getByTestId('ai-u1-l06-run-v2')).toBeEnabled({ timeout: 30_000 })
    await page.getByTestId('ai-u1-l06-run-v2').click()
    await expect(page.getByTestId('ai-u1-l06-error')).toBeVisible({ timeout: 120_000 })
    const overflow = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth }))
    expect(overflow.scrollW).toBeLessThanOrEqual(overflow.innerW)
  })
})
