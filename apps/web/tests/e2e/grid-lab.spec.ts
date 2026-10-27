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

test('G0-U1-L02 formal course: wrong-way error lab, two practices, pick a friend, review, saved and reopened', async ({ page }) => {
  test.setTimeout(150_000)
  await page.goto('/learn/grid-lab/G0-U1-L02')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  // Original story scenery: the forest post office with its four-way signpost.
  await expect(page.locator('[data-grid-item="signpost"]')).toBeVisible()

  // Step 1 — error lab: the starter walks DOWN although the house is UP. Predict (wrongly), run as-is, compare.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await page.getByTestId('grid-predict-choice-0').click()
  await expect(page.getByTestId('grid-predict-choice-0')).toHaveAttribute('aria-pressed', 'true')
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('猜错也没关系')
  await expect(page.getByTestId('grid-feedback')).toContainText('走出了地图')
  await expect(page.getByText(/第 1 层/)).toBeVisible()
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'move_up', 2)
  await runAndExpect(page, 'success')
  await next(page)

  // Guided: one cell too far is a specific failure, then the corner route passes.
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 3)
  await add(page, 'move_up', 2)
  await runAndExpect(page, 'error', '还没到')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'move_up', 2)
  await add(page, 'move_right_cell', 2)
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: cutting through the river fails; the dry route passes.
  await add(page, 'when_start')
  await add(page, 'move_up')
  await add(page, 'move_right_cell')
  await runAndExpect(page, 'error', '小河')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'move_up', 3)
  await add(page, 'move_right_cell', 4)
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: the friend's route crashes into the river; rebuild it.
  await runAndExpect(page, 'error', '小河')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 3)
  await add(page, 'move_up', 2)
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: pick who gets the letter first; a route for one friend doesn't reach another.
  await expect(page.getByTestId('grid-creative')).toContainText('这封信送给谁')
  await page.getByTestId('grid-run').click()
  await expect(page.getByTestId('grid-feedback')).toContainText('先选一格')
  await page.getByTestId('grid-goal-choice-0').click() // 小熊 · 右上角
  await expect(page.getByTestId('grid-goal-choice-0')).toHaveAttribute('aria-pressed', 'true')
  await add(page, 'when_start')
  await add(page, 'move_up', 2)
  await runAndExpect(page, 'error', '还没到')
  await page.getByTestId('grid-goal-choice-1').click() // 小兔 · 正上方
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘: the mistakes this child really met, plus the what-if answer.
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('走出了地图')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('掉进小河')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('向左走一格')
  await expect(page.getByTestId('grid-project-status')).toHaveText('真实运行能走到蘑菇屋')
  await expect(page.getByTestId('grid-project-steps').locator('li')).toHaveCount(3)
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the work and its chosen friend come back and replay for real.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('走出了地图')
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-card').getByTestId('grid-stage')).toHaveAttribute('data-fox-cell', '0,0', { timeout: 15_000 })

  // Modify after reopening: send to 小熊 instead; the old route no longer counts until rebuilt.
  await page.getByTestId('grid-replay-my-route-card').click()
  await expect(page.getByTestId('grid-goal-choice-1')).toHaveAttribute('data-chosen', 'true')
  await page.getByTestId('grid-goal-choice-0').click()
  await runAndExpect(page, 'error')
  await add(page, 'move_right_cell', 3)
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
})

test('G0-U1-L03 formal course: one-short error lab, two practices, place the house either side, review, saved and reopened', async ({ page }) => {
  test.setTimeout(150_000)
  await page.goto('/learn/grid-lab/G0-U1-L03')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  // Original story scenery: the squirrel's counting board with three acorns.
  await expect(page.locator('[data-grid-item="counting"]')).toBeVisible()

  // Step 1 — error lab: two blocks for a three-cell walk. Predict, run as-is, compare, add the missing block.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await page.getByTestId('grid-predict-choice-0').click()
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('猜错也没关系')
  await expect(page.getByTestId('grid-feedback')).toContainText('前面一格')
  await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Guided: five cells; one short is diagnosed, then fixed.
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 4)
  await runAndExpect(page, 'error', '位置不对')
  await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: facing left, “向右” walks off the map; “向前” follows the face.
  await add(page, 'when_start')
  await add(page, 'move_right_cell')
  await runAndExpect(page, 'error', '出了地图')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'move_forward', 2)
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: one step too far; undo the last block.
  await runAndExpect(page, 'error', '位置不对')
  await page.getByTestId('lesson-remove-last').click()
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: put the house on the LEFT; counting to the right lands on the wrong cell, counting left passes.
  await page.getByTestId('grid-run').click()
  await expect(page.getByTestId('grid-feedback')).toContainText('先选一格')
  await page.getByTestId('grid-goal-choice-1').click() // 第 1 格（左边 3 格）
  await expect(page.getByTestId('grid-goal-choice-1')).toHaveAttribute('aria-pressed', 'true')
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 3)
  await runAndExpect(page, 'error', '位置不对')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'move_left', 3)
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘: the mistakes this child really met.
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('没走到目标')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('走出了地图')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('撤回最后一块')
  await expect(page.getByTestId('grid-project-status')).toHaveText('真实运行能走到蘑菇屋')
  await expect(page.getByTestId('grid-project-steps').locator('li')).toHaveCount(4)
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the card replays for real to the child's own house.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-card').getByTestId('grid-stage')).toHaveAttribute('data-fox-cell', '0,0', { timeout: 15_000 })

  // Modify after reopening: move the house one cell closer; the old count is one too many.
  await page.getByTestId('grid-replay-my-count-card').click()
  await expect(page.getByTestId('grid-goal-choice-1')).toHaveAttribute('data-chosen', 'true')
  await page.getByTestId('grid-goal-choice-3').click() // 第 2 格（左边 2 格）
  await runAndExpect(page, 'error')
  await page.getByTestId('lesson-remove-last').click()
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
})

test('G0-U1-L04 formal course: turn-in-place error lab, two practices, detour to a friend, review, saved and reopened', async ({ page }) => {
  test.setTimeout(170_000)
  await page.goto('/learn/catalog/G0-U1-L04')
  await page.getByTestId('grid-trial-entry').click()
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  // Original story scenery: the crossroads turn sign beside a small rock.
  await expect(page.locator('[data-grid-item="turnsign"]')).toBeVisible()

  // Step 1 — error lab: a lone “向左转” turns the fox but it never walks.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await page.getByTestId('grid-predict-choice-0').click()
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('猜错也没关系')
  await expect(page.getByTestId('grid-feedback')).toContainText('站在原地')
  await expect(page.getByTestId('grid-stage')).toHaveAttribute('data-fox-facing', 'up')
  await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await next(page)

  // Guided: straight ahead hits the rock; the detour passes.
  await add(page, 'when_start')
  await add(page, 'move_forward', 2)
  await runAndExpect(page, 'error', '撞到石头')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'move_forward'); await add(page, 'turn_left'); await add(page, 'move_forward'); await add(page, 'turn_right'); await add(page, 'move_forward', 3)
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: only the middle row has a bridge.
  await add(page, 'when_start')
  await add(page, 'move_forward', 2)
  await runAndExpect(page, 'error', '小河')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'turn_left'); await add(page, 'move_forward'); await add(page, 'turn_right'); await add(page, 'move_forward', 4); await add(page, 'turn_left'); await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: the friend's turns are swapped; rebuild with the right turns.
  await runAndExpect(page, 'error', '撞到石头')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'move_forward'); await add(page, 'turn_left'); await add(page, 'move_forward'); await add(page, 'turn_right'); await add(page, 'move_forward', 3)
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: pick the friend behind the rock; straight hits the rock, the detour passes.
  await page.getByTestId('grid-run').click()
  await expect(page.getByTestId('grid-feedback')).toContainText('先选一格')
  await page.getByTestId('grid-goal-choice-0').click() // 小熊 · 石头后面
  await add(page, 'when_start')
  await add(page, 'move_forward', 2)
  await runAndExpect(page, 'error', '撞到石头')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'move_forward'); await add(page, 'turn_left'); await add(page, 'move_forward'); await add(page, 'turn_right'); await add(page, 'move_forward', 2); await add(page, 'turn_right'); await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘: the mistakes this child really met.
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('撞到石头')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('掉进小河')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('没走到目标')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('向右转')
  await expect(page.getByTestId('grid-project-steps').locator('li')).toHaveCount(9)
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the card replays for real behind the rock.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-card').getByTestId('grid-stage')).toHaveAttribute('data-fox-cell', '3,2', { timeout: 20_000 })

  // Modify after reopening: visit 小兔 instead; the old route no longer counts until rebuilt.
  await page.getByTestId('grid-replay-my-turn-card').click()
  await expect(page.getByTestId('grid-goal-choice-0')).toHaveAttribute('data-chosen', 'true')
  await page.getByTestId('grid-goal-choice-1').click() // 小兔 · 上排第二格
  await runAndExpect(page, 'error')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'turn_left'); await add(page, 'move_forward', 2); await add(page, 'turn_right'); await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
})

test('G0-U1-L05: key-before-door is judged by real runs', async ({ page }) => {
  test.setTimeout(60_000)
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
  // (G0-U1-L04 now opens with its error lab, so this uses L05's first step: walking into the locked door.)
  await page.goto('/learn/grid-lab/G0-U1-L05')
  await page.getByTestId('grid-read-instruction').click()
  await add(page, 'when_start')
  await add(page, 'move_right_cell', 4)
  await runAndExpect(page, 'error', '问题出在第 4 块')
  await page.getByTestId('grid-read-feedback').click()
  const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)
  expect(spoken[0]).toMatch(/^zh-CN\|第 1 关，捡钥匙，开门/)
  expect(spoken[1]).toMatch(/^zh-CN\|.*问题出在第 4 块/)
})
