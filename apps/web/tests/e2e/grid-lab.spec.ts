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

test('G0-U1-L01 formal course: error lab, two practices, creative remake, review, saved and reopened', async ({ page }) => {
  test.setTimeout(150_000)
  await page.goto('/learn/catalog/G0-U1-L01')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('grid-trial-entry').click()
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  // Original story scenery: the fox leaves a real illustrated treehouse, not a placeholder.
  await expect(page.locator('[data-grid-item="treehouse"]')).toBeVisible()
  // TQ-010: “回到起点” uses the decorative SVG icon, not the “↺” glyph; its name is the plain text.
  const reset = page.getByTestId('grid-reset')
  await expect(reset.locator('svg[data-testid="reset-icon"]')).toHaveAttribute('aria-hidden', 'true')
  await expect(reset).not.toContainText('↺')
  await expect(page.getByRole('button', { name: '回到起点', exact: true })).toHaveAttribute('data-testid', 'grid-reset')

  // Step 1 — error lab. Can't skip, and fixing before seeing the mistake doesn't count.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toHaveAttribute('data-tone', 'warning')
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await add(page, 'when_start')
  await page.getByTestId('grid-run').click()
  await expect(page.getByTestId('grid-feedback')).toHaveAttribute('data-tone', 'warning', { timeout: 15_000 })
  await next(page)
  await expect(page.getByTestId('lesson-complete-step')).toBeVisible()
  await expect(page.getByTestId('grid-feedback')).toContainText('先按原样运行一次')
  // Recover the planned mistake, predict (wrongly — never blocks), run, compare expected vs actual.
  await page.getByTestId('grid-restore-starter').click()
  await page.getByTestId('grid-predict-choice-0').click()
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('猜错也没关系')
  await expect(page.getByTestId('grid-feedback')).toContainText('一动不动')
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

  // Creative remake: must place the house first; then the child's own route to the child's own map.
  await expect(page.getByTestId('grid-creative')).toBeVisible()
  await page.getByTestId('grid-run').click()
  await expect(page.getByTestId('grid-feedback')).toContainText('先选一格')
  await page.getByTestId('grid-goal-choice-2').click() // 第 5 格 → 4 arrows
  await expect(page.getByTestId('grid-stage')).toBeVisible()
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 3)
  await runAndExpect(page, 'error', '还没到蘑菇屋')
  await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘 lists the mistakes this child really met; what-if answer on demand.
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('忘了“开始时”')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('掉进小河')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('再接一块箭头')
  await expect(page.getByTestId('grid-project-status')).toHaveText('真实运行能走到蘑菇屋')
  await expect(page.getByTestId('grid-project-steps').locator('li')).toHaveCount(5)

  // EDU-105: one-tap reflection is judged and saved with the lesson.
  await page.getByTestId('grid-reflection-option-1').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'false')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the work, its map, the review and the reflection all come back.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await expect(page.getByTestId('grid-reflection-option-0')).toHaveAttribute('data-chosen', 'true')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('掉进小河')
  await expect(page.getByTestId('grid-project-status')).toHaveText('真实运行能走到蘑菇屋')
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-card').getByTestId('grid-stage')).toHaveAttribute('data-fox-cell', '4,0', { timeout: 15_000 })

  // Modify after reopening: move the house; the old route no longer counts until re-run.
  await page.getByTestId('grid-replay-my-start-card').click()
  await expect(page.getByTestId('grid-goal-choice-2')).toHaveAttribute('data-chosen', 'true')
  await page.getByTestId('grid-goal-choice-1').click() // 第 4 格
  await runAndExpect(page, 'error')
  await page.getByTestId('lesson-remove-last').click()
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
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

test('G0-U1-L04 and L05: turning and key-before-door are judged by real runs', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/learn/catalog/G0-U1-L04')
  await page.getByTestId('grid-trial-entry').click()
  await add(page, 'when_start')
  await add(page, 'move_forward')
  await add(page, 'turn_right')
  await add(page, 'move_forward')
  await runAndExpect(page, 'error', '转错了方向')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'move_forward')
  await add(page, 'turn_left')
  await add(page, 'move_forward', 2)
  await runAndExpect(page, 'success')

  await page.goto('/learn/grid-lab/G0-U1-L05')
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 4)
  await runAndExpect(page, 'error', '门还锁着')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 2)
  await add(page, 'pick_key')
  await add(page, 'move_right_cell')
  await add(page, 'open_door')
  await add(page, 'move_right_cell', 2)
  await runAndExpect(page, 'success')
})

test('G0-U1-L06 unit project: own route card is saved, reopened and replayed', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/learn/grid-lab/G0-U1-L06')
  // Warm-up 1
  await add(page, 'when_start'); await add(page, 'move_right_cell', 2); await add(page, 'pick_key'); await add(page, 'move_up'); await add(page, 'open_door'); await add(page, 'move_right_cell', 2)
  await runAndExpect(page, 'success'); await next(page)
  // Warm-up 2
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_down'); await add(page, 'move_right_cell', 3); await add(page, 'move_up')
  await runAndExpect(page, 'success'); await next(page)
  // Practice A: the child's own route (forgetting the key first)
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_up', 3); await add(page, 'move_right_cell', 2); await add(page, 'open_door')
  await runAndExpect(page, 'error', '捡起钥匙')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_up', 3); await add(page, 'pick_key'); await add(page, 'move_right_cell', 2); await add(page, 'open_door'); await add(page, 'move_right_cell', 2)
  await runAndExpect(page, 'success'); await next(page)
  // Practice B: fix the friend's card
  await runAndExpect(page, 'error', '捡起钥匙')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'move_up', 3); await add(page, 'move_right_cell'); await add(page, 'pick_key'); await add(page, 'move_right_cell', 2); await add(page, 'open_door'); await add(page, 'move_right_cell', 2)
  await runAndExpect(page, 'success'); await next(page)

  const card = page.getByTestId('grid-project-card')
  await expect(card).toBeVisible()
  await expect(page.getByTestId('grid-project-status')).toContainText('真实运行能走到')
  await page.reload()
  await expect(card).toBeVisible()
  await expect(page.getByTestId('grid-project-steps').locator('li')).toHaveCount(11)
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-play')).toHaveText('▶ 播放我的森林寻路卡', { timeout: 15_000 })
})

test('EDU-105: instructions and diagnoses are read aloud in Chinese and point at the failing block', async ({ page }) => {
  test.setTimeout(60_000)
  await page.addInitScript(() => {
    const spoken: string[] = []
    ;(window as unknown as { __spoken: string[] }).__spoken = spoken
    class Utterance { lang = ''; rate = 1; pitch = 1; voice = null; onend: (() => void) | null = null; onerror = null; constructor(public text: string) {} }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true })
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel() {}, getVoices: () => [], speak(u: Utterance) { spoken.push(u.lang + '|' + u.text); setTimeout(() => u.onend?.(), 50) } } })
  })
  await page.goto('/learn/grid-lab/G0-U1-L04')
  await page.getByTestId('grid-read-instruction').click()
  await add(page, 'when_start')
  await add(page, 'move_forward', 3)
  await runAndExpect(page, 'error', '问题出在第 3 块')
  await page.getByTestId('grid-read-feedback').click()
  const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)
  expect(spoken[0]).toMatch(/^zh-CN\|第 1 关，第一次转弯/)
  expect(spoken[1]).toMatch(/^zh-CN\|.*问题出在第 3 块/)
})
