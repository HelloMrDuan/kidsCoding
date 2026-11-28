import { expect, test, type Page } from '@playwright/test'
import { clickLessonControl, seedLaunchV3Draft, showLessonPane, solveMistakeStep, solvePracticeStep } from './lesson-pane-helpers'

/**
 * OPS-056 G1～G8 (负责人 2026-11-27T09:00:24Z 裁定，全部选 A): the launch V3 studio carries the
 * #554 / OPS-047 《森林打招呼》 acceptance that this PR replaces. Real pages on the real build:
 * real Blockly, real runner, real local storage. Only the network edge is controlled where the
 * case is about the network (cloud down / hanging sync / hanging completion navigation) or the
 * browser quota (local-save-failed); nothing in the app is mocked.
 *
 * G2 note: the 15 s slow-complete hint (LAUNCH_SLOW_COMPLETE_MS) can never show while
 * /api/guest hangs, because syncGuestSnapshot aborts after GUEST_SYNC_TIMEOUT_MS = 10 s first
 * and isCompleting drops with the cloud-failed alert. The spec asserts exactly that; the hint
 * itself is covered by the launch-v3-slot unit test.
 */
const LESSON = 'lesson-02-forest-greeting'
const STUDIO_PATH = `/studio/blockly/launch/${LESSON}`
const COMPLETE_PATH = `/project/${LESSON}/complete`
const DRAFT_KEY = `kids-lesson-owner-v1:guest:kidscoding-draft:${LESSON}`
const CLAIM_KEY = 'kc-lesson-draft-owner-v1'
const FIXED = ['when_start', 'move_right', 'say_line']

type Block = { type: string; line?: string }

/** Network edge for /api/guest only: `__kcCloudDown` answers 500, `__kcCloudHang` never answers. */
async function controlCloud(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __kcCloudDown?: boolean; __kcCloudHang?: boolean }
    w.__kcCloudDown = false
    w.__kcCloudHang = false
    const realFetch = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (url.includes('/api/guest')) {
        if (w.__kcCloudDown) return Promise.resolve(new Response('{"error":"down"}', { status: 500 }))
        if (w.__kcCloudHang) {
          // Never answers; the app's own AbortController (10 s timeout) is the only way out.
          return new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
          })
        }
      }
      return realFetch(input, init)
    }
  })
}

async function setCloud(page: Page, flags: { down?: boolean; hang?: boolean }) {
  await page.evaluate(({ down, hang }) => {
    const w = window as unknown as { __kcCloudDown?: boolean; __kcCloudHang?: boolean }
    if (down !== undefined) w.__kcCloudDown = down
    if (hang !== undefined) w.__kcCloudHang = hang
  }, flags)
}

async function waitStudio(page: Page) {
  await expect(page.getByTestId('launch-v3-slot')).toBeAttached({ timeout: 30_000 })
}

/** Open the studio on a seeded draft (steps without a program start from their starter program). */
async function openAt(page: Page, stepIndex: number, passed: string[] = []) {
  await page.goto('/')
  if (passed.length === 0) {
    await seedLaunchV3Draft(page, LESSON, stepIndex, {})
  } else {
    await page.evaluate(
      ({ key, lessonId, stepIndex, passed }) => {
        const script = { version: 1, lessonId, stepIndex, programs: {}, passed, failures: 0 }
        window.localStorage.setItem(key, JSON.stringify({ lessonId, savedAt: new Date().toISOString(), script, version: 1 }))
        window.sessionStorage.clear()
      },
      { key: DRAFT_KEY, lessonId: LESSON, stepIndex, passed },
    )
  }
  await page.goto(STUDIO_PATH)
  await waitStudio(page)
}

async function program(page: Page, stepId: string): Promise<Block[] | null> {
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_KEY)
  if (!raw) return null
  return (JSON.parse(raw).script?.programs?.[stepId] ?? null) as Block[] | null
}

async function add(page: Page, ...types: string[]) {
  for (const type of types) await clickLessonControl(page, `lesson-add-${type}`)
}

async function runToSuccess(page: Page) {
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('ws-run-toggle')).not.toHaveText(/停止/, { timeout: 20_000 })
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 20_000 })
}

async function expectStep(page: Page, step: number) {
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText(`第 ${step} /`)
}

/** 第 4 关 (the designed mistake) solved with the real buttons, ready for “完成本课”. */
async function solveStep4(page: Page) {
  await expectStep(page, 4)
  await solveMistakeStep(page, { expectCode: 'say-too-early', answer: 'before-walk', fix: FIXED })
}

/** Open the slot's “本关指引与积木顺序” <details> in whichever pane shows it. */
async function openBlockOrder(page: Page) {
  for (const pane of ['task', 'code'] as const) {
    await showLessonPane(page, pane)
    const details = page.locator('.kc-v3-editor-details')
    if (await details.isVisible()) {
      if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) await details.locator('summary').click()
      await expect(page.getByTestId('launch-v3-block-list')).toBeVisible()
      return
    }
  }
  throw new Error('launch V3 block-order <details> not visible in task or code pane')
}

test.describe('OPS-056 G1～G8: lesson-02 森林打招呼 on the launch V3 studio', () => {
  test('G1 (N10): cloud down -> retry while navigation hangs -> navigation-failed fallback opens the complete page', async ({ page }) => {
    test.setTimeout(180_000)
    await controlCloud(page)
    await openAt(page, 3, ['step-1', 'step-2', 'step-3'])
    await solveStep4(page)

    // 1) The cloud is down: the lesson is saved locally, the child sees the honest cloud alert.
    await setCloud(page, { down: true })
    await clickLessonControl(page, 'lesson-complete-step')
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('launch-v3-cloud-failed')).toBeVisible({ timeout: 20_000 })
    expect(new URL(page.url()).pathname).toBe(STUDIO_PATH)

    // 2) Cloud back, but the completion navigation hangs: retry syncs, then the 3 s arrival
    //    check shows the navigation fallback instead of a stuck page.
    await setCloud(page, { down: false })
    const hang = `**${COMPLETE_PATH}**`
    await page.route(hang, () => {})
    await page.getByTestId('launch-v3-retry-cloud-sync').click()
    await showLessonPane(page, 'code')
    const fallback = page.getByTestId('launch-v3-open-complete-page')
    await expect(page.getByTestId('launch-v3-navigation-failed')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('launch-v3-cloud-failed')).toHaveCount(0)
    await expect(fallback).toHaveAttribute('href', COMPLETE_PATH)
    expect(new URL(page.url()).pathname).toBe(STUDIO_PATH)

    // 3) Network back: the fallback link really opens the complete page.
    await page.unroute(hang)
    await Promise.all([
      page.waitForURL(`**${COMPLETE_PATH}`, { timeout: 30_000 }),
      fallback.evaluate((el) => (el as HTMLElement).click()),
    ])
    await expect(page.getByTestId('project-complete-heading')).toBeVisible({ timeout: 30_000 })
  })

  test('G2: a hanging /api/guest ends in cloud-failed after the 10 s sync timeout; the 15 s slow hint never shows', async ({ page }) => {
    test.setTimeout(180_000)
    await controlCloud(page)
    await openAt(page, 3, ['step-1', 'step-2', 'step-3'])
    await solveStep4(page)
    await setCloud(page, { hang: true })
    const started = Date.now()
    await clickLessonControl(page, 'lesson-complete-step')
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('launch-v3-cloud-failed')).toBeVisible({ timeout: 25_000 })
    const elapsed = Date.now() - started
    expect(elapsed, `cloud-failed after ${elapsed} ms`).toBeGreaterThanOrEqual(8_000)
    expect(elapsed, `cloud-failed after ${elapsed} ms`).toBeLessThan(15_000)
    await expect(page.getByTestId('launch-v3-complete-slow')).toHaveCount(0)
    await page.waitForTimeout(6_000) // past the 15 s mark from the click
    await expect(page.getByTestId('launch-v3-complete-slow')).toHaveCount(0)
    await expect(page.getByTestId('launch-v3-cloud-failed')).toBeVisible()
    expect(new URL(page.url()).pathname).toBe(STUDIO_PATH)
  })

  test('G3: the claimed old classroom draft imports with the chosen line and lands on 第 2 关', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(STUDIO_PATH)
    await waitStudio(page)
    await page.evaluate(
      ({ lessonId, claimKey, draftKey }) => {
        const legacy = (stepIndex: number, blocks: Array<{ type: string; line?: string }>) =>
          JSON.stringify({ schemaVersion: 1, lessonId, stepIndex, blocks, updatedAt: '2026-10-01T08:00:00.000Z' })
        window.sessionStorage.setItem(`kc-lesson-draft:${lessonId}:0`, legacy(0, [{ type: 'when_start' }]))
        window.sessionStorage.setItem(
          `kc-lesson-draft:${lessonId}:1`,
          legacy(1, [{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line: 'nice-to-meet' }]),
        )
        window.localStorage.setItem(claimKey, 'guest')
        window.localStorage.removeItem(draftKey)
      },
      { lessonId: LESSON, claimKey: CLAIM_KEY, draftKey: DRAFT_KEY },
    )
    await page.reload()
    await waitStudio(page)
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('launch-v3-legacy-import')).toBeVisible()
    await page.getByTestId('launch-v3-import-legacy').click()
    await expect(page.getByTestId('launch-v3-legacy-import')).toHaveCount(0)
    await expectStep(page, 2)
    await expect
      .poll(async () => (await program(page, 'step-2'))?.map((b) => b.type) ?? null, { timeout: 10_000 })
      .toEqual(FIXED)
    expect(await program(page, 'step-2')).toContainEqual({ type: 'say_line', line: 'nice-to-meet' })
  })

  test('G4: a program with a chosen line survives reload and still says it', async ({ page }) => {
    test.setTimeout(150_000)
    await openAt(page, 1)
    await expectStep(page, 2)
    await add(page, ...FIXED)
    await clickLessonControl(page, 'lesson-say-line-lets-play')
    const want = [{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line: 'lets-play' }]
    await expect.poll(() => program(page, 'step-2'), { timeout: 10_000 }).toEqual(want)
    await runToSuccess(page)
    await expect(page.getByTestId('studio-save-chip')).toContainText('已保存到本机', { timeout: 15_000 })
    await page.reload()
    await waitStudio(page)
    await expectStep(page, 2)
    await expect.poll(() => program(page, 'step-2'), { timeout: 10_000 }).toEqual(want)
    await runToSuccess(page)
    await expect(page.getByTestId('stage-character-main')).toContainText('一起来玩吧！')
  })

  test('G5: the line chosen on 第 2 关 carries into 第 3 关: the fox stays and still says it', async ({ page }) => {
    test.setTimeout(180_000)
    await openAt(page, 1)
    await expectStep(page, 2)
    await add(page, ...FIXED)
    await clickLessonControl(page, 'lesson-say-line-hi-all')
    await runToSuccess(page)
    await expect(page.getByTestId('stage-character-main')).toContainText('大家好呀！')
    await clickLessonControl(page, 'lesson-complete-step')
    await expectStep(page, 3)
    await solvePracticeStep(page, { goalType: 'change-distance', guess: 'stay', clear: true, build: ['when_start', 'say_line'] })
    await showLessonPane(page, 'stage')
    await expect(page.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '0')
    await expect(page.getByTestId('stage-character-main')).toContainText('大家好呀！')
    await expect(page.getByTestId('practice-done')).toBeVisible()
  })

  test('G6: 第 4 关 is fixed with the “下移” button instead of rebuilding', async ({ page }) => {
    test.setTimeout(150_000)
    await openAt(page, 3)
    await expectStep(page, 4)
    await clickLessonControl(page, 'run-code-button')
    await expect(page.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code', 'say-too-early', { timeout: 20_000 })
    await clickLessonControl(page, 'mistake-answer-before-walk')
    await expect(page.getByTestId('mistake-fix')).toBeVisible()
    await openBlockOrder(page)
    await page.getByTestId('launch-v3-block-down-1').click()
    await expect
      .poll(async () => (await program(page, 'step-4'))?.map((b) => b.type) ?? null, { timeout: 10_000 })
      .toEqual(FIXED)
    await runToSuccess(page)
    await expect(page.getByTestId('mistake-fixed')).toBeVisible()
  })

  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
  ]) {
    test(`G7: ${size.width}×${size.height} first screen has no horizontal overflow; stage and run control are on it`, async ({ page }, testInfo) => {
      // Desktop sizes only: the mobile project emulates a Pixel 7 (isMobile / touch), where a
      // 1920 px viewport is not a real device. Phones are covered by the mobile runs of G1～G6/G8.
      test.skip(testInfo.project.name !== 'desktop', 'desktop viewport check')
      await page.setViewportSize(size)
      await page.goto(STUDIO_PATH)
      await waitStudio(page)
      await expect(page.getByTestId('lesson-playable-stage')).toBeVisible({ timeout: 30_000 })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, 'horizontal overflow (px)').toBeLessThanOrEqual(1)
      for (const id of ['lesson-playable-stage', 'ws-run-toggle']) {
        const box = await page.getByTestId(id).boundingBox()
        expect(box, `${id} box`).not.toBeNull()
        expect(box!.y, `${id} top within the first screen`).toBeLessThan(size.height)
        expect(box!.x + box!.width, `${id} right edge`).toBeLessThanOrEqual(size.width + 1)
      }
    })
  }

  test('G8a: cloud down -> “仅本机继续” opens the complete page', async ({ page }) => {
    test.setTimeout(180_000)
    await controlCloud(page)
    await openAt(page, 3, ['step-1', 'step-2', 'step-3'])
    await solveStep4(page)
    await setCloud(page, { down: true })
    await clickLessonControl(page, 'lesson-complete-step')
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('launch-v3-cloud-failed')).toBeVisible({ timeout: 20_000 })
    await Promise.all([
      page.waitForURL(`**${COMPLETE_PATH}`, { timeout: 30_000 }),
      page.getByTestId('launch-v3-continue-local-only').click(),
    ])
    await expect(page.getByTestId('project-complete-heading')).toBeVisible({ timeout: 30_000 })
  })

  test('G8b: local progress quota full -> local-save-failed notice, no navigation', async ({ page }) => {
    test.setTimeout(180_000)
    await page.addInitScript(() => {
      const realSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
        if (key.startsWith('kids-progress-owner-v1:')) throw new DOMException('quota', 'QuotaExceededError')
        return realSetItem.call(this, key, value)
      }
    })
    await openAt(page, 3, ['step-1', 'step-2', 'step-3'])
    await solveStep4(page)
    await clickLessonControl(page, 'lesson-complete-step')
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('launch-v3-notice')).toContainText('本机存储失败', { timeout: 20_000 })
    await expect(page.getByTestId('launch-v3-cloud-failed')).toHaveCount(0)
    await page.waitForTimeout(3_500)
    expect(new URL(page.url()).pathname).toBe(STUDIO_PATH)
  })
})
