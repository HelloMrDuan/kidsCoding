import { expect, test, type Page } from '@playwright/test'

import { showLessonPane } from './lesson-pane-helpers'

const lessonId = 'lesson-11-duo-rehearsal'
const movement = ['when_start', 'move_right', 'switch_character', 'move_right']
async function add(page: Page, ...types: string[]) {
  await showLessonPane(page, 'code')
  for (const type of types) await page.getByTestId(`lesson-add-${type}`).click()
}
async function program(page: Page, types: string[]) {
  await showLessonPane(page, 'code')
  await page.getByTestId('lesson-clear-program').click()
  await add(page, ...types)
}
async function positions(page: Page, fox: number, bear: number) {
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-position', String(fox))
  await expect(page.getByTestId('stage-character-partner')).toHaveAttribute('data-position', String(bear))
}
async function run(page: Page, fox = 100, bear = 100) {
  await showLessonPane(page, 'stage')
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('duo-result')).toContainText('运行成功', { timeout: 15000 })
  await positions(page, fox, bear)
}
async function next(page: Page, step: number) {
  await page.getByTestId('lesson-complete-step').click()
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('lesson-task-card')).toContainText(`第 ${step} 关`)
}
async function start(page: Page) {
  await page.goto(`/learn/lesson/${lessonId}`)
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await positions(page, 0, 0)
  await expect(page.getByTestId('duo-fox-speech-record')).toHaveText('还没有说话')
  await expect(page.getByTestId('duo-bear-speech-record')).toHaveText('还没有说话')
  await expect(page.getByTestId('run-code-button')).toBeDisabled()
  await page.getByTestId('duo-predict-both').click()
  await add(page, 'when_start')
  await page.reload()
  await showLessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace').locator('.blocklySvg')).toBeVisible()
  await showLessonPane(page, 'stage')
  await page.getByTestId('duo-predict-both').click()
  await page.getByTestId('lesson-complete-step').click()
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 1 关')
  await run(page, 0, 0)
  await next(page, 2)
  await add(page, 'move_right', 'switch_character', 'move_right')
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
    // Movement alone never passes the dialogue task.
    await showLessonPane(page, 'stage')
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('duo-result')).toContainText('小熊还没说')
    await positions(page, 100, 100)
    await page.getByTestId('lesson-complete-step').click()
    await showLessonPane(page, 'task')
    await expect(page.getByTestId('lesson-task-card')).toContainText('第 3 关')
    await add(page, 'say_line')
    // Speech is cancelled if the child resets while movement is in progress.
    await showLessonPane(page, 'stage')
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-position', '100')
    await page.getByTestId('reset-code-button').click()
    await positions(page, 0, 0)
    await expect(page.getByTestId('duo-bear-speech-record')).toHaveText('还没有说话')
    await run(page)
    await expect(page.getByTestId('duo-bear-message')).toHaveText('我们一起出发吧！')
    await expect(page.getByTestId('duo-fox-speech-record')).toHaveText('还没有说话')
    await run(page)
    await expect(page.getByTestId('duo-action-log').locator('li')).toHaveCount(4)
    await page.getByTestId('reset-code-button').click()
    await expect(page.getByTestId('duo-bear-message')).toHaveCount(0)
    await run(page)
    await next(page, 4)
    await run(page)
    await page.getByTestId('lesson-complete-step').click()
    await showLessonPane(page, 'task')
    await expect(page.getByTestId('lesson-task-card')).toContainText('第 4 关')
    await program(page, ['when_start', 'move_right', 'say_line', 'switch_character', 'move_right'])
    await showLessonPane(page, 'stage')
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('duo-result')).toContainText('对白给错人')
    await positions(page, 100, 100)
    await expect(page.getByTestId('duo-fox-message')).toHaveText('你好！')
    await expect(page.getByTestId('duo-bear-speech-record')).toHaveText('还没有说话')
    await page.getByTestId('lesson-playable-stage').screenshot({ path: testInfo.outputPath(`${viewport.name}-error.png`) })
    // TQ-015: the designed mistake above is the experiment — it raises no hint.
    // Two more real failed runs escalate the classroom hint 1 → 2.
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('duo-result')).toContainText('对白给错人')
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('duo-result')).toContainText('对白给错人')
    await showLessonPane(page, 'task')
    await expect(page.getByTestId('lesson-hint')).toHaveAttribute('data-hint-tier', '2')
    await expect(page.getByTestId('lesson-hint')).toContainText('每个角色有自己的对白')
    await program(page, [...movement, 'say_line'])
    await run(page)
    await next(page, 5)
    // Baseline and creative variants both pass actual result assertions.
    await run(page)
    await program(page, ['when_start', 'say_line', 'move_right', 'switch_character', 'move_right', 'say_line'])
    await run(page)
    await expect(page.getByTestId('duo-fox-message')).toHaveText('你好！')
    await expect(page.getByTestId('duo-bear-message')).toHaveText('我们一起出发吧！')
    for (const actor of ['fox', 'bear']) {
      const distance = await page.getByTestId(`duo-${actor}-distance`).boundingBox()
      const speech = await page.getByTestId(`duo-${actor}-message`).boundingBox()
      expect(distance).not.toBeNull()
      expect(speech).not.toBeNull()
      expect(speech!.y).toBeGreaterThanOrEqual(distance!.y + distance!.height)
    }
    await page.getByTestId('duo-reflect-together').click()
    await page.getByTestId('lesson-complete-step').click()
    await showLessonPane(page, 'task')
    await expect(page.getByTestId('lesson-task-card')).toContainText('第 5 关')
    await showLessonPane(page, 'stage')
    await page.getByTestId('duo-reflect-own').click()
    await expect(page.getByTestId('duo-reflection')).toContainText('各有自己的对白')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-after.png`), fullPage: true })
    await page.getByTestId('lesson-complete-step').click()
    await page.waitForURL(`**/project/${lessonId}/complete`)
    await expect(page.getByTestId('duo-saved-project')).toBeVisible()
    await page.reload()
    await run(page)
    await page.getByTestId('duo-reflect-own').click()
    await showLessonPane(page, 'code')
    await page.getByTestId('lesson-remove-last').click()
    await expect(page.getByTestId('duo-save-project')).toBeDisabled()
    await showLessonPane(page, 'stage')
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('duo-result')).toContainText('小熊还没说')
    await add(page, 'say_line')
    await run(page)
    await page.getByTestId('duo-save-project').click()
    await expect(page.getByTestId('duo-save-status')).toContainText('作品已保存到本机')
    await page.evaluate(() => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function (key, value) {
        if (key === 'kc-progress') throw new DOMException('Storage full', 'QuotaExceededError')
        return original.call(this, key, value)
      }
    })
    await page.getByTestId('duo-save-project').click()
    await expect(page.getByTestId('duo-save-status')).toContainText('作品尚未保存')
    await page.reload()
    await run(page)
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
  await showLessonPane(page, 'stage')
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('duo-result')).toContainText('重复切换')
  await positions(page, 100, 0)
  await expect(page.getByTestId('duo-bear-speech-record')).toHaveText('还没有说话')
  await program(page, [...movement, 'say_line'])
  await run(page)
})
