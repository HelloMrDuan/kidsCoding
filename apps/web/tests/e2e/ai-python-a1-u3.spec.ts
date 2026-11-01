import { expect, test } from '@playwright/test'

test.describe('A1-U3 local-plane pilot (no sandbox: all outputs are synchronous)', () => {
  test('L01 route loads and the default refusal case shows gate ① failure', async ({ page }) => {
    await page.goto('/learn/ai-python-lab-u3/A1-U3-L01')
    await expect(page.getByTestId('u3-local-lab')).toBeVisible()
    await expect(page.getByTestId('u3-lesson-title')).toContainText('A1-U3-L01')
    await expect(page.getByTestId('u3-gate-output')).toContainText('拒绝')
    await expect(page.getByTestId('u3-gate-output')).toContainText('门禁①失败')
    await expect(page.getByTestId('u3-gate-output')).toContainText('不能通过')
  })

  test('L03 type-error record shows failure with the type check named', async ({ page }) => {
    await page.goto('/learn/ai-python-lab-u3/A1-U3-L03')
    await expect(page.getByTestId('u3-json-output')).toContainText('失败')
    await expect(page.getByTestId('u3-json-output')).toContainText('类型正确')
  })

  test('L06 drill totals are answered 6 and refused 2, and an out-of-scope question refuses', async ({
    page,
  }) => {
    await page.goto('/learn/ai-python-lab-u3/A1-U3-L06')
    await expect(page.getByTestId('u3-qa-drill')).toContainText('可答 6')
    await expect(page.getByTestId('u3-qa-drill')).toContainText('拒答 2')
    await page.getByTestId('u3-ask-Q7').click()
    await expect(page.getByTestId('u3-qa-answer')).toContainText('拒答')
    await expect(page.getByTestId('u3-qa-answer')).toContainText('超出课节限定任务')
    await expect(page.getByTestId('u3-qa-log')).toContainText('已拒答 1')
  })

  test('L05 route loads with its lesson heading', async ({ page }) => {
    await page.goto('/learn/ai-python-lab-u3/A1-U3-L05')
    await expect(page.getByTestId('u3-lesson-title')).toContainText('A1-U3-L05')
    await expect(page.getByTestId('u3-citation-output')).toContainText('通过')
  })
})
