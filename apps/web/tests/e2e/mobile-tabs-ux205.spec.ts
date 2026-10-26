import { expect, test } from '@playwright/test'
import { clickLessonControl, showLessonPane } from './lesson-pane-helpers'

/** UX-205: on a 375px phone, switching task/stage/code tabs must not unmount
 *  the Blockly workspace or reset entered content, and Run / Next must stay
 *  reachable at the bottom. Tab switching only exists on mobile widths, so
 *  the persistence tests run on the mobile project; desktop asserts the tabs
 *  stay hidden and all panes stay visible. */

test('mobile tabs keep blocks and the program still runs', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'mobile-only')
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  for (const type of ['when_start', 'move_right']) await clickLessonControl(page, 'lesson-add-' + type)
  const canvas = page.getByTestId('lesson-blockly-workspace').locator('svg.blocklySvg .blocklyBlockCanvas')
  await expect(canvas).toContainText('向右走 100 步')
  await page.getByTestId('lesson-mobile-tab-stage').click()
  await expect(page.getByTestId('lesson-stage-column')).toBeVisible()
  await page.getByTestId('lesson-mobile-tab-task').click()
  await expect(page.getByTestId('lesson-task-column')).toBeVisible()
  await page.getByTestId('lesson-mobile-tab-code').click()
  await expect(canvas).toContainText('向右走 100 步')
  await clickLessonControl(page, 'run-code-button')
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 20_000 })
})

test('mobile tabs keep entered content: the chosen say line survives', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'mobile-only')
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  for (const type of ['when_start', 'say_line']) await clickLessonControl(page, 'lesson-add-' + type)
  await page.getByTestId('lesson-say-line-choices').getByRole('button', { name: '你好！' }).click()
  await page.getByTestId('lesson-mobile-tab-stage').click()
  await page.getByTestId('lesson-mobile-tab-code').click()
  await clickLessonControl(page, 'run-code-button')
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('stage-character-main').locator('.kc-stage-speech')).toContainText('你好！', { timeout: 20_000 })
})

test('mobile run and next actions stick to the bottom', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'mobile-only')
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  await showLessonPane(page, 'stage')
  const footerPosition = await page.getByTestId('lesson-footer').evaluate((el) => getComputedStyle(el).position)
  expect(footerPosition).toBe('sticky')
  const runActionsPosition = await page.locator('.kc-run-actions').first().evaluate((el) => getComputedStyle(el).position)
  expect(runActionsPosition).toBe('sticky')
})

test('desktop keeps all panes visible without mobile tabs', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'desktop-only')
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  await expect(page.getByTestId('lesson-mobile-tabs')).toBeHidden()
  await expect(page.getByTestId('lesson-task-column')).toBeVisible()
  await expect(page.getByTestId('lesson-code-column')).toBeVisible()
  await expect(page.getByTestId('lesson-stage-column')).toBeVisible()
})
