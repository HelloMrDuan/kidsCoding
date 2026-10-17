import { expect, test, type Page } from '@playwright/test'

import { showLessonPane } from './lesson-pane-helpers'

const lessonId = 'lesson-12-graduation-show'
const movement = ['when_start', 'move_right', 'switch_character', 'move_right']
const repeat = [...movement, 'repeat_twice']
const creative = ['when_start', 'say_line', 'move_right', 'switch_character', 'move_right', 'move_right', 'say_line']
const touchPages = new WeakMap<Page, boolean>()
test.beforeEach(({ page }, testInfo) => { touchPages.set(page, Boolean(testInfo.project.use.hasTouch)) })
// Touch projects dispatch native taps, including at desktop/tablet-sized viewports.
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
async function program(page: Page, types: string[]) {
  await showLessonPane(page, 'code')
  await press(page, 'lesson-clear-program')
  await add(page, types)
}
async function positions(page: Page, fox: number, bear: number) {
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-position', String(fox))
  await expect(page.getByTestId('stage-character-partner')).toHaveAttribute('data-position', String(bear))
}
async function run(page: Page, fox = 100, bear = 200) {
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expect(page.getByTestId('duo-result')).toContainText('运行成功', { timeout: 15000 })
  await positions(page, fox, bear)
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', String(bear === 200))
}
async function next(page: Page, step: number) {
  await press(page, 'lesson-complete-step')
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('lesson-task-card')).toContainText(`第 ${step} 步`)
}
async function opening(page: Page) {
  await page.goto(`/learn/lesson/${lessonId}`)
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await showLessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace').locator('.blocklySvg')).toBeVisible()
  await positions(page, 0, 0)
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
  await expect(page.getByTestId('run-code-button')).toBeDisabled()
  await press(page, 'duo-predict-both')
  await add(page, ['when_start'])
  await run(page, 0, 0)
  await next(page, 2)
  await add(page, ['move_right'])
  await run(page, 100, 0)
  await next(page, 3)
}
async function debug(page: Page) {
  await program(page, movement)
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expect(page.getByTestId('duo-result')).toContainText('实际：小狐狸 100 步、小熊 100 步')
  await positions(page, 100, 100)
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
}
async function finish(page: Page) {
  await press(page, 'duo-reflect-own')
  await press(page, 'lesson-complete-step')
  await page.waitForURL(`**/project/${lessonId}/complete`)
  await expect(page.getByTestId('duo-saved-project')).toBeVisible()
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
    await showLessonPane(page, 'task')
    await expect(page.getByTestId('lesson-task-card')).toContainText('第 3 步')
    await add(page, ['repeat_twice'])
    await showLessonPane(page, 'stage')
    await press(page, 'run-code-button')
    await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-position', '100')
    await press(page, 'reset-code-button')
    await positions(page, 0, 0)
    await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
    await run(page)
    await run(page)
    await expect(page.getByTestId('duo-action-log').locator('li')).toHaveCount(5)
    await next(page, 4)
    await run(page)
    await press(page, 'lesson-complete-step')
    await showLessonPane(page, 'task')
    await expect(page.getByTestId('lesson-task-card')).toContainText('第 4 步')
    await debug(page)
    for (let i = 0; i < 3; i++) await press(page, 'duo-show-hint')
    await expect(page.getByTestId('duo-debug-task')).toContainText('已观察')
    await page.getByTestId('lesson-playable-stage').screenshot({ path: testInfo.outputPath(`${viewport.name}-error.png`) })
    await add(page, ['repeat_twice'])
    await run(page)
    await next(page, 5)
    await program(page, creative)
    await run(page)
    await expect(page.getByTestId('duo-fox-message')).toHaveText('你好！')
    await expect(page.getByTestId('duo-bear-message')).toHaveText('找到礼物啦！')
    await press(page, 'duo-reflect-together')
    await press(page, 'lesson-complete-step')
    await showLessonPane(page, 'task')
    await expect(page.getByTestId('lesson-task-card')).toContainText('第 5 步')
    await press(page, 'duo-reflect-own')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-after.png`), fullPage: true })
    // A failed final write neither awards nor navigates; retry uses the same real result.
    await page.evaluate(() => {
      const original = Storage.prototype.setItem
      Object.assign(window, { graduationSetItem: original })
      Storage.prototype.setItem = function (key, value) {
        if (key === 'kc-progress') throw new DOMException('full', 'QuotaExceededError')
        return original.call(this, key, value)
      }
    })
    await press(page, 'lesson-complete-step')
    await showLessonPane(page, 'stage')
    await expect(page.getByTestId('lesson-feedback-card')).toContainText('尚未保存')
    expect((await progress(page)).completedLessonIds ?? []).not.toContain(lessonId)
    await page.evaluate(() => { Storage.prototype.setItem = (window as unknown as { graduationSetItem: typeof Storage.prototype.setItem }).graduationSetItem })
    await finish(page)
    const earned = await progress(page)
    expect(earned.stars).toBe(3)
    expect(earned.cardIds).toContain('commemorative-foundation-graduate')
    await page.reload()
    await run(page)
    await press(page, 'duo-reflect-own')
    await program(page, movement)
    await expect(page.getByTestId('duo-save-project')).toBeDisabled()
    await showLessonPane(page, 'stage')
    await press(page, 'run-code-button')
    await expect(page.getByTestId('duo-result')).toContainText('小熊 100 步')
    await add(page, ['repeat_twice'])
    await run(page)
    await press(page, 'duo-save-project')
    await expect(page.getByTestId('duo-save-status')).toContainText('已保存到本机')
    await page.reload()
    await run(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (viewport.name === 'phone') {
      const project = await page.getByTestId('duo-saved-project').boundingBox()
      expect(project!.width).toBeGreaterThanOrEqual(300)
    }
    await page.getByTestId('duo-saved-project').screenshot({ path: testInfo.outputPath(`${viewport.name}-project.png`) })
    expect((await progress(page)).projectSnapshots.find((p: {lessonId: string}) => p.lessonId === lessonId).blocks.map((b: {type: string}) => b.type)).toEqual(repeat)
    // Actually complete the entire lesson again; do not seed an already-earned reward.
    await opening(page)
    await program(page, repeat)
    await run(page)
    await next(page, 4)
    await debug(page)
    await add(page, ['repeat_twice'])
    await run(page)
    await next(page, 5)
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
  await expect(page.getByTestId('duo-result')).toContainText('当前角色的移动')
  await positions(page, 100, 0)
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
  await program(page, [...repeat, 'switch_character'])
  await showLessonPane(page, 'stage')
  await press(page, 'run-code-button')
  await expect(page.getByTestId('duo-result')).toContainText('重复切换')
  await positions(page, 100, 200)
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
  await program(page, repeat)
  await run(page)
})
test('opening the completion URL cannot invent graduation or a saved work', async ({ page }) => {
  await page.goto(`/project/${lessonId}/complete`)
  await expect(page.getByRole('heading', { name: '毕业作品还未完成' })).toBeVisible()
  await expect(page.getByTestId('project-complete-rewards')).toHaveCount(0)
  await expect(page.getByTestId('duo-saved-project')).toHaveCount(0)
  await page.getByRole('link', { name: '回课堂继续寻宝' }).click()
  await expect(page.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
})
