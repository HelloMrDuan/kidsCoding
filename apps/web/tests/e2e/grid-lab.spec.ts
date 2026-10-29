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

test('G0-U1-L05 formal course: locked-door error lab, two practices, a friend behind the door, review, saved and reopened', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/learn/grid-lab/G0-U1-L05')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  // Original story scenery: the key hook board (key → lock).
  await expect(page.locator('[data-grid-item="keyhook"]')).toBeVisible()

  // Step 1 — error lab: walking straight into the locked door.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await page.getByTestId('grid-predict-choice-0').click()
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('猜错也没关系')
  await expect(page.getByTestId('grid-feedback')).toContainText('锁着的门')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'pick_key'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Guided: picking up where there is no key is diagnosed; the detour for the key passes.
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'pick_key')
  await runAndExpect(page, 'error', '这里没有钥匙')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_up'); await add(page, 'pick_key'); await add(page, 'move_down'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: opening without the key fails; the long way round passes.
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'open_door')
  await runAndExpect(page, 'error', '没有钥匙')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'move_down'); await add(page, 'move_down'); await add(page, 'move_right_cell'); await add(page, 'pick_key'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: the friend walked past the key; put “捡起钥匙” in the right place.
  await runAndExpect(page, 'error', '没有钥匙')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'pick_key'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: a friend behind the door; rushing at the door fails, key → open → walk passes.
  await page.getByTestId('grid-run').click()
  await expect(page.getByTestId('grid-feedback')).toContainText('先选一格')
  await page.getByTestId('grid-goal-choice-0').click() // 小熊 · 门正对面
  // Story-named choices wrap two per row and never clip their label.
  for (let i = 0; i < 4; i += 1) {
    const clipped = await page.getByTestId(`grid-goal-choice-${i}`).evaluate(el => el.scrollWidth > el.clientWidth + 1)
    expect(clipped, `choice ${i}`).toBe(false)
  }
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'error', '门还锁着')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_up'); await add(page, 'pick_key'); await add(page, 'move_down'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘: the mistakes this child really met.
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('门还锁着')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('这里没有钥匙')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('没拿钥匙就开门')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('先捡钥匙')
  await expect(page.getByTestId('grid-project-steps').locator('li')).toHaveCount(10)
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the card replays for real through the opened door.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-card').getByTestId('grid-stage')).toHaveAttribute('data-fox-cell', '5,1', { timeout: 25_000 })

  // Modify after reopening: visit 小兔 instead; the old route stops one cell short until extended.
  await page.getByTestId('grid-replay-my-key-card').click()
  await expect(page.getByTestId('grid-goal-choice-0')).toHaveAttribute('data-chosen', 'true')
  await page.getByTestId('grid-goal-choice-1').click() // 小兔 · 右上角
  await runAndExpect(page, 'error')
  await add(page, 'move_up')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
})

test('G0-U1-L06 unit project formal course: wrong-order error lab, two practices, own forest card for a new friend, review, saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  await page.goto('/learn/grid-lab/G0-U1-L06')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  // Original story scenery: the forest guide's hand-drawn map.
  await expect(page.locator('[data-grid-item="guidemap"]')).toBeVisible()

  // Step 1 — error lab: the right blocks in the wrong order (“向上” before “捡起钥匙”).
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await page.getByTestId('grid-predict-choice-0').click()
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('猜错也没关系')
  await expect(page.getByTestId('grid-feedback')).toContainText('顺序错一块')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'pick_key'); await add(page, 'move_up'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Guided: rock on top, river below — the middle row is the way.
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'error', '石头')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'move_down'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'move_up')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: the big map — forgetting the key is diagnosed, then the full route passes.
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'open_door')
  await runAndExpect(page, 'error', '捡起钥匙')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'move_right_cell'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'pick_key'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: fix the friend's card (missing key).
  await runAndExpect(page, 'error', '捡起钥匙')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_right_cell'); await add(page, 'pick_key'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'success')
  await next(page)

  // Unit work: a card for 小刺猬 at the bottom behind the door — the top-row card stops short, three more steps down pass.
  await page.getByTestId('grid-run').click()
  await expect(page.getByTestId('grid-feedback')).toContainText('先选一格')
  await page.getByTestId('grid-goal-choice-3').click() // 小刺猬 · 门后最下面
  await add(page, 'when_start'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_up'); await add(page, 'move_right_cell'); await add(page, 'pick_key'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell'); await add(page, 'open_door'); await add(page, 'move_right_cell'); await add(page, 'move_right_cell')
  await runAndExpect(page, 'error', '还没到蘑菇屋')
  await add(page, 'move_down', 3)
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘: the mistakes this child really met.
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('这里没有钥匙')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('撞到石头')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('没拿钥匙就开门')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('向下')
  const card = page.getByTestId('grid-project-card')
  await expect(card).toBeVisible()
  await expect(page.getByTestId('grid-project-status')).toContainText('真实运行能走到')
  await expect(page.getByTestId('grid-project-steps').locator('li')).toHaveCount(14)

  // Close and reopen: the unit work is still there and replays for real to 小刺猬's house.
  await page.reload()
  await expect(card).toBeVisible()
  await page.getByTestId('grid-project-play').click()
  await expect(card.getByTestId('grid-stage')).toHaveAttribute('data-fox-cell', '5,3', { timeout: 30_000 })
  await expect(page.getByTestId('grid-project-play')).toHaveText('▶ 播放我的森林寻路卡', { timeout: 15_000 })

  // Modify after reopening: give the card to 小熊 on the top row instead; drop the three “向下”.
  await page.getByTestId('grid-replay-my-forest-card').click()
  await expect(page.getByTestId('grid-goal-choice-3')).toHaveAttribute('data-chosen', 'true')
  await page.getByTestId('grid-goal-choice-0').click()
  await runAndExpect(page, 'error')
  for (let i = 0; i < 3; i += 1) await page.getByTestId('lesson-remove-last').click()
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
})

// G0-U2 event lessons run on the event stage (/learn/event-lab); their E2E lives here because this spec is in CI.
test('G0-U2-L01 formal course on the event stage: hat-below error lab, order, click-only wake, debug the woken rabbit, pick a friend, saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  const q = async (...types: string[]) => { for (const t of types) await add(page, t) }
  await page.goto('/learn/catalog/G0-U2-L01')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('event-trial-entry').click()
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await expect(page.locator('[data-grid-item="morning-glade"]')).toBeVisible()
  const fox = page.getByTestId('event-actor-fox')
  await expect(fox).toHaveAttribute('data-awake', 'false')
  // Characters stand inside the stage, never spilling onto the buttons below it.
  const stageBox = (await page.getByTestId('event-stage').first().boundingBox())!
  for (const id of ['fox', 'rabbit']) {
    const box = (await page.getByTestId(`event-actor-${id}`).first().boundingBox())!
    expect(box.y + box.height).toBeLessThanOrEqual(stageBox.y + stageBox.height + 1)
  }

  // Step 1 — error lab: “开始时” sits below the actions, so the start flag never reaches them.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await page.getByTestId('grid-predict-choice-0').click()
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('猜错也没关系')
  await expect(page.getByTestId('grid-feedback')).toContainText('还在睡')
  await expect(fox).toHaveAttribute('data-awake', 'false')
  await page.getByTestId('lesson-clear-program').click()
  await q('when_start', 'wake_up', 'say_hello')
  await runAndExpect(page, 'success')
  await expect(fox).toHaveAttribute('data-awake', 'true')
  await expect(fox).toHaveAttribute('data-said', 'true')
  await next(page)

  // Guided: speaking before waking is the wrong order.
  await q('when_start', 'say_hello', 'wake_up')
  await runAndExpect(page, 'error', '顺序反了')
  await page.getByTestId('lesson-clear-program').click()
  await q('when_start', 'wake_up', 'say_hello')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: only a click wakes the fox; with “开始时” it wakes too early.
  await q('when_start', 'wake_up', 'say_hello')
  await runAndExpect(page, 'error', '还没点')
  await page.getByTestId('lesson-clear-program').click()
  await q('when_clicked', 'wake_up', 'say_hello')
  // Free play before checking: the start flag does nothing, tapping the fox wakes it.
  await page.getByTestId('event-flag').click()
  await expect(fox).toHaveAttribute('data-awake', 'false')
  await fox.click()
  await expect(fox).toHaveAttribute('data-awake', 'true')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: the rabbit's own script wakes it at the start flag; clear the rabbit's script.
  await runAndExpect(page, 'error', '多了不该有的动作')
  await expect(page.getByTestId('grid-feedback')).toContainText('小兔子')
  await page.getByTestId('event-edit-rabbit').click()
  await page.getByTestId('lesson-clear-program').click()
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: pick the bird; blocks on the fox do nothing for the bird; blocks on the bird pass.
  await page.getByTestId('grid-run').click()
  await expect(page.getByTestId('grid-feedback')).toContainText('先在上面选好')
  await page.getByTestId('grid-goal-choice-2').click() // 小鸟
  await page.getByTestId('event-edit-fox').click()
  await q('when_clicked', 'wake_up', 'say_hello')
  await runAndExpect(page, 'error', '什么都没发生')
  await page.getByTestId('lesson-clear-program').click()
  await page.getByTestId('event-edit-bird').click()
  await q('when_clicked', 'wake_up', 'say_hello')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘: the mistakes this child really met, and the what-if.
  const mistakes = page.getByTestId('grid-review-mistakes')
  for (const m of ['事件没放在最上面', '动作顺序反了', '还没触发就先动了', '多了不该有的动作', '触发了却没反应']) await expect(mistakes).toContainText(m)
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('开始旗')
  await expect(page.getByTestId('grid-project-status')).toContainText('点小鸟才会醒')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the card replays for real — only the bird wakes.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await page.getByTestId('grid-project-play').click()
  const card = page.getByTestId('grid-project-card')
  await expect(card.getByTestId('event-actor-bird')).toHaveAttribute('data-awake', 'true', { timeout: 15_000 })
  await expect(card.getByTestId('event-actor-fox')).toHaveAttribute('data-awake', 'false')

  // Modify after reopening: pick the rabbit instead; the bird card no longer counts until rebuilt.
  await page.getByTestId('grid-replay-my-wake-card').click()
  await expect(page.getByTestId('grid-goal-choice-2')).toHaveAttribute('data-chosen', 'true')
  await page.getByTestId('grid-goal-choice-1').click() // 小兔子
  await runAndExpect(page, 'error')
  await page.getByTestId('event-edit-bird').click()
  await page.getByTestId('lesson-clear-program').click()
  await page.getByTestId('event-edit-rabbit').click()
  await q('when_clicked', 'wake_up', 'say_hello')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('lesson-save-local')).toHaveText('已保存到本机')
})

test('G0-U2-L02 formal course on the opening stage: flag-first error lab, start-flag opening, invite the bird, two start hats, pick a host, saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  const q = async (...types: string[]) => { for (const t of types) await add(page, t) }
  const flag = () => page.locator('[data-grid-item="stage-flags"]').first()
  await page.goto('/learn/catalog/G0-U2-L02')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('event-trial-entry').click()
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await expect(flag()).toHaveAttribute('data-flag-up', 'false')
  const fox = page.getByTestId('event-actor-fox')

  // Step 1 — error lab: “升起彩旗” sits above the opening words, so the flag goes up first.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await page.getByTestId('grid-predict-choice-0').click()
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('彩旗先升起')
  await page.getByTestId('lesson-clear-program').click()
  await q('when_start', 'say_hello', 'raise_flag')
  await runAndExpect(page, 'success')
  await expect(flag()).toHaveAttribute('data-flag-up', 'true')
  await expect(fox).toHaveAttribute('data-said', 'true')
  await next(page)

  // Guided: a click-hat opening never starts on the start flag.
  await expect(flag()).toHaveAttribute('data-flag-up', 'false')
  await q('when_clicked', 'say_hello', 'raise_flag')
  await runAndExpect(page, 'error', '什么都没发生')
  await page.getByTestId('lesson-clear-program').click()
  await q('when_start', 'say_hello', 'raise_flag')
  // Free play: tapping the host changes nothing; the start flag runs the opening.
  await fox.click()
  await expect(flag()).toHaveAttribute('data-flag-up', 'false')
  await page.getByTestId('event-flag').click()
  await expect(flag()).toHaveAttribute('data-flag-up', 'true', { timeout: 10_000 })
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: the host opens on the start flag; the bird only comes on when tapped.
  await q('when_start', 'say_hello', 'raise_flag')
  await page.getByTestId('event-edit-bird').click()
  await q('when_start', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'error', '还没到时候')
  await page.getByTestId('lesson-clear-program').click()
  await q('when_clicked', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('event-actor-bird')).toHaveAttribute('data-said', 'true')
  await next(page)

  // Practice B: the rabbit's own start hat raises the flag before the host speaks; clear the rabbit.
  await runAndExpect(page, 'error', '互相抢')
  await expect(page.getByTestId('grid-feedback')).toContainText('小兔子')
  await page.getByTestId('event-edit-rabbit').click()
  await page.getByTestId('lesson-clear-program').click()
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: the rabbit hosts; an opening on the fox does not count for the rabbit.
  await page.getByTestId('grid-goal-choice-1').click() // 小兔子
  await page.getByTestId('event-edit-fox').click()
  await q('when_start', 'say_hello', 'raise_flag')
  await runAndExpect(page, 'error')
  await page.getByTestId('lesson-clear-program').click()
  await page.getByTestId('event-edit-rabbit').click()
  await q('when_start', 'say_hello', 'raise_flag')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  const mistakes = page.getByTestId('grid-review-mistakes')
  for (const m of ['动作顺序反了', '触发了却没反应', '还没触发就先动了', '多了不该有的动作']) await expect(mistakes).toContainText(m)
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('开始时')
  await expect(page.getByTestId('grid-project-status')).toContainText('小兔子主持')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the programme replays for real — the rabbit speaks, then the flag goes up.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  const card = page.getByTestId('grid-project-card')
  await expect(card.locator('[data-grid-item="stage-flags"]')).toHaveAttribute('data-flag-up', 'false')
  await page.getByTestId('grid-project-play').click()
  await expect(card.locator('[data-grid-item="stage-flags"]')).toHaveAttribute('data-flag-up', 'true', { timeout: 15_000 })
  await expect(card.getByTestId('event-actor-rabbit')).toHaveAttribute('data-said', 'true')
  await expect(card.getByTestId('event-actor-fox')).toHaveAttribute('data-said', 'false')
})

test('G0-U2-L03 formal course at the bell tree: swapped sender/receiver error lab, ring for the rabbit, one bell two friends, surprise too early, pick a listener, saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  const q = async (...types: string[]) => { for (const t of types) await add(page, t) }
  const bell = () => page.locator('[data-grid-item="bell-tree"]').first()
  await page.goto('/learn/catalog/G0-U2-L03')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('event-trial-entry').click()
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await expect(bell()).toHaveAttribute('data-bell-rung', 'false')
  const squirrel = page.getByTestId('event-actor-squirrel')
  const rabbit = page.getByTestId('event-actor-rabbit')

  // Step 1 — error lab: the squirrel waits for the bell and the rabbit waits for a tap, so nobody rings.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await page.getByTestId('grid-predict-choice-0').click()
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('没有人先摇铃')
  await expect(bell()).toHaveAttribute('data-bell-rung', 'false')
  await page.getByTestId('lesson-clear-program').click()
  await q('when_clicked', 'send_bell')
  await page.getByTestId('event-edit-rabbit').click()
  await page.getByTestId('lesson-clear-program').click()
  await q('when_bell', 'show_surprise')
  await runAndExpect(page, 'success')
  await expect(bell()).toHaveAttribute('data-bell-rung', 'true')
  await expect(rabbit).toHaveAttribute('data-surprised', 'true')
  await next(page)

  // Guided: a start-hat rabbit is surprised before any bell.
  await q('when_clicked', 'send_bell')
  await page.getByTestId('event-edit-rabbit').click()
  await q('when_start', 'show_surprise')
  await runAndExpect(page, 'error', '还没摇铃')
  await page.getByTestId('lesson-clear-program').click()
  await q('when_bell', 'show_surprise')
  // Free play: tapping the rabbit does nothing; tapping the squirrel rings and the rabbit answers.
  await rabbit.click()
  await expect(rabbit).toHaveAttribute('data-surprised', 'false')
  await squirrel.click()
  await expect(rabbit).toHaveAttribute('data-surprised', 'true', { timeout: 10_000 })
  await expect(squirrel).toHaveAttribute('data-rang', 'true')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: one bell, two listeners; the fox on a click hat misses the bell.
  await q('when_clicked', 'send_bell')
  await page.getByTestId('event-edit-rabbit').click()
  await q('when_bell', 'show_surprise')
  await page.getByTestId('event-edit-fox').click()
  await q('when_clicked', 'wake_up', 'say_hello')
  await runAndExpect(page, 'error', '还有朋友没回应')
  await page.getByTestId('lesson-clear-program').click()
  await q('when_bell', 'wake_up', 'say_hello')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('event-actor-fox')).toHaveAttribute('data-awake', 'true')
  await next(page)

  // Practice B: the rabbit is surprised at the start flag; give it the bell hat.
  await runAndExpect(page, 'error', '还没摇铃')
  await page.getByTestId('event-edit-rabbit').click()
  await page.getByTestId('lesson-clear-program').click()
  await q('when_bell', 'show_surprise')
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: the fox listens; a second listener (the rabbit) is one too many.
  await page.getByTestId('grid-goal-choice-1').click() // 小狐狸
  await page.getByTestId('event-edit-squirrel').click()
  await q('when_clicked', 'send_bell')
  await page.getByTestId('event-edit-fox').click()
  await q('when_bell', 'show_surprise')
  await page.getByTestId('event-edit-rabbit').click()
  await q('when_bell', 'show_surprise')
  await runAndExpect(page, 'error', '多了不该有的动作')
  await page.getByTestId('lesson-clear-program').click()
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  const mistakes = page.getByTestId('grid-review-mistakes')
  for (const m of ['触发了却没反应', '还没触发就先动了', '少了一个动作', '多了不该有的动作']) await expect(mistakes).toContainText(m)
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('听到铃铛时')
  await expect(page.getByTestId('grid-project-status')).toContainText('小狐狸听到才惊喜')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the card replays for real — the bell rings and only the fox is surprised.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  const card = page.getByTestId('grid-project-card')
  await page.getByTestId('grid-project-play').click()
  await expect(card.getByTestId('event-actor-fox')).toHaveAttribute('data-surprised', 'true', { timeout: 15_000 })
  await expect(card.locator('[data-grid-item="bell-tree"]')).toHaveAttribute('data-bell-rung', 'true')
  await expect(card.getByTestId('event-actor-rabbit')).toHaveAttribute('data-surprised', 'false')
})

test('G0-U2-L04 formal course in the forest theatre: script on the wrong friend, fox first, two turns, nobody came, pick the second act, saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  const q = async (...types: string[]) => { for (const t of types) await add(page, t) }
  await page.goto('/learn/catalog/G0-U2-L04')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('event-trial-entry').click()
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await expect(page.locator('[data-grid-item="two-doors"]').first()).toBeVisible()
  const fox = page.getByTestId('event-actor-fox')
  const bird = page.getByTestId('event-actor-bird')
  await expect(fox).toHaveAttribute('data-onstage', 'false')

  // Step 1 — error lab: the fox's opening was built under the bird, so the bird rushes on first.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await page.getByTestId('grid-predict-choice-0').click()
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('小鸟抢先上台')
  await expect(bird).toHaveAttribute('data-onstage', 'true')
  await expect(fox).toHaveAttribute('data-onstage', 'false')
  await q('when_start', 'enter_stage', 'say_hello') // on the fox (selected first)
  await page.getByTestId('event-edit-bird').click()
  await page.getByTestId('lesson-clear-program').click()
  await q('when_clicked', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'success')
  await next(page)

  // Guided: built under the bird, the wrong friend comes on.
  await page.getByTestId('event-edit-bird').click()
  await q('when_start', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'error', '上台的不是该上台的那位')
  await page.getByTestId('lesson-clear-program').click()
  await page.getByTestId('event-edit-fox').click()
  await q('when_start', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'success')
  await expect(fox).toHaveAttribute('data-onstage', 'true')
  await expect(bird).toHaveAttribute('data-onstage', 'false')
  await next(page)

  // Practice A: two turns; a start-hat bird collides with the fox.
  await q('when_start', 'enter_stage', 'say_hello')
  await page.getByTestId('event-edit-bird').click()
  await q('when_start', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'error', '小鸟抢在小狐狸前面')
  await page.getByTestId('lesson-clear-program').click()
  await q('when_clicked', 'enter_stage', 'say_hello')
  // Free play: the start flag brings only the fox; tapping the bird brings it on next.
  await page.getByTestId('event-flag').click()
  await expect(fox).toHaveAttribute('data-onstage', 'true', { timeout: 10_000 })
  await expect(bird).toHaveAttribute('data-onstage', 'false')
  await bird.click()
  await expect(bird).toHaveAttribute('data-onstage', 'true', { timeout: 10_000 })
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: the fox has no hat and the bird waits for a bell nobody rings — both need fixing.
  await runAndExpect(page, 'error', '没有事件')
  await page.getByTestId('lesson-clear-program').click()
  await q('when_start', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'error', '没人上台')
  await page.getByTestId('event-edit-bird').click()
  await page.getByTestId('lesson-clear-program').click()
  await q('when_clicked', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: the frog is the second act; the frog's blocks under the rabbit do nothing.
  await page.getByTestId('grid-goal-choice-2').click() // 小青蛙 (picking a friend switches the editor to it)
  await expect(page.getByTestId('event-edit-frog')).toHaveAttribute('aria-selected', 'true')
  await page.getByTestId('event-edit-fox').click()
  await q('when_start', 'enter_stage', 'say_hello')
  await page.getByTestId('event-edit-rabbit').click()
  await q('when_clicked', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'error')
  await page.getByTestId('lesson-clear-program').click()
  await page.getByTestId('event-edit-frog').click()
  await q('when_clicked', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  const mistakes = page.getByTestId('grid-review-mistakes')
  for (const m of ['还没触发就先动了', '动的不是要动的角色', '忘了事件积木', '触发了却没反应']) await expect(mistakes).toContainText(m)
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('两个不同的事件')
  await expect(page.getByTestId('grid-project-status')).toContainText('点小青蛙它再上台')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the programme replays — the fox, then the frog; the bird and rabbit stay backstage.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  const card = page.getByTestId('grid-project-card')
  await page.getByTestId('grid-project-play').click()
  await expect(card.getByTestId('event-actor-frog')).toHaveAttribute('data-onstage', 'true', { timeout: 15_000 })
  await expect(card.getByTestId('event-actor-fox')).toHaveAttribute('data-onstage', 'true')
  await expect(card.getByTestId('event-actor-bird')).toHaveAttribute('data-onstage', 'false')
  await expect(card.getByTestId('event-actor-rabbit')).toHaveAttribute('data-onstage', 'false')
})

test('G0-U2-L05 formal course in the apple orchard: event on the tree, only the apple, apple tells the rabbit, wrong spot drops, pick who is surprised, saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  const q = async (...types: string[]) => { for (const t of types) await add(page, t) }
  await page.goto('/learn/catalog/G0-U2-L05')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('event-trial-entry').click()
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await expect(page.locator('[data-grid-item="apple-tree"]').first()).toBeVisible()
  const apple = page.getByTestId('event-actor-apple')
  const tree = page.getByTestId('event-actor-tree')
  const fox = page.getByTestId('event-actor-fox')
  await expect(apple).toHaveAttribute('data-fallen', 'false')

  // Step 1 — error lab: the click event sits on the tree, so tapping the apple does nothing.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await page.getByTestId('grid-predict-choice-0').click()
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('苹果一动不动')
  await expect(apple).toHaveAttribute('data-fallen', 'false')
  await page.getByTestId('lesson-clear-program').click() // the tree's blocks
  await page.getByTestId('event-edit-apple').click()
  await q('when_clicked', 'fall_down')
  await runAndExpect(page, 'success')
  await expect(apple).toHaveAttribute('data-fallen', 'true')
  await next(page)

  // Guided: a start-hat apple falls by itself.
  await page.getByTestId('event-edit-apple').click()
  await q('when_start', 'fall_down')
  await runAndExpect(page, 'error', '苹果就自己掉下来了')
  await page.getByTestId('lesson-clear-program').click()
  await q('when_clicked', 'fall_down')
  // Free play: tapping the tree or the fox leaves the apple hanging; tapping the apple drops it.
  await tree.click({ position: { x: 20, y: 60 } })
  await fox.click()
  await expect(apple).toHaveAttribute('data-fallen', 'false')
  await apple.click()
  await expect(apple).toHaveAttribute('data-fallen', 'true', { timeout: 10_000 })
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: the apple falls and rings; the rabbit answers the bell (a click hat misses it).
  await q('when_clicked', 'fall_down', 'send_bell')
  await page.getByTestId('event-edit-rabbit').click()
  await q('when_clicked', 'show_surprise')
  await runAndExpect(page, 'error', '还少一步')
  await page.getByTestId('lesson-clear-program').click()
  await q('when_bell', 'show_surprise')
  await runAndExpect(page, 'success')
  await expect(page.getByTestId('event-actor-rabbit')).toHaveAttribute('data-surprised', 'true')
  await next(page)

  // Practice B: the apple waits for a bell the fox rings — fix the apple, then the fox.
  await runAndExpect(page, 'error', '没有落下')
  await page.getByTestId('event-edit-apple').click()
  await page.getByTestId('lesson-clear-program').click()
  await q('when_clicked', 'fall_down')
  await runAndExpect(page, 'error', '点了别的地方也有反应')
  await page.getByTestId('event-edit-fox').click()
  await page.getByTestId('lesson-clear-program').click()
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: the bird is surprised; a second surprised friend is one too many.
  await page.getByTestId('grid-goal-choice-2').click() // 小鸟
  await page.getByTestId('event-edit-apple').click()
  await q('when_clicked', 'fall_down', 'send_bell')
  await page.getByTestId('event-edit-bird').click()
  await q('when_bell', 'show_surprise')
  await page.getByTestId('event-edit-fox').click()
  await q('when_bell', 'show_surprise')
  await runAndExpect(page, 'error', '多了不该有的动作')
  await page.getByTestId('lesson-clear-program').click()
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  const mistakes = page.getByTestId('grid-review-mistakes')
  for (const m of ['触发了却没反应', '还没触发就先动了', '少了一个动作', '点错角色也有反应', '多了不该有的动作']) await expect(mistakes).toContainText(m)
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('拼在谁名下')
  await expect(page.getByTestId('grid-project-status')).toContainText('小鸟听到铃铛惊喜')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the card replays — the apple falls and only the bird is surprised.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  const card = page.getByTestId('grid-project-card')
  await page.getByTestId('grid-project-play').click()
  await expect(card.getByTestId('event-actor-bird')).toHaveAttribute('data-surprised', 'true', { timeout: 15_000 })
  await expect(card.getByTestId('event-actor-apple')).toHaveAttribute('data-fallen', 'true')
  await expect(card.getByTestId('event-actor-fox')).toHaveAttribute('data-surprised', 'false')
})

test('G0-U2-L06 unit project at the meet-and-greet: everyone on start, open and call, bell brings the guest, only tested start, pick a guest, saved and reopened', async ({ page }) => {
  test.setTimeout(240_000)
  const q = async (...types: string[]) => { for (const t of types) await add(page, t) }
  const edit = (id: string) => page.getByTestId(`event-edit-${id}`).click()
  const clear = () => page.getByTestId('lesson-clear-program').click()
  await page.goto('/learn/catalog/G0-U2-L06')
  await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
  await page.getByTestId('event-trial-entry').click()
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await expect(page.locator('[data-grid-item="meeting-stage"]').first()).toBeVisible()
  const fox = page.getByTestId('event-actor-fox')
  const rabbit = page.getByTestId('event-actor-rabbit')
  const bird = page.getByTestId('event-actor-bird')

  // Step 1 — error lab: all three listen to the start flag, so everyone moves at once.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await page.getByTestId('grid-predict-choice-0').click()
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('三位一起动起来了')
  await expect(bird).toHaveAttribute('data-onstage', 'true')
  await edit('rabbit'); await clear(); await q('when_clicked', 'show_surprise', 'send_bell')
  await edit('bird'); await clear(); await q('when_bell', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'success')
  await next(page)

  // Guided: open on the start flag, the audience taps the rabbit.
  await edit('fox'); await q('when_start', 'enter_stage', 'say_hello')
  await edit('rabbit'); await q('when_start', 'show_surprise')
  await runAndExpect(page, 'error', '还没轮到就先动了')
  await clear(); await q('when_clicked', 'show_surprise')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: the full meeting; a click-hat bird never hears the bell.
  await edit('fox'); await q('when_start', 'enter_stage', 'say_hello')
  await edit('rabbit'); await q('when_clicked', 'show_surprise', 'send_bell')
  await edit('bird'); await q('when_clicked', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'error', '有一段没演出来')
  await clear(); await q('when_bell', 'enter_stage', 'say_hello')
  // Free play: start flag opens; tapping the rabbit rings and the bird comes on.
  await page.getByTestId('event-flag').click()
  await expect(fox).toHaveAttribute('data-onstage', 'true', { timeout: 10_000 })
  await expect(bird).toHaveAttribute('data-onstage', 'false')
  await rabbit.click()
  await expect(bird).toHaveAttribute('data-onstage', 'true', { timeout: 10_000 })
  await runAndExpect(page, 'success')
  await next(page)

  // Practice B: only the start flag was tested; the rabbit never rings.
  await runAndExpect(page, 'error', '有一段没演出来')
  await edit('rabbit'); await q('send_bell')
  await runAndExpect(page, 'success')
  await next(page)

  // Unit project: the squirrel is the guest; inviting the frog too is one guest too many.
  await page.getByTestId('grid-goal-choice-2').click() // 松鼠
  await edit('fox'); await q('when_start', 'enter_stage', 'say_hello')
  await edit('rabbit'); await q('when_clicked', 'show_surprise', 'send_bell')
  await edit('squirrel'); await q('when_bell', 'enter_stage', 'say_hello')
  await edit('frog'); await q('when_bell', 'enter_stage', 'say_hello')
  await runAndExpect(page, 'error', '多了不该有的表演')
  await clear()
  await runAndExpect(page, 'success')
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  const mistakes = page.getByTestId('grid-review-mistakes')
  for (const m of ['还没触发就先动了', '少了一个动作', '多了不该有的动作']) await expect(mistakes).toContainText(m)
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('每种触发都要亲手测一遍')
  await expect(page.getByTestId('grid-project-status')).toContainText('松鼠上台问好')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the meeting replays — fox opens, rabbit rings, only the squirrel comes on.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  const card = page.getByTestId('grid-project-card')
  await page.getByTestId('grid-project-play').click()
  await expect(card.getByTestId('event-actor-squirrel')).toHaveAttribute('data-onstage', 'true', { timeout: 20_000 })
  await expect(card.getByTestId('event-actor-fox')).toHaveAttribute('data-onstage', 'true')
  await expect(card.getByTestId('event-actor-frog')).toHaveAttribute('data-onstage', 'false')
  await expect(card.getByTestId('event-actor-bird')).toHaveAttribute('data-onstage', 'false')
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
  // Error labs show “expected vs actual” instead, so this uses L05 step 2 (error lab already done in a saved draft).
  await page.goto('/learn/grid-lab/G0-U1-L05')
  await page.evaluate(() => localStorage.setItem('kids-grid-lesson-v1:G0-U1-L05', JSON.stringify({ stepIndex: 1, passed: ['locked-door'], observed: ['locked-door'], programs: {}, savedAt: null })))
  await page.reload()
  await page.getByTestId('grid-read-instruction').click()
  await add(page, 'when_start')
  await add(page, 'move_right_cell')
  await add(page, 'move_up')
  await add(page, 'move_right_cell')
  await add(page, 'pick_key')
  await runAndExpect(page, 'error', '问题出在第 4 块')
  await page.getByTestId('grid-read-feedback').click()
  const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)
  expect(spoken[0]).toMatch(/^zh-CN\|第 2 关，钥匙不在路上/)
  expect(spoken[1]).toMatch(/^zh-CN\|.*问题出在第 4 块/)
})

test('G0-U3-L01 mushroom path pattern: only two pairs, find the unit, repeat four pairs, swapped colours, my rhythm path saved and reopened', async ({ page }) => {
  test.setTimeout(200_000)
  const stage = page.getByTestId('grid-stage').first()
  await page.goto('/learn/grid-lab/G0-U3-L01')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  // Original story scenery (the bear's mushroom signpost) and the faded footprints to copy.
  await expect(page.locator('[data-grid-item="mushroompath"]')).toBeVisible()
  await expect(page.locator('[data-grid-item="ghost-paw"]')).toHaveCount(8)

  // Step 1 — error lab: “repeat 2 times” only stamps two pairs. Predict, run as-is, compare, then change only the count.
  await next(page)
  await expect(page.getByTestId('grid-feedback')).toContainText('错误实验')
  await page.getByTestId('grid-predict-choice-0').click()
  await runAndExpect(page, 'error', '预想')
  await expect(page.getByTestId('grid-feedback')).toContainText('只印了 4 个脚印')
  await expect(stage).toHaveAttribute('data-stamps', 'rbrb', { timeout: 15_000 })
  await expect(page.getByTestId('lesson-repeat-times-2')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('lesson-repeat-times-4').click()
  await runAndExpect(page, 'success')
  await expect(stage).toHaveAttribute('data-stamps', 'rbrbrbrb', { timeout: 15_000 })
  await next(page)

  // Guided: one unit. Blue first is a pattern mistake; red, forward, blue, forward is right.
  await add(page, 'when_start')
  await add(page, 'stamp_blue')
  await add(page, 'move_forward')
  await add(page, 'stamp_red')
  await add(page, 'move_forward')
  await runAndExpect(page, 'error', '颜色顺序乱了')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'stamp_red')
  await add(page, 'move_forward')
  await add(page, 'stamp_blue')
  await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await next(page)

  // Practice A: tap blocks into the repeat's mouth, then try counts until the path is full.
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await expect(page.getByTestId('lesson-repeat-target-inside')).toHaveAttribute('aria-pressed', 'true')
  await add(page, 'stamp_red')
  await add(page, 'move_forward')
  await add(page, 'stamp_blue')
  await add(page, 'move_forward')
  await runAndExpect(page, 'error', '脚印还不够')
  await page.getByTestId('lesson-repeat-times-3').click()
  await runAndExpect(page, 'error', '脚印还不够')
  await page.getByTestId('lesson-repeat-times-4').click()
  await runAndExpect(page, 'success')
  await expect(stage).toHaveAttribute('data-stamps', 'rbrbrbrb', { timeout: 15_000 })
  await next(page)

  // Practice B: the given loop stamps blue first; rebuild the loop red-first, count unchanged at 4.
  await runAndExpect(page, 'error', '颜色顺序乱了')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await add(page, 'stamp_red')
  await add(page, 'move_forward')
  await add(page, 'stamp_blue')
  await add(page, 'move_forward')
  await page.getByTestId('lesson-repeat-times-4').click()
  await runAndExpect(page, 'success')
  await next(page)

  // Creative remake: pick the red-red-blue rhythm; the red-blue loop no longer fits, red-red-blue × 2 does.
  await page.getByTestId('grid-run').click()
  await expect(page.getByTestId('grid-feedback')).toContainText('先选一种脚印节奏')
  await page.getByTestId('grid-goal-choice-1').click()
  await expect(page.locator('[data-grid-item="ghost-paw"]')).toHaveCount(6)
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await add(page, 'stamp_red')
  await add(page, 'move_forward')
  await add(page, 'stamp_blue')
  await add(page, 'move_forward')
  await runAndExpect(page, 'error')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, 'when_start')
  await add(page, 'repeat_times')
  await add(page, 'stamp_red')
  await add(page, 'move_forward')
  await add(page, 'stamp_red')
  await add(page, 'move_forward')
  await add(page, 'stamp_blue')
  await add(page, 'move_forward')
  await runAndExpect(page, 'success')
  await expect(stage).toHaveAttribute('data-stamps', 'rrbrrb', { timeout: 15_000 })
  await next(page)
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()

  // 复盘: the mistakes this child really met, the what-if, the one-tap check.
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('脚印放得不够')
  await expect(page.getByTestId('grid-review-mistakes')).toContainText('脚印规律乱了')
  await page.getByTestId('grid-review-reveal').click()
  await expect(page.getByTestId('grid-review-answer')).toContainText('次数')
  await expect(page.getByTestId('grid-project-status')).toHaveText('真实运行能走到蘑菇屋')
  await expect(page.getByTestId('grid-project-steps')).toContainText('重复 2 次')
  await page.getByTestId('grid-reflection-option-0').click()
  await expect(page.getByTestId('grid-reflection-result')).toHaveAttribute('data-correct', 'true')

  // Close and reopen: the rhythm path (repeat body included) replays for real.
  await page.reload()
  await expect(page.getByTestId('grid-lesson-finished')).toBeVisible()
  await page.getByTestId('grid-project-play').click()
  await expect(page.getByTestId('grid-project-card').getByTestId('grid-stage')).toHaveAttribute('data-stamps', 'rrbrrb', { timeout: 15_000 })
})
