import { expect, test } from '@playwright/test'

// A0-U1-L01 classify trial: the React widget judges reasons by presence only.
// It never claims to grade reason quality.
const ROUTE = '/learn/classify-lab/A0-U1-L01'

const EXPECTED: Record<string, 'ai' | 'traditional' | 'non_digital'> = {
  'nav-software': 'ai',
  calculator: 'traditional',
  'paper-ruler': 'non_digital',
  'photo-flower': 'ai',
  'alarm-clock': 'traditional',
  notebook: 'non_digital',
}

async function pickTool(page: import('@playwright/test').Page, toolId: string, category: string) {
  await page.getByTestId(`classify-tool-${toolId}-bucket-${category}`).click()
  await expect(page.getByTestId(`classify-tool-${toolId}-bucket-${category}`)).toHaveAttribute('aria-pressed', 'true')
}

async function fillToolReason(page: import('@playwright/test').Page, toolId: string, reason: string) {
  await page.getByTestId(`classify-tool-${toolId}-reason`).fill(reason)
}

test.describe('A0-U1-L01 classify trial', () => {
  test('all six correct with reasons pass', async ({ page }) => {
    await page.goto(ROUTE)
    await expect(page.getByTestId('classify-lab')).toBeVisible()
    for (const [toolId, category] of Object.entries(EXPECTED)) {
      await pickTool(page, toolId, category)
      await fillToolReason(page, toolId, `因为${toolId}符合分类规则`)
    }
    await page.getByTestId('classify-submit').click()
    await expect(page.getByTestId('classify-result')).toHaveText(/通过：6\/6 项分类有依据/)
  })

  test('a right category without a reason does not count', async ({ page }) => {
    await page.goto(ROUTE)
    for (const [toolId, category] of Object.entries(EXPECTED)) {
      await pickTool(page, toolId, category)
      if (toolId !== 'alarm-clock' && toolId !== 'notebook') {
        await fillToolReason(page, toolId, `因为${toolId}符合分类规则`)
      }
    }
    await page.getByTestId('classify-submit').click()
    await expect(page.getByTestId('classify-result')).toHaveText(/未通过：4\/6 项分类有依据/)
    await expect(page.getByTestId('classify-tool-alarm-clock-feedback')).toContainText('理由')
    await expect(page.getByTestId('classify-tool-notebook-feedback')).toContainText('理由')
  })

  test('the sounding radio classified as ai fails with a hint', async ({ page }) => {
    await page.goto(ROUTE)
    await page.getByTestId('classify-counterexample-bucket-ai').click()
    await page.getByTestId('classify-counterexample-reason').fill('它会出声')
    await page.getByTestId('classify-submit').click()
    await expect(page.getByTestId('classify-counterexample-feedback')).toContainText('会发声不等于 AI')
  })

  test('a creative example without a reason is rejected', async ({ page }) => {
    await page.goto(ROUTE)
    await page.getByTestId('classify-creative-name').fill('会唱歌的台灯')
    await page.getByTestId('classify-creative-bucket-ai').click()
    await page.getByTestId('classify-submit').click()
    await expect(page.getByTestId('classify-creative-feedback')).toContainText('需要写出理由')
  })

  test('closing and reopening keeps the draft', async ({ page, context }) => {
    await page.goto(ROUTE)
    await pickTool(page, 'nav-software', 'ai')
    await fillToolReason(page, 'nav-software', '草稿理由')
    await page.waitForFunction(() =>
      (window.localStorage.getItem('kidscoding:classify-draft:A0-U1-L01') ?? '').includes('草稿理由'),
    )
    await page.close()
    const reopened = await context.newPage()
    await reopened.goto(ROUTE)
    await expect(reopened.getByTestId('classify-tool-nav-software-bucket-ai')).toHaveAttribute('aria-pressed', 'true')
    await expect(reopened.getByTestId('classify-tool-nav-software-reason')).toHaveValue('草稿理由')
    await reopened.close()
  })
})
