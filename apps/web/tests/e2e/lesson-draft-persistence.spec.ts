import { expect, test } from '@playwright/test'

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

    await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()

    // Add two distinct blocks in a specific order.
    await page.getByTestId('lesson-add-when_start').click()
    await page.getByTestId('lesson-add-move_right').click()

    // The draft for step 0 must be persisted before we refresh.
    await expect
      .poll(async () => readDraftBlocks(page, DRAFT_KEY_STEP_0), { timeout: 5_000 })
      .not.toBeNull()

    await page.reload()

    await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()

    // After refresh the saved block sequence (order included) must be restored.
    const restoredBlocks = await readDraftBlocks(page, DRAFT_KEY_STEP_0)
    expect(restoredBlocks).toEqual([
      { type: 'when_start' },
      { type: 'move_right' },
    ])

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
