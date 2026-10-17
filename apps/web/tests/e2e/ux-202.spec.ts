import { expect, test } from '@playwright/test'

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
const LESSON_ID = 'lesson-02-forest-greeting'
const LESSON_URL = `/learn/lesson/${LESSON_ID}`

async function noHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
}

test('UX-202 desktop shows task / code / stage side by side, run reachable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(LESSON_URL)
  await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()

  const task = page.getByTestId('lesson-task-column')
  const code = page.getByTestId('lesson-code-column')
  const stage = page.getByTestId('lesson-stage-column')
  await expect(task).toBeVisible()
  await expect(code).toBeVisible()
  await expect(stage).toBeVisible()

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

  // Run button is reachable in the stage zone; complete button in footer.
  await expect(page.getByTestId('run-code-button')).toBeVisible()
  await expect(page.getByTestId('lesson-footer')).toBeVisible()
  await expect(page.getByTestId('lesson-complete-step')).toBeVisible()
  await expect(page.getByTestId('lesson-progress-strip')).toBeVisible()
  await noHorizontalOverflow(page)
})

test('UX-202 tablet puts the task on top, code + stage side by side below', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(LESSON_URL)
  await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()

  const task = page.getByTestId('lesson-task-column')
  const code = page.getByTestId('lesson-code-column')
  const stage = page.getByTestId('lesson-stage-column')
  await expect(task).toBeVisible()
  await expect(code).toBeVisible()
  await expect(stage).toBeVisible()

  const taskBox = await task.boundingBox()
  const codeBox = await code.boundingBox()
  const stageBox = await stage.boundingBox()
  expect(taskBox).not.toBeNull()
  expect(codeBox).not.toBeNull()
  expect(stageBox).not.toBeNull()
  if (!taskBox || !codeBox || !stageBox) return
  // Task spans the full grid width above; code + stage share the row below.
  expect(taskBox.width).toBeGreaterThan(codeBox.width)
  expect(taskBox.y + taskBox.height).toBeLessThanOrEqual(codeBox.y + 1)
  expect(Math.abs(codeBox.y - stageBox.y)).toBeLessThanOrEqual(2)
  expect(codeBox.x).toBeLessThan(stageBox.x)
  expect(stageBox.x + stageBox.width).toBeLessThanOrEqual(768)
  await noHorizontalOverflow(page)
})

test('UX-202 mobile shows one pane at a time via task / code / stage tabs', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(LESSON_URL)
  await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()

  const tabs = page.getByTestId('lesson-mobile-tabs')
  await expect(tabs).toBeVisible()
  await expect(page.getByTestId('lesson-mobile-tab-task')).toBeVisible()
  await expect(page.getByTestId('lesson-mobile-tab-code')).toBeVisible()
  await expect(page.getByTestId('lesson-mobile-tab-stage')).toBeVisible()

  const task = page.getByTestId('lesson-task-column')
  const code = page.getByTestId('lesson-code-column')
  const stage = page.getByTestId('lesson-stage-column')

  // Default: task pane only.
  await expect(task).toBeVisible()
  await expect(code).toBeHidden()
  await expect(stage).toBeHidden()

  // Code pane: Blockly must survive being hidden and still accept a block.
  await page.getByTestId('lesson-mobile-tab-code').click()
  await expect(code).toBeVisible()
  await expect(task).toBeHidden()
  await expect(stage).toBeHidden()
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await page.getByTestId('lesson-add-when_start').click()
  await expect(page.getByTestId('lesson-save-local')).toContainText(
    '已保存到本机',
  )

  // Stage pane: run button reachable.
  await page.getByTestId('lesson-mobile-tab-stage').click()
  await expect(stage).toBeVisible()
  await expect(code).toBeHidden()
  await expect(page.getByTestId('run-code-button')).toBeVisible()

  // Back to task; footer complete button stays reachable.
  await page.getByTestId('lesson-mobile-tab-task').click()
  await expect(task).toBeVisible()
  await expect(page.getByTestId('lesson-complete-step')).toBeVisible()
  await noHorizontalOverflow(page)
})

test('UX-202 real edit, run, save and reload-restore still work', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(LESSON_URL)
  await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()

  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await page.getByTestId('lesson-add-when_start').click()
  await page.getByTestId('lesson-add-move_right').click()
  await expect(page.getByTestId('lesson-save-local')).toContainText(
    '已保存到本机',
  )

  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText(
    '运行成功',
    { timeout: 20_000 },
  )

  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-progress-strip')).toContainText(
    '步骤 2 / 5',
  )

  // On step 2, change the blocks once so a draft exists for THIS step;
  // otherwise reload would restore the step-1 draft (same as UX-201).
  await page.getByTestId('lesson-add-say_line').click()
  await expect(page.getByTestId('lesson-save-local')).toContainText(
    '已保存到本机',
  )

  await page.reload()
  await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()
  await expect(page.getByTestId('lesson-progress-strip')).toContainText(
    '步骤 2 / 5',
  )
  await expect(page.getByTestId('lesson-resume-note')).toContainText(
    '已回到上次进度：第 2 步',
  )
})

test('UX-202 three-zone visual evidence on three viewports', async ({
  browser,
}, testInfo) => {
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
    await page.goto(LESSON_URL)
    await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()
    await expect(page.getByTestId('lesson-three-zone-grid')).toBeVisible()

    await page
      .getByTestId('lesson-shell')
      .screenshot({ path: testInfo.outputPath(`ux-202-three-zone-${name}.png`) })
    await context.close()
  }
})
