import { expect, test, type Page } from '@playwright/test'

import { clickLessonControl, isLaunchV3, showLessonPane } from './lesson-pane-helpers'

/**
 * OPS-056: lesson-10 now runs in the V3 launch studio
 * (/studio/blockly/launch/<id>; the old /learn/lesson/<id> entry 308-redirects).
 * Everything up to /project/<id>/complete asserts the V3 DOM; the completion
 * page keeps its own DuoProject workbench and its original assertions.
 * DOM mapping (same strength): data-position -> data-steps,
 * stage-character-partner -> stage-character-friend, duo-result failure copy ->
 * stage-run-reason, duo-result 运行成功 -> run toggle back to 运行 + stage 运行成功,
 * lesson-task-card 第 N 关 -> launch-v3-step-progress 第 N /,
 * duo-active-actor at 第 3 关 -> lesson-playable-stage[data-active-actor].
 */
const LESSON = 'lesson-10-second-friend'

async function add(page: Page, ...types: string[]) {
  for (const type of types) await clickLessonControl(page, `lesson-add-${type}`)
}
async function stageClick(page: Page, testId: string) {
  await showLessonPane(page, 'stage')
  await page.getByTestId(testId).click()
}
async function positions(page: Page, fox: number, bear: number) {
  await showLessonPane(page, 'stage')
  if (isLaunchV3(page)) {
    await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', String(fox))
    await expect(page.getByTestId('stage-character-friend')).toHaveAttribute('data-steps', String(bear))
    return
  }
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-position', String(fox))
  await expect(page.getByTestId('stage-character-partner')).toHaveAttribute('data-position', String(bear))
}
async function pressRun(page: Page) {
  await clickLessonControl(page, 'run-code-button')
}
async function expectFailure(page: Page, text: string) {
  if (isLaunchV3(page)) {
    await expect(page.getByTestId('stage-run-reason')).toContainText(text, { timeout: 15000 })
    return
  }
  await expect(page.getByTestId('duo-result')).toContainText(text)
}
async function run(page: Page, fox: number, bear: number) {
  await pressRun(page)
  if (isLaunchV3(page)) {
    await expect(page.getByTestId('ws-run-toggle')).not.toHaveText(/停止/, { timeout: 15000 })
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15000 })
  } else {
    await expect(page.getByTestId('duo-result')).toContainText('运行成功', { timeout: 15000 })
  }
  await positions(page, fox, bear)
}
async function expectStep(page: Page, step: number) {
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText(`第 ${step} /`)
}
async function next(page: Page, step: number) {
  await clickLessonControl(page, 'lesson-complete-step')
  await expectStep(page, step)
}
async function start(page: Page) {
  await page.goto(`/learn/lesson/${LESSON}`)
  await page.waitForURL(`**/studio/blockly/launch/${LESSON}`)
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await positions(page, 0, 0)
  // V3: the run toggle is never disabled; the predict gate lives on 完成这一关.
  await clickLessonControl(page, 'lesson-complete-step')
  await expect(page.getByTestId('launch-v3-notice')).toContainText('先在舞台下方猜一猜')
  await expectStep(page, 1)
  await stageClick(page, 'duo-predict-both')
  await add(page, 'when_start')
  // Shell autosave is debounced (1000ms): reload only once the real draft
  // envelope in localStorage holds the new block.
  await expect.poll(() => page.evaluate((id) => localStorage.getItem(`kids-lesson-owner-v1:guest:kidscoding-draft:${id}`) ?? '', LESSON), { timeout: 10_000 }).toContain('when_start')
  await page.reload()
  await showLessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace').locator('.blocklySvg')).toBeVisible()
  await stageClick(page, 'duo-predict-both')
  await clickLessonControl(page, 'lesson-complete-step')
  await expectStep(page, 1)
  await run(page, 0, 0)
  await next(page, 2)
  // V3 keeps a program per 关: 第 2 关 opens on its own canvas, so lay the
  // 第 1 关 block again before the new one (same program as the old carry-over).
  await add(page, 'when_start', 'move_right')
  await run(page, 100, 0)
  await next(page, 3)
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'tablet', width: 768, height: 1024 }, { name: 'phone', width: 375, height: 812 }]) {
  test(`real Blockly duo lesson completes, debugs and recovers on ${viewport.name}`, async ({ page }, testInfo) => {
    test.setTimeout(180000)
    await page.setViewportSize(viewport)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await start(page)
    await clickLessonControl(page, 'lesson-clear-program')
    await add(page, 'when_start', 'switch_character', 'move_right')
    await pressRun(page)
    await expectFailure(page, '先让小狐狸走')
    await positions(page, 0, 0)
    await clickLessonControl(page, 'lesson-clear-program')
    await add(page, 'when_start', 'move_right', 'switch_character', 'move_right')
    await pressRun(page)
    await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100')
    await clickLessonControl(page, 'reset-code-button')
    await positions(page, 0, 0)
    await run(page, 100, 100)
    // 第 3 关 is independent mode: the duo panel is not rendered there, the
    // stage itself carries who is being operated.
    await expect(page.getByTestId('lesson-playable-stage')).toHaveAttribute('data-active-actor', 'partner')
    await run(page, 100, 100)
    await clickLessonControl(page, 'reset-code-button')
    await positions(page, 0, 0)
    await expect(page.getByTestId('lesson-playable-stage')).toHaveAttribute('data-active-actor', 'main')
    await run(page, 100, 100)
    await next(page, 4)
    // 第 4 关 opens on its own canvas: lay the 第 3 关 program for the baseline run.
    await add(page, 'when_start', 'move_right', 'switch_character', 'move_right')
    await run(page, 100, 100)
    await clickLessonControl(page, 'lesson-complete-step')
    await expectStep(page, 4)
    await clickLessonControl(page, 'lesson-clear-program')
    await add(page, 'when_start', 'move_right', 'move_right')
    await pressRun(page)
    await expectFailure(page, '小熊还没动')
    await positions(page, 200, 0)
    await page.getByTestId('lesson-playable-stage').screenshot({ path: testInfo.outputPath(`${viewport.name}-error.png`) })
    // TQ-015: the designed mistake above is the experiment. Two more real
    // failed runs stay failures; V3 hints are revealed by the child, level by level.
    await pressRun(page)
    await expectFailure(page, '小熊还没动')
    await pressRun(page)
    await expectFailure(page, '小熊还没动')
    await clickLessonControl(page, 'ws-hint-reveal-1')
    await clickLessonControl(page, 'ws-hint-reveal-2')
    await expect(page.getByTestId('ws-task-content')).toContainText('每个角色有自己的位置')
    await clickLessonControl(page, 'lesson-remove-last')
    await add(page, 'switch_character', 'move_right')
    await run(page, 100, 100)
    await next(page, 5)
    await clickLessonControl(page, 'lesson-clear-program')
    await add(page, 'when_start', 'move_right', 'say_line', 'switch_character', 'move_right')
    await run(page, 100, 100)
    await expect(page.getByTestId('stage-character-main')).toContainText('你好！')
    await stageClick(page, 'duo-reflect-together')
    await clickLessonControl(page, 'lesson-complete-step')
    await expectStep(page, 5)
    await stageClick(page, 'duo-reflect-own')
    await expect(page.getByTestId('duo-reflection')).toContainText('各有自己的位置')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-after.png`), fullPage: true })
    await clickLessonControl(page, 'lesson-complete-step')
    await page.waitForURL(`**/project/${LESSON}/complete`)
    await expect(page.getByTestId('project-complete-heading')).toBeVisible()
    await expect(page.getByTestId('duo-saved-project')).toBeVisible()
    await run(page, 100, 100)
    await page.getByTestId('duo-reflect-own').click()
    await page.getByTestId('duo-save-project').click()
    await expect(page.getByTestId('duo-save-status')).toContainText('作品已保存到本机')
    // Inject a real browser storage failure, never a substitute executor.
    await page.evaluate(() => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function (key, value) {
        // Block every progress envelope (legacy + owner-scoped), like a real quota failure.
        if (key.endsWith('kc-progress')) throw new DOMException('Storage full', 'QuotaExceededError')
        return original.call(this, key, value)
      }
    })
    await page.getByTestId('duo-save-project').click()
    await expect(page.getByTestId('duo-save-status')).toContainText('作品尚未保存')
    await page.reload()
    await run(page, 100, 100)
    await page.getByTestId('duo-reflect-own').click()
    // Editing invalidates old pass credit; no stale success may be saved.
    await add(page, 'move_right')
    await expect(page.getByTestId('duo-save-project')).toBeDisabled()
    await showLessonPane(page, 'stage')
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('duo-result')).toContainText('距离不对')
    await showLessonPane(page, 'code')
    await page.getByTestId('lesson-remove-last').click()
    await run(page, 100, 100)
    await page.getByTestId('duo-save-project').click()
    await expect(page.getByTestId('duo-save-status')).toContainText('作品已保存到本机')
    const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('kc-progress') ?? '{}'))
    expect(progress.completedLessonIds).toContain(LESSON)
    expect(progress.projectSnapshots.find((p: { lessonId: string }) => p.lessonId === LESSON).blocks.map((b: { type: string }) => b.type)).toEqual(['when_start', 'move_right', 'say_line', 'switch_character', 'move_right'])
    expect(errors).toEqual([])
  })
}

test('duplicate switch cannot pass and can be repaired', async ({ page }) => {
  test.setTimeout(90000)
  await start(page)
  // 第 3 关 opens on its own canvas: lay the fox's move, then the duplicate switch.
  await add(page, 'when_start', 'move_right', 'switch_character', 'switch_character', 'move_right')
  await pressRun(page)
  await expectFailure(page, '重复切换')
  await positions(page, 100, 0)
  await clickLessonControl(page, 'lesson-complete-step')
  await expectStep(page, 3)
  await clickLessonControl(page, 'lesson-clear-program')
  await add(page, 'when_start', 'move_right', 'switch_character', 'move_right')
  await run(page, 100, 100)
})

test('TQ-015 (V3): duo lesson failed runs keep manual hint levels; the character-switch remedial opens and returns to the V3 lesson', async ({ page }) => {
  test.setTimeout(120000)
  await start(page)
  // At 第 3 关, build the classic mistake: two fox moves and no switch.
  await clickLessonControl(page, 'lesson-clear-program')
  await add(page, 'when_start', 'move_right', 'move_right')
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await pressRun(page)
    await expectFailure(page, '还没切换角色')
  }
  // The workspace's own hint cards stay manual: the child reveals them in order.
  await clickLessonControl(page, 'ws-hint-reveal-1')
  await clickLessonControl(page, 'ws-hint-reveal-2')
  await clickLessonControl(page, 'ws-hint-reveal-3')
  await expect(page.getByTestId('ws-task-content')).toContainText('删掉多余移动')
  // 复审 HOLD P1 (restored): three real failures reach tier 3, and the in-lesson remedial link
  // opens the character-switch practice (same URL the old classroom pushed).
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('lesson-hint')).toHaveAttribute('data-hint-tier', '3', { timeout: 12_000 })
  const remedialLink = page.getByTestId('lesson-remedial-link')
  await expect(remedialLink).toHaveAttribute('data-remedial-id', 'remedial-switch-character')
  await remedialLink.click()
  await page.waitForURL(
    (url) => url.pathname === '/learn/remedial/remedial-switch-character' && url.searchParams.get('from') === LESSON,
  )
  await expect(page.getByRole('heading', { name: '先学会切换角色' })).toBeVisible()
  // The switch practice: move the fox, switch, then move the bear.
  await page.getByTestId('remedial-card-move_right').click()
  await expect(page.getByTestId('remedial-fox-steps')).toContainText('已走 100 步')
  await page.getByTestId('remedial-card-switch_character').click()
  await expect(page.getByTestId('remedial-active-actor')).toContainText('小熊')
  await page.getByTestId('remedial-card-move_right').click()
  await expect(page.getByTestId('remedial-success')).toContainText('切换之后')
  await page.getByRole('link', { name: '回到刚才的课程' }).click()
  await page.waitForURL(`**/studio/blockly/launch/${LESSON}`)
})

test('TQ-019: completion-page duo work escalates hints and offers the switch remedial', async ({ page }) => {
  test.setTimeout(180000)
  await start(page)
  // Step 3: the correct switch program.
  await clickLessonControl(page, 'lesson-clear-program')
  await add(page, 'when_start', 'move_right', 'switch_character', 'move_right')
  await run(page, 100, 100)
  await next(page, 4)
  // Step 4: baseline run, the designed mistake, then repair it.
  // 第 4 关 opens on its own canvas: lay the 第 3 关 program for the baseline run.
  await add(page, 'when_start', 'move_right', 'switch_character', 'move_right')
  await run(page, 100, 100)
  await clickLessonControl(page, 'lesson-complete-step')
  await clickLessonControl(page, 'lesson-clear-program')
  await add(page, 'when_start', 'move_right', 'move_right')
  await pressRun(page)
  await expectFailure(page, '小熊还没动')
  await clickLessonControl(page, 'lesson-remove-last')
  await add(page, 'switch_character', 'move_right')
  await run(page, 100, 100)
  await next(page, 5)
  // Step 5 (the work): build the saved program, reflect, and finish to the completion page.
  await clickLessonControl(page, 'lesson-clear-program')
  await add(page, 'when_start', 'move_right', 'say_line', 'switch_character', 'move_right')
  await run(page, 100, 100)
  await stageClick(page, 'duo-reflect-own')
  await clickLessonControl(page, 'lesson-complete-step')
  await page.waitForURL(`**/project/${LESSON}/complete`)
  await expect(page.getByTestId('duo-saved-project')).toBeVisible()
  // TQ-019: no hint before any failed run on the completion page.
  await expect(page.getByTestId('duo-project-hint')).toHaveCount(0)
  // Break the saved work: remove the bear's move, leaving the switch dangling.
  await page.getByTestId('lesson-remove-last').click()
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('duo-result')).toContainText('动错角色啦')
  await expect(page.getByTestId('duo-project-hint')).toHaveAttribute('data-hint-tier', '1')
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('duo-result')).toContainText('动错角色啦')
  await expect(page.getByTestId('duo-project-hint')).toHaveAttribute('data-hint-tier', '2')
  await expect(page.getByTestId('duo-project-hint')).toContainText('每个角色有自己的位置')
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('duo-result')).toContainText('动错角色啦')
  await expect(page.getByTestId('duo-project-hint')).toHaveAttribute('data-hint-tier', '3')
  const link = page.getByTestId('lesson-remedial-link')
  await expect(link).toHaveAttribute('data-remedial-id', 'remedial-switch-character')
  await link.click()
  await page.waitForURL(`**/learn/remedial/remedial-switch-character?from=${LESSON}&step=step-3**`)
  await expect(page.getByRole('heading', { name: '先学会切换角色' })).toBeVisible()
})
