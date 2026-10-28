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
