import { expect, type Page } from '@playwright/test'

/** lesson-01 has exactly one official workspace: the V3 Blockly studio. */
const FOREST_V3_PATH = /^\/studio\/blockly\/lesson-01-forest-hello(\/|$)/

/**
 * OPS-052: the six G0-U1 grid lessons also have exactly one official
 * workspace — the same V3 studio under /studio/blockly/grid/<lessonId>.
 * The old /learn/grid-lab/<lessonId> classroom entries redirect there.
 */
const GRID_V3_PATH = /^\/studio\/blockly\/grid(\/|$)/

export function isForestV3(page: Page): boolean {
  return FOREST_V3_PATH.test(new URL(page.url()).pathname)
}

export function isGridV3(page: Page): boolean {
  return GRID_V3_PATH.test(new URL(page.url()).pathname)
}

/**
 * OPS-053: the six G0-U2 event lessons share the same V3 studio under
 * /studio/blockly/event/<lessonId>; their old /learn/event-lab/<lessonId>
 * entries redirect there (G0-U3 event+loop lessons stay on event-lab).
 */
const EVENT_V3_PATH = /^\/studio\/blockly\/event(\/|$)/

export function isEventV3(page: Page): boolean {
  return EVENT_V3_PATH.test(new URL(page.url()).pathname)
}

/**
 * OPS-056: the eleven launch lessons lesson-02…12 share the same V3 studio
 * under /studio/blockly/launch/<lessonId>; their old /learn/lesson/<lessonId>
 * entries permanently redirect there.
 */
const LAUNCH_V3_PATH = /^\/studio\/blockly\/launch(\/|$)/

export function isLaunchV3(page: Page): boolean {
  return LAUNCH_V3_PATH.test(new URL(page.url()).pathname)
}

/**
 * OPS-057: the V3 project edit mode (作品编辑) reuses the same studio under
 * /studio/blockly/project/<lessonId>; only the data store and the editor/stage
 * slots differ, so the pane and tools helpers apply unchanged.
 */
const PROJECT_V3_PATH = /^\/studio\/blockly\/project(\/|$)/

export function isProjectV3(page: Page): boolean {
  return PROJECT_V3_PATH.test(new URL(page.url()).pathname)
}

/** Any lesson that renders the V3 studio (one shell, no per-lesson copies). */
export function isLessonStudioV3(page: Page): boolean {
  return isForestV3(page) || isGridV3(page) || isEventV3(page) || isLaunchV3(page) || isProjectV3(page)
}

/**
 * Where a lesson explains why a step cannot pass yet: lesson-01's V3 slot
 * notice, the launch V3 slot notice (OPS-056, lesson-02…12), or the old
 * classroom's feedback card. Same message, each workspace's own element.
 */
function lessonNotice(page: Page) {
  if (isForestV3(page)) return page.getByTestId('forest-hello-notice')
  if (isLaunchV3(page)) return page.getByTestId('launch-v3-notice')
  return page.getByTestId('lesson-feedback-card')
}

/** Open the only official 《小狐狸出场》 workspace and wait for it to mount. */
export async function openForestV3(page: Page) {
  await page.goto('/studio/blockly/lesson-01-forest-hello')
  await expect(page.getByTestId('studio-shell')).toBeVisible({ timeout: 30_000 })
  // The slot lives in the task pane; on a phone only one pane is shown, so
  // wait for it to be mounted, not visible, and let pane switches decide.
  await expect(page.getByTestId('forest-hello-slot')).toBeAttached({ timeout: 30_000 })
}

/**
 * The V3 studio's own three tabs. On desktop all three panes are on screen and
 * the tab row is display:none (a no-op); on phones one pane is shown at a time.
 */
async function showV3Pane(page: Page, pane: 'task' | 'code' | 'stage') {
  const tabs = page.getByTestId('v3-mobiletabs')
  if (!(await tabs.isVisible())) return
  const tab = page.getByTestId(`v3-pane-${pane}`)
  if ((await tab.getAttribute('aria-selected')) !== 'true') {
    await tab.click()
    // Same hydration race as the old classroom tabs: prove the click was
    // accepted by the tab's own state, then let the pane become visible.
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 5_000 })
  }
}

/**
 * V3 keeps the palette inside the “点按添加 · 删除 · 键盘” <details>; the block
 * buttons exist in the DOM but are not clickable until it is open.
 */
export async function openForestTools(page: Page) {
  await showLessonPane(page, 'code')
  const summary = page.getByTestId('golden-block-tools')
  await expect(summary).toBeVisible({ timeout: 20_000 })
  if (!(await summary.evaluate((el) => (el.parentElement as HTMLDetailsElement).open))) {
    await summary.click()
  }
  await expect(page.getByTestId('lesson-block-palette')).toBeVisible()
}

/** Press the V3 “完成这一关 / 完成本课” button (it lives in the task pane). */
export async function completeForestStep(page: Page) {
  await showLessonPane(page, 'task')
  await page.getByTestId('forest-hello-complete-step').click()
}

/** Press the V3 stage's run control (the shell owns it in blockly-v3 mode). */
export async function runForestStage(page: Page) {
  await showLessonPane(page, 'stage')
  await page.getByTestId('ws-run-toggle').click()
}

/**
 * Seed the owner-scoped V3 draft for lesson-01 before the page loads. Each
 * 关 keeps its own program in V3, so callers pass only the steps they need;
 * the remaining steps fall back to their starter programs when the slot
 * validates the draft.
 */
export async function seedForestV3Draft(
  page: Page,
  stepIndex: number,
  programs: Record<string, ReadonlyArray<{ type: string }>>,
) {
  await page.evaluate(
    ({ stepIndex, programs }) => {
      const lessonId = 'lesson-01-forest-hello'
      const script = {
        version: 1,
        lessonId,
        stepIndex,
        programs: Object.fromEntries(
          Object.entries(programs).map(([stepId, blocks]) => [
            stepId,
            blocks.map((block) => ({ type: block.type })),
          ]),
        ),
        passed: [],
        failures: 0,
      }
      // No Supabase user and no kc_guest_id cookie in the E2E context means
      // the server-resolved owner is the bare guest, which is the key the
      // studio itself writes (verified against the real workspace).
      window.localStorage.setItem(
        `kids-lesson-owner-v1:guest:kidscoding-draft:${lessonId}`,
        JSON.stringify({ lessonId, savedAt: new Date().toISOString(), script, version: 1 }),
      )
      window.sessionStorage.clear()
    },
    { stepIndex, programs },
  )
}

/**
 * OPS-056: seed the owner-scoped V3 draft for a launch lesson (lesson-02…12)
 * before the page loads. Same envelope and owner key as seedForestV3Draft;
 * steps without a program fall back to their starter programs.
 */
export async function seedLaunchV3Draft(
  page: Page,
  lessonId: string,
  stepIndex: number,
  programs: Record<string, ReadonlyArray<{ type: string }>>,
) {
  await page.evaluate(
    ({ lessonId, stepIndex, programs }) => {
      const script = {
        version: 1,
        lessonId,
        stepIndex,
        programs: Object.fromEntries(
          Object.entries(programs).map(([stepId, blocks]) => [
            stepId,
            blocks.map((block) => ({ type: block.type })),
          ]),
        ),
        passed: [],
        failures: 0,
      }
      window.localStorage.setItem(
        `kids-lesson-owner-v1:guest:kidscoding-draft:${lessonId}`,
        JSON.stringify({ lessonId, savedAt: new Date().toISOString(), script, version: 1 }),
      )
      window.sessionStorage.clear()
    },
    { lessonId, stepIndex, programs },
  )
}

/**
 * UX-202: on phones (<=600px) the classroom shows one zone at a time
 * behind the 任务 / 积木 / 舞台 tabs. On larger viewports all zones are
 * visible and the tabs are display:none, so this is a no-op there.
 * Call it before interacting with elements that live in a zone.
 *
 * lesson-01 now renders the V3 studio instead of the old three-column
 * classroom; its tabs are 学习任务 / 积木编程 / 作品舞台 and live behind
 * `v3-pane-*`. lesson-02…12 keep the original `lesson-mobile-tab-*` row.
 */
export async function showLessonPane(
  page: Page,
  pane: 'task' | 'code' | 'stage',
) {
  // OPS-053: the G0-U2 event lessons render the same V3 studio, so their pane
  // switches go through the V3 tabs too (on phones the old classroom tab row
  // does not exist there and the legacy branch below would silently no-op).
  // OPS-056: the launch lessons lesson-02…12 render it too.
  const isV3 = (path: string) =>
    FOREST_V3_PATH.test(path) ||
    GRID_V3_PATH.test(path) ||
    EVENT_V3_PATH.test(path) ||
    LAUNCH_V3_PATH.test(path) ||
    PROJECT_V3_PATH.test(path)
  let pathname = new URL(page.url()).pathname
  if (isV3(pathname)) {
    // The shell is visible in every pane mode; the slot is not (phones show
    // one pane at a time), so never gate the pane switch on slot visibility.
    await expect(page.getByTestId('studio-shell')).toBeVisible({ timeout: 30_000 })
    await showV3Pane(page, pane)
    return
  }
  // Trial-entry opens the classroom through client-side navigation, so the
  // caller can arrive here before the classroom is mounted at all. Decide
  // nothing until the shell is really on screen (desktop and tablet satisfy
  // this too), otherwise the hidden-tab check below would silently no-op and
  // leave the phone on the default 任务 pane.
  //
  // Only on classroom routes: finishing a lesson (and reloading) lands on
  // /project/<id>/complete, which renders its own saved-project workbench and
  // no lesson shell, yet the specs call this helper again there to run the
  // saved program. Waiting for a lesson shell on that page can never pass.
  if (/^\/learn\/(lesson|grid-lab|event-lab|story-lab|catalog)(\/|$)/.test(pathname)) {
    // OPS-052: a trial entry can now land on the V3 studio instead of the old
    // classroom, so the URL read above may predate the client navigation that
    // is still in flight. Accept either real shell, then dispatch from the
    // route that actually settled.
    await expect(
      page
        .locator(
          '[data-testid="studio-shell"], [data-testid="lesson-workbench-shell"], [data-testid="golden-lesson"]',
        )
        .first(),
    ).toBeVisible({ timeout: 15_000 })
    pathname = new URL(page.url()).pathname
    if (isV3(pathname)) {
      await showV3Pane(page, pane)
      return
    }
  }
  const tabs = page.getByTestId('lesson-mobile-tabs')
  if (await tabs.isVisible()) {
    await expect(tabs).toBeVisible()
    const tab = page.getByTestId(`lesson-mobile-tab-${pane}`)
    const column = page.getByTestId(`lesson-${pane}-column`)
    await tab.click()
    // The tab button is visible in SSR HTML before hydration attaches its
    // handler, so a click can land with no effect and the pane stays put
    // (CI run 40597421905: the code pane never became visible and the next
    // click timed out on an existing-but-hidden button). Assert the tab's own
    // selected state first; only when that state proves the click was lost do
    // we click once more. No force, no sleep, no skipped assertion, no mock:
    // a genuine regression still fails the final visibility expect below.
    try {
      await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 5_000 })
    } catch {
      await tab.click()
      await expect(tab).toHaveAttribute('aria-selected', 'true')
    }
    await expect(column).toBeVisible()
  }
}

/** Real mobile interaction: select the visible classroom tab before clicking.
 * On desktop the tabs are absent/hidden, so behavior stays unchanged.
 * This does not alter acceptance assertions, app code or frozen V2 layout.
 */
/**
 * OPS-056: prepare a V3 control the way a child reaches it (open the right
 * pane / the tools drawer) and return the real V3 test id to press. Returns
 * null for controls that need the full helper flow (run / forest complete),
 * which callers must route through clickLessonControl instead. Exported so
 * specs that tap on touch projects (blockly-duo-graduation press()) reuse the
 * same mapping and keep their own tap-vs-click choice.
 */
export async function resolveV3LessonControl(page: Page, testId: string): Promise<string | null> {
  if (isLaunchV3(page) && testId === 'lesson-complete-step') {
    // lesson-02…12: the completion button lives under the launch slot's id.
    await showLessonPane(page, 'task')
    return 'launch-v3-complete-step'
  }
  if (
    testId.startsWith('lesson-add-') ||
    testId.startsWith('lesson-say-line-') ||
    testId === 'lesson-clear-program' ||
    testId === 'lesson-remove-last' ||
    testId === 'lesson-delete-selected'
  ) {
    // 撤回最后一块 / 删除选中 live in the same tools <details> as 清空 / 添加;
    // OPS-056: so do the “选一句对白” buttons (BlocklyToolsPanel renders them).
    await openForestTools(page)
    return testId
  }
  if (testId === 'run-code-button' || testId === 'lesson-complete-step') return null
  if (testId === 'reset-code-button') {
    await showLessonPane(page, 'stage')
    return 'v3-reset-stage'
  }
  if (testId === 'lesson-remedial-link' || testId.startsWith('ws-hint-reveal-')) {
    await showLessonPane(page, 'task')
  } else if (
    testId.startsWith('stage-') ||
    testId.startsWith('practice-') ||
    testId.startsWith('mistake-') ||
    testId.startsWith('garden-')
  ) {
    await showLessonPane(page, 'stage')
  }
  return testId
}

export async function clickLessonControl(page: Page, testId: string) {
  if (isForestV3(page) || isLaunchV3(page) || isProjectV3(page)) {
    // The V3 studio renames the shell's controls. Map the old classroom's
    // test ids onto the real V3 ones so specs keep expressing the child's
    // intent (add a block, run, clear, complete) instead of per-page markup.
    const resolved = await resolveV3LessonControl(page, testId)
    if (resolved) {
      await page.getByTestId(resolved).click()
      return
    }
    if (testId === 'run-code-button') {
      await runForestStage(page)
      return
    }
    await completeForestStep(page)
    return
  }
  if (testId.startsWith('lesson-add-') || testId === 'lesson-clear-program') {
    await showLessonPane(page, 'code')
  } else if (
    testId === 'run-code-button' ||
    testId.startsWith('stage-') ||
    testId.startsWith('practice-') ||
    testId.startsWith('mistake-') ||
    testId.startsWith('garden-')
  ) {
    await showLessonPane(page, 'stage')
  } else if (testId === 'lesson-remedial-link') {
    await showLessonPane(page, 'task')
  }
  await page.getByTestId(testId).click()
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
  await showLessonPane(page, 'stage')
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
  const [mainArt, friendArt, mainTag, friendTag, mainBox, friendBox] = await Promise.all([
    main.locator('.kc-stage-actor-art').boundingBox(),
    friend.locator('.kc-stage-actor-art').boundingBox(),
    main.locator('.kc-stage-nametag').boundingBox(),
    friend.locator('.kc-stage-nametag').boundingBox(),
    main.boundingBox(),
    friend.boundingBox(),
  ])
  expect(mainArt && friendArt && mainTag && friendTag && mainBox && friendBox).toBeTruthy()
  expect(overlaps(mainArt!, friendArt!), 'walker must not cover the friend').toBe(false)
  expect(overlaps(mainTag!, friendTag!), 'name tags must not overlap').toBe(false)
  expect(mainArt!.x + mainArt!.width).toBeLessThan(friendArt!.x)
  if (progress === 1) {
    // OPS-056: the launch lessons (lesson-02…12) render the same V3 stage column as
    // lesson-01, so they share its slot contract (measured the same 43.45px painted
    // gap at Pixel 7 on /studio/blockly/launch/*).
    if (isForestV3(page) || isLaunchV3(page)) {
      // V3's stage column scales the artwork (clamp(52px, 13vw, 72px) on phones) inside
      // fixed 92px/74px actor slots, so the painted gap carries both slot insets on top
      // of the 14px meeting gap (measured 43.45px at Pixel 7). The layout contract is
      // the slots: they must end exactly one meeting gap apart, never overlapping.
      const slotGap = friendBox!.x - (mainBox!.x + mainBox!.width)
      expect(slotGap, 'walker slot must end one meeting gap beside the friend').toBeGreaterThanOrEqual(0)
      expect(slotGap, 'walker slot must end one meeting gap beside the friend').toBeLessThanOrEqual(16)
    } else {
      expect(friendArt!.x - (mainArt!.x + mainArt!.width)).toBeLessThanOrEqual(30)
    }
  }
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
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('mistake-task')).toBeVisible()
  await expect(page.getByTestId('mistake-setup')).toBeVisible()
  if (options.predict ?? options.garden) await clickLessonControl(page, 'garden-predict-click')
  else await expect(page.getByTestId('garden-prediction')).toHaveCount(0)
  await clickLessonControl(page, 'run-code-button')
  if (options.wrongWaitsForClick) {
    await expect(page.getByTestId('garden-await-click')).toBeVisible()
    await clickLessonControl(page, 'stage-character-main')
  }
  // The designed wrong run is the experiment: a neutral note, never the failure-style “哎呀” box.
  await expect(page.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code', options.expectCode, { timeout: 20_000 })
  await expect(page.getByTestId('stage-run-error')).toHaveCount(0)
  await expect(page.getByTestId('mistake-observed')).toBeVisible()
  // The designed mistake is the experiment, not a failed attempt: no hint tier is raised.
  // The old classroom has an auto-escalating `lesson-hint`; the V3 studio has no automatic
  // hint at all, so the equivalent promise is that tier 2 stays locked until the child asks.
  if (isForestV3(page) || isLaunchV3(page)) {
    await expect(page.getByTestId('ws-hint-reveal-2')).toBeDisabled()
  } else {
    await expect(page.getByTestId('lesson-hint')).toHaveCount(0)
  }
  // Observed but not answered: the step does not pass yet.
  await clickLessonControl(page, 'lesson-complete-step')
  await expect(
    lessonNotice(page),
  ).toContainText('先回答舞台上的问题')
  await clickLessonControl(page, `mistake-answer-${options.answer}`)
  await expect(page.getByTestId('mistake-fix')).toBeVisible()
  // Answered right: still no “哎呀” box under the panel.
  await expect(page.getByTestId('mistake-run-result')).toContainText('你看懂啦')
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('哎呀')
  await clickLessonControl(page, 'lesson-clear-program')
  for (const type of options.fix) await clickLessonControl(page, `lesson-add-${type}`)
  await clickLessonControl(page, 'run-code-button')
  if (options.garden) {
    await expect(page.getByTestId('garden-await-click')).toBeVisible()
    await clickLessonControl(page, 'stage-character-main')
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
  await showLessonPane(page, 'stage')
  const task = page.getByTestId('practice-task')
  await expect(task).toBeVisible()
  await expect(task).toHaveAttribute('data-goal-type', options.goalType)
  await expect(page.getByTestId('practice-setup')).toBeVisible()
  // Lessons 08–09 no longer repeat lesson 07's click prediction.
  await expect(page.getByTestId('garden-prediction')).toHaveCount(0)
  if (options.guess) {
    // A prediction is made before the run: no guess, no run, no completion.
    await expect(page.getByTestId('practice-need-guess')).toBeVisible()
    if (isForestV3(page) || isLaunchV3(page)) {
      // The V3 shell owns the run button, so the gate is the completion attempt:
      // it must explain the missing prediction instead of advancing the step.
      await clickLessonControl(page, 'lesson-complete-step')
      await expect(lessonNotice(page)).toContainText('先在舞台上猜一猜')
    } else {
      await expect(page.getByTestId('run-code-button')).toBeDisabled()
      await clickLessonControl(page, 'lesson-complete-step')
      await expect(page.getByTestId('lesson-feedback-card')).toContainText('先在舞台上猜一猜')
    }
    await clickLessonControl(page, `practice-answer-${options.guess}`)
    await expect(page.getByTestId('practice-answer-reply')).toContainText('猜好啦')
  } else {
    await expect(page.getByTestId('practice-question')).toHaveCount(0)
  }
  if (options.clear) await clickLessonControl(page, 'lesson-clear-program')
  for (const type of options.build) await clickLessonControl(page, `lesson-add-${type}`)
  await clickLessonControl(page, 'run-code-button')
  if (options.click) {
    await expect(page.getByTestId('garden-await-click')).toBeVisible()
    await clickLessonControl(page, 'stage-character-main')
  }
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 25_000 })
  if (options.answer) {
    await expect(page.getByTestId('practice-need-answer')).toBeVisible()
    await clickLessonControl(page, 'lesson-complete-step')
    await expect(
      lessonNotice(page),
    ).toContainText('先回答舞台上的问题')
    if (options.wrongAnswer) {
      await clickLessonControl(page, `practice-answer-${options.wrongAnswer}`)
      await expect(page.getByTestId('practice-answer-reply')).toContainText('再看看舞台')
      await expect(page.getByTestId('practice-done')).toHaveCount(0)
    }
    await clickLessonControl(page, `practice-answer-${options.answer}`)
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
