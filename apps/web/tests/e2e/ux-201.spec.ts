import { expect, test } from '@playwright/test'

// UX-201: classroom top task progress + save status must be real.
//
// Gaps found by the audit (2026-10-15) — none of these were covered before:
//  1. No progress bar / step strip in the classroom shell at all (the page
//     hero only had a step chip; the V2 prototype groups step + progress
//     bar + save chip in one header).
//  2. Re-entering a lesson always restarted at step 0, even with a saved
//     draft for a later step ("last progress" was never restored).
//  3. saveLessonDraft swallowed every error and returned void: a failed
//     local save was invisible, indistinguishable from success.
//  4. syncGuestSnapshot ignored the /api/guest response entirely, so a
//     failed cloud sync still redirected as success, and a 200 with
//     synced:false (no cloud backend) was indistinguishable from a real
//     cloud save.
// This file covers those four gaps plus three-viewport strip evidence.
// It does NOT duplicate lesson-draft-persistence (block restore),
// blockly-forest-sequence (full-lesson completion), or reward-idempotency.
const LESSON_ID = 'lesson-02-forest-greeting'
const LESSON_URL = `/learn/lesson/${LESSON_ID}`

async function runAndCompleteStep(page: import('@playwright/test').Page) {
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText(
    '运行成功',
    { timeout: 20_000 },
  )
  await page.getByTestId('lesson-complete-step').click()
}

test('UX-201 progress strip shows the real step and saved chip', async ({
  page,
}) => {
  await page.goto(LESSON_URL)
  await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()

  const strip = page.getByTestId('lesson-progress-strip')
  await expect(strip).toContainText('步骤 1 / 5')
  await expect(page.getByTestId('lesson-progress-bar')).toHaveAttribute(
    'aria-valuenow',
    '20',
  )

  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await page.getByTestId('lesson-add-when_start').click()
  await expect(page.getByTestId('lesson-save-local')).toContainText(
    '已保存到本机',
  )
})

test('UX-201 re-entering a lesson resumes at the real last step', async ({
  page,
}) => {
  await page.goto(LESSON_URL)
  await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()

  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await page.getByTestId('lesson-add-when_start').click()
  await page.getByTestId('lesson-add-move_right').click()
  await runAndCompleteStep(page)

  // Now on step 2: change the blocks once so a draft exists for this step.
  await page.getByTestId('lesson-add-say_line').click()
  await expect(page.getByTestId('lesson-save-local')).toContainText(
    '已保存到本机',
  )

  await page.reload()
  await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()

  await expect(page.getByTestId('lesson-progress-strip')).toContainText(
    '步骤 2 / 5',
  )
  await expect(page.getByTestId('lesson-resume-note')).toContainText(
    '已回到上次进度：第 2 步',
  )
})

test('UX-201 a failed local save shows as failed, and retry really saves', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const originalSetItem = window.sessionStorage.setItem.bind(
      window.sessionStorage,
    )
    window.sessionStorage.setItem = function (key: string, value: string) {
      if (
        (window as unknown as { __ux201FailDraftSave?: boolean })
          .__ux201FailDraftSave &&
        key.startsWith('kc-lesson-draft:')
      ) {
        throw new Error('simulated quota exceeded')
      }
      return originalSetItem(key, value)
    }
  })
  await page.goto(LESSON_URL)
  await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()

  await page.evaluate(() => {
    ;(window as unknown as { __ux201FailDraftSave: boolean })
      .__ux201FailDraftSave = true
  })
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await page.getByTestId('lesson-add-when_start').click()
  await expect(page.getByTestId('lesson-save-local')).toContainText(
    '本机保存失败',
  )
  await expect(page.getByTestId('lesson-save-retry')).toBeVisible()

  await page.evaluate(() => {
    ;(window as unknown as { __ux201FailDraftSave: boolean })
      .__ux201FailDraftSave = false
  })
  // The retry button was just asserted visible, but a loaded CI worker can
  // transiently report it not actionable (layout settling under contention).
  // Re-query and retry the click itself; the real assertion below — the
  // save chip must read saved — is unchanged and not weakened.
  await expect(async () => {
    await page
      .getByTestId('lesson-save-retry')
      .click({ timeout: 5_000 })
  }).toPass({ timeout: 30_000 })
  await expect(page.getByTestId('lesson-save-local')).toContainText(
    '已保存到本机',
  )
})

test('UX-201 a failed cloud sync never reports success; retry really syncs', async ({
  page,
}) => {
  test.setTimeout(180_000)
  let failGuestSync = true
  await page.route('**/api/guest', async (route) => {
    if (failGuestSync) {
      await route.fulfill({ status: 500, body: '{}' })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ guestId: 'guest-1', synced: true }),
    })
  })

  await page.goto(LESSON_URL)
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()

  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await page.getByTestId('lesson-add-when_start').click()
  await page.getByTestId('lesson-add-move_right').click()
  for (let step = 0; step < 5; step += 1) {
    if (step === 2) await page.getByTestId('lesson-add-say_line').click()
    await runAndCompleteStep(page)
  }

  // The local save succeeded, the cloud sync did not: the page must stay
  // and show the failure, not redirect as success.
  await expect(page.getByTestId('lesson-cloud-failure')).toBeVisible()
  await expect(page.getByTestId('lesson-save-cloud')).toContainText(
    '云端同步失败',
  )
  expect(page.url()).toContain(LESSON_URL)

  failGuestSync = false
  await page.getByTestId('lesson-cloud-retry').click()
  await page.waitForURL(`**/project/${LESSON_ID}/complete`)
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()

  await page.unrouteAll({ behavior: 'ignoreErrors' })
})

test('UX-201 progress strip visual evidence on three viewports', async ({
  browser,
}, testInfo) => {
  for (const [name, width, height] of [
    ['desktop', 1440, 900],
    ['tablet', 768, 1024],
    ['mobile', 375, 667],
  ] as const) {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width, height },
    })
    const page = await context.newPage()
    await page.goto(LESSON_URL)
    await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()
    // UX-202: on phones only the task pane is visible by default; the
    // Blockly workspace lives in the code pane behind the 积木 tab.
    if (name === 'mobile') {
      await page.getByTestId('lesson-mobile-tab-code').click()
    }
    await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
    await page.getByTestId('lesson-add-when_start').click()
    await expect(page.getByTestId('lesson-save-local')).toContainText(
      '已保存到本机',
    )

    await page
      .getByTestId('lesson-progress-strip')
      .screenshot({ path: testInfo.outputPath(`ux-201-strip-${name}.png`) })
    await context.close()
  }
})
