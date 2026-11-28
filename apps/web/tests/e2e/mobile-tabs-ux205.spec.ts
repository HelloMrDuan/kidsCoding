import { expect, test, type Page } from '@playwright/test'
import { clickLessonControl, openForestTools, showLessonPane } from './lesson-pane-helpers'

/** UX-205: on a 375px phone, switching task/stage/code tabs must not unmount
 *  the Blockly workspace or reset entered content, and Run / Next must stay
 *  reachable at the bottom. Tab switching only exists on mobile widths, so
 *  the persistence tests run on the mobile project; desktop asserts the tabs
 *  stay hidden and all panes stay visible.
 *
 *  OPS-056: lesson-02 runs in the V3 launch studio (/studio/blockly/launch/<id>; the old
 *  /learn/lesson/<id> entry 308-redirects there). DOM mapping (same strength):
 *  - lesson-mobile-tabs / lesson-mobile-tab-{task,code,stage} -> v3-mobiletabs / v3-pane-*;
 *  - lesson-task-column -> v3-mission; lesson-code-column -> the V3 editor region;
 *    lesson-stage-column -> v3-stage-region;
 *  - the say-line choices live in the V3 tools drawer (opened first, as a child would);
 *  - Run -> ws-run-toggle (stage pane), Next -> launch-v3-complete-step (task pane).
 *  mobile-tabs-ux205 裁定 (decided, not pending): the V3 tabs are kept and no sticky
 *  lesson-footer / .kc-run-actions is restored. "Run / Next stay reachable" is asserted as both
 *  controls being on screen, without scrolling, in their pane at 375px, and the spec before the
 *  desktop one asserts run, stop, the blocked-complete recovery and a real completion.
 */
const LESSON = 'lesson-02-forest-greeting'

async function openLaunch(page: Page) {
  await page.goto(`/learn/lesson/${LESSON}`)
  await page.waitForURL(`**/studio/blockly/launch/${LESSON}`)
  await expect(page.getByTestId('launch-v3-slot')).toBeAttached({ timeout: 30_000 })
}

test('mobile tabs keep blocks and the program still runs', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'mobile-only')
  await openLaunch(page)
  for (const type of ['when_start', 'move_right']) await clickLessonControl(page, 'lesson-add-' + type)
  const canvas = page.getByTestId('lesson-blockly-workspace').locator('svg.blocklySvg .blocklyBlockCanvas')
  await expect(canvas).toContainText('向右走 100 步')
  await page.getByTestId('v3-pane-stage').click()
  await expect(page.getByTestId('v3-stage-region')).toBeVisible()
  await page.getByTestId('v3-pane-task').click()
  await expect(page.getByTestId('v3-mission')).toBeVisible()
  await page.getByTestId('v3-pane-code').click()
  await expect(canvas).toContainText('向右走 100 步')
  await clickLessonControl(page, 'run-code-button')
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 20_000 })
})

test('mobile tabs keep entered content: the chosen say line survives', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'mobile-only')
  await openLaunch(page)
  for (const type of ['when_start', 'say_line']) await clickLessonControl(page, 'lesson-add-' + type)
  await openForestTools(page)
  await page.getByTestId('lesson-say-line-choices').getByRole('button', { name: '你好！' }).click()
  await page.getByTestId('v3-pane-stage').click()
  await page.getByTestId('v3-pane-code').click()
  await clickLessonControl(page, 'run-code-button')
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('stage-character-main').locator('.kc-stage-speech')).toContainText('你好！', { timeout: 20_000 })
})

test('mobile run and next actions stay on screen in their pane', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'mobile-only')
  await openLaunch(page)
  // No scrolling: the controls must already be inside the viewport when the pane opens.
  await page.getByTestId('v3-pane-stage').click()
  await expect(page.getByTestId('ws-run-toggle')).toBeVisible()
  await expect(page.getByTestId('ws-run-toggle')).toBeInViewport()
  await page.getByTestId('v3-pane-task').click()
  await expect(page.getByTestId('launch-v3-complete-step')).toBeVisible()
  await expect(page.getByTestId('launch-v3-complete-step')).toBeInViewport()
})

test('mobile V3 tabs: run, stop, recover from a blocked complete, then really complete', async ({ page }) => {
  // mobile-tabs-ux205 裁定: keep the V3 tabs, no sticky footer is restored. Assert that
  // run / stop / complete and the recovery path are really reachable and really work.
  test.skip(test.info().project.name !== 'mobile', 'mobile-only')
  test.setTimeout(120_000)
  await openLaunch(page)
  for (const type of ['when_start', 'move_right']) await clickLessonControl(page, 'lesson-add-' + type)

  const run = page.getByTestId('ws-run-toggle')
  const playable = page.getByTestId('lesson-playable-stage')
  const complete = page.getByTestId('launch-v3-complete-step')
  const progress = page.getByTestId('launch-v3-step-progress')

  // Run then stop from the stage pane: the same toggle flips 运行 -> 停止 -> 运行,
  // and a stopped run never reports success.
  await page.getByTestId('v3-pane-stage').click()
  await expect(run).toBeInViewport()
  await run.click()
  await expect(run).toContainText('停止')
  await run.click()
  await expect(run).toContainText('运行')
  await expect(playable).not.toContainText('运行成功')

  // Abnormal path: completing without a successful run is blocked with a visible notice.
  await page.getByTestId('v3-pane-task').click()
  await expect(complete).toBeInViewport()
  await complete.click()
  await expect(page.getByTestId('launch-v3-notice')).toBeVisible({ timeout: 10_000 })
  await expect(progress).toContainText('第 1 / 4 关')

  // Recovery: a real run to success, then the task-pane complete button advances.
  await page.getByTestId('v3-pane-stage').click()
  await run.click()
  await expect(playable).toContainText('运行成功', { timeout: 20_000 })
  await page.getByTestId('v3-pane-task').click()
  await expect(complete).toBeInViewport()
  await complete.click()
  await expect(progress).toContainText('第 2 / 4 关')
  await expect(page.getByTestId('launch-v3-stepbar-2')).toHaveAttribute('aria-current', 'step')
})

test('desktop keeps all panes visible without mobile tabs', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'desktop-only')
  await openLaunch(page)
  await expect(page.getByTestId('v3-mobiletabs')).toBeHidden()
  await expect(page.getByTestId('v3-mission')).toBeVisible()
  await expect(page.getByTestId('ws-grid').locator('.kc-v3-editor-region')).toBeVisible()
  await expect(page.getByTestId('v3-stage-region')).toBeVisible()
})
