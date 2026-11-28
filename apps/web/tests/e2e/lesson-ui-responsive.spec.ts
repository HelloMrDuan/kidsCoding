import { expect, test, type Page } from '@playwright/test'
import {
  clickLessonControl,
  completeForestStep,
  expectStageWalk,
  isLaunchV3,
  openForestV3,
  resolveV3LessonControl,
  seedLaunchV3Draft,
  showLessonPane,
  solveMistakeStep,
  solvePracticeStep,
} from './lesson-pane-helpers'

/** UX-206: integrated classroom regression across lessons 1 / 5 / 9 / 12 —
 *  success, error, reset-rebuild recovery and reward, at 1440 / 768 / 375
 *  widths, plus a real touch chain on the mobile project. Each lesson keeps
 *  its own dedicated spec for depth; this suite proves the full loop holds
 *  together across lessons and breakpoints.
 *
 *  OPS-056: lesson-02…12 run in the V3 launch studio (/studio/blockly/launch/<id>;
 *  the old /learn/lesson/<id> entry 308-redirects there). DOM mapping (same strength):
 *  - lesson-task-card 第 N 关 -> launch-v3-step-progress 第 N / M 关;
 *  - lesson-feedback-card -> launch-v3-notice; reset-code-button -> v3-reset-stage;
 *  - lesson-mobile-tabs / lesson-mobile-tab-* -> v3-mobiletabs / v3-pane-*;
 *  - lesson-task-column -> v3-mission; lesson-code-column -> the V3 editor region;
 *    lesson-stage-column -> v3-stage-region;
 *  - "fresh state" is a real empty owner-scoped V3 draft, not sessionStorage.clear().
 *  Recorded layout difference (approved V3 geometry, not weakened): V3 switches to
 *  任务·编程·舞台 tabs below 1040px, the old classroom below 600px, so at 768 the
 *  V3 studio is tabbed. The matrix asserts the V3 baseline at each width.
 */

const touchPages = new WeakMap<Page, boolean>()
test.beforeEach(({ page }, testInfo) => {
  touchPages.set(page, Boolean(testInfo.project.use.hasTouch))
})

/** Tap on touch projects, click elsewhere; V3 controls resolve to their real ids. */
async function press(page: Page, id: string) {
  let target = id
  if (isLaunchV3(page)) {
    const resolved = await resolveV3LessonControl(page, id)
    if (resolved) target = resolved
    else if (id === 'run-code-button') {
      await showLessonPane(page, 'stage')
      target = 'ws-run-toggle'
    }
  }
  const button = page.getByTestId(target)
  await button.scrollIntoViewIfNeeded()
  if (touchPages.get(page)) await button.tap()
  else await button.click()
}

async function add(page: Page, types: string[]) {
  // Routes through the shared helper: the V3 studios keep their palette in the
  // tools <details> under the code pane.
  for (const type of types) await clickLessonControl(page, `lesson-add-${type}`)
}

async function runOk(page: Page) {
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 25_000 })
}

/** Open a launch lesson from its old URL and wait for the V3 studio it redirects to. */
async function openLaunch(page: Page, lessonId: string) {
  await page.goto(`/learn/lesson/${lessonId}`)
  await page.waitForURL(`**/studio/blockly/launch/${lessonId}`)
  await expect(page.getByTestId('launch-v3-slot')).toBeAttached({ timeout: 30_000 })
}

/** Start a launch lesson from a real, empty V3 draft at 第 1 关. */
async function openLaunchFresh(page: Page, lessonId: string) {
  await page.goto('/')
  await seedLaunchV3Draft(page, lessonId, 0, { 'step-1': [] })
  await openLaunch(page, lessonId)
}

async function expectLaunchStep(page: Page, step: number) {
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText(new RegExp(`第 ${step} / \\d+ 关`))
}

test('lesson 1: empty run errors, adding the start block recovers to success', async ({ page }) => {
  test.setTimeout(120_000)
  await openForestV3(page)
  // Step 1 only offers when_start, so the error leg is the empty run
  // (the TQ-008 pattern), not a move_right without when_start.
  await showLessonPane(page, 'stage')
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('stage-run-reason')).toBeVisible({ timeout: 12_000 })
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('运行成功')
  await add(page, ['when_start'])
  await runOk(page)
  await completeForestStep(page)
  await expect(page.getByTestId('forest-hello-step-progress')).toContainText('第 2 / 4 关')
})

test('lesson 5: scene-switch success, then stage reset and re-run repeats it', async ({ page }) => {
  test.setTimeout(120_000)
  await openLaunch(page, 'lesson-05-meadow-order')
  await add(page, ['when_start', 'move_right', 'switch_scene'])
  await runOk(page)
  await expect(page.getByTestId('stage-current-scene')).toContainText('草地')
  await expectStageWalk(page, 100)
  await press(page, 'reset-code-button')
  await runOk(page)
  await expect(page.getByTestId('stage-current-scene')).toContainText('草地')
  await expectStageWalk(page, 100)
})

test('lesson 9: click runs the program, the wrong first event cannot bypass it', async ({ page }) => {
  test.setTimeout(120_000)
  await openLaunch(page, 'lesson-09-garden-story')
  // Step 1 only offers when_clicked, so the wrong-event leg is the empty
  // run (the lesson-07 proven pattern): no click event, no execution.
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expect(page.getByTestId('stage-run-reason')).toContainText('被点击时', { timeout: 12_000 })
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('运行成功')
  // Fresh state for the success leg: the V3 draft persists per owner, so start
  // again from a real empty draft instead of a clear button.
  await openLaunchFresh(page, 'lesson-09-garden-story')
  await add(page, ['when_clicked', 'move_right'])
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expect(page.getByTestId('garden-await-click')).toBeVisible()
  await press(page, 'lesson-complete-step')
  await expect(page.getByTestId('launch-v3-notice')).toContainText('点击蝴蝶')
  await showLessonPane(page, 'stage')
  await page.getByTestId('stage-character-main').click()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 20_000 })
  await expectStageWalk(page, 100)
  await press(page, 'lesson-complete-step')
  await expectLaunchStep(page, 2)
})

/**
 * V3 duo result, same mapping as blockly-duo-graduation: the old duo-result 运行成功
 * is the run toggle leaving 停止 plus the shared stage's 运行成功.
 */
async function expectDuoRunOk(page: Page) {
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('ws-run-toggle')).not.toHaveText(/停止/, { timeout: 15_000 })
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15_000 })
}

test('lesson 12: duo success runs both actors and the gift stays unfound until earned', async ({ page }) => {
  test.setTimeout(120_000)
  await openLaunch(page, 'lesson-12-graduation-show')
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
  await press(page, 'duo-predict-both')
  await add(page, ['when_start'])
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expectDuoRunOk(page)
  await press(page, 'lesson-complete-step')
  await expectLaunchStep(page, 2)
  // V3 keeps a program per 关: 第 2 关 opens on its own canvas, so lay the 第 1 关
  // block again before the new one (same program as the old carry-over; same as
  // blockly-duo-graduation opening()).
  await add(page, ['when_start', 'move_right'])
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expectDuoRunOk(page)
  // Old data-position -> V3 data-steps (same mapping as blockly-duo-graduation positions()).
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100')
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
})

test('lesson 1 reward: full completion awards 3 stars, reopening keeps exactly 3', async ({ page }) => {
  test.setTimeout(180_000)
  await openForestV3(page)
  await showLessonPane(page, 'stage')
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'lesson-complete-step')
  await expect(page.getByTestId('forest-hello-notice')).toContainText('请先点击舞台')
  // 第 1 关's real 0-step run, then each later 关 builds its own program in V3.
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15_000 })
  await completeForestStep(page)
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'lesson-add-move_right')
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15_000 })
  await completeForestStep(page)
  await solvePracticeStep(page, { goalType: 'change-distance', guess: 'beside-friend', build: ['when_start', 'move_right', 'move_right'] })
  await expectStageWalk(page, 200)
  await completeForestStep(page)
  await solveMistakeStep(page, { expectCode: 'missing-start', answer: 'stayed', fix: ['when_start', 'move_right'] })
  await expectStageWalk(page, 100)
  await completeForestStep(page)
  await page.waitForURL('**/project/lesson-01-forest-hello/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
  await expect(page.getByText('当前累计 3 颗星星')).toBeVisible()
  await page.reload()
  await expect(page.getByText('当前累计 3 颗星星')).toHaveCount(1)
})

test('breakpoints 1440 / 768 / 375: lesson 5 success with matching layout and screenshots', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'viewport matrix runs once, on desktop')
  test.setTimeout(180_000)
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 900 })
    // Each viewport reuses this page, so the previous width's draft would
    // duplicate the program on re-add: start from a real empty draft every time.
    await openLaunchFresh(page, 'lesson-05-meadow-order')
    await add(page, ['when_start', 'move_right', 'switch_scene'])
    await runOk(page)
    await expect(page.getByTestId('stage-current-scene')).toContainText('草地')
    if (width > 1040) {
      // V3 desktop: three columns side by side, no tab row.
      await expect(page.getByTestId('v3-mobiletabs')).toBeHidden()
      await expect(page.getByTestId('v3-mission')).toBeVisible()
      await expect(page.getByTestId('ws-grid').locator('.kc-v3-editor-region')).toBeVisible()
      await expect(page.getByTestId('v3-stage-region')).toBeVisible()
    } else {
      // V3 below 1040px: 任务·编程·舞台 tabs; runOk left the stage pane on screen.
      await expect(page.getByTestId('v3-mobiletabs')).toBeVisible()
      await expect(page.getByTestId('v3-pane-stage')).toHaveAttribute('aria-selected', 'true')
      await expect(page.getByTestId('v3-stage-region')).toBeVisible()
      await expect(page.getByTestId('v3-mission')).toBeHidden()
    }
    await page.screenshot({ path: testInfo.outputPath(`l05-${width}.png`) })
  }
})

test('touch chain: real taps drive tabs, blocks, run and next on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'tap() needs a touch project')
  test.setTimeout(120_000)
  await openLaunch(page, 'lesson-02-forest-greeting')
  await page.getByTestId('v3-pane-code').tap()
  await expect(page.getByTestId('v3-pane-code')).toHaveAttribute('aria-selected', 'true')
  // The block buttons live in the V3 tools drawer: open it with a real tap.
  const tools = page.getByTestId('golden-block-tools')
  if (!(await tools.evaluate((el) => (el.parentElement as HTMLDetailsElement).open))) await tools.tap()
  await page.getByTestId('lesson-add-when_start').tap()
  await page.getByTestId('lesson-add-move_right').tap()
  await page.getByTestId('v3-pane-stage').tap()
  await page.getByTestId('ws-run-toggle').tap()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 20_000 })
  await page.getByTestId('v3-pane-task').tap()
  await expect(page.getByTestId('v3-mission')).toBeVisible()
  // V3 keeps “完成这一关” in the task pane (the old classroom had it on the stage).
  await page.getByTestId('launch-v3-complete-step').tap()
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText(/第 2 \/ \d+ 关/)
})
