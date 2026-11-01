import { expect, test } from '@playwright/test'

// A1-U1 ai-python pilot trial: the L01→L05 fruit-classifier line runs real
// Pyodide Python in the shared sandboxed iframe. Matrices are computed by
// the page from the sandbox's per-row printed judgments, never hand-filled.
// L06 (second-batch re-verification) is not in this pilot.
const ROUTE = '/learn/ai-python-lab/A1-U1-L01'

test.describe('A1-U1 ai-python pilot trial', () => {
  test('v1 run produces the program-computed 5/6 test matrix with the T2 miss', async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto(ROUTE)
    await expect(page.getByTestId('ai-python-lab')).toBeVisible()
    await expect(page.getByTestId('ai-python-dataset')).toBeVisible()
    await expect(page.getByTestId('ai-python-run-v1')).toBeEnabled({ timeout: 15_000 })
    await page.getByTestId('ai-python-run-v1').click()
    await expect(page.getByTestId('ai-python-matrix-v1')).toContainText('测试：5/6', { timeout: 70_000 })
    await expect(page.getByTestId('ai-python-matrix-v1')).toContainText('T2')
  })

  test('v2 run produces 6/6 labelled as a practice record, not a final score', async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto(ROUTE)
    await expect(page.getByTestId('ai-python-run-v2')).toBeEnabled({ timeout: 15_000 })
    await page.getByTestId('ai-python-run-v2').click()
    await expect(page.getByTestId('ai-python-matrix-v2')).toContainText('测试：6/6', { timeout: 70_000 })
    await expect(page.getByTestId('ai-python-v2-practice-label')).toContainText('练习记录，已污染，不作最终成绩')
  })

  test('L05 route loads with its stage heading', async ({ page }) => {
    await page.goto('/learn/ai-python-lab/A1-U1-L05')
    await expect(page.getByTestId('ai-python-lab')).toBeVisible()
    await expect(page.getByTestId('ai-python-lesson-heading')).toContainText('A1-U1-L05')
  })
})
