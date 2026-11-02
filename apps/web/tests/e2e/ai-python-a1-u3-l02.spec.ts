import { expect, test } from '@playwright/test'

const ROUTE = '/learn/ai-python-lab-u3-l02/A1-U3-L02'

async function overflow(page: import('@playwright/test').Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}

test.describe('A1-U3-L02 lesson page', () => {
  test('full passage, summary exercise and three checks', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await expect(page.getByTestId('ai-u3-l02-lesson-heading')).toContainText('实现文本摘要')
    await expect(page.getByTestId('ai-u3-l02-passage')).toContainText('颜色是本数据集的主特征')
    await expect(page.getByTestId('ai-u3-l02-passage')).toContainText('两栏成绩要分开写')
    await page.getByTestId('ai-u3-l02-pick-P1-1').check()
    await page.getByTestId('ai-u3-l02-pick-P3-1').check()
    await page.getByTestId('ai-u3-l02-pick-P4-1').check()
    await page.getByTestId('ai-u3-l02-check-summary').click()
    const checks = page.getByTestId('ai-u3-l02-summary-checks')
    await expect(checks).toContainText('漏要点：通过')
    await expect(checks).toContainText('添内容：通过')
    await expect(checks).toContainText('改原意：通过')
  })

  test('bad summary fails the missing-point check', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l02-pick-P1-1').check()
    await page.getByTestId('ai-u3-l02-pick-P3-1').check()
    await page.getByTestId('ai-u3-l02-check-summary').click()
    await expect(page.getByTestId('ai-u3-l02-summary-checks')).toContainText('漏要点：失败')
  })

  test('fact check classifies all six statements', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    const answers: Record<string, string> = {
      F1: '原文事实',
      F2: '原文事实',
      G1: '合理概括',
      G2: '合理概括',
      U1: '无依据推断',
      U2: '无依据推断',
    }
    for (const [id, kind] of Object.entries(answers)) {
      await page.getByTestId(`ai-u3-l02-fact-${id}`).selectOption(kind)
    }
    await page.getByTestId('ai-u3-l02-check-facts').click()
    await expect(page.getByTestId('ai-u3-l02-fact-score')).toContainText('6 / 6 条正确')
    await expect(page.getByTestId('ai-u3-l02-fact-result-U1')).toContainText('正确：无依据推断')
  })

  test('three-level hints reveal progressively', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l02-hint-1').click()
    await expect(page.getByTestId('ai-u3-l02-hint-text')).toContainText('先读每段第一句')
    await expect(page.getByTestId('ai-u3-l02-hint-text')).not.toContainText('逐句回原文查三项')
    await page.getByTestId('ai-u3-l02-hint-3').click()
    await expect(page.getByTestId('ai-u3-l02-hint-text')).toContainText('逐句回原文查三项')
  })

  test('draft saves and restores across reload; restore-default clears', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l02-pick-P1-1').check()
    await page.getByTestId('ai-u3-l02-fact-F1').selectOption('原文事实')
    await page.reload()
    await expect(page.getByTestId('ai-u3-l02-pick-P1-1')).toBeChecked()
    await expect(page.getByTestId('ai-u3-l02-fact-F1')).toHaveValue('原文事实')
    await page.getByTestId('ai-u3-l02-reset').click()
    await expect(page.getByTestId('ai-u3-l02-pick-P1-1')).not.toBeChecked()
    await expect(page.getByTestId('ai-u3-l02-fact-F1')).toHaveValue('')
  })
})

test.describe('A1-U3-L02 narrow screen', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true })
  test('375px: no horizontal overflow before or after interaction', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await expect(page.getByTestId('ai-u3-l02-lesson-heading')).toBeVisible()
    expect(await overflow(page)).toBe(false)
    await page.getByTestId('ai-u3-l02-pick-P1-1').tap()
    await page.getByTestId('ai-u3-l02-check-summary').tap()
    await expect(page.getByTestId('ai-u3-l02-summary-checks')).toBeVisible()
    expect(await overflow(page)).toBe(false)
  })
})
