import { expect, test } from '@playwright/test'
import { clickLessonControl, showLessonPane } from './lesson-pane-helpers'

// lesson-02 step-1 allows when_start + move_right + say_line, so we can add two
// distinct blocks and verify their order survives a refresh. lesson-01 step-1
// only permits when_start (deduplicated by the workspace), so it cannot exercise
// multi-block ordering on its own.
const LESSON_ID = 'lesson-02-forest-greeting'
const DRAFT_KEY_STEP_0 = `kc-lesson-draft:${LESSON_ID}:0`

async function readDraftBlocks(page: import('@playwright/test').Page, key: string) {
  return page.evaluate((k) => {
    const raw = window.sessionStorage.getItem(k)
    if (!raw) {
      return null
    }
    try {
      return (JSON.parse(raw).blocks ?? null) as Array<{ type: string }> | null
    } catch {
      return null
    }
  }, key)
}

test.describe('lesson draft persistence', () => {
  test('restores block sequence after refresh and clears the step draft once completed', async ({
    page,
  }) => {
    await page.goto(`/learn/lesson/${LESSON_ID}`)

    // Mobile shows one classroom zone at a time and the workspace lives in
    // the code pane, so switch there first (no-op on desktop; same pattern
    // as lesson-recovery-ux502).
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()

    // Add two distinct blocks in a specific order.
    await clickLessonControl(page, 'lesson-add-when_start')
    await clickLessonControl(page, 'lesson-add-move_right')

    // The draft for step 0 must be persisted before we refresh.
    await expect
      .poll(async () => readDraftBlocks(page, DRAFT_KEY_STEP_0), { timeout: 5_000 })
      .not.toBeNull()

    await page.reload()

    // Reload resets the mobile pane to its initial zone, so switch to the
    // code pane again before asserting the workspace is visible.
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()

    // After refresh the saved block sequence (order included) must be restored.
    const restoredBlocks = await readDraftBlocks(page, DRAFT_KEY_STEP_0)
    expect(restoredBlocks).toEqual([
      { type: 'when_start' },
      { type: 'move_right' },
    ])

    // The product needsRun gate requires a successful run before the step
    // can complete (same pattern as lesson-recovery-ux502).
    await clickLessonControl(page, 'run-code-button')
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15_000 })

    // Completing the step clears the step-0 draft.
    await page.getByTestId('lesson-complete-step').click()

    await expect
      .poll(async () => readDraftBlocks(page, DRAFT_KEY_STEP_0), { timeout: 5_000 })
      .toBeNull()

    // Refreshing again must not restore the cleared step-0 blocks. The workspace
    // may re-save an empty draft on mount, but the previous block sequence must
    // not come back.
    await page.reload()

    const draftAfterReload = await readDraftBlocks(page, DRAFT_KEY_STEP_0)
    expect(draftAfterReload ?? []).toEqual([])
  })
})
