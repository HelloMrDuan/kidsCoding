import { expect, test, type Page } from '@playwright/test'
import { clickLessonControl, openForestTools, showLessonPane } from './lesson-pane-helpers'

/**
 * OPS-057: one Blockly V3 workbench for every editable Blockly work.
 *
 * Real pages on the real build (no app mocks): the works center / completion page entry opens
 * /studio/blockly/project/<lessonId>, the saved work is opened from the real local data, and
 * editing, running, stopping, resetting, saving and reopening go through the V3 studio.
 *
 * Data isolation is asserted on the real storage keys:
 * - the work has its own owner-scoped `kidscoding-project:<lessonId>` envelope,
 * - the lesson draft key, stars, cards and completed lessons are byte-identical after editing,
 * - switching the guest identity (server cookie) never exposes another guest's work.
 *
 * Existing editable works: lesson-02 (single role) and lesson-12 (duo role, graduation mode)
 * open from their legacy `progress.projectSnapshots` entries.
 */
const OWNER_ID = 'ops057-a'
const OWNER = `guest:${OWNER_ID}`

const L02 = 'lesson-02-forest-greeting'
const L12 = 'lesson-12-graduation-show'
const PROJECT_PATH = (lessonId: string) => `/studio/blockly/project/${lessonId}`

const progressKey = (owner = OWNER) => `kids-progress-owner-v1:${encodeURIComponent(owner)}:kc-progress`
const lessonDraftKey = (lessonId: string, owner = OWNER) =>
  `kids-lesson-owner-v1:${encodeURIComponent(owner)}:kidscoding-draft:${lessonId}`
const projectKey = (lessonId: string, owner = OWNER) =>
  `kids-lesson-owner-v1:${encodeURIComponent(owner)}:kidscoding-project:${lessonId}`

const LESSON_SENTINEL = JSON.stringify({
  lessonId: L02,
  savedAt: '2026-11-01T00:00:00.000Z',
  version: 1,
  script: { marker: 'lesson-draft-must-not-change' },
})

/** Five moves + one line: long enough that “停止” can be pressed mid-run. */
const LEGACY_L02 = [
  { type: 'when_start' },
  { type: 'move_right' },
  { type: 'move_right' },
  { type: 'move_right' },
  { type: 'move_right' },
  { type: 'move_right' },
  { type: 'say_line', line: 'hello' },
]

const BASE_PROGRESS = {
  completedLessonIds: [L02],
  currentLessonId: L02,
  stars: 7,
  badgeIds: ['first-steps'],
  cardIds: ['growth-first-project'],
  streakDays: 3,
  completedProjectIds: [],
  projectSnapshots: [],
}

/** Resolve the guest identity on the server before any page render. */
async function useOwner(page: Page, id: string | null = OWNER_ID) {
  // The first navigation gives us the real origin for the cookie.
  if (!page.url().startsWith('http')) await page.goto('/')
  const origin = new URL(page.url()).origin
  if (id === null) await page.context().clearCookies({ name: 'kc_guest_id' })
  else await page.context().addCookies([{ name: 'kc_guest_id', value: id, url: origin }])
}

async function seedWork(
  page: Page,
  options: { lessonId: string; blocks: Array<{ type: string; line?: string }>; progress?: Partial<typeof BASE_PROGRESS> },
) {
  await page.goto('/')
  await page.evaluate(
    ({ lessonId, blocks, progressKeyValue, progress, ownProjectKey }) => {
      window.localStorage.setItem(
        progressKeyValue,
        JSON.stringify({
          ...progress,
          projectSnapshots: [{ lessonId, blocks, updatedAt: '2026-10-18T08:00:00.000Z' }],
        }),
      )
      // A work first opened from its legacy snapshot must not inherit a stale envelope.
      window.localStorage.removeItem(ownProjectKey)
    },
    {
      lessonId: options.lessonId,
      blocks: options.blocks,
      progressKeyValue: progressKey(),
      progress: { ...BASE_PROGRESS, ...(options.progress ?? {}) },
      ownProjectKey: projectKey(options.lessonId),
    },
  )
}

async function storage(page: Page, lessonId = L02) {
  return page.evaluate(
    ({ ownerProgressKey, lessonKey, ownProjectKey }) => ({
      progress: window.localStorage.getItem(ownerProgressKey),
      lessonDraft: window.localStorage.getItem(lessonKey),
      project: window.localStorage.getItem(ownProjectKey),
      keys: Object.keys(window.localStorage),
    }),
    { ownerProgressKey: progressKey(), lessonKey: lessonDraftKey(lessonId), ownProjectKey: projectKey(lessonId) },
  )
}

function projectProgram(raw: string | null): Array<{ type: string; line?: string }> | null {
  if (!raw) return null
  const parsed = JSON.parse(raw) as { script?: { kind?: string; lessonId?: string; program?: unknown } }
  if (parsed.script?.kind !== 'project') return null
  return parsed.script.program as Array<{ type: string; line?: string }>
}

function progressOf(raw: string | null) {
  return raw ? (JSON.parse(raw) as { stars: number; cardIds: string[]; completedLessonIds: string[] }) : null
}

async function openProject(page: Page, lessonId: string) {
  await page.goto(PROJECT_PATH(lessonId))
  await expect(page.getByTestId('launch-project-slot')).toBeAttached({ timeout: 30_000 })
  await expect(page.getByTestId('launch-project-stage')).toBeAttached()
}

async function runToSuccess(page: Page) {
  await page.getByTestId('ws-run-toggle').click()
  await expect(page.getByTestId('ws-run-toggle')).not.toHaveText(/停止/, { timeout: 20_000 })
  await expect(page.getByTestId('launch-project-stage')).toContainText('运行完成', { timeout: 20_000 })
}

test.describe('OPS-057: Blockly V3 work edit mode', () => {
  test('desktop single-role work: open, stop, reset, run, edit, save, reopen, entry links', async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await useOwner(page)
    await seedWork(page, { lessonId: L02, blocks: LEGACY_L02 })
    // Seed the lesson draft sentinel after the work so both coexist.
    await page.evaluate(
      ({ key, value }) => window.localStorage.setItem(key, value),
      { key: lessonDraftKey(L02), value: LESSON_SENTINEL },
    )
    const before = await storage(page)

    await openProject(page, L02)

    // Works mode, not a lesson: real work title, no step bar, no completion button.
    await showLessonPane(page, 'task')
    await expect(page.getByTestId('launch-project-title')).toHaveText('小狐狸打招呼')
    await expect(page.getByTestId('launch-project-notes')).toContainText('不会改变课堂草稿、课程进度和奖励')
    await expect(page.getByTestId('launch-v3-stepbar')).toHaveCount(0)
    await expect(page.getByTestId('launch-v3-complete-step')).toHaveCount(0)
    await expect(page.getByTestId('launch-project-save')).toBeVisible()

    // Stop: the run really stops, and nothing claims a finished run.
    await page.getByTestId('ws-run-toggle').click()
    await expect(page.getByTestId('ws-run-toggle')).toHaveText(/停止/, { timeout: 10_000 })
    await page.getByTestId('ws-run-toggle').click()
    await expect(page.getByTestId('ws-run-toggle')).not.toHaveText(/停止/, { timeout: 10_000 })
    await page.waitForTimeout(700)
    await expect(page.getByTestId('launch-project-stage')).not.toContainText('运行完成')

    // Reset: the stage goes back to the start.
    await clickLessonControl(page, 'reset-code-button')
    await expect(page.getByTestId('stage-action-log')).toHaveCount(0, { timeout: 10_000 })

    // Run the opened legacy work frame by frame.
    await runToSuccess(page)
    await expect(page.getByTestId('stage-action-log').locator('li')).toHaveCount(6)
    await expect(page.getByTestId('stage-action-log')).toContainText('说：你好！')

    // Edit: append one more move with the real palette.
    await openForestTools(page)
    await clickLessonControl(page, 'lesson-add-move_right')
    await expect(page.getByTestId('launch-project-mode')).toContainText('8 块积木', { timeout: 10_000 })

    // Save through the work’s own save button.
    await showLessonPane(page, 'task')
    await page.getByTestId('launch-project-save').click()
    await expect(page.getByTestId('studio-save-chip')).toContainText('已保存到本机', { timeout: 15_000 })

    const saved = await storage(page)
    const savedTypes = projectProgram(saved.project)?.map((block) => block.type) ?? []
    expect(savedTypes).toHaveLength(8)
    expect(savedTypes[0]).toBe('when_start')
    expect(savedTypes.filter((type) => type === 'move_right')).toHaveLength(6)
    expect(savedTypes).toContain('say_line')
    // The work mirror keeps the real projectSnapshots in sync.
    expect(JSON.parse(saved.progress ?? '{}').projectSnapshots[0].blocks).toHaveLength(8)
    // Lesson draft and rewards are untouched.
    expect(saved.lessonDraft).toBe(LESSON_SENTINEL)
    expect(progressOf(saved.progress)).toMatchObject({
      stars: 7,
      cardIds: ['growth-first-project'],
      completedLessonIds: [L02],
    })
    expect(before.lessonDraft).toBe(LESSON_SENTINEL)

    // Reopen: the saved work comes back and still runs.
    await page.reload()
    await expect(page.getByTestId('launch-project-slot')).toBeAttached({ timeout: 30_000 })
    await runToSuccess(page)
    await expect(page.getByTestId('stage-action-log').locator('li')).toHaveCount(7)
    await expect(page.getByTestId('stage-action-log')).toContainText('说：你好！')

    // Entry from the works center.
    await page.goto('/learn/portfolio')
    const workLink = page.locator(`a[href="${PROJECT_PATH(L02)}"]`).first()
    await expect(workLink).toBeVisible({ timeout: 30_000 })
    await workLink.click()
    await expect(page).toHaveURL(new RegExp(`${PROJECT_PATH(L02).replace(/\//g, '\\/')}$`))
    await expect(page.getByTestId('launch-project-slot')).toBeAttached({ timeout: 30_000 })

    // Entry from the lesson completion page.
    await page.goto(`/project/${L02}/complete`)
    const continueLink = page.getByTestId('project-open-v3')
    await expect(continueLink).toBeVisible()
    await expect(continueLink).toHaveAttribute('href', PROJECT_PATH(L02))
    await continueLink.click()
    await expect(page).toHaveURL(new RegExp(`${PROJECT_PATH(L02).replace(/\//g, '\\/')}$`))
    await expect(page.getByTestId('launch-project-slot')).toBeAttached({ timeout: 30_000 })

    // Owner isolation: another guest sees neither the saved envelope nor a workbench
    // pretending there is one — the route says honestly that it has no work.
    await useOwner(page, 'ops057-b')
    await page.goto(PROJECT_PATH(L02))
    await expect(page.getByTestId('project-work-missing')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('launch-project-slot')).toHaveCount(0)
    const otherStorage = await page.evaluate(
      ({ ownProjectKey }) => window.localStorage.getItem(ownProjectKey),
      { ownProjectKey: projectKey(L02, 'guest:ops057-b') },
    )
    expect(otherStorage).toBeNull()
    const aStorage = await page.evaluate(
      ({ ownProjectKey }) => window.localStorage.getItem(ownProjectKey),
      { ownProjectKey: projectKey(L02) },
    )
    expect(projectProgram(aStorage)).toHaveLength(8)
  })

  test('desktop duo work: lesson-12 opens, runs both friends and saves without rewards', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await useOwner(page)
    const duoBlocks = [
      { type: 'when_start' },
      { type: 'move_right' },
      { type: 'switch_character' },
      { type: 'move_right' },
      { type: 'say_line' },
    ]
    await seedWork(page, {
      lessonId: L12,
      blocks: duoBlocks,
      progress: { completedLessonIds: [L12], currentLessonId: L12, stars: 12 },
    })
    await openProject(page, L12)

    await showLessonPane(page, 'task')
    await expect(page.getByTestId('launch-project-title')).toBeVisible()
    await expect(page.getByTestId('launch-v3-stepbar')).toHaveCount(0)

    await runToSuccess(page)
    await expect(page.getByTestId('launch-project-stage')).toContainText('小狐狸已走 100 步')
    await expect(page.getByTestId('launch-project-stage')).toContainText('小熊已走 100 步')
    await expect(page.getByTestId('stage-action-log')).toContainText('切换到小熊')
    await expect(page.getByTestId('stage-action-log')).toContainText('小熊向右走 100 步')
    // Teaching-only blocks stay out of the work stage.
    await expect(page.getByTestId('launch-project-stage')).not.toContainText('完成这一关')
    await expect(page.getByTestId('practice-need-answer')).toHaveCount(0)
    await expect(page.getByTestId('mistake-task')).toHaveCount(0)

    await showLessonPane(page, 'task')
    await page.getByTestId('launch-project-save').click()
    await expect(page.getByTestId('studio-save-chip')).toContainText('已保存到本机', { timeout: 15_000 })
    const saved = await storage(page, L12)
    expect(projectProgram(saved.project)?.map((block) => block.type)).toEqual([
      'when_start',
      'move_right',
      'switch_character',
      'move_right',
      'say_line',
    ])
    expect(progressOf(saved.progress)).toMatchObject({ stars: 12, completedLessonIds: [L12] })
    // No card / star grant from running or saving a work.
    expect(progressOf(saved.progress)?.cardIds).toEqual(['growth-first-project'])
  })

  test('tablet: the same work opens, runs and saves at 834px', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 834, height: 1112 })
    await useOwner(page)
    await seedWork(page, { lessonId: L02, blocks: LEGACY_L02 })
    await openProject(page, L02)

    await showLessonPane(page, 'task')
    await expect(page.getByTestId('launch-project-title')).toBeVisible()
    await expect(page.getByTestId('launch-project-save')).toBeVisible()
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('golden-block-tools')).toBeVisible({ timeout: 30_000 })
    await showLessonPane(page, 'stage')
    await runToSuccess(page)
    await expect(page.getByTestId('stage-action-log')).toContainText('说：你好！')

    await showLessonPane(page, 'task')
    await page.getByTestId('launch-project-save').click()
    await expect(page.getByTestId('studio-save-chip')).toContainText('已保存到本机', { timeout: 15_000 })
    const saved = await storage(page)
    expect(projectProgram(saved.project)).toHaveLength(LEGACY_L02.length)
  })

  test('phone: the work opens and runs in the 3-pane studio without horizontal overflow', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 390, height: 844 })
    await useOwner(page)
    await seedWork(page, { lessonId: L02, blocks: LEGACY_L02 })
    await openProject(page, L02)

    await expect(page.getByTestId('v3-mobiletabs')).toBeVisible()
    await showLessonPane(page, 'task')
    await expect(page.getByTestId('launch-project-title')).toBeVisible()
    await expect(page.getByTestId('launch-project-save')).toBeVisible()
    await showLessonPane(page, 'code')
    await expect(page.getByTestId('golden-block-tools')).toBeVisible({ timeout: 30_000 })
    // On the phone the run control lives in the stage pane.
    await showLessonPane(page, 'stage')
    await expect(page.getByTestId('ws-run-toggle')).toBeVisible()
    await runToSuccess(page)
    await expect(page.getByTestId('stage-action-log')).toContainText('说：你好！')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('grid work: opens in the independent work mode and saving leaves the lesson draft byte-identical', async ({ page }) => {
    test.setTimeout(150_000)
    const GRID = 'G0-U3-L05'
    const gridLessonKey = `kids-lesson-owner-v1:${encodeURIComponent(OWNER)}:kidscoding-draft:${GRID}`
    const gridWorkKey = `kids-lesson-owner-v1:${encodeURIComponent(OWNER)}:kidscoding-project:${GRID}`
    const blocks = [
      { type: 'when_start' },
      { type: 'repeat_times', times: 4, body: [{ type: 'move_forward' }, { type: 'move_forward' }, { type: 'turn_right' }] },
    ]
    const seedDraft = JSON.stringify({
      lessonId: GRID,
      savedAt: '2026-11-01T00:00:00.000Z',
      version: 1,
      script: {
        version: 1, lessonId: GRID, stepIndex: 4,
        programs: { 'my-fence': blocks },
        passed: ['my-fence'], failures: 0,
        creative: { 'my-fence': { goal: { x: 0, y: 0 } } },
        finished: false,
      },
    })

    await useOwner(page)
    await page.goto('/')
    await page.evaluate(({ lessonKey, workKey, draft }) => {
      window.localStorage.setItem(lessonKey, draft)
      // A work opened from an existing lesson draft must not start from a stale envelope.
      window.localStorage.removeItem(workKey)
    }, { lessonKey: gridLessonKey, workKey: gridWorkKey, draft: seedDraft })

    await page.goto(`/studio/blockly/project/grid/${GRID}`)
    await expect(page.getByTestId('grid-slot')).toBeAttached({ timeout: 30_000 })
    await expect(page.getByTestId('grid-step-title')).toContainText('为花圃选一个围栏')
    // 作品模式不是课堂模式：没有关卡进度、关卡条和“完成本课”，也不做课堂预测。
    await expect(page.getByTestId('grid-work-mode')).toBeVisible()
    await expect(page.getByTestId('grid-step-progress')).toHaveCount(0)
    await expect(page.getByTestId('grid-stepbar')).toHaveCount(0)
    await expect(page.getByTestId('grid-complete-step')).toHaveCount(0)
    await expect(page.getByTestId('grid-predict')).toHaveCount(0)
    await expect(page.getByTestId('grid-lesson-finished')).toHaveCount(0)

    // 运行只报告真实执行结果，不显示课堂“通过/未通过”判定。
    await page.getByTestId('ws-run-toggle').click()
    await expect(page.getByTestId('grid-feedback')).toContainText('播放结束', { timeout: 30_000 })
    await expect(page.getByTestId('grid-feedback')).toHaveAttribute('data-work-mode', 'true')
    await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)

    // 作品模式自己的保存：写独立信封，不写课程草稿。
    await page.getByTestId('studio-file-menu-button').click()
    await page.getByTestId('studio-file-save').click()
    await expect(page.getByTestId('studio-save-chip')).toContainText('已保存到本机', { timeout: 15_000 })
    const saved = await page.evaluate(({ lessonKey, workKey }) => ({
      lessonDraft: window.localStorage.getItem(lessonKey),
      work: window.localStorage.getItem(workKey),
    }), { lessonKey: gridLessonKey, workKey: gridWorkKey })
    expect(saved.lessonDraft).toBe(seedDraft)
    const envelope = JSON.parse(saved.work ?? '{}') as { kind?: string; lessonId?: string; draft?: { programs?: Record<string, unknown> } }
    expect(envelope.kind).toBe('grid-project')
    expect(envelope.lessonId).toBe(GRID)
    expect(envelope.draft?.programs?.['my-fence']).toEqual(blocks)

    // 重新打开仍从作品信封读取，课程草稿保持原样。
    await page.reload()
    await expect(page.getByTestId('grid-slot')).toBeAttached({ timeout: 30_000 })
    await expect(page.getByTestId('grid-step-title')).toContainText('为花圃选一个围栏')
    await expect(page.getByTestId('grid-work-mode')).toBeVisible()
    expect(await page.evaluate((key) => window.localStorage.getItem(key), gridLessonKey)).toBe(seedDraft)

    // 删除作品：课程草稿逐字节不变，作品信封与卡片消失，旧草稿不得复活作品。
    await page.goto('/learn/portfolio')
    const remove = page.getByTestId(`portfolio-delete-${GRID}`)
    await expect(remove).toBeVisible({ timeout: 30_000 })
    page.once('dialog', (dialog) => dialog.accept())
    await remove.click()
    await expect(page.getByTestId('portfolio-delete-status')).toContainText('已删除', { timeout: 15_000 })
    const afterDelete = await page.evaluate(({ lessonKey, workKey }) => ({
      lessonDraft: window.localStorage.getItem(lessonKey),
      work: window.localStorage.getItem(workKey),
    }), { lessonKey: gridLessonKey, workKey: gridWorkKey })
    expect(afterDelete.lessonDraft).toBe(seedDraft)
    expect(afterDelete.work).toBeNull()
    await expect(page.getByTestId(`portfolio-work-${GRID}`)).toHaveCount(0)
    await page.goto(`/studio/blockly/project/grid/${GRID}`)
    await expect(page.getByTestId('grid-project-missing')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('grid-slot')).toHaveCount(0)
  })

  test('deleting a work in the works center removes the envelope and the old snapshot, so it cannot reappear', async ({ page }) => {
    await useOwner(page)
    await seedWork(page, { lessonId: L02, blocks: LEGACY_L02, progress: { completedLessonIds: [L02] } })
    // Saving once creates the independent envelope and keeps the mirror snapshot.
    await openProject(page, L02)
    await page.getByTestId('launch-project-save').click()
    await expect(page.getByTestId('studio-save-chip')).toContainText('已保存到本机', { timeout: 15_000 })
    expect(await page.evaluate((key) => window.localStorage.getItem(key), projectKey(L02))).not.toBeNull()

    await page.goto('/learn/portfolio')
    const remove = page.getByTestId(`portfolio-delete-${L02}`)
    await expect(remove).toBeVisible({ timeout: 30_000 })
    page.once('dialog', (dialog) => dialog.accept())
    await remove.click()
    await expect(page.getByTestId('portfolio-delete-status')).toContainText('已删除', { timeout: 15_000 })

    const afterDelete = await page.evaluate(({ workKey, progressKeyValue }) => ({
      work: window.localStorage.getItem(workKey),
      snapshots: JSON.parse(window.localStorage.getItem(progressKeyValue) ?? '{}').projectSnapshots ?? [],
    }), { workKey: projectKey(L02), progressKeyValue: progressKey() })
    expect(afterDelete.work).toBeNull()
    expect(afterDelete.snapshots.filter((snapshot: { lessonId: string }) => snapshot.lessonId === L02)).toHaveLength(0)

    // 再次打开如实提示没有作品，不用默认积木冒充。
    await page.goto(PROJECT_PATH(L02))
    await expect(page.getByTestId('project-work-missing')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('launch-project-slot')).toHaveCount(0)
  })

  test('work route is honest: no saved work and a broken work never fall back to a default program', async ({ page }) => {
    await useOwner(page, 'ops057-honest')
    await page.goto('/')
    await page.evaluate(({ progress, lessonKey, ownKey }) => {
      window.localStorage.removeItem(progress)
      window.localStorage.removeItem(lessonKey)
      window.localStorage.removeItem(ownKey)
    }, { progress: progressKey('guest:ops057-honest'), lessonKey: lessonDraftKey(L02, 'guest:ops057-honest'), ownKey: projectKey(L02, 'guest:ops057-honest') })

    await page.goto(PROJECT_PATH(L02))
    await expect(page.getByTestId('project-work-missing')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('project-work-missing')).toContainText('还没有保存过这件作品')
    await expect(page.getByTestId('launch-project-slot')).toHaveCount(0)

    await page.evaluate((key) => window.localStorage.setItem(key, '{broken'), projectKey(L02, 'guest:ops057-honest'))
    await page.reload()
    await expect(page.getByTestId('project-work-broken')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('project-work-broken')).toContainText('已拒绝恢复')
    await expect(page.getByTestId('launch-project-slot')).toHaveCount(0)
  })
})
