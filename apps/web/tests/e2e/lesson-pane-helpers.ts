import { expect, type Page } from '@playwright/test'

/**
 * UX-202: on phones (<=600px) the classroom shows one zone at a time
 * behind the 任务 / 积木 / 舞台 tabs. On larger viewports all zones are
 * visible and the tabs are display:none, so this is a no-op there.
 * Call it before interacting with elements that live in a zone.
 */
export async function showLessonPane(
  page: Page,
  pane: 'task' | 'code' | 'stage',
) {
  if (await page.getByTestId('lesson-mobile-tabs').isVisible()) {
    await page.getByTestId(`lesson-mobile-tab-${pane}`).click()
  }
}

type Box = { x: number; y: number; width: number; height: number }
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/**
 * TQ-009: lessons 01–09 stage. Steps are story distance: the walker’s track is the actor row
 * minus both actors and a meeting gap, and 200 steps (or more) ends right BESIDE the friend.
 * Asserts the real step count, the scaled position, and that the two characters and their
 * name tags never overlap — so a child always sees the friend they travelled to.
 */
export async function expectStageWalk(page: Page, steps: number) {
  const main = page.getByTestId('stage-character-main')
  const friend = page.getByTestId('stage-character-friend')
  await expect(main).toHaveAttribute('data-steps', String(steps))
  await expect(friend).toBeVisible()
  const progress = Math.min(Math.max(steps, 0), 200) / 200
  await expect
    .poll(async () => {
      const row = await main.locator('xpath=..').boundingBox()
      const box = await main.boundingBox()
      const friendBox = await friend.boundingBox()
      if (!row || !box || !friendBox) return 'missing'
      const track = Math.max(0, row.width - box.width - friendBox.width - 14)
      return Math.abs(box.x - (row.x + track * progress)) <= 2 ? 'ok' : `x=${box.x} want ${row.x + track * progress}`
    })
    .toBe('ok')
  const [mainArt, friendArt, mainTag, friendTag] = await Promise.all([
    main.locator('.kc-stage-actor-art').boundingBox(),
    friend.locator('.kc-stage-actor-art').boundingBox(),
    main.locator('.kc-stage-nametag').boundingBox(),
    friend.locator('.kc-stage-nametag').boundingBox(),
  ])
  expect(mainArt && friendArt && mainTag && friendTag).toBeTruthy()
  expect(overlaps(mainArt!, friendArt!), 'walker must not cover the friend').toBe(false)
  expect(overlaps(mainTag!, friendTag!), 'name tags must not overlap').toBe(false)
  expect(mainArt!.x + mainArt!.width).toBeLessThan(friendArt!.x)
  if (progress === 1) expect(friendArt!.x - (mainArt!.x + mainArt!.width)).toBeLessThanOrEqual(30)
}

/**
 * TQ-010: lessons 01–09 each have one designed mistake → observe → fix step. The step opens
 * with a pre-built wrong program: run it (and click the butterfly when it waits for a click),
 * see the designed failure, answer “what did you see?”, rebuild the fix and run it again.
 * Leaves the page on the passing run; the caller presses “完成这一关”.
 */
export async function solveMistakeStep(
  page: Page,
  options: {
    expectCode: string
    answer: string
    fix: string[]
    /** Garden lessons: the fixed program waits for a click on the butterfly. */
    garden?: boolean
    /**
     * The garden “先猜一猜” must be answered before the run button works. Defaults to `garden`;
     * since TQ-011 only lesson 07 asks it, so lessons 08–09 pass false.
     */
    predict?: boolean
    /** The wrong program starts with “被点击时”, so it waits for a click. */
    wrongWaitsForClick?: boolean
  },
) {
  await expect(page.getByTestId('mistake-task')).toBeVisible()
  await expect(page.getByTestId('mistake-setup')).toBeVisible()
  if (options.predict ?? options.garden) await page.getByTestId('garden-predict-click').click()
  else await expect(page.getByTestId('garden-prediction')).toHaveCount(0)
  await page.getByTestId('run-code-button').click()
  if (options.wrongWaitsForClick) {
    await expect(page.getByTestId('garden-await-click')).toBeVisible()
    await page.getByTestId('stage-character-main').click()
  }
  // The designed wrong run is the experiment: a neutral note, never the failure-style “哎呀” box.
  await expect(page.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code', options.expectCode, { timeout: 20_000 })
  await expect(page.getByTestId('stage-run-error')).toHaveCount(0)
  await expect(page.getByTestId('mistake-observed')).toBeVisible()
  // The designed mistake is the experiment, not a failed attempt: no hint tier is raised.
  await expect(page.getByTestId('lesson-hint')).toHaveCount(0)
  // Observed but not answered: the step does not pass yet.
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-feedback-card')).toContainText('先回答舞台上的问题')
  await page.getByTestId(`mistake-answer-${options.answer}`).click()
  await expect(page.getByTestId('mistake-fix')).toBeVisible()
  // Answered right: still no “哎呀” box under the panel.
  await expect(page.getByTestId('mistake-run-result')).toContainText('你看懂啦')
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('哎呀')
  await page.getByTestId('lesson-clear-program').click()
  for (const type of options.fix) await page.getByTestId(`lesson-add-${type}`).click()
  await page.getByTestId('run-code-button').click()
  if (options.garden) {
    await expect(page.getByTestId('garden-await-click')).toBeVisible()
    await page.getByTestId('stage-character-main').click()
  }
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 20_000 })
  await expect(page.getByTestId('mistake-fixed')).toBeVisible()
}

/**
 * TQ-011: lessons 01–09 each have one second practice with a goal different from the main build.
 * predict (change-distance): pick a guess first — the run button waits for it — then build and run.
 * compare (compare-orders / compare-events): build and run, then answer “哪里不一样？” (optionally
 * trying a wrong answer first). Leaves the page on the passing run; the caller presses “完成这一关”.
 */
export async function solvePracticeStep(
  page: Page,
  options: {
    goalType: 'change-distance' | 'compare-orders' | 'compare-events'
    /** predict: the guess picked before running. */
    guess?: string
    /** compare: the right answer, picked after the run. */
    answer?: string
    /** compare: a wrong answer tried first (it must not complete the step). */
    wrongAnswer?: string
    /** Clear the workspace before building (the step uses another order or start event). */
    clear?: boolean
    /** Blocks added by their palette buttons. */
    build: string[]
    /** The program starts with “被点击时”, so it waits for a click on the butterfly. */
    click?: boolean
  },
) {
  const task = page.getByTestId('practice-task')
  await expect(task).toBeVisible()
  await expect(task).toHaveAttribute('data-goal-type', options.goalType)
  await expect(page.getByTestId('practice-setup')).toBeVisible()
  // Lessons 08–09 no longer repeat lesson 07's click prediction.
  await expect(page.getByTestId('garden-prediction')).toHaveCount(0)
  if (options.guess) {
    // A prediction is made before the run: no guess, no run, no completion.
    await expect(page.getByTestId('practice-need-guess')).toBeVisible()
    await expect(page.getByTestId('run-code-button')).toBeDisabled()
    await page.getByTestId('lesson-complete-step').click()
    await expect(page.getByTestId('lesson-feedback-card')).toContainText('先在舞台上猜一猜')
    await page.getByTestId(`practice-answer-${options.guess}`).click()
    await expect(page.getByTestId('practice-answer-reply')).toContainText('猜好啦')
  } else {
    await expect(page.getByTestId('practice-question')).toHaveCount(0)
  }
  if (options.clear) await page.getByTestId('lesson-clear-program').click()
  for (const type of options.build) await page.getByTestId(`lesson-add-${type}`).click()
  await page.getByTestId('run-code-button').click()
  if (options.click) {
    await expect(page.getByTestId('garden-await-click')).toBeVisible()
    await page.getByTestId('stage-character-main').click()
  }
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 25_000 })
  if (options.answer) {
    await expect(page.getByTestId('practice-need-answer')).toBeVisible()
    await page.getByTestId('lesson-complete-step').click()
    await expect(page.getByTestId('lesson-feedback-card')).toContainText('先回答舞台上的问题')
    if (options.wrongAnswer) {
      await page.getByTestId(`practice-answer-${options.wrongAnswer}`).click()
      await expect(page.getByTestId('practice-answer-reply')).toContainText('再看看舞台')
      await expect(page.getByTestId('practice-done')).toHaveCount(0)
    }
    await page.getByTestId(`practice-answer-${options.answer}`).click()
    await expect(page.getByTestId('practice-answer-reply')).toContainText('对！')
  }
  await expect(page.getByTestId('practice-done')).toBeVisible()
}

/**
 * TQ-011: a step that loads or sets its program (carried over, pre-built, or rebuilt with the
 * buttons after “清空积木重拼”) shows the whole program from the top-left of the Blockly
 * workspace: every block sits inside the visible workspace (right of the flyout, above the
 * bottom edge) and the first block (“开始时”/“被点击时”) starts near the top — never cut off.
 */
export async function expectProgramFromTop(page: Page) {
  await showLessonPane(page, 'code')
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const root = document.querySelector('[data-testid="lesson-blockly-workspace"]')
          const svg = root?.querySelector('svg.blocklySvg')
          const view = svg?.querySelector('.blocklyMainBackground')?.getBoundingClientRect()
          const flyout = root?.querySelector('svg.blocklyFlyout')?.getBoundingClientRect()
          const canvas = svg?.querySelector('.blocklyBlockCanvas')
          const tops = canvas ? Array.from(canvas.children).filter((node) => node.classList.contains('blocklyDraggable')) : []
          if (!view || view.width === 0 || tops.length === 0) return 'missing'
          const left = flyout && flyout.width > 0 ? Math.max(view.left, flyout.right) : view.left
          let highest = Infinity
          for (const node of tops) {
            const box = node.getBoundingClientRect()
            highest = Math.min(highest, box.top)
            if (box.top < view.top || box.left < left - 1 || box.bottom > view.bottom || box.right > view.right) {
              return `cut: block ${Math.round(box.left)},${Math.round(box.top)}–${Math.round(box.right)},${Math.round(box.bottom)} view ${Math.round(left)},${Math.round(view.top)}–${Math.round(view.right)},${Math.round(view.bottom)}`
            }
          }
          return highest - view.top <= 48 ? 'ok' : `not from top: ${Math.round(highest - view.top)}px down`
        }),
      { timeout: 10_000 },
    )
    .toBe('ok')
}
