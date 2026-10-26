import { expect, test } from '@playwright/test'
import { clickLessonControl, showLessonPane } from './lesson-pane-helpers'

/** UX-204: the classroom stage shows what actually happened — clicks, moves,
 *  speech, repeats, both actors — and reset / untriggered states read true.
 *  Fixtures are the real lesson pages; no Blockly canvas interaction here, so
 *  the sprite CDN workaround from the toolbox spec is not needed. */

test('move: main steps, friend at rest, and the run log line are all visible', async ({ page }) => {
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  for (const type of ['when_start', 'move_right']) await clickLessonControl(page, 'lesson-add-' + type)
  await clickLessonControl(page, 'run-code-button')
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100', { timeout: 20_000 })
  await expect(page.getByTestId('stage-walked-distance')).toContainText('已走 100 步')
  await expect(page.getByTestId('stage-action-log')).toContainText('向右走 100 步')
  await expect(page.getByTestId('stage-character-friend')).toHaveAttribute('data-steps', '0')
  await expect(page.getByTestId('stage-friend-distance')).toContainText('已走 0 步')
  await expect(page.getByTestId('stage-friend-action')).toContainText('等待指令')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 20_000 })
})

test('repeat and scene: the repeat is its own log line and the scene chip moves', async ({ page }) => {
  await page.goto('/learn/lesson/lesson-05-meadow-order')
  for (const type of ['when_start', 'move_right', 'switch_scene', 'repeat_twice']) await clickLessonControl(page, 'lesson-add-' + type)
  await clickLessonControl(page, 'run-code-button')
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('stage-current-scene')).toContainText('草地', { timeout: 20_000 })
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '200')
  const log = page.getByTestId('stage-action-log')
  await expect(log).toContainText('向右走 100 步')
  await expect(log).toContainText('切换场景到草地')
  await expect(log).toContainText('再走 100 步（重复）')
})

test('speech: the spoken line shows as a bubble and in the run log', async ({ page }) => {
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  for (const type of ['when_start', 'say_line']) await clickLessonControl(page, 'lesson-add-' + type)
  await page.getByTestId('lesson-say-line-choices').getByRole('button', { name: '你好！' }).click()
  await clickLessonControl(page, 'run-code-button')
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('stage-character-main').locator('.kc-stage-speech')).toContainText('你好！', { timeout: 20_000 })
  await expect(page.getByTestId('stage-action-log')).toContainText('说：你好！')
})

test('click untriggered: arming waits for the click and never counts as success', async ({ page }) => {
  await page.goto('/learn/lesson/lesson-07-garden-click')
  await showLessonPane(page, 'stage')
  // Lesson 07 step 1 offers only the click hat: arming alone, with no move
  // block, still proves the wait — success comes only after the real click.
  await clickLessonControl(page, 'lesson-add-when_clicked')
  await clickLessonControl(page, 'run-code-button')
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('garden-await-click')).toBeVisible()
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('运行成功')
  await page.getByTestId('stage-character-main').click()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 20_000 })
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '0')
})

test('reset: every observed state returns to its pre-run value', async ({ page }) => {
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  for (const type of ['when_start', 'move_right']) await clickLessonControl(page, 'lesson-add-' + type)
  await clickLessonControl(page, 'run-code-button')
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 20_000 })
  await clickLessonControl(page, 'reset-code-button')
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '0')
  await expect(page.getByTestId('stage-current-scene')).toContainText('森林')
  await expect(page.getByTestId('stage-action-log')).toHaveCount(0)
  await expect(page.getByTestId('run-code-button')).toContainText('▶ 运行')
})
