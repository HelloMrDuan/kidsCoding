import { expect, test } from '@playwright/test'

// A1-U1-L06: second-batch re-verification for the fruit classifier. The page
// runs real Pyodide Python in the shared sandboxed iframe against six NEW
// synthetic samples (S1-S6), disjoint from the original 30-row table.
// Matrices are computed by the page from the sandbox's per-row printed
// judgments, never hand-filled. The taught rules run untouched are the clean
// re-verification; edited rules are labelled practice records.
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

  test('v2 clean run produces the program-computed 5/6 second-batch matrix with the S2 miss', async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto(ROUTE)
    await expect(page.getByTestId('ai-u1-l06-run-v2')).toBeEnabled({ timeout: 15_000 })
    await page.getByTestId('ai-u1-l06-run-v2').click()
    await expect(page.getByTestId('ai-u1-l06-matrix-v2')).toContainText('第二批：5/6', { timeout: 70_000 })
    await expect(page.getByTestId('ai-u1-l06-matrix-v2')).toContainText('S2')
    await expect(page.getByTestId('ai-u1-l06-clean-label-v2')).toContainText('干净复验')
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
})
