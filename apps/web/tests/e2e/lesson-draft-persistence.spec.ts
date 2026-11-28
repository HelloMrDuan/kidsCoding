import { expect, test, type Page } from '@playwright/test'
import { clickLessonControl, showLessonPane } from './lesson-pane-helpers'

// lesson-02 step-1 allows when_start + move_right + say_line, so we can add two
// distinct blocks and verify their order survives a refresh. lesson-01 step-1
// only permits when_start (deduplicated by the workspace), so it cannot exercise
// multi-block ordering on its own.
//
// OPS-056: lesson-02 runs in the V3 launch studio (/studio/blockly/launch/<id>; the old
// /learn/lesson/<id> entry 308-redirects there). Mapping (same strength):
// - the draft is the real owner-scoped V3 draft (localStorage, autosaved after ~1 s),
//   not the old sessionStorage `kc-lesson-draft:<id>:0` key; step-0 -> programs['step-1'];
// - lesson-complete-step -> launch-v3-complete-step (via clickLessonControl).
// Behaviour difference, pending decision (not weakened silently): completing a 关 in V3
// advances stepIndex and records it in `passed`, but keeps that 关's program (each 关 owns
// its program) instead of deleting it. The child-facing promise is kept: after completing
// and reloading, the canvas is the next 关 and the previous blocks do not come back.
const LESSON_ID = 'lesson-02-forest-greeting'
const DRAFT_KEY = `kids-lesson-owner-v1:guest:kidscoding-draft:${LESSON_ID}`

type Draft = { stepIndex: number; programs: Record<string, Array<{ type: string }>>; passed: string[] }

async function readDraft(page: Page): Promise<Draft | null> {
  return page.evaluate((k) => {
    const raw = window.localStorage.getItem(k)
    if (!raw) return null
    try {
      return (JSON.parse(raw).script ?? null) as Draft | null
    } catch {
      return null
    }
  }, DRAFT_KEY)
}

function canvas(page: Page) {
  return page.getByTestId('lesson-blockly-workspace').locator('svg.blocklySvg .blocklyBlockCanvas')
}

test.describe('lesson draft persistence', () => {
  test('restores block sequence after refresh and does not bring the completed step back', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.goto(`/learn/lesson/${LESSON_ID}`)
    await page.waitForURL(`**/studio/blockly/launch/${LESSON_ID}`)

    // Mobile shows one pane at a time and the workspace lives in the code pane.
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()

    // Add two distinct blocks in a specific order.
    await clickLessonControl(page, 'lesson-add-when_start')
    await clickLessonControl(page, 'lesson-add-move_right')

    // The draft for 第 1 关 must be persisted (order included) before we refresh.
    await expect
      .poll(async () => (await readDraft(page))?.programs['step-1'] ?? null, { timeout: 10_000 })
      .toEqual([{ type: 'when_start' }, { type: 'move_right' }])

    await page.reload()

    // After refresh the saved block sequence is restored into the workspace.
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
    await expect(canvas(page).locator('.blocklyDraggable')).toHaveCount(2)
    await expect(canvas(page)).toContainText('向右走 100 步')
    expect((await readDraft(page))?.programs['step-1']).toEqual([{ type: 'when_start' }, { type: 'move_right' }])

    // The completion gate requires a successful run before the step can complete.
    await clickLessonControl(page, 'run-code-button')
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15_000 })

    // Completing the step advances the real draft to 第 2 关.
    await clickLessonControl(page, 'lesson-complete-step')
    await expect
      .poll(async () => {
        const draft = await readDraft(page)
        return draft ? { stepIndex: draft.stepIndex, passed: draft.passed.includes('step-1') } : null
      }, { timeout: 10_000 })
      .toEqual({ stepIndex: 1, passed: true })

    // Refreshing again must not restore the completed step's blocks on screen.
    await page.reload()
    await showLessonPane(page, 'task')
    await expect(page.getByTestId('launch-v3-step-progress')).toContainText(/第 2 \/ \d+ 关/)
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
    await expect(canvas(page)).not.toContainText('向右走 100 步')
  })
})
