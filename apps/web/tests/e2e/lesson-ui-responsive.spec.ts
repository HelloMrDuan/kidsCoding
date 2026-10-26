import { expect, test, type Page } from '@playwright/test'
import { clickLessonControl, expectStageWalk, showLessonPane, solveMistakeStep, solvePracticeStep } from './lesson-pane-helpers'

/** UX-206: integrated classroom regression across lessons 1 / 5 / 9 / 12 —
 *  success, error, reset-rebuild recovery and reward, at 1440 / 768 / 375
 *  widths, plus a real touch chain on the mobile project. Each lesson keeps
 *  its own dedicated spec for depth; this suite proves the full loop holds
 *  together across lessons and breakpoints. */

const touchPages = new WeakMap<Page, boolean>()
test.beforeEach(({ page }, testInfo) => {
  touchPages.set(page, Boolean(testInfo.project.use.hasTouch))
})

async function press(page: Page, id: string) {
  const button = page.getByTestId(id)
  await button.scrollIntoViewIfNeeded()
  if (touchPages.get(page)) await button.tap()
  else await button.click()
}

async function add(page: Page, types: string[]) {
  await showLessonPane(page, 'code')
  for (const type of types) await press(page, `lesson-add-${type}`)
}

async function runOk(page: Page) {
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 25_000 })
}

test('lesson 1: empty run errors, adding the start block recovers to success', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/learn/lesson/lesson-01-forest-hello')
  // Step 1 only offers when_start, so the error leg is the empty run
  // (the TQ-008 pattern), not a move_right without when_start.
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expect(page.getByTestId('stage-run-reason')).toBeVisible({ timeout: 12_000 })
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('运行成功')
  await add(page, ['when_start'])
  await runOk(page)
  await press(page, 'lesson-complete-step')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 2 关')
})

test('lesson 5: scene-switch success, then stage reset and re-run repeats it', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/learn/lesson/lesson-05-meadow-order')
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
  await page.goto('/learn/lesson/lesson-09-garden-story')
  // Step 1 only offers when_clicked, so the wrong-event leg is the empty
  // run (the lesson-07 proven pattern): no click event, no execution.
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expect(page.getByTestId('stage-run-reason')).toContainText('被点击时', { timeout: 12_000 })
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('运行成功')
  // Fresh state for the success leg: drafts persist per context, so clear
  // session storage and reload instead of a clear button that regular steps
  // do not have.
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()
  await add(page, ['when_clicked', 'move_right'])
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expect(page.getByTestId('garden-await-click')).toBeVisible()
  await press(page, 'lesson-complete-step')
  await expect(page.getByTestId('lesson-feedback-card')).toContainText('点击蝴蝶')
  await page.getByTestId('stage-character-main').click()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 20_000 })
  await expectStageWalk(page, 100)
  await press(page, 'lesson-complete-step')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 2 关')
})

test('lesson 12: duo success runs both actors and the gift stays unfound until earned', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/learn/lesson/lesson-12-graduation-show')
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
  await press(page, 'duo-predict-both')
  await add(page, ['when_start'])
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expect(page.getByTestId('duo-result')).toContainText('运行成功', { timeout: 15_000 })
  await press(page, 'lesson-complete-step')
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 2 关')
  await add(page, ['move_right'])
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expect(page.getByTestId('duo-result')).toContainText('运行成功', { timeout: 15_000 })
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-position', '100')
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
})

test('lesson 1 reward: full completion awards 3 stars, reopening keeps exactly 3', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-01-forest-hello')
  await showLessonPane(page, 'stage')
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'lesson-complete-step')
  await expect(page.getByTestId('lesson-feedback-card')).toContainText('请先点击舞台')
  for (let step = 0; step < 2; step++) {
    if (step === 1) await clickLessonControl(page, 'lesson-add-move_right')
    await clickLessonControl(page, 'run-code-button')
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15_000 })
    await clickLessonControl(page, 'lesson-complete-step')
  }
  await solvePracticeStep(page, { goalType: 'change-distance', guess: 'beside-friend', build: ['move_right'] })
  await expectStageWalk(page, 200)
  await clickLessonControl(page, 'lesson-complete-step')
  await solveMistakeStep(page, { expectCode: 'missing-start', answer: 'stayed', fix: ['when_start', 'move_right'] })
  await expectStageWalk(page, 100)
  await clickLessonControl(page, 'lesson-complete-step')
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
    await page.goto('/learn/lesson/lesson-05-meadow-order')
    // Each viewport reuses this page, so drafts from the previous width
    // would duplicate the program on re-add: start clean every time.
    await page.evaluate(() => sessionStorage.clear())
    await page.reload()
    await add(page, ['when_start', 'move_right', 'switch_scene'])
    await runOk(page)
    await expect(page.getByTestId('stage-current-scene')).toContainText('草地')
    if (width > 600) {
      await expect(page.getByTestId('lesson-mobile-tabs')).toBeHidden()
      await expect(page.getByTestId('lesson-task-column')).toBeVisible()
      await expect(page.getByTestId('lesson-code-column')).toBeVisible()
    } else {
      await expect(page.getByTestId('lesson-mobile-tabs')).toBeVisible()
      await expect(page.getByTestId('lesson-stage-column')).toBeVisible()
    }
    await page.screenshot({ path: testInfo.outputPath(`l05-${width}.png`) })
  }
})

test('touch chain: real taps drive tabs, blocks, run and next on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'tap() needs a touch project')
  test.setTimeout(120_000)
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  await page.getByTestId('lesson-mobile-tab-code').tap()
  await page.getByTestId('lesson-add-when_start').tap()
  await page.getByTestId('lesson-add-move_right').tap()
  await page.getByTestId('lesson-mobile-tab-stage').tap()
  await page.getByTestId('run-code-button').tap()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 20_000 })
  await page.getByTestId('lesson-mobile-tab-task').tap()
  await expect(page.getByTestId('lesson-task-column')).toBeVisible()
  await page.getByTestId('lesson-mobile-tab-stage').tap()
  await page.getByTestId('lesson-complete-step').tap()
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 2 关')
})
