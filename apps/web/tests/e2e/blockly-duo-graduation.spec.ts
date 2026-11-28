import { expect, test, type Page } from '@playwright/test'

import { isLaunchV3, resolveV3LessonControl, showLessonPane } from './lesson-pane-helpers'

/**
 * OPS-056: lesson-12 now runs in the V3 launch studio
 * (/studio/blockly/launch/<id>; the old /learn/lesson/<id> entry 308-redirects).
 * Everything up to /project/<id>/complete asserts the V3 DOM; the completion
 * page keeps its own DuoProject workbench and its original assertions.
 * DOM mapping (same strength): data-position -> data-steps,
 * stage-character-partner -> stage-character-friend, duo-result failure copy ->
 * stage-run-reason, duo-result 运行成功 -> run toggle back to 运行 + stage 运行成功,
 * duo-fox/bear-message -> .kc-stage-speech inside stage-character-main/friend,
 * duo-action-log li -> stage-action-log li (5 lines incl. the gift log),
 * lesson-task-card 第 N 关 -> launch-v3-step-progress 第 N /,
 * lesson-feedback-card 尚未保存 -> launch-v3-notice.
 */
const lessonId = 'lesson-12-graduation-show'
const movement = ['when_start', 'move_right', 'switch_character', 'move_right']
const repeat = [...movement, 'repeat_twice']
const creative = ['when_start', 'say_line', 'move_right', 'switch_character', 'move_right', 'move_right', 'say_line']
const touchPages = new WeakMap<Page, boolean>()
test.beforeEach(({ page }, testInfo) => { touchPages.set(page, Boolean(testInfo.project.use.hasTouch)) })
// Touch projects dispatch native taps, including at desktop/tablet-sized viewports.
async function press(page: Page, id: string) {
  let target = id
  if (isLaunchV3(page)) {
    // Same V3 mapping as clickLessonControl (pane / tools drawer first), but
    // keep this spec's own tap-vs-click choice.
    if (id === 'run-code-button') {
      await showLessonPane(page, 'stage')
      target = 'ws-run-toggle'
    } else if (id.startsWith('duo-') || id === 'graduation-gift') {
      await showLessonPane(page, 'stage')
    } else {
      target = (await resolveV3LessonControl(page, id)) ?? id
    }
  }
  const button = page.getByTestId(target)
  await button.scrollIntoViewIfNeeded()
  if (touchPages.get(page)) await button.tap()
  else await button.click()
}
function foxSpeech(page: Page) {
  return page.getByTestId('stage-character-main').locator('.kc-stage-speech')
}
function bearSpeech(page: Page) {
  return page.getByTestId('stage-character-friend').locator('.kc-stage-speech')
}
async function add(page: Page, types: string[]) {
  if (!isLaunchV3(page)) await showLessonPane(page, 'code')
  for (const type of types) await press(page, `lesson-add-${type}`)
}
async function program(page: Page, types: string[]) {
  if (!isLaunchV3(page)) await showLessonPane(page, 'code')
  await press(page, 'lesson-clear-program')
  await add(page, types)
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
async function expectFailure(page: Page, text: string) {
  if (isLaunchV3(page)) {
    await expect(page.getByTestId('stage-run-reason')).toContainText(text, { timeout: 15000 })
    return
  }
  await expect(page.getByTestId('duo-result')).toContainText(text)
}
async function run(page: Page, fox = 100, bear = 200) {
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  if (isLaunchV3(page)) {
    await expect(page.getByTestId('ws-run-toggle')).not.toHaveText(/停止/, { timeout: 15000 })
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15000 })
  } else {
    await expect(page.getByTestId('duo-result')).toContainText('运行成功', { timeout: 15000 })
  }
  await positions(page, fox, bear)
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', String(bear === 200))
}
async function expectStep(page: Page, step: number) {
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText(`第 ${step} /`)
}
async function next(page: Page, step: number) {
  await press(page, 'lesson-complete-step')
  await expectStep(page, step)
}
async function opening(page: Page) {
  await page.goto(`/learn/lesson/${lessonId}`)
  await page.waitForURL(`**/studio/blockly/launch/${lessonId}`)
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await showLessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace').locator('.blocklySvg')).toBeVisible()
  await positions(page, 0, 0)
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
  // V3: the run toggle is never disabled; the predict gate lives on 完成这一关.
  await press(page, 'lesson-complete-step')
  await expect(page.getByTestId('launch-v3-notice')).toContainText('先在舞台下方猜一猜')
  await expectStep(page, 1)
  await press(page, 'duo-predict-both')
  await add(page, ['when_start'])
  await run(page, 0, 0)
  await next(page, 2)
  // V3 keeps a program per 关: 第 2 关 opens on its own canvas, so lay the
  // 第 1 关 block again before the new one (same program as the old carry-over).
  await add(page, ['when_start', 'move_right'])
  await run(page, 100, 0)
  await next(page, 3)
}
async function debug(page: Page) {
  await program(page, movement)
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expectFailure(page, '还差 100 步')
  await positions(page, 100, 100)
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
}
async function finish(page: Page) {
  await press(page, 'duo-reflect-own')
  await press(page, 'lesson-complete-step')
  await page.waitForURL(`**/project/${lessonId}/complete`)
  await expect(page.getByTestId('project-work-replay')).toBeVisible()
}
async function progress(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('kc-progress') ?? '{}'))
}
for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'tablet', width: 768, height: 1024 }, { name: 'phone', width: 375, height: 812 }]) {
  test(`graduation gift, repair, reopen and repeat rewards on ${viewport.name}`, async ({ page }, testInfo) => {
    test.setTimeout(240000)
    await page.setViewportSize(viewport)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await opening(page)
    await debug(page)
    await press(page, 'lesson-complete-step')
    await expectStep(page, 3)
    await add(page, ['repeat_twice'])
    await showLessonPane(page, 'stage')
    await press(page, 'run-code-button')
    await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100')
    await press(page, 'reset-code-button')
    await positions(page, 0, 0)
    await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
    await run(page)
    await run(page)
    await expect(page.getByTestId('stage-action-log').locator('li')).toHaveCount(5)
    await next(page, 4)
    // 第 4 关 opens on its own canvas: lay the 第 3 关 program for the baseline run.
    await program(page, repeat)
    await run(page)
    await press(page, 'lesson-complete-step')
    await expectStep(page, 4)
    await debug(page)
    await expect(page.getByTestId('duo-debug-task')).toContainText('已观察')
    await page.getByTestId('lesson-playable-stage').screenshot({ path: testInfo.outputPath(`${viewport.name}-error.png`) })
    // TQ-015: the designed mistake above is the experiment. Two more real
    // failed runs stay failures; V3 hints are revealed by the child, level by level.
    await press(page, 'run-code-button')
    await expectFailure(page, '还差 100 步')
    await press(page, 'run-code-button')
    await expectFailure(page, '还差 100 步')
    await press(page, 'ws-hint-reveal-1')
    await press(page, 'ws-hint-reveal-2')
    await expect(page.getByTestId('ws-task-content')).toContainText('只重复当前角色的移动')
    await add(page, ['repeat_twice'])
    await run(page)
    await next(page, 5)
    await program(page, creative)
    await run(page)
    await expect(foxSpeech(page)).toHaveText('你好！')
    await expect(bearSpeech(page)).toHaveText('找到礼物啦！')
    await press(page, 'duo-reflect-together')
    await press(page, 'lesson-complete-step')
    await expectStep(page, 5)
    await press(page, 'duo-reflect-own')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-after.png`), fullPage: true })
    // A failed final write neither awards nor navigates; retry uses the same real result.
    await page.evaluate(() => {
      const original = Storage.prototype.setItem
      Object.assign(window, { graduationSetItem: original })
      Storage.prototype.setItem = function (key, value) {
        // Block every progress envelope (legacy + owner-scoped), like a real quota failure.
        if (key.endsWith('kc-progress')) throw new DOMException('full', 'QuotaExceededError')
        return original.call(this, key, value)
      }
    })
    await press(page, 'lesson-complete-step')
    await showLessonPane(page, 'task')
    await expect(page.getByTestId('launch-v3-notice')).toContainText('尚未保存')
    expect(new URL(page.url()).pathname).toBe(`/studio/blockly/launch/${lessonId}`)
    expect((await progress(page)).completedLessonIds ?? []).not.toContain(lessonId)
    await page.evaluate(() => { Storage.prototype.setItem = (window as unknown as { graduationSetItem: typeof Storage.prototype.setItem }).graduationSetItem })
    await finish(page)
    const earned = await progress(page)
    expect(earned.stars).toBe(3)
    expect(earned.cardIds).toContain('commemorative-foundation-graduate')
    await page.reload()
    // OPS-057: read-only replay; no editing controls on the completion page.
    await expect(page.getByTestId('project-work-replay')).toBeVisible()
    await expect(page.getByTestId('duo-saved-project')).toHaveCount(0)
    await expect(page.getByTestId('duo-save-project')).toHaveCount(0)
    await expect(page.getByTestId('project-open-v3')).toHaveAttribute('href', `/studio/blockly/project/${lessonId}`)
    await expect(page.getByRole('status').filter({ hasText: '回放完成' })).toBeVisible({ timeout: 25_000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.name === 'phone') {
      const project = await page.getByTestId('project-work-replay').boundingBox()
      expect(project!.width).toBeGreaterThanOrEqual(300)
    }
    await page.getByTestId('project-work-replay').screenshot({ path: testInfo.outputPath(`${viewport.name}-project.png`) })
    expect((await progress(page)).projectSnapshots.find((p: {lessonId: string}) => p.lessonId === lessonId).blocks.map((b: {type: string}) => b.type)).toEqual(creative)
    // Actually complete the entire lesson again; do not seed an already-earned reward.
    await opening(page)
    await program(page, repeat)
    await run(page)
    await next(page, 4)
    await debug(page)
    await add(page, ['repeat_twice'])
    await run(page)
    await next(page, 5)
    // 第 5 关 opens on its own canvas: lay the repaired program before the run.
    await program(page, repeat)
    await run(page)
    await finish(page)
    const again = await progress(page)
    for (const key of ['stars', 'cardIds', 'badgeIds', 'completedLessonIds', 'completedProjectIds']) expect(again[key]).toEqual(earned[key])
    expect(again.projectSnapshots.filter((p: {lessonId: string}) => p.lessonId === lessonId)).toHaveLength(1)
    expect(errors).toEqual([])
  })
}
test('repetition never borrows the other actor’s move, and invalid trailing code hides the gift', async ({ page }) => {
  await opening(page)
  await program(page, ['when_start', 'move_right', 'switch_character', 'repeat_twice'])
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expectFailure(page, '要跟在移动后面')
  await positions(page, 100, 0)
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
  await program(page, [...repeat, 'switch_character'])
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expectFailure(page, '重复切换')
  await positions(page, 100, 200)
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
  await program(page, repeat)
  await run(page)
})
test('opening the completion URL cannot invent graduation or a saved work', async ({ page }) => {
  await page.goto(`/project/${lessonId}/complete`)
  await expect(page.getByRole('heading', { name: '毕业作品还未完成' })).toBeVisible()
  await expect(page.getByTestId('project-complete-rewards')).toHaveCount(0)
  await expect(page.getByTestId('project-work-replay')).toHaveCount(0)
  await page.getByRole('link', { name: '回课堂继续寻宝' }).click()
  await page.waitForURL(`**/studio/blockly/launch/${lessonId}`)
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
})
