import { expect, test, type Page } from '@playwright/test'

async function add(page: Page, type: string, times = 1) {
  for (let i = 0; i < times; i += 1) await page.getByTestId(`lesson-add-${type}`).click()
}
async function runAndExpect(page: Page, tone: 'success' | 'error', text?: string) {
  await page.getByTestId('grid-run').click()
  const feedback = page.getByTestId('grid-feedback')
  await expect(feedback).toHaveAttribute('data-tone', tone, { timeout: 15_000 })
  if (text) await expect(feedback).toContainText(text)
}
async function next(page: Page) {
  await page.getByTestId('lesson-complete-step').click()
}

test('G0-U1-L01 grid lesson: real failure, layered hint, four real passes, saved and reopened', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/learn/catalog/G0-U1-L01')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('grid-trial-entry').click()
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()

  // Step 1: the starter arrow has no start → the fox must not move.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toHaveAttribute('data-tone', 'warning')
  await runAndExpect(page, 'error', '开始时')
  await expect(page.getByText(/第 1 层/)).toBeVisible()
  await page.getByTestId('grid-more-hint').click()
  await expect(page.getByText(/第 2 层/)).toBeVisible()
  await add(page, 'when_start')
  await runAndExpect(page, 'success')
  await next(page)

  // Step 2: either arrow type works; one short is a specific failure.
  await add(page, 'when_start')
  await add(page, 'move_forward', 2)
  await runAndExpect(page, 'error', '还没到蘑菇屋')
  await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: overshooting falls into the river.
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 3)
  await runAndExpect(page, 'error', '小河')
  await page.getByTestId('lesson-remove-last').click()
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: a loose block from the starter program is reported, then fixed.
  await runAndExpect(page, 'error', '掉队')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 3)
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await page.getByTestId('grid-replay-mushroom-house').click()
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
  await runAndExpect(page, 'success') // the saved forward×3 program is restored, not a fixed answer
})

test('G0-U1-L02 and L03: river crash and one-step-too-far are diagnosed, then fixed', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/learn/grid-lab/G0-U1-L02')
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 2)
  await runAndExpect(page, 'error', '哪一边')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'move_up', 2)
  await runAndExpect(page, 'success')

  await page.goto('/learn/grid-lab/G0-U1-L03')
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 4)
  await runAndExpect(page, 'error', '位置不对')
  await page.getByTestId('lesson-remove-last').click()
  await runAndExpect(page, 'success')
})
