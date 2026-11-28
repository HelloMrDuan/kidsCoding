import { expect, test, type Page } from '@playwright/test'

import { clickLessonControl, isLaunchV3, showLessonPane } from './lesson-pane-helpers'

/**
 * OPS-056: lesson-11 now runs in the V3 launch studio
 * (/studio/blockly/launch/<id>; the old /learn/lesson/<id> entry 308-redirects).
 * Everything up to /project/<id>/complete asserts the V3 DOM; the completion
 * page keeps its own DuoProject workbench and its original assertions.
 * DOM mapping (same strength): data-position -> data-steps,
 * stage-character-partner -> stage-character-friend, duo-result failure copy ->
 * stage-run-reason, duo-result 运行成功 -> run toggle back to 运行 + stage 运行成功,
 * duo-fox/bear-message -> .kc-stage-speech inside stage-character-main/friend,
 * duo-action-log li -> stage-action-log li, duo-fox/bear-distance ->
 * stage-walked-distance / stage-friend-distance, lesson-task-card 第 N 关 ->
 * launch-v3-step-progress 第 N /. The dialogue board (duo-*-speech-record)
 * is the V3 duo panel's own element and keeps its assertions.
 */
const lessonId = 'lesson-11-duo-rehearsal'
const movement = ['when_start', 'move_right', 'switch_character', 'move_right']

async function add(page: Page, ...types: string[]) {
  for (const type of types) await clickLessonControl(page, `lesson-add-${type}`)
}
async function program(page: Page, types: string[]) {
  await clickLessonControl(page, 'lesson-clear-program')
  await add(page, ...types)
}
async function stageClick(page: Page, testId: string) {
  await showLessonPane(page, 'stage')
  await page.getByTestId(testId).click()
}
function foxSpeech(page: Page) {
  return page.getByTestId('stage-character-main').locator('.kc-stage-speech')
}
function bearSpeech(page: Page) {
  return page.getByTestId('stage-character-friend').locator('.kc-stage-speech')
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
async function run(page: Page, fox = 100, bear = 100) {
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
  await page.goto(`/learn/lesson/${lessonId}`)
  await page.waitForURL(`**/studio/blockly/launch/${lessonId}`)
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await positions(page, 0, 0)
  await expect(page.getByTestId('duo-fox-speech-record')).toHaveText('还没有说话')
  await expect(page.getByTestId('duo-bear-speech-record')).toHaveText('还没有说话')
  // V3: the run toggle is never disabled; the predict gate lives on 完成这一关.
  await clickLessonControl(page, 'lesson-complete-step')
  await expect(page.getByTestId('launch-v3-notice')).toContainText('先在舞台下方猜一猜')
  await expectStep(page, 1)
  await stageClick(page, 'duo-predict-both')
  await add(page, 'when_start')
  // Shell autosave is debounced (1000ms): reload only once the real draft
  // envelope in localStorage holds the new block.
  await expect.poll(() => page.evaluate((id) => localStorage.getItem(`kids-lesson-owner-v1:guest:kidscoding-draft:${id}`) ?? '', lessonId), { timeout: 10_000 }).toContain('when_start')
  await page.reload()
  await showLessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace').locator('.blocklySvg')).toBeVisible()
  await stageClick(page, 'duo-predict-both')
  await clickLessonControl(page, 'lesson-complete-step')
  await expectStep(page, 1)
  await run(page, 0, 0)
  await next(page, 2)
  // V3 keeps a program per 关: 第 2 关 opens on its own canvas, so lay the
  // 第 1 关 block again before the new ones (same program as the old carry-over).
  await add(page, 'when_start', 'move_right', 'switch_character', 'move_right')
  await run(page)
  await expect(page.getByTestId('duo-bear-speech-record')).toHaveText('还没有说话')
  await next(page, 3)
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'tablet', width: 768, height: 1024 }, { name: 'phone', width: 375, height: 812 }]) {
  test(`real dialogue, wrong actor repair and editable saved work on ${viewport.name}`, async ({ page }, testInfo) => {
    test.setTimeout(180000)
    await page.setViewportSize(viewport)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await start(page)
    // Movement alone never passes the dialogue task (第 3 关 opens on its own canvas).
    await add(page, ...movement)
    await pressRun(page)
    await expectFailure(page, '小熊还没说')
    await positions(page, 100, 100)
    await clickLessonControl(page, 'lesson-complete-step')
    await expectStep(page, 3)
    await add(page, 'say_line')
    // Speech is cancelled if the child resets while movement is in progress.
    await pressRun(page)
    await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100')
    await clickLessonControl(page, 'reset-code-button')
    await positions(page, 0, 0)
    await expect(page.getByTestId('duo-bear-speech-record')).toHaveText('还没有说话')
    await run(page)
    await expect(bearSpeech(page)).toHaveText('我们一起出发吧！')
    await expect(page.getByTestId('duo-fox-speech-record')).toHaveText('还没有说话')
    await run(page)
    await expect(page.getByTestId('stage-action-log').locator('li')).toHaveCount(4)
    await clickLessonControl(page, 'reset-code-button')
    await expect(bearSpeech(page)).toHaveCount(0)
    await run(page)
    await next(page, 4)
    // 第 4 关 opens on its own canvas: lay the 第 3 关 program for the baseline run.
    await add(page, ...movement, 'say_line')
    await run(page)
    await clickLessonControl(page, 'lesson-complete-step')
    await expectStep(page, 4)
    await program(page, ['when_start', 'move_right', 'say_line', 'switch_character', 'move_right'])
    await pressRun(page)
    await expectFailure(page, '对白给错人')
    await positions(page, 100, 100)
    await expect(foxSpeech(page)).toHaveText('你好！')
    await expect(page.getByTestId('duo-bear-speech-record')).toHaveText('还没有说话')
    await page.getByTestId('lesson-playable-stage').screenshot({ path: testInfo.outputPath(`${viewport.name}-error.png`) })
    // TQ-015: the designed mistake above is the experiment. Two more real
    // failed runs stay failures; V3 hints are revealed by the child, level by level.
    await pressRun(page)
    await expectFailure(page, '对白给错人')
    await pressRun(page)
    await expectFailure(page, '对白给错人')
    await clickLessonControl(page, 'ws-hint-reveal-1')
    await clickLessonControl(page, 'ws-hint-reveal-2')
    await expect(page.getByTestId('ws-task-content')).toContainText('每个角色有自己的对白')
    await program(page, [...movement, 'say_line'])
    await run(page)
    await next(page, 5)
    // Baseline and creative variants both pass actual result assertions
    // (第 5 关 opens on its own canvas, so the baseline is laid first).
    await add(page, ...movement, 'say_line')
    await run(page)
    await program(page, ['when_start', 'say_line', 'move_right', 'switch_character', 'move_right', 'say_line'])
    await run(page)
    await expect(foxSpeech(page)).toHaveText('你好！')
    await expect(bearSpeech(page)).toHaveText('我们一起出发吧！')
    for (const [distanceId, speech] of [
      ['stage-walked-distance', foxSpeech(page)],
      ['stage-friend-distance', bearSpeech(page)],
    ] as const) {
      const distance = await page.getByTestId(distanceId).boundingBox()
      const bubble = await speech.boundingBox()
      expect(distance).not.toBeNull()
      expect(bubble).not.toBeNull()
      expect(bubble!.y).toBeGreaterThanOrEqual(distance!.y + distance!.height)
    }
    await stageClick(page, 'duo-reflect-together')
    await clickLessonControl(page, 'lesson-complete-step')
    await expectStep(page, 5)
    await stageClick(page, 'duo-reflect-own')
    await expect(page.getByTestId('duo-reflection')).toContainText('各有自己的对白')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-after.png`), fullPage: true })
    await clickLessonControl(page, 'lesson-complete-step')
    await page.waitForURL(`**/project/${lessonId}/complete`)
    // OPS-057: read-only replay on completion; editing is in the V3 work mode.
    await expect(page.getByTestId('project-work-replay')).toBeVisible()
    await expect(page.getByTestId('duo-saved-project')).toHaveCount(0)
    await expect(page.getByTestId('duo-save-project')).toHaveCount(0)
    await expect(page.getByTestId('project-open-v3')).toHaveAttribute('href', `/studio/blockly/project/${lessonId}`)
    await expect(page.getByRole('status').filter({ hasText: '回放完成' })).toBeVisible({ timeout: 25_000 })
    await page.reload()
    await expect(page.getByTestId('project-work-replay')).toBeVisible()
    const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('kc-progress') ?? '{}'))
    expect(progress.completedLessonIds).toContain(lessonId)
    expect(progress.projectSnapshots.find((p: { lessonId: string }) => p.lessonId === lessonId).blocks.map((b: { type: string }) => b.type)).toEqual(['when_start', 'say_line', 'move_right', 'switch_character', 'move_right', 'say_line'])
    expect(errors).toEqual([])
  })
}

test('duplicate switching is a real error and repairs within the same lesson', async ({ page }) => {
  test.setTimeout(90000)
  await start(page)
  await program(page, ['when_start', 'move_right', 'switch_character', 'switch_character', 'move_right', 'say_line'])
  await pressRun(page)
  await expectFailure(page, '重复切换')
  await positions(page, 100, 0)
  await expect(page.getByTestId('duo-bear-speech-record')).toHaveText('还没有说话')
  await program(page, [...movement, 'say_line'])
  await run(page)
})
