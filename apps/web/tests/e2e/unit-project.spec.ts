import { expect, test, type Page } from '@playwright/test'

import { expectStageWalk, solveMistakeStep, solvePracticeStep } from './lesson-pane-helpers'

/**
 * TQ-012: the playable unit project on the completion page of lessons 01–09.
 * The child reopens the saved program, runs it (several programs may be right), changes it,
 * and saves it again — only after a passing run since the last edit.
 */
type Block = { type: string; line?: string }

const L03 = 'lesson-03-forest-story'
const L06 = 'lesson-06-meadow-story'
const L09 = 'lesson-09-garden-story'

async function seed(page: Page, lessonId: string, blocks: Block[] | null) {
  await page.goto(`/project/${lessonId}/complete`)
  await page.evaluate(
    ({ lessonId, blocks }) => {
      localStorage.setItem(
        'kc-progress',
        JSON.stringify({
          completedLessonIds: blocks ? [lessonId] : [],
          currentLessonId: lessonId,
          stars: 3,
          badgeIds: [],
          cardIds: [],
          streakDays: 1,
          completedProjectIds: [],
          projectSnapshots: blocks ? [{ lessonId, updatedAt: '2026-10-01T00:00:00.000Z', blocks }] : [],
        }),
      )
    },
    { lessonId, blocks },
  )
  await page.reload()
}

async function savedSnapshot(page: Page, lessonId: string) {
  return page.evaluate((id) => {
    const progress = JSON.parse(localStorage.getItem('kc-progress') ?? '{}')
    return (progress.projectSnapshots ?? []).find((item: { lessonId: string }) => item.lessonId === id) ?? null
  }, lessonId)
}

/** Phones and tablets (≤768px) show one pane at a time behind 舞台 / 积木 tabs. */
async function showPane(page: Page, pane: 'stage' | 'code') {
  if (await page.getByTestId('unit-mobile-tabs').isVisible()) {
    await page.getByTestId(`unit-mobile-tab-${pane}`).click()
  }
}

async function build(page: Page, types: string[], line?: string) {
  await showPane(page, 'code')
  await page.getByTestId('lesson-clear-program').click()
  for (const type of types) await page.getByTestId(`lesson-add-${type}`).click()
  if (line) await page.getByTestId(`lesson-say-line-${line}`).click()
}

async function run(page: Page, options: { click?: boolean } = {}) {
  await showPane(page, 'stage')
  await page.getByTestId('run-code-button').click()
  if (options.click) {
    await expect(page.getByTestId('garden-await-click')).toBeVisible()
    await page.getByTestId('stage-character-main').click()
  }
}

async function runPasses(page: Page, options: { click?: boolean } = {}) {
  await run(page, options)
  await expect(page.getByTestId('unit-project')).toHaveAttribute('data-passed', 'true', { timeout: 25_000 })
  await expect(page.getByTestId('unit-save-project')).toBeEnabled()
}

function collectErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

test('locked: no saved program on this device → no playable project, a way back to the lesson', async ({ page }) => {
  await seed(page, L03, null)
  await expect(page.getByTestId('unit-project-locked')).toBeVisible()
  await expect(page.getByTestId('unit-project-locked')).toContainText('回课堂完成这节课')
  await expect(page.getByTestId('unit-project')).toHaveCount(0)
  // Completed but the saved program is empty: still locked.
  await page.evaluate((id) => {
    localStorage.setItem('kc-progress', JSON.stringify({
      completedLessonIds: [id], currentLessonId: id, stars: 3, badgeIds: [], cardIds: [], streakDays: 1,
      completedProjectIds: [], projectSnapshots: [{ lessonId: id, updatedAt: '2026-10-01T00:00:00.000Z', blocks: [] }],
    }))
  }, L03)
  await page.reload()
  await expect(page.getByTestId('unit-project-locked')).toBeVisible()
})

test('L03: run → save → reload keeps it; the other accepted order passes and saves too', async ({ page }) => {
  test.setTimeout(120_000)
  const errors = collectErrors(page)
  await seed(page, L03, [{ type: 'when_start' }, { type: 'move_right' }, { type: 'move_right' }, { type: 'say_line', line: 'hello' }])
  const project = page.getByTestId('unit-project')
  await expect(project).toHaveAttribute('data-lesson-id', L03)
  await expect(project).toHaveAttribute('data-passed', 'false')
  await expect(page.getByTestId('unit-choice-chip')).toBeVisible()
  // Saving needs a passing run first.
  await expect(page.getByTestId('unit-save-project')).toBeDisabled()
  await expect(page.getByTestId('unit-save-status')).toHaveAttribute('data-save-state', 'idle')

  await runPasses(page)
  await expectStageWalk(page, 200)
  await expect(page.getByTestId('stage-character-main')).toContainText('你好！')
  await page.getByTestId('unit-save-project').click()
  await expect(page.getByTestId('unit-save-status')).toHaveAttribute('data-save-state', 'saved')
  await expect(page.getByTestId('unit-save-status')).toContainText('作品已保存到本机')

  await page.reload()
  let saved = await savedSnapshot(page, L03)
  expect(saved.blocks).toEqual([{ type: 'when_start' }, { type: 'move_right' }, { type: 'move_right' }, { type: 'say_line', line: 'hello' }])
  expect(saved.updatedAt).not.toBe('2026-10-01T00:00:00.000Z')

  // The second accepted program: greet half way, with another line.
  await build(page, ['when_start', 'move_right', 'say_line', 'move_right'], 'lets-play')
  await expect(project).toHaveAttribute('data-passed', 'false')
  await expect(page.getByTestId('unit-save-project')).toBeDisabled()
  await expect(page.getByTestId('unit-save-status')).toContainText('先运行一次')
  await runPasses(page)
  await expectStageWalk(page, 200)
  await expect(page.getByTestId('stage-character-main')).toContainText('一起来玩吧！')
  await page.getByTestId('unit-save-project').click()
  await expect(page.getByTestId('unit-save-status')).toHaveAttribute('data-save-state', 'saved')

  await page.reload()
  saved = await savedSnapshot(page, L03)
  expect(saved.blocks).toEqual([{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line: 'lets-play' }, { type: 'move_right' }])
  // The reopened editor shows the modified program and its chosen line.
  await expect(page.getByTestId('lesson-say-line-lets-play')).toHaveAttribute('aria-pressed', 'true')
  await runPasses(page)
  await expect(page.getByTestId('stage-character-main')).toContainText('一起来玩吧！')

  // A change that no longer matches either accepted program fails and cannot be saved.
  await build(page, ['when_start', 'say_line', 'move_right', 'move_right'])
  await run(page)
  await expect(page.getByTestId('stage-run-error')).toBeVisible({ timeout: 25_000 })
  await expect(project).toHaveAttribute('data-passed', 'false')
  await expect(page.getByTestId('unit-save-project')).toBeDisabled()
  expect(errors).toEqual([])
})

test('L06: a forest line said in the forest passes; a meadow line said in the forest gets a friendly hint', async ({ page }) => {
  test.setTimeout(120_000)
  const errors = collectErrors(page)
  await seed(page, L06, [{ type: 'when_start' }, { type: 'move_right' }, { type: 'switch_scene' }, { type: 'repeat_twice' }, { type: 'say_line', line: 'meadow-arrived' }])
  await expect(page.getByTestId('unit-choice-chip')).toBeVisible()
  await runPasses(page)
  await expect(page.getByTestId('stage-character-main')).toContainText('我到草地啦！')

  await build(page, ['when_start', 'move_right', 'say_line', 'switch_scene', 'repeat_twice'], 'travel-depart')
  await runPasses(page)
  await expect(page.getByTestId('stage-current-scene')).toContainText('草地')

  // Same order, but “小鸟，你好呀！” is said before leaving the forest.
  await showPane(page, 'code')
  await page.getByTestId('lesson-say-line-meadow-hi-bird').click()
  await expect(page.getByTestId('unit-save-project')).toBeDisabled()
  await run(page)
  const error = page.getByTestId('stage-run-error')
  await expect(error).toHaveAttribute('data-failure-code', 'line-wrong-place', { timeout: 25_000 })
  await expect(page.getByTestId('stage-run-reason')).toContainText('“小鸟，你好呀！”要到草地再说哦')
  await expect(page.getByTestId('stage-run-reason')).toContainText('在森林可以说“出发去旅行啦！”')
  await expect(page.getByTestId('unit-project')).toHaveAttribute('data-passed', 'false')
  await expect(page.getByTestId('unit-save-project')).toBeDisabled()
  expect(errors).toEqual([])
})

test('L09: both orders pass after clicking the butterfly', async ({ page }) => {
  test.setTimeout(120_000)
  const errors = collectErrors(page)
  await seed(page, L09, [{ type: 'when_clicked' }, { type: 'move_right' }, { type: 'repeat_twice' }, { type: 'say_line', line: 'garden-thanks' }])
  await expect(page.getByTestId('unit-choice-chip')).toBeVisible()
  // The click program waits for the child: no click, no pass.
  await run(page)
  await expect(page.getByTestId('garden-await-click')).toBeVisible()
  await expect(page.getByTestId('unit-project')).toHaveAttribute('data-passed', 'false')
  await page.getByTestId('stage-character-main').click()
  await expect(page.getByTestId('unit-project')).toHaveAttribute('data-passed', 'true', { timeout: 25_000 })
  await expect(page.getByTestId('stage-character-main')).toContainText('谢谢你点我！')

  await build(page, ['when_clicked', 'move_right', 'say_line', 'repeat_twice'], 'garden-dance')
  await runPasses(page, { click: true })
  await expect(page.getByTestId('stage-character-main')).toContainText('看我跳个舞！')
  await page.getByTestId('unit-save-project').click()
  await expect(page.getByTestId('unit-save-status')).toHaveAttribute('data-save-state', 'saved')
  const saved = await savedSnapshot(page, L09)
  expect(saved.blocks.map((block: Block) => block.type)).toEqual(['when_clicked', 'move_right', 'say_line', 'repeat_twice'])
  expect(errors).toEqual([])
})

test('storage full: saving says honestly that the project is not saved', async ({ page }) => {
  test.setTimeout(90_000)
  const start = [{ type: 'when_start' }, { type: 'move_right' }, { type: 'move_right' }, { type: 'say_line', line: 'hello' }]
  await seed(page, L03, start)
  await build(page, ['when_start', 'move_right', 'say_line', 'move_right'], 'hi-all')
  await runPasses(page)
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'kc-progress') throw new DOMException('Storage full', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await page.getByTestId('unit-save-project').click()
  const status = page.getByTestId('unit-save-status')
  await expect(status).toHaveAttribute('data-save-state', 'error')
  await expect(status).toContainText('作品尚未保存')
  await expect(status).not.toContainText('已保存')
  await page.reload()
  const saved = await savedSnapshot(page, L03)
  expect(saved.blocks).toEqual(start)
})

test('375 wide: 舞台 / 积木 tabs work and the page never scrolls sideways', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 375, height: 812 })
  await seed(page, L03, [{ type: 'when_start' }, { type: 'move_right' }, { type: 'move_right' }, { type: 'say_line', line: 'hello' }])
  const noSideScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  await expect(page.getByTestId('unit-mobile-tabs')).toBeVisible()
  await expect(page.getByTestId('unit-mobile-tab-stage')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('run-code-button')).toBeVisible()
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeHidden()
  expect(await noSideScroll()).toBe(true)

  await page.getByTestId('unit-mobile-tab-code').click()
  await expect(page.getByTestId('unit-mobile-tab-code')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await expect(page.getByTestId('run-code-button')).toBeHidden()
  expect(await noSideScroll()).toBe(true)

  await build(page, ['when_start', 'move_right', 'say_line', 'move_right'], 'nice-to-meet')
  await runPasses(page)
  await expect(page.getByTestId('stage-character-main')).toContainText('很高兴见到你！')
  await page.getByTestId('unit-save-project').click()
  await expect(page.getByTestId('unit-save-status')).toHaveAttribute('data-save-state', 'saved')
  expect(await noSideScroll()).toBe(true)
})

test('L03 finished in the lesson opens its unit project with the program the child built', async ({ page }, testInfo) => {
  // The lesson flow helpers drive the desktop classroom (like blockly-forest-sequence, desktop-only in CI).
  test.skip(testInfo.project.name === 'mobile', 'lesson flow is covered on desktop')
  test.setTimeout(180_000)
  await page.goto(`/learn/lesson/${L03}`)
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await page.getByTestId('lesson-add-when_start').click()
  await page.getByTestId('lesson-add-move_right').click()
  await page.getByTestId('lesson-add-move_right').click()
  for (let step = 0; step < 4; step++) {
    if (step === 1) await page.getByTestId('lesson-add-say_line').click()
    if (step === 2) {
      await solvePracticeStep(page, { goalType: 'compare-orders', clear: true, build: ['when_start', 'move_right', 'say_line', 'move_right'], answer: 'say-place' })
    } else if (step === 3) {
      await solveMistakeStep(page, { expectCode: 'say-too-early', answer: 'said-first', fix: ['when_start', 'move_right', 'move_right', 'say_line'] })
    } else {
      await page.getByTestId('run-code-button').click()
      await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 20_000 })
    }
    await page.getByTestId('lesson-complete-step').click()
  }
  await page.waitForURL(`**/project/${L03}/complete`)
  const project = page.getByTestId('unit-project')
  await expect(project).toBeVisible()
  await expect(project).toHaveAttribute('data-passed', 'false')
  const saved = await savedSnapshot(page, L03)
  expect(saved.blocks.map((block: Block) => block.type)).toEqual(['when_start', 'move_right', 'move_right', 'say_line'])
  await runPasses(page)
  await expectStageWalk(page, 200)
  await expect(page.getByTestId('stage-character-main')).toContainText('你好！')
})
