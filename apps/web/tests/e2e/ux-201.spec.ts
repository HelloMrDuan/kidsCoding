import { expect, test, type Page } from '@playwright/test'
import { clickLessonControl, showLessonPane, solveMistakeStep, solvePracticeStep } from './lesson-pane-helpers'

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
//
// OPS-056: lesson-02 runs in the shared V3 launch studio
// (/studio/blockly/launch/<id>; the old /learn/lesson/<id> entry 308-redirects there).
// DOM mapping (same strength, real code paths only):
//  - lesson-workbench-shell -> studio-shell + launch-v3-slot (data-lesson-id);
//  - lesson-progress-strip「关卡 N / M」-> launch-v3-step-progress「第 N / M 关」;
//  - lesson-progress-bar aria-valuenow -> launch-v3-stepbar: exactly M pills, pill N carries
//    aria-current="step" + .is-active, earlier pills .is-complete;
//  - lesson-save-local -> studio-save-chip (data-state saved / failed);
//  - local-save failure: the V3 draft is the owner-scoped localStorage envelope
//    (kids-lesson-owner-v1:<owner>:kidscoding-draft:<id>), not sessionStorage `kc-lesson-draft:`,
//    so the failure is injected on the real write path; retry -> 文件 menu 保存作品
//    (studio-file-save, the shell's real save), since V3 has no separate lesson-save-retry;
//  - lesson-cloud-failure / lesson-cloud-retry -> launch-v3-cloud-failed / launch-v3-retry-cloud-sync.
// V3 keeps a program per 关, so each 关 is built on its own canvas.
// ux-201 裁定: V3 restores the resume note「已回到上次进度：第 N 关」(lesson-resume-note) and the
// accessible numeric progress bar (lesson-progress-bar, role=progressbar + aria-valuenow); both are
// asserted with the original values in the resume spec at the end.
const LESSON_ID = 'lesson-02-forest-greeting'
const LESSON_URL = `/learn/lesson/${LESSON_ID}`
const LAUNCH_URL = `/studio/blockly/launch/${LESSON_ID}`

async function openLaunch(page: Page) {
  await page.goto(LESSON_URL)
  await page.waitForURL(`**${LAUNCH_URL}`)
  await expect(page.getByTestId('studio-shell')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('launch-v3-slot')).toHaveAttribute('data-lesson-id', LESSON_ID, { timeout: 30_000 })
}

async function expectStep(page: Page, n: number, total: number) {
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText(`第 ${n} / ${total} 关`)
  const bar = page.getByTestId('launch-v3-stepbar')
  await expect(bar.locator('[data-testid^="launch-v3-stepbar-"]')).toHaveCount(total)
  const active = page.getByTestId(`launch-v3-stepbar-${n}`)
  await expect(active).toHaveAttribute('aria-current', 'step')
  await expect(active).toHaveClass(/is-active/)
  for (let i = 1; i < n; i += 1) {
    await expect(page.getByTestId(`launch-v3-stepbar-${i}`)).toHaveClass(/is-complete/)
  }
}

async function runAndCompleteStep(page: Page) {
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText(
    '运行成功',
    { timeout: 20_000 },
  )
  await clickLessonControl(page, 'lesson-complete-step')
}

async function addBlocks(page: Page, types: string[]) {
  for (const type of types) await clickLessonControl(page, `lesson-add-${type}`)
}

async function saveFromFileMenu(page: Page) {
  await page.getByTestId('studio-file-menu-button').click()
  await page.getByTestId('studio-file-save').click()
}

test('UX-201 progress strip shows the real step and saved chip', async ({
  page,
}) => {
  // openLaunch alone may wait 30s for the studio on a cold server; keep the
  // whole case inside one budget instead of the 30s default (no assertion relaxed).
  test.setTimeout(90_000)
  await openLaunch(page)
  await expectStep(page, 1, 4)

  await showLessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await clickLessonControl(page, 'lesson-add-when_start')
  const chip = page.getByTestId('studio-save-chip')
  await expect(chip).toHaveAttribute('data-state', 'saved', { timeout: 10_000 })
  await expect(chip).toContainText('已保存到本机')
})

test('UX-201 re-entering a lesson resumes at the real last step', async ({
  page,
}) => {
  await openLaunch(page)

  await showLessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await addBlocks(page, ['when_start', 'move_right'])
  await runAndCompleteStep(page)
  await expectStep(page, 2, 4)

  // Now on step 2: change the blocks once so a draft exists for this step.
  await clickLessonControl(page, 'lesson-add-when_start')
  await expect(page.getByTestId('studio-save-chip')).toHaveAttribute('data-state', 'saved', { timeout: 10_000 })

  await page.reload()
  await expect(page.getByTestId('studio-shell')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('launch-v3-slot')).toBeAttached({ timeout: 30_000 })

  // The real last step is restored (not 第 1 关), with 第 1 关 shown completed.
  await expectStep(page, 2, 4)
})

test('UX-201 a failed local save shows as failed, and retry really saves', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage)
    window.localStorage.setItem = function (key: string, value: string) {
      if (
        (window as unknown as { __ux201FailDraftSave?: boolean })
          .__ux201FailDraftSave &&
        key.includes('kidscoding-draft:')
      ) {
        throw new Error('simulated quota exceeded')
      }
      return originalSetItem(key, value)
    }
  })
  await openLaunch(page)

  await page.evaluate(() => {
    ;(window as unknown as { __ux201FailDraftSave: boolean })
      .__ux201FailDraftSave = true
  })
  await showLessonPane(page, 'code')
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
  await clickLessonControl(page, 'lesson-add-when_start')
  const chip = page.getByTestId('studio-save-chip')
  await expect(chip).toHaveAttribute('data-state', 'failed', { timeout: 10_000 })
  await expect(chip).toContainText('未能保存')
  await expect(chip).not.toContainText('已保存')
  // Nothing was written: the failure is real, not cosmetic.
  expect(
    await page.evaluate(() =>
      Object.keys(window.localStorage).some((key) => key.includes('kidscoding-draft:lesson-02-forest-greeting')),
    ),
  ).toBe(false)

  await page.evaluate(() => {
    ;(window as unknown as { __ux201FailDraftSave: boolean })
      .__ux201FailDraftSave = false
  })
  // Retry through the shell's real save entry. Re-query and retry the click
  // itself under CI contention; the real assertion below is not weakened.
  await expect(async () => {
    await saveFromFileMenu(page)
    await expect(chip).toHaveAttribute('data-state', 'saved', { timeout: 2_000 })
  }).toPass({ timeout: 30_000 })
  await expect(chip).toContainText('已保存到本机')
  expect(
    await page.evaluate(() =>
      Object.keys(window.localStorage).some((key) => key.includes('kidscoding-draft:lesson-02-forest-greeting')),
    ),
  ).toBe(true)
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

  await openLaunch(page)

  for (let step = 0; step < 4; step += 1) {
    if (step === 0) await addBlocks(page, ['when_start', 'move_right'])
    if (step === 1) await addBlocks(page, ['when_start', 'move_right', 'say_line'])
    if (step === 2) {
      // TQ-011: 第 3 关 is the second practice (greet without walking).
      await solvePracticeStep(page, { goalType: 'change-distance', guess: 'stay', clear: true, build: ['when_start', 'say_line'] })
      await clickLessonControl(page, 'lesson-complete-step')
      continue
    }
    if (step === 3) {
      // TQ-010: 第 4 关 is the designed mistake step (speaks before walking).
      await solveMistakeStep(page, { expectCode: 'say-too-early', answer: 'before-walk', fix: ['when_start', 'move_right', 'say_line'] })
      await clickLessonControl(page, 'lesson-complete-step')
      continue
    }
    await runAndCompleteStep(page)
  }

  // The local save succeeded, the cloud sync did not: the page must stay
  // and show the failure, not redirect as success.
  // OPS-056: like lesson-01 (forest-hello-slot; its N7/N10 specs pin this at
  // desktop 1440 only), the failure banner lives in the code pane while the
  // complete button is in the task pane. Below 1040px the banner is first
  // rendered in the hidden code pane, so switch to it before asserting
  // visibility (ux-202 裁定: the approved V3 one-pane tabs below 1040px).
  const failure = page.getByTestId('launch-v3-cloud-failed')
  await expect(failure).toBeAttached({ timeout: 20_000 })
  await showLessonPane(page, 'code')
  await expect(failure).toBeVisible({ timeout: 20_000 })
  await expect(failure).toContainText('云端同步失败')
  expect(page.url()).toContain(LAUNCH_URL)
  expect(page.url()).not.toContain('/complete')

  failGuestSync = false
  await page.getByTestId('launch-v3-retry-cloud-sync').click()
  await page.waitForURL(`**/project/${LESSON_ID}/complete`)
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()

  await page.unrouteAll({ behavior: 'ignoreErrors' })
})

test('UX-201 progress strip visual evidence on three viewports', async ({
  browser,
}, testInfo) => {
  // Three fresh contexts, each opening the studio: 30s total is not enough.
  test.setTimeout(180_000)
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
    await openLaunch(page)
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
    await clickLessonControl(page, 'lesson-add-when_start')
    await expect(page.getByTestId('studio-save-chip')).toHaveAttribute('data-state', 'saved', { timeout: 10_000 })

    await showLessonPane(page, 'task')
    await expect(page.getByTestId('launch-v3-step-header')).toBeVisible()
    await page
      .getByTestId('launch-v3-step-header')
      .screenshot({ path: testInfo.outputPath(`ux-201-strip-${name}.png`) })
    await context.close()
  }
})

test('ux-201: V3 shows the resume note and a numeric progress bar after reload', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await openLaunch(page)
  await addBlocks(page, ['when_start', 'move_right'])
  await runAndCompleteStep(page)
  await clickLessonControl(page, 'lesson-add-when_start')
  await expect(page.getByTestId('studio-save-chip')).toHaveAttribute('data-state', 'saved', { timeout: 10_000 })
  await page.reload()
  await expect(page.getByTestId('lesson-progress-bar')).toHaveAttribute('aria-valuenow', '50', { timeout: 5_000 })
  await expect(page.getByTestId('lesson-resume-note')).toContainText('已回到上次进度：第 2 关', { timeout: 5_000 })
})
