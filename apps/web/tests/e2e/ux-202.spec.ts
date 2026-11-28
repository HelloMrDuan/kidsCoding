import { expect, test, type Locator, type Page } from '@playwright/test'
import { clickLessonControl, showLessonPane } from './lesson-pane-helpers'

// UX-202: classroom task / code / stage three-zone layout must follow the
// frozen V2 prototype (prototype.html: .lesson-grid + 1180/860/600 rules).
//
// Audit gaps vs the pre-UX-202 classroom:
//  1. Two columns only (320px task rail + workbench): stage and Blockly
//     were stacked vertically inside one workbench column. The prototype
//     has three side-by-side columns: task 255px | code | stage.
//  2. Breakpoints were wrong: a single `xl:` switch stacked everything
//     below 1280px. The prototype keeps three columns to 1180px, puts
//     the task full-width on top with code+stage side by side at <=860px,
//     and switches to task/code/stage tabs at <=600px.
//  3. No mobile tabs: on phones all zones stacked and Blockly + stage
//     both rendered, squeezing the editor. The prototype shows exactly
//     one pane, switched by 任务 / 积木 / 舞台 tabs.
//  4. The complete-step button lived in the task rail; the prototype
//     puts it in the lesson footer. Feedback lived in the task rail;
//     the prototype shows it in the stage column.
// This file covers the three-zone geometry on three viewports, the
// mobile tab switching (including Blockly surviving a hidden pane),
// run-button reachability, no horizontal overflow, and one real
// edit -> run -> save -> reload-restore cycle (no regression vs UX-201).
// It does NOT duplicate the full duo flows or the UX-201 save-failure
// matrix.
//
// OPS-056: lesson-02 runs in the shared V3 launch studio
// (/studio/blockly/launch/<id>; the old /learn/lesson/<id> entry redirects there).
// DOM mapping (same strength, real code paths only):
//  - lesson-workbench-shell -> studio-shell + launch-v3-slot (data-lesson-id);
//  - lesson-task / code / stage-column -> v3-mission / .kc-v3-editor-region /
//    .kc-v3-stage-column (the three children of ws-grid);
//  - lesson-mobile-tabs / lesson-mobile-tab-* -> v3-mobiletabs / v3-pane-*;
//  - run-code-button -> ws-run-toggle (the V3 stage's run control);
//  - lesson-complete-step -> launch-v3-complete-step (in the task pane);
//  - lesson-save-local -> studio-save-chip; lesson-progress-strip -> launch-v3-step-progress;
//  - lesson-shell screenshot -> studio-shell.
// ux-202 裁定 (decided, no pending gaps; real functional checks, not weakened):
//  - the V3 one-pane tabs at <=1040px are approved: 768px shows ONE pane, and the
//    tablet spec below asserts real tab switching plus edit / run / complete from each pane;
//  - the old lesson-footer is not restored: the V3 task pane's complete button is the
//    completion control, asserted blocking before a run and advancing after one;
//  - the resume note「已回到上次进度：第 N 关」is restored and asserted in ux-201.
const LESSON_ID = 'lesson-02-forest-greeting'
const LESSON_URL = `/learn/lesson/${LESSON_ID}`
const LAUNCH_URL = `/studio/blockly/launch/${LESSON_ID}`

async function openLaunch(page: Page) {
  await page.goto(LESSON_URL)
  await page.waitForURL(`**${LAUNCH_URL}`)
  await expect(page.getByTestId('studio-shell')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('launch-v3-slot')).toHaveAttribute('data-lesson-id', LESSON_ID, { timeout: 30_000 })
}

function zones(page: Page): { task: Locator; code: Locator; stage: Locator } {
  const grid = page.getByTestId('ws-grid')
  return {
    task: page.getByTestId('v3-mission'),
    code: grid.locator('.kc-v3-editor-region'),
    stage: grid.locator('.kc-v3-stage-column'),
  }
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
}

async function expectExactlyOneVisible(locators: Locator[]) {
  await expect.poll(async () => {
    let visible = 0
    for (const locator of locators) if (await locator.isVisible()) visible += 1
    return visible
  }).toBe(1)
}

test('UX-202 desktop shows task / code / stage side by side, run reachable', async ({
  page,
}) => {
  // openLaunch alone may wait 30s for the studio on a cold server; keep the
  // whole case inside one budget instead of the 30s default (no assertion relaxed).
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await openLaunch(page)

  const { task, code, stage } = zones(page)
  await expect(task).toBeVisible()
  await expect(code).toBeVisible()
  await expect(stage).toBeVisible()
  // Desktop is not tab mode.
  await expect(page.getByTestId('v3-mobiletabs')).toBeHidden()

  const taskBox = await task.boundingBox()
  const codeBox = await code.boundingBox()
  const stageBox = await stage.boundingBox()
  expect(taskBox).not.toBeNull()
  expect(codeBox).not.toBeNull()
  expect(stageBox).not.toBeNull()
  if (!taskBox || !codeBox || !stageBox) return
  // Three columns in one row, left to right, no overlap.
  expect(taskBox.x).toBeLessThan(codeBox.x)
  expect(codeBox.x).toBeLessThan(stageBox.x)
  expect(Math.abs(taskBox.y - codeBox.y)).toBeLessThanOrEqual(2)
  expect(Math.abs(codeBox.y - stageBox.y)).toBeLessThanOrEqual(2)
  expect(taskBox.x + taskBox.width).toBeLessThanOrEqual(codeBox.x + 1)
  expect(codeBox.x + codeBox.width).toBeLessThanOrEqual(stageBox.x + 1)
  expect(stageBox.x + stageBox.width).toBeLessThanOrEqual(1440)

  // Run button is reachable in the stage zone; complete button and the
  // step progress are reachable in the task zone (V3 has no footer).
  await expect(stage.getByTestId('ws-run-toggle')).toBeVisible()
  await expect(task.getByTestId('launch-v3-complete-step')).toBeVisible()
  await expect(page.getByTestId('launch-v3-step-progress')).toBeVisible()
  await noHorizontalOverflow(page)
})

test('UX-202 tablet keeps every zone reachable without overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await openLaunch(page)

  // V3 at <=1040px: one pane at a time, switched by the 任务·编程·舞台 tabs.
  const { task, code, stage } = zones(page)
  await expect(page.getByTestId('v3-mobiletabs')).toBeVisible()
  await expectExactlyOneVisible([task, code, stage])
  for (const [pane, zone] of [['task', task], ['code', code], ['stage', stage]] as const) {
    await showLessonPane(page, pane)
    await expect(zone).toBeVisible()
    await expectExactlyOneVisible([task, code, stage])
    const box = await zone.boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.x + box.width).toBeLessThanOrEqual(768)
  }
  await noHorizontalOverflow(page)
})

test('UX-202 tablet (<=1040px) one-pane tabs really switch and every action works from its pane', async ({
  page,
}) => {
  // ux-202 裁定: the approved V3 one-pane tabs below 1040px replace the old
  // "task on top, code + stage side by side" layout. Assert real tab switching
  // and that edit / run / complete are reachable and actually work from their pane.
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 768, height: 1024 })
  await openLaunch(page)

  const grid = page.getByTestId('ws-grid')
  const { task, code, stage } = zones(page)
  await expect(page.getByTestId('v3-mobiletabs')).toBeVisible()

  // Code tab: the pane switches and a block really lands on the canvas and saves.
  await page.getByTestId('v3-pane-code').click()
  await expect(grid).toHaveAttribute('data-pane', 'code')
  await expect(code).toBeVisible()
  await expectExactlyOneVisible([task, code, stage])
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'lesson-add-move_right')
  const chip = page.getByTestId('studio-save-chip')
  await expect(chip).toHaveAttribute('data-state', 'saved', { timeout: 10_000 })

  // Stage tab: the run control is on screen without scrolling and really runs.
  await page.getByTestId('v3-pane-stage').click()
  await expect(grid).toHaveAttribute('data-pane', 'stage')
  await expect(stage).toBeVisible()
  await expectExactlyOneVisible([task, code, stage])
  await expect(page.getByTestId('ws-run-toggle')).toBeInViewport()
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 20_000 })

  // Task tab: the complete button is on screen and really advances to 第 2 关.
  await page.getByTestId('v3-pane-task').click()
  await expect(grid).toHaveAttribute('data-pane', 'task')
  await expect(task).toBeVisible()
  await expectExactlyOneVisible([task, code, stage])
  const complete = task.getByTestId('launch-v3-complete-step')
  await expect(complete).toBeInViewport()
  await complete.click()
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText('第 2 / 4 关')
  await expect(page.getByTestId('launch-v3-stepbar-2')).toHaveAttribute('aria-current', 'step')
  await noHorizontalOverflow(page)
})

test('UX-202 mobile shows one pane at a time via task / code / stage tabs', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await openLaunch(page)

  const tabs = page.getByTestId('v3-mobiletabs')
  await expect(tabs).toBeVisible()
  await expect(page.getByTestId('v3-pane-task')).toBeVisible()
  await expect(page.getByTestId('v3-pane-code')).toBeVisible()
  await expect(page.getByTestId('v3-pane-stage')).toBeVisible()

  const { task, code, stage } = zones(page)
  // Exactly one pane, whichever the classroom opens on.
  await expectExactlyOneVisible([task, code, stage])

  // Task pane.
  await showLessonPane(page, 'task')
  await expect(task).toBeVisible()
  await expect(code).toBeHidden()
  await expect(stage).toBeHidden()

  // Code pane: Blockly must survive being hidden and still accept a block.
  await showLessonPane(page, 'code')
  await expect(code).toBeVisible()
  await expect(task).toBeHidden()
  await expect(stage).toBeHidden()
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await clickLessonControl(page, 'lesson-add-when_start')
  const chip = page.getByTestId('studio-save-chip')
  await expect(chip).toHaveAttribute('data-state', 'saved', { timeout: 10_000 })
  await expect(chip).toContainText('已保存到本机')

  // Stage pane: run button reachable.
  await showLessonPane(page, 'stage')
  await expect(stage).toBeVisible()
  await expect(code).toBeHidden()
  await expect(page.getByTestId('ws-run-toggle')).toBeVisible()

  // Back to task; the complete button stays reachable there.
  await showLessonPane(page, 'task')
  await expect(task).toBeVisible()
  await expect(page.getByTestId('launch-v3-complete-step')).toBeVisible()
  await noHorizontalOverflow(page)
})

test('UX-202 the V3 task-pane complete button really completes the step (no lesson footer)', async ({
  page,
}) => {
  // ux-202 裁定: the old lesson-footer is not restored; the V3 task pane's
  // complete button is the one completion control. Assert it blocks before a
  // successful run (negative) and really advances after one (positive).
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await openLaunch(page)

  const { task } = zones(page)
  await expect(page.getByTestId('lesson-footer')).toHaveCount(0)
  const complete = task.getByTestId('launch-v3-complete-step')
  await expect(complete).toBeVisible()
  await expect(complete).toBeInViewport()

  // Negative: no successful run yet -> honest notice, still on 第 1 关.
  await complete.click()
  await expect(page.getByTestId('launch-v3-notice')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText('第 1 / 4 关')

  // Positive: build, run to success, then the same button advances to 第 2 关.
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'lesson-add-move_right')
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 20_000 })
  await complete.click()
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText('第 2 / 4 关')
  await expect(page.getByTestId('launch-v3-stepbar-2')).toHaveAttribute('aria-current', 'step')
  await expect(page.getByTestId('launch-v3-stepbar-1')).toHaveClass(/is-complete/)
})

test('UX-202 real edit, run, save and reload-restore still work', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openLaunch(page)

  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'lesson-add-move_right')
  const chip = page.getByTestId('studio-save-chip')
  await expect(chip).toHaveAttribute('data-state', 'saved', { timeout: 10_000 })
  await expect(chip).toContainText('已保存到本机')

  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText(
    '运行成功',
    { timeout: 20_000 },
  )

  await clickLessonControl(page, 'lesson-complete-step')
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText('第 2 / 4 关')
  await expect(page.getByTestId('launch-v3-stepbar-2')).toHaveAttribute('aria-current', 'step')

  // On step 2, change the blocks once so a draft exists for THIS step
  // (same as UX-201).
  await clickLessonControl(page, 'lesson-add-say_line')
  await expect(chip).toHaveAttribute('data-state', 'saved', { timeout: 10_000 })

  await page.reload()
  await expect(page.getByTestId('studio-shell')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('launch-v3-slot')).toBeAttached({ timeout: 30_000 })
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText('第 2 / 4 关')
  await expect(page.getByTestId('launch-v3-stepbar-2')).toHaveAttribute('aria-current', 'step')
  await expect(page.getByTestId('launch-v3-stepbar-1')).toHaveClass(/is-complete/)
  // The 「已回到上次进度：第 2 关」 note is asserted in ux-201's resume spec (ux-201 裁定).
})

test('UX-202 three-zone visual evidence on three viewports', async ({
  browser,
}, testInfo) => {
  // Three fresh contexts, each opening the studio: 30s total is not enough.
  test.setTimeout(180_000)
  for (const [name, width, height] of [
    ['desktop', 1440, 900],
    ['tablet', 768, 1024],
    ['mobile', 375, 812],
  ] as const) {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width, height },
    })
    const page = await context.newPage()
    await openLaunch(page)
    await expect(page.getByTestId('ws-grid')).toBeVisible()

    await page
      .getByTestId('studio-shell')
      .screenshot({ path: testInfo.outputPath(`ux-202-three-zone-${name}.png`) })
    await context.close()
  }
})
