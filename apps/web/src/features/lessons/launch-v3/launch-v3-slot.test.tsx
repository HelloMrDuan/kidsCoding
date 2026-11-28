import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMistakeStep, mistakeSteps } from '@/content/curriculum/mistake-steps'
import { getPracticeStepFor } from '@/content/curriculum/practice-steps'
import type { ProgramBlock } from '@/features/lessons/blockly/observable-run'
import { getSayLineChoices } from '@/features/lessons/blockly/step-judge-options'
import { LessonDraftOwnerContext } from '@/features/lessons/lesson-draft-boundary'
import { LESSON_DRAFT_OWNER_STORAGE_KEY } from '@/features/lessons/scoped-draft-key'
import type { EditorSlotProps } from '@/features/lessons/workspace/workspace-slots'

const { push, surface } = vi.hoisted(() => ({
  push: vi.fn(),
  surface: { props: null as null | Record<string, unknown> },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

/**
 * 插槽单测：BlocklyWorkspace 在 jsdom 里无法 inject（同 forest-hello-slot.test 说明），
 * 这里只 mock 编辑面本身——mock 记录收到的 props 并按 props.blocks 展示当前程序；
 * 判定、完成门控、错误实验流转、双角色门控、旧草稿导入等插槽逻辑保持真实。
 */
vi.mock('@/features/lessons/blockly/blockly-workspace', () => ({
  BlocklyWorkspace: (props: { blocks: unknown[]; onSnapshotChange: (blocks: unknown[]) => void }) => {
    surface.props = props as unknown as Record<string, unknown>
    return <div data-testid="mock-blockly" data-blocks={JSON.stringify(props.blocks)} />
  },
}))

import { emptyLaunchDraft, type LaunchSlotData } from './launch-v3-draft'
import { buildLaunchJudgment, judgeLaunchStep } from './launch-v3-judging'
import { hasLegacyLaunchDraft, hasUnclaimableLegacyLaunchDraft, importLegacyLaunchDraft } from './launch-v3-legacy'
import { getLaunchV3Lesson, LAUNCH_V3_LESSON_IDS, launchV3DuoMode } from './launch-v3-lessons'
import { LaunchRunAdapter } from './launch-v3-run-adapter'
import { createLaunchSessionStore, LaunchSessionContext } from './launch-v3-session'
import {
  LAUNCH_SLOW_COMPLETE_MS,
  LaunchEditorSlot,
  readLaunchSlotLastGoodForTest,
  resetLaunchSlotLastGoodForTest,
} from './launch-v3-slot'

const GUEST_A = 'guest:aaaa'
const GUEST_B = 'guest:bbbb'
const USER_A = 'user:alice'

function stampClaim(owner: string | null) {
  if (owner === null) window.localStorage.removeItem(LESSON_DRAFT_OWNER_STORAGE_KEY)
  else window.localStorage.setItem(LESSON_DRAFT_OWNER_STORAGE_KEY, owner)
}

const SINGLE = 'lesson-03-forest-story'
const CLICK = 'lesson-07-garden-click'
const DUO = 'lesson-10-second-friend'

const b = (...types: string[]): ProgramBlock[] => types.map((type) => ({ type }))

function withLine(lessonId: string, blocks: readonly ProgramBlock[]): ProgramBlock[] {
  const line = getSayLineChoices(lessonId)?.[0]?.id
  return blocks.map((block) =>
    line && block.type === 'say_line' && !block.line ? { ...block, line } : { ...block },
  )
}

function fakeShell(overrides: Partial<NonNullable<EditorSlotProps['shell']>> = {}): EditorSlotProps['shell'] {
  return {
    run: vi.fn(),
    stop: vi.fn(),
    save: vi.fn(),
    running: false,
    saveState: 'unsaved',
    judgment: null,
    ...overrides,
  } as EditorSlotProps['shell']
}

function renderSlot(
  lessonId: string,
  initial: unknown,
  shell = fakeShell(),
  owner?: string,
  revealAlerts?: () => void,
) {
  const onChange = vi.fn()
  const onJudgment = vi.fn()
  const store = createLaunchSessionStore(lessonId)
  const runAdapter = new LaunchRunAdapter(lessonId, {
    isStepObserved: (stepId) => store.getState().observed.includes(stepId),
  })
  let currentOwner = owner
  const view = (nextShell: EditorSlotProps['shell']) => (
    <LessonDraftOwnerContext.Provider value={currentOwner}>
      <LaunchSessionContext.Provider value={{ lessonId, store, runAdapter, revealAlerts }}>
        <LaunchEditorSlot
          lessonId={lessonId}
          initial={initial}
          onChange={onChange}
          onJudgment={onJudgment}
          editable
          shell={nextShell}
        />
      </LaunchSessionContext.Provider>
    </LessonDraftOwnerContext.Provider>
  )
  let lastShell = shell
  const utils = render(view(shell))
  return {
    ...utils,
    onChange,
    onJudgment,
    store,
    runAdapter,
    rerenderWith: (nextShell: EditorSlotProps['shell']) => {
      lastShell = nextShell
      utils.rerender(view(nextShell))
    },
    /** 同一插槽实例上切换身份（模拟同一标签页里 A→B 账号切换后重新渲染）。 */
    switchOwner: (nextOwner: string | undefined) => {
      currentOwner = nextOwner
      utils.rerender(view(lastShell))
    },
  }
}

function legacyDraft(lessonId: string, stepIndex: number, blocks: unknown[]) {
  window.sessionStorage.setItem(
    `kc-lesson-draft:${lessonId}:${stepIndex}`,
    JSON.stringify({ schemaVersion: 1, lessonId, stepIndex, blocks, updatedAt: new Date().toISOString() }),
  )
}

/** 选一个既非首关也非末关、且没有错误实验与练习题的关，用于“运行通过 → 进入下一关”。 */
function plainMiddleStep(lessonId: string): number {
  const lesson = getLaunchV3Lesson(lessonId)!
  const index = lesson.steps.findIndex(
    (step, i) =>
      i > 0 &&
      i < lesson.steps.length - 1 &&
      !getMistakeStep(lessonId, step.id) &&
      !getPracticeStepFor(lessonId, step),
  )
  expect(index).toBeGreaterThan(0)
  return index
}

beforeEach(() => {
  resetLaunchSlotLastGoodForTest()
  surface.props = null
  window.sessionStorage.clear()
  window.localStorage.clear()
  push.mockClear()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ synced: true }) }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('OPS-056 LaunchEditorSlot (mocked Blockly surface)', () => {
  it.each(LAUNCH_V3_LESSON_IDS)('%s: shows step 1 from the curriculum data in one shared slot', async (id) => {
    const lesson = getLaunchV3Lesson(id)!
    renderSlot(id, emptyLaunchDraft(id))
    await screen.findByTestId('mock-blockly')
    const root = screen.getByTestId('launch-v3-slot')
    expect(root).toHaveAttribute('data-lesson-id', id)
    expect(root.style.height).toBe('100%')
    expect(root.style.overflowY).toBe('auto')
    expect(screen.getByTestId('launch-v3-step-progress')).toHaveTextContent(`第 1 / ${lesson.steps.length} 关`)
    expect(screen.getByTestId('launch-v3-step-title')).toHaveTextContent(lesson.steps[0].title)
    expect(screen.getByTestId('launch-v3-instruction')).toHaveTextContent(lesson.steps[0].instruction)
    expect(surface.props?.allowedBlocks).toEqual(lesson.steps[0].allowedBlocks)
    expect(surface.props?.sayLineChoices).toEqual(getSayLineChoices(id))
  })

  it('a snapshot change persists through onChange', async () => {
    const draft = emptyLaunchDraft(SINGLE)
    draft.stepIndex = 1
    const { onChange } = renderSlot(SINGLE, draft)
    await screen.findByTestId('mock-blockly')
    const onSnapshotChange = surface.props?.onSnapshotChange as (blocks: ProgramBlock[]) => void
    onSnapshotChange(b('when_start', 'move_right'))
    const persisted = onChange.mock.calls.at(-1)?.[0] as LaunchSlotData
    const stepId = getLaunchV3Lesson(SINGLE)!.steps[1].id
    expect(persisted.programs[stepId]).toEqual(b('when_start', 'move_right'))
    expect(persisted.stepIndex).toBe(1)
  })

  it('complete is blocked before a successful run, then advances after a passed judgment', async () => {
    const lesson = getLaunchV3Lesson(SINGLE)!
    const index = plainMiddleStep(SINGLE)
    const step = lesson.steps[index]
    const program = withLine(SINGLE, b(...step.requiredBlockTypes))
    const draft = emptyLaunchDraft(SINGLE)
    draft.stepIndex = index
    draft.programs[step.id] = program
    const { onChange, rerenderWith } = renderSlot(SINGLE, draft)
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    expect(screen.getByTestId('launch-v3-notice').textContent?.length ?? 0).toBeGreaterThan(0)
    expect(screen.getByTestId('launch-v3-step-progress')).toHaveTextContent(`第 ${index + 1} / `)

    const passed = buildLaunchJudgment(judgeLaunchStep(SINGLE, program, index, false))
    expect(passed.passed).toBe(true)
    rerenderWith(fakeShell({ judgment: passed }))
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    const advanced = onChange.mock.calls.at(-1)?.[0] as LaunchSlotData
    expect(advanced.stepIndex).toBe(index + 1)
    expect(advanced.passed).toContain(step.id)
    expect(screen.getByTestId('launch-v3-step-progress')).toHaveTextContent(`第 ${index + 2} / `)
  })

  it('a designed-mistake run marks observed in the session store, not the draft', async () => {
    const mistake = mistakeSteps.find((m) => m.lessonId === SINGLE)!
    const lesson = getLaunchV3Lesson(SINGLE)!
    const index = lesson.steps.findIndex((step) => step.id === mistake.stepId)
    const wrong = withLine(SINGLE, mistake.wrongProgram)
    const result = judgeLaunchStep(SINGLE, wrong, index, false)
    expect(result.designedMistake).toBe(true)
    const draft = emptyLaunchDraft(SINGLE)
    draft.stepIndex = index
    draft.programs[mistake.stepId] = wrong
    const { onChange, store, rerenderWith } = renderSlot(SINGLE, draft)
    await screen.findByTestId('mock-blockly')
    rerenderWith(fakeShell({ judgment: buildLaunchJudgment(result) }))
    await screen.findByTestId('mock-blockly')
    expect(store.getState().observed).toEqual([mistake.stepId])
    const persisted = onChange.mock.calls.at(-1)?.[0] as LaunchSlotData | undefined
    expect(persisted?.failures ?? 0).toBe(0)
  })

  it('click lessons tell the child to click the character on the stage', async () => {
    renderSlot(CLICK, emptyLaunchDraft(CLICK))
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('launch-v3-click-note')).toHaveTextContent('亲自点一下角色')
    cleanup()
    renderSlot(SINGLE, emptyLaunchDraft(SINGLE))
    await screen.findByTestId('mock-blockly')
    expect(screen.queryByTestId('launch-v3-click-note')).toBeNull()
  })

  it('duo lesson step 1: completing without a prediction is blocked with a hint', async () => {
    const { onChange } = renderSlot(DUO, emptyLaunchDraft(DUO))
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    expect(screen.getByTestId('launch-v3-notice')).toHaveTextContent('先在舞台下方猜一猜')
    const last = onChange.mock.calls.at(-1)?.[0] as LaunchSlotData | undefined
    expect(last?.stepIndex ?? 0).toBe(0)
  })

  it('duo lesson step 4: completing before observing the mistake run is blocked', async () => {
    const draft = emptyLaunchDraft(DUO)
    draft.stepIndex = 3
    renderSlot(DUO, draft)
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    expect(screen.getByTestId('launch-v3-notice')).toHaveTextContent('先按舞台上的运行按钮')
  })

  it('rejects a foreign-lesson import and echoes the empty draft', async () => {
    const { onChange } = renderSlot(SINGLE, { lessonId: 'someone-else', stepIndex: 0, programs: {} })
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('launch-v3-notice')).toHaveTextContent('导入文件属于其他课节，已拒绝')
    expect(onChange).toHaveBeenCalledWith(emptyLaunchDraft(SINGLE))
  })

  it('offers a one-click legacy import when the new draft is empty, and keeps the old keys', async () => {
    const lesson = getLaunchV3Lesson(SINGLE)!
    const step2 = b(...lesson.steps[1].requiredBlockTypes)
    legacyDraft(SINGLE, 0, b('when_start'))
    legacyDraft(SINGLE, 1, step2)
    stampClaim(GUEST_A)
    const { onChange } = renderSlot(SINGLE, emptyLaunchDraft(SINGLE), fakeShell(), GUEST_A)
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('launch-v3-legacy-import')).toHaveTextContent('到第 2 关')
    fireEvent.click(screen.getByTestId('launch-v3-import-legacy'))
    const imported = onChange.mock.calls.at(-1)?.[0] as LaunchSlotData
    expect(imported.stepIndex).toBe(1)
    expect(imported.programs[lesson.steps[1].id]).toEqual(step2)
    expect(imported.passed).toEqual([])
    expect(window.sessionStorage.getItem(`kc-lesson-draft:${SINGLE}:1`)).not.toBeNull()
    expect(screen.queryByTestId('launch-v3-legacy-import')).toBeNull()
  })

  it('does not offer the legacy import when the new draft is not empty', async () => {
    legacyDraft(SINGLE, 0, b('when_start'))
    stampClaim(GUEST_A)
    const draft = emptyLaunchDraft(SINGLE)
    draft.programs[getLaunchV3Lesson(SINGLE)!.steps[1].id] = b('when_start', 'move_right')
    renderSlot(SINGLE, draft, fakeShell(), GUEST_A)
    await screen.findByTestId('mock-blockly')
    expect(screen.queryByTestId('launch-v3-legacy-import')).toBeNull()
  })

  it('reports an unusable legacy draft honestly instead of importing half of it', async () => {
    legacyDraft(SINGLE, 0, b('totally_unknown_block'))
    stampClaim(GUEST_A)
    renderSlot(SINGLE, emptyLaunchDraft(SINGLE), fakeShell(), GUEST_A)
    await screen.findByTestId('mock-blockly')
    expect(screen.queryByTestId('launch-v3-legacy-import')).toBeNull()
    expect(screen.getByTestId('launch-v3-notice')).toHaveTextContent('没能导入')
  })

  describe('P0 草稿归属（复审 HOLD）', () => {
    const HISTORICAL_KEY = `kidscoding-draft:${SINGLE}`
    const HISTORICAL_VALUE = JSON.stringify({ lessonId: SINGLE, marker: 'historical' })

    function seedLegacy() {
      const lesson = getLaunchV3Lesson(SINGLE)!
      legacyDraft(SINGLE, 0, b('when_start'))
      legacyDraft(SINGLE, 1, b(...lesson.steps[1].requiredBlockTypes))
      window.localStorage.setItem(HISTORICAL_KEY, HISTORICAL_VALUE)
    }

    function snapshotLegacyKeys() {
      return {
        s0: window.sessionStorage.getItem(`kc-lesson-draft:${SINGLE}:0`),
        s1: window.sessionStorage.getItem(`kc-lesson-draft:${SINGLE}:1`),
        historical: window.localStorage.getItem(HISTORICAL_KEY),
      }
    }

    it('same tab A→B switch: the prompt offered to A is revoked and never usable by B', async () => {
      seedLegacy()
      stampClaim(GUEST_A)
      const { onChange, switchOwner } = renderSlot(SINGLE, emptyLaunchDraft(SINGLE), fakeShell(), GUEST_A)
      await screen.findByTestId('mock-blockly')
      expect(screen.getByTestId('launch-v3-legacy-import')).toBeInTheDocument()
      switchOwner(GUEST_B)
      expect(screen.queryByTestId('launch-v3-legacy-import')).toBeNull()
      expect(onChange).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(LESSON_DRAFT_OWNER_STORAGE_KEY)).toBe(GUEST_A)
    })

    it('B mounting on a browser claimed by A gets an honest notice and no content', async () => {
      seedLegacy()
      stampClaim(GUEST_A)
      const before = snapshotLegacyKeys()
      const { onChange } = renderSlot(SINGLE, emptyLaunchDraft(SINGLE), fakeShell(), GUEST_B)
      await screen.findByTestId('mock-blockly')
      expect(screen.queryByTestId('launch-v3-legacy-import')).toBeNull()
      expect(screen.getByTestId('launch-v3-notice')).toHaveTextContent('无法确认属于当前账号')
      expect(onChange).not.toHaveBeenCalled()
      expect(snapshotLegacyKeys()).toEqual(before)
      expect(window.localStorage.getItem(LESSON_DRAFT_OWNER_STORAGE_KEY)).toBe(GUEST_A)
    })

    it.each([
      ['no claim stamp', null, GUEST_A],
      ['bare guest stamp, concrete guest', 'guest', GUEST_A],
      ['unknown owner', GUEST_A, undefined],
    ])('unclaimed draft (%s): notice only, nothing read into the slot', async (_label, claim, owner) => {
      seedLegacy()
      stampClaim(claim)
      const { onChange } = renderSlot(SINGLE, emptyLaunchDraft(SINGLE), fakeShell(), owner)
      await screen.findByTestId('mock-blockly')
      expect(screen.queryByTestId('launch-v3-legacy-import')).toBeNull()
      expect(screen.getByTestId('launch-v3-notice')).toHaveTextContent('原草稿已原样保留')
      expect(onChange).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(LESSON_DRAFT_OWNER_STORAGE_KEY)).toBe(claim)
    })

    it('an existing V3 draft is never overwritten by the legacy draft', async () => {
      seedLegacy()
      stampClaim(GUEST_A)
      const draft = emptyLaunchDraft(SINGLE)
      const stepId = getLaunchV3Lesson(SINGLE)!.steps[0].id
      draft.programs[stepId] = b('when_start', 'move_right')
      const { onChange } = renderSlot(SINGLE, draft, fakeShell(), GUEST_A)
      await screen.findByTestId('mock-blockly')
      expect(screen.queryByTestId('launch-v3-legacy-import')).toBeNull()
      expect(onChange).not.toHaveBeenCalled()
      expect(JSON.parse(screen.getByTestId('mock-blockly').dataset.blocks ?? '[]')).toEqual(b('when_start', 'move_right'))
    })

    it('editing after the prompt appears revokes the import for good', async () => {
      seedLegacy()
      stampClaim(GUEST_A)
      const { onChange } = renderSlot(SINGLE, emptyLaunchDraft(SINGLE), fakeShell(), GUEST_A)
      await screen.findByTestId('mock-blockly')
      expect(screen.getByTestId('launch-v3-legacy-import')).toBeInTheDocument()
      const onSnapshotChange = surface.props?.onSnapshotChange as (blocks: ProgramBlock[]) => void
      act(() => onSnapshotChange(b('when_start', 'move_right')))
      expect(screen.queryByTestId('launch-v3-legacy-import')).toBeNull()
      const last = onChange.mock.calls.at(-1)?.[0] as LaunchSlotData
      expect(last.stepIndex).toBe(0)
      expect(last.programs[getLaunchV3Lesson(SINGLE)!.steps[0].id]).toEqual(b('when_start', 'move_right'))
    })

    it('a run judgment written after the prompt appears also revokes the import', async () => {
      seedLegacy()
      stampClaim(GUEST_A)
      const lesson = getLaunchV3Lesson(SINGLE)!
      const program = withLine(SINGLE, b(...lesson.steps[0].requiredBlockTypes))
      const { rerenderWith } = renderSlot(SINGLE, emptyLaunchDraft(SINGLE), fakeShell(), GUEST_A)
      await screen.findByTestId('mock-blockly')
      expect(screen.getByTestId('launch-v3-legacy-import')).toBeInTheDocument()
      const passed = buildLaunchJudgment(judgeLaunchStep(SINGLE, program, 0, false))
      rerenderWith(fakeShell({ judgment: passed }))
      await screen.findByTestId('mock-blockly')
      expect(screen.queryByTestId('launch-v3-legacy-import')).toBeNull()
    })

    it('re-validates the claim at click time instead of using the mount-time content', async () => {
      seedLegacy()
      stampClaim(GUEST_A)
      const { onChange } = renderSlot(SINGLE, emptyLaunchDraft(SINGLE), fakeShell(), GUEST_A)
      await screen.findByTestId('mock-blockly')
      expect(screen.getByTestId('launch-v3-legacy-import')).toBeInTheDocument()
      // 另一标签页把认领戳改成了别人：点击时必须拒绝。
      stampClaim(USER_A)
      fireEvent.click(screen.getByTestId('launch-v3-import-legacy'))
      expect(screen.getByTestId('launch-v3-notice')).toHaveTextContent('无法再确认旧草稿属于当前账号')
      expect(screen.queryByTestId('launch-v3-legacy-import')).toBeNull()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('dismissing the prompt imports nothing and keeps all legacy keys', async () => {
      seedLegacy()
      stampClaim(GUEST_A)
      const before = snapshotLegacyKeys()
      const { onChange } = renderSlot(SINGLE, emptyLaunchDraft(SINGLE), fakeShell(), GUEST_A)
      await screen.findByTestId('mock-blockly')
      fireEvent.click(screen.getByTestId('launch-v3-dismiss-legacy'))
      expect(screen.queryByTestId('launch-v3-legacy-import')).toBeNull()
      expect(onChange).not.toHaveBeenCalled()
      expect(snapshotLegacyKeys()).toEqual(before)
    })

    it('import then edit leaves the historical keys byte-for-byte unchanged', async () => {
      seedLegacy()
      stampClaim(GUEST_A)
      const before = snapshotLegacyKeys()
      renderSlot(SINGLE, emptyLaunchDraft(SINGLE), fakeShell(), GUEST_A)
      await screen.findByTestId('mock-blockly')
      fireEvent.click(screen.getByTestId('launch-v3-import-legacy'))
      const onSnapshotChange = surface.props?.onSnapshotChange as (blocks: ProgramBlock[]) => void
      act(() => onSnapshotChange(b('when_start', 'move_right', 'move_right')))
      expect(snapshotLegacyKeys()).toEqual(before)
      expect(window.localStorage.getItem(LESSON_DRAFT_OWNER_STORAGE_KEY)).toBe(GUEST_A)
    })

    it('the last-good session cache is isolated per owner and skipped for unknown owners', async () => {
      const { switchOwner } = renderSlot(SINGLE, emptyLaunchDraft(SINGLE), fakeShell(), GUEST_A)
      await screen.findByTestId('mock-blockly')
      const edit = (blocks: ProgramBlock[]) =>
        act(() => (surface.props?.onSnapshotChange as (next: ProgramBlock[]) => void)(blocks))
      const stepId = getLaunchV3Lesson(SINGLE)!.steps[0].id
      edit(b('when_start', 'move_right'))
      expect(readLaunchSlotLastGoodForTest(GUEST_A, SINGLE)?.programs[stepId]).toEqual(b('when_start', 'move_right'))
      expect(readLaunchSlotLastGoodForTest(GUEST_B, SINGLE)).toBeUndefined()
      // 切到 B 后写入：A 的缓存被清掉，B 只看得到自己的。
      switchOwner(GUEST_B)
      edit(b('when_start', 'move_right', 'move_right'))
      expect(readLaunchSlotLastGoodForTest(GUEST_A, SINGLE)).toBeUndefined()
      expect(readLaunchSlotLastGoodForTest(GUEST_B, SINGLE)?.programs[stepId]).toEqual(
        b('when_start', 'move_right', 'move_right'),
      )
      // 身份未知：不写也不读。
      switchOwner(undefined)
      edit(b('when_start'))
      expect(readLaunchSlotLastGoodForTest(undefined, SINGLE)).toBeUndefined()
      expect(readLaunchSlotLastGoodForTest('guest', SINGLE)).toBeUndefined()
    })

    it('a foreign-lesson import for B never echoes the draft A left in the session cache', async () => {
      const first = renderSlot(SINGLE, emptyLaunchDraft(SINGLE), fakeShell(), GUEST_A)
      await screen.findByTestId('mock-blockly')
      act(() => (surface.props?.onSnapshotChange as (next: ProgramBlock[]) => void)(b('when_start', 'move_right')))
      first.unmount()
      const { onChange } = renderSlot(SINGLE, { lessonId: 'someone-else', stepIndex: 0, programs: {} }, fakeShell(), GUEST_B)
      await screen.findByTestId('mock-blockly')
      expect(onChange).toHaveBeenCalledWith(emptyLaunchDraft(SINGLE))
    })
  })

  // 第 1 关就允许 move_right + repeat_twice 的两节课：蝴蝶课（飞）与草地课（走）。
  it.each([
    ['lesson-09-garden-story', 'when_clicked', '向右飞 100 步', '重复：再飞 100 步'],
    ['lesson-05-meadow-order', 'when_start', '向右走 100 步', '重复：再走 100 步'],
  ])('TQ-009: %s block list uses the lesson motion verb', async (id, event, move, repeat) => {
    const draft = emptyLaunchDraft(id)
    draft.programs[getLaunchV3Lesson(id)!.steps[0].id] = b(event, 'move_right', 'repeat_twice')
    renderSlot(id, draft)
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('launch-v3-block-1')).toHaveTextContent(move)
    expect(screen.getByTestId('launch-v3-block-2')).toHaveTextContent(repeat)
  })
})

describe('OPS-056 launch-v3 legacy import', () => {
  it('is fail-closed for unregistered lessons and for missing drafts', () => {
    stampClaim(GUEST_A)
    legacyDraft('lesson-01-forest-hello', 0, b('when_start'))
    expect(hasLegacyLaunchDraft('lesson-01-forest-hello', GUEST_A)).toBe(false)
    expect(importLegacyLaunchDraft('lesson-01-forest-hello', GUEST_A).ok).toBe(false)
    expect(hasUnclaimableLegacyLaunchDraft('lesson-01-forest-hello', GUEST_B)).toBe(false)
    expect(hasLegacyLaunchDraft(SINGLE, GUEST_A)).toBe(false)
    expect(importLegacyLaunchDraft(SINGLE, GUEST_A).ok).toBe(false)
    expect(hasUnclaimableLegacyLaunchDraft(SINGLE, GUEST_B)).toBe(false)
  })

  it('without a matching claim it neither reads nor imports, and only reports the key exists', () => {
    legacyDraft(SINGLE, 0, b('when_start'))
    const cases: Array<[string | null, string | undefined]> = [
      [null, GUEST_A], // 无认领戳
      ['guest', GUEST_A], // 裸 guest 戳不被具体访客认领（同 event-v3 严格策略）
      [USER_A, GUEST_A], // 他人戳
      [GUEST_A, undefined], // 身份未知
      [GUEST_A, GUEST_B], // 同一浏览器换了另一位访客
    ]
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    for (const [claim, owner] of cases) {
      stampClaim(claim)
      getItem.mockClear()
      expect(hasLegacyLaunchDraft(SINGLE, owner)).toBe(false)
      const result = importLegacyLaunchDraft(SINGLE, owner)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toContain('无法确认旧草稿属于当前账号')
      expect(hasUnclaimableLegacyLaunchDraft(SINGLE, owner)).toBe(true)
      const legacyReads = getItem.mock.calls.filter(([key]) => String(key).startsWith('kc-lesson-draft:'))
      expect(legacyReads).toEqual([])
    }
    // 对照：认领一致时确实会读取旧键内容（证明上面的“未读取”断言不是空断言）。
    stampClaim(GUEST_A)
    getItem.mockClear()
    expect(importLegacyLaunchDraft(SINGLE, GUEST_A).ok).toBe(true)
    expect(getItem.mock.calls.some(([key]) => String(key).startsWith('kc-lesson-draft:'))).toBe(true)
    expect(hasUnclaimableLegacyLaunchDraft(SINGLE, GUEST_A)).toBe(false)
    getItem.mockRestore()
    // 模块从不写认领戳。
    expect(window.localStorage.getItem(LESSON_DRAFT_OWNER_STORAGE_KEY)).toBe(GUEST_A)
  })

  it('never writes a claim stamp when there is none', () => {
    legacyDraft(SINGLE, 0, b('when_start'))
    stampClaim(null)
    importLegacyLaunchDraft(SINGLE, GUEST_A)
    hasLegacyLaunchDraft(SINGLE, GUEST_A)
    hasUnclaimableLegacyLaunchDraft(SINGLE, GUEST_A)
    expect(window.localStorage.getItem(LESSON_DRAFT_OWNER_STORAGE_KEY)).toBeNull()
  })

  it('fills missing and later steps with the starter program and resets passed/failures', () => {
    const lesson = getLaunchV3Lesson(SINGLE)!
    legacyDraft(SINGLE, 1, b('when_start', 'move_right'))
    stampClaim(GUEST_A)
    const result = importLegacyLaunchDraft(SINGLE, GUEST_A)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fromStep).toBe(1)
    expect(result.importedSteps).toBe(1)
    expect(result.data.passed).toEqual([])
    expect(result.data.failures).toBe(0)
    expect(Object.keys(result.data.programs).sort()).toEqual(lesson.steps.map((step) => step.id).sort())
    const mistake = mistakeSteps.find((m) => m.lessonId === SINGLE)!
    expect(result.data.programs[mistake.stepId]).toEqual(mistake.wrongProgram)
  })

  it('drops unknown say-line ids but keeps the blocks', () => {
    legacyDraft('lesson-02-forest-greeting', 0, [{ type: 'when_start' }, { type: 'say_line', line: 'not-a-preset' }])
    stampClaim(GUEST_A)
    const result = importLegacyLaunchDraft('lesson-02-forest-greeting', GUEST_A)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const stepId = getLaunchV3Lesson('lesson-02-forest-greeting')!.steps[0].id
    expect(result.data.programs[stepId]).toEqual(b('when_start', 'say_line'))
  })
})

/**
 * 单角色课的末关都带错误实验或练习题：用第一节单角色课，按课程数据把“已观察 + 正确回答”
 * 写进会话 store，再给一次真实判定通过的运行结果，驱动真实完成流程（门控逻辑不 mock）。
 */
async function renderAtPassedLastStep(shell = fakeShell()) {
  const id = LAUNCH_V3_LESSON_IDS.find((lessonId) => !launchV3DuoMode(lessonId))!
  const lesson = getLaunchV3Lesson(id)!
  const index = lesson.steps.length - 1
  const step = lesson.steps[index]
  const mistake = getMistakeStep(id, step.id)
  const practice = getPracticeStepFor(id, step)
  const program = withLine(id, b(...step.requiredBlockTypes))
  const draft = emptyLaunchDraft(id)
  draft.stepIndex = index
  draft.programs[step.id] = program
  draft.passed = lesson.steps.slice(0, index).map((s) => s.id)
  const utils = renderSlot(id, draft, shell, GUEST_A)
  await screen.findByTestId('mock-blockly')
  act(() => {
    const state = utils.store.getState()
    utils.store.setState({
      observed: mistake ? [...state.observed, step.id] : state.observed,
      mistakeAnswers: mistake
        ? { ...state.mistakeAnswers, [step.id]: mistake.choices.find((c) => c.correct)!.id }
        : state.mistakeAnswers,
      practiceAnswers: practice
        ? { ...state.practiceAnswers, [step.id]: practice.choices.find((c) => c.correct)!.id }
        : state.practiceAnswers,
    })
  })
  const passed = buildLaunchJudgment(judgeLaunchStep(id, program, index, Boolean(mistake)))
  expect(passed.passed).toBe(true)
  utils.rerenderWith(fakeShell({ judgment: passed }))
  await screen.findByTestId('mock-blockly')
  return { ...utils, id }
}

describe('OPS-056 补充验收：完成流程（复用 #554 / OPS-047 思路）', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows the slow-complete notice only after 15 s of a hanging completion, and clears it on unmount', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const { unmount } = await renderAtPassedLastStep()
    vi.useFakeTimers()
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByTestId('launch-v3-complete-step')).toBeDisabled()
    act(() => vi.advanceTimersByTime(LAUNCH_SLOW_COMPLETE_MS - 1))
    expect(screen.queryByTestId('launch-v3-complete-slow')).toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByTestId('launch-v3-complete-slow')).toHaveTextContent('完成处理比平时久')
    const clear = vi.spyOn(globalThis, 'clearTimeout')
    unmount()
    expect(clear).toHaveBeenCalled()
    expect(() => vi.advanceTimersByTime(LAUNCH_SLOW_COMPLETE_MS * 2)).not.toThrow()
  })

  it('a normal completion never shows the slow notice, even after 15 s', async () => {
    await renderAtPassedLastStep()
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    await vi.waitFor(() => expect(push).toHaveBeenCalled())
    vi.useFakeTimers()
    act(() => vi.advanceTimersByTime(LAUNCH_SLOW_COMPLETE_MS + 1000))
    expect(screen.queryByTestId('launch-v3-complete-slow')).toBeNull()
  })

  it('cloud failure: banner with retry + local-only, progress saved locally, no navigation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    const { id } = await renderAtPassedLastStep()
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    expect(await screen.findByTestId('launch-v3-cloud-failed')).toHaveTextContent('云端同步失败，本机进度已保存')
    expect(push).not.toHaveBeenCalled()
    const progressDump = Object.keys(window.localStorage)
      .map((key) => window.localStorage.getItem(key) ?? '')
      .join('\n')
    expect(progressDump).toContain(id)
    fireEvent.click(screen.getByTestId('launch-v3-continue-local-only'))
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith(`/project/${id}/complete`))
  })

  it('navigation failure: real banner plus a full-page fallback link to the complete page', async () => {
    push.mockImplementationOnce(() => {
      throw new Error('navigation down')
    })
    const { id } = await renderAtPassedLastStep()
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    expect(await screen.findByTestId('launch-v3-navigation-failed')).toHaveTextContent('打开完成页失败了')
    expect(screen.getByTestId('launch-v3-open-complete-page')).toHaveAttribute('href', `/project/${id}/complete`)
    expect(screen.getByTestId('launch-v3-notice')).toHaveTextContent('跳转到完成页失败')
  })

  it('local save failure is reported honestly and never shown as success', async () => {
    await renderAtPassedLastStep()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    expect(await screen.findByTestId('launch-v3-notice')).toHaveTextContent('本机存储失败，作品和奖励尚未保存')
    expect(push).not.toHaveBeenCalled()
    expect(screen.queryByTestId('launch-v3-cloud-failed')).toBeNull()
    expect(screen.queryByTestId('launch-v3-navigation-failed')).toBeNull()
  })
})

describe('OPS-056 复审 HOLD P1：失败计数、分级提示、补救入口与小结果卡（对齐原课堂）', () => {
  function failingSetup() {
    const lesson = getLaunchV3Lesson(SINGLE)!
    const index = plainMiddleStep(SINGLE)
    const step = lesson.steps[index]
    const wrong = b('when_start')
    const result = judgeLaunchStep(SINGLE, wrong, index, false)
    expect(result.passed).toBe(false)
    expect(result.failure).toBeTruthy()
    const draft = emptyLaunchDraft(SINGLE)
    draft.stepIndex = index
    draft.programs[step.id] = wrong
    return { lesson, index, step, result, draft }
  }

  it('every real failing run counts once, even with the same program (no program-level dedup)', async () => {
    const { result, draft } = failingSetup()
    const { onChange, rerenderWith } = renderSlot(SINGLE, draft)
    await screen.findByTestId('mock-blockly')
    rerenderWith(fakeShell({ judgment: buildLaunchJudgment(result) }))
    rerenderWith(fakeShell({ judgment: null }))
    rerenderWith(fakeShell({ judgment: buildLaunchJudgment(result) }))
    await screen.findByTestId('mock-blockly')
    expect((onChange.mock.calls.at(-1)?.[0] as LaunchSlotData).failures).toBe(2)
  })

  it('a failing run followed by "complete" on the same program is not double counted', async () => {
    const { result, draft } = failingSetup()
    const { onChange, rerenderWith } = renderSlot(SINGLE, draft)
    await screen.findByTestId('mock-blockly')
    rerenderWith(fakeShell({ judgment: buildLaunchJudgment(result) }))
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    expect((onChange.mock.calls.at(-1)?.[0] as LaunchSlotData).failures).toBe(1)
  })

  it('hint tiers escalate per failure and tier 3 offers a real remedial jump', async () => {
    const { result, draft, step } = failingSetup()
    const { rerenderWith } = renderSlot(SINGLE, draft)
    await screen.findByTestId('mock-blockly')
    expect(screen.queryByTestId('lesson-hint')).toBeNull()
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      rerenderWith(fakeShell({ judgment: buildLaunchJudgment(result) }))
      await screen.findByTestId('mock-blockly')
      expect(screen.getByTestId('lesson-hint')).toHaveAttribute('data-hint-tier', String(attempt))
      expect(screen.getByTestId('lesson-hint').textContent).toContain('卡住时提示：')
      rerenderWith(fakeShell({ judgment: null }))
    }
    const link = screen.getByTestId('lesson-remedial-link')
    expect(link).toHaveAttribute('data-remedial-id', 'remedial-start-sequence')
    fireEvent.click(link)
    expect(push).toHaveBeenCalledWith(`/learn/remedial/remedial-start-sequence?from=${SINGLE}&step=${step.id}`)
  })

  it('no remedial link before tier 3', async () => {
    const { result, draft } = failingSetup()
    const { rerenderWith } = renderSlot(SINGLE, draft)
    await screen.findByTestId('mock-blockly')
    rerenderWith(fakeShell({ judgment: buildLaunchJudgment(result) }))
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('lesson-hint')).toHaveAttribute('data-hint-tier', '1')
    expect(screen.queryByTestId('lesson-remedial-link')).toBeNull()
  })

  it('passing a step resets failures, clears the hint and shows the "刚完成的小结果" card', async () => {
    const { result, draft, step, index } = failingSetup()
    const { onChange, rerenderWith } = renderSlot(SINGLE, draft)
    await screen.findByTestId('mock-blockly')
    rerenderWith(fakeShell({ judgment: buildLaunchJudgment(result) }))
    rerenderWith(fakeShell({ judgment: null }))
    expect(screen.getByTestId('lesson-hint')).toBeInTheDocument()
    expect(screen.queryByTestId('lesson-feedback-card')).toBeNull()

    const good = withLine(SINGLE, b(...step.requiredBlockTypes))
    const onSnapshotChange = surface.props?.onSnapshotChange as (blocks: ProgramBlock[]) => void
    act(() => onSnapshotChange(good))
    rerenderWith(fakeShell({ judgment: buildLaunchJudgment(judgeLaunchStep(SINGLE, good, index, false)) }))
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    const advanced = onChange.mock.calls.at(-1)?.[0] as LaunchSlotData
    expect(advanced.stepIndex).toBe(index + 1)
    expect(advanced.failures).toBe(0)
    expect(screen.queryByTestId('lesson-hint')).toBeNull()
    expect(screen.getByTestId('lesson-feedback-card')).toHaveTextContent('刚完成的小结果')
    expect(screen.getByTestId('lesson-feedback-preview').textContent?.length ?? 0).toBeGreaterThan(0)
  })

  it('practice steps use their own hint copy at tiers 1–2', async () => {
    const lessonId = 'lesson-04-meadow-scene'
    const target = getLaunchV3Lesson(lessonId)!
    const index = target.steps.findIndex((s) => getPracticeStepFor(lessonId, s))
    expect(index).toBeGreaterThanOrEqual(0)
    const practice = getPracticeStepFor(lessonId, target.steps[index])!
    const wrong = b('when_start')
    const result = judgeLaunchStep(lessonId, wrong, index, false)
    expect(result.passed).toBe(false)
    const draft = emptyLaunchDraft(lessonId)
    draft.stepIndex = index
    draft.programs[target.steps[index].id] = wrong
    const { rerenderWith } = renderSlot(lessonId, draft)
    await screen.findByTestId('mock-blockly')
    rerenderWith(fakeShell({ judgment: buildLaunchJudgment(result) }))
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('lesson-hint')).toHaveAttribute('data-hint-tier', '1')
    expect(screen.getByTestId('lesson-hint')).toHaveTextContent(practice.hint)
  })
})

describe('OPS-056 复审 HOLD P1：花园课“先猜一猜”门槛（对齐原课堂：未预测不能运行通过）', () => {
  function gardenSetup() {
    const lesson = getLaunchV3Lesson(CLICK)!
    const index = lesson.steps.findIndex((s) => s.id === 'step-2')
    expect(index).toBeGreaterThan(0)
    const step = lesson.steps[index]
    const program = withLine(CLICK, b(...step.requiredBlockTypes))
    const passed = buildLaunchJudgment(judgeLaunchStep(CLICK, program, index, false))
    expect(passed.passed).toBe(true)
    const draft = emptyLaunchDraft(CLICK)
    draft.stepIndex = index
    draft.programs[step.id] = program
    draft.passed = lesson.steps.slice(0, index).map((s) => s.id)
    return { index, step, passed, draft }
  }

  it('a passing run before any guess does not pass the step, and completing is blocked with a guess notice', async () => {
    const { index, passed, draft } = gardenSetup()
    const { onChange, rerenderWith } = renderSlot(CLICK, draft)
    await screen.findByTestId('mock-blockly')
    rerenderWith(fakeShell({ judgment: passed }))
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('launch-v3-notice')).toHaveTextContent('先在舞台上猜一猜')
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    expect(screen.getByTestId('launch-v3-notice')).toHaveTextContent('猜一猜')
    const last = onChange.mock.calls.at(-1)?.[0] as LaunchSlotData | undefined
    expect(last?.stepIndex ?? index).toBe(index)
  })

  it('after the guess, a passing run passes the step and completing advances', async () => {
    const { index, step, passed, draft } = gardenSetup()
    const { onChange, store, rerenderWith } = renderSlot(CLICK, draft)
    await screen.findByTestId('mock-blockly')
    rerenderWith(fakeShell({ judgment: passed }))
    await screen.findByTestId('mock-blockly')
    act(() => {
      store.setState({ clickPredictions: { [step.id]: 'needs-click' } })
    })
    rerenderWith(fakeShell({ judgment: null }))
    // 每次真实运行都会产生新的判定对象（判定 effect 按对象去重），这里模拟第二次运行。
    rerenderWith(fakeShell({ judgment: { ...passed } }))
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    const advanced = onChange.mock.calls.at(-1)?.[0] as LaunchSlotData
    expect(advanced.stepIndex).toBe(index + 1)
  })

  it('non-prediction steps of the garden lesson are not gated', async () => {
    const lesson = getLaunchV3Lesson(CLICK)!
    const step = lesson.steps[0]
    const program = withLine(CLICK, b(...step.requiredBlockTypes))
    const passed = buildLaunchJudgment(judgeLaunchStep(CLICK, program, 0, false))
    expect(passed.passed).toBe(true)
    const draft = emptyLaunchDraft(CLICK)
    draft.programs[step.id] = program
    const { onChange, rerenderWith } = renderSlot(CLICK, draft)
    await screen.findByTestId('mock-blockly')
    rerenderWith(fakeShell({ judgment: passed }))
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    expect((onChange.mock.calls.at(-1)?.[0] as LaunchSlotData).stepIndex).toBe(1)
  })
})

describe('OPS-056 复审 HOLD P1：手机端提示切到可见面板', () => {
  it('asks the route to reveal the alert pane when a notice appears, and not before', async () => {
    const reveal = vi.fn()
    renderSlot(DUO, emptyLaunchDraft(DUO), fakeShell(), undefined, reveal)
    await screen.findByTestId('mock-blockly')
    expect(reveal).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    expect(screen.getByTestId('launch-v3-notice')).toBeInTheDocument()
    expect(reveal).toHaveBeenCalledTimes(1)
  })

  it('cloud-sync failure also reveals the alert pane (retry / local-only stay reachable)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    const reveal = vi.fn()
    const id = LAUNCH_V3_LESSON_IDS.find((lessonId) => !launchV3DuoMode(lessonId))!
    const lesson = getLaunchV3Lesson(id)!
    const index = lesson.steps.length - 1
    const step = lesson.steps[index]
    const mistake = getMistakeStep(id, step.id)
    const practice = getPracticeStepFor(id, step)
    const program = withLine(id, b(...step.requiredBlockTypes))
    const draft = emptyLaunchDraft(id)
    draft.stepIndex = index
    draft.programs[step.id] = program
    draft.passed = lesson.steps.slice(0, index).map((s) => s.id)
    const utils = renderSlot(id, draft, fakeShell(), GUEST_A, reveal)
    await screen.findByTestId('mock-blockly')
    act(() => {
      const state = utils.store.getState()
      utils.store.setState({
        observed: mistake ? [...state.observed, step.id] : state.observed,
        mistakeAnswers: mistake
          ? { ...state.mistakeAnswers, [step.id]: mistake.choices.find((c) => c.correct)!.id }
          : state.mistakeAnswers,
        practiceAnswers: practice
          ? { ...state.practiceAnswers, [step.id]: practice.choices.find((c) => c.correct)!.id }
          : state.practiceAnswers,
      })
    })
    utils.rerenderWith(fakeShell({ judgment: buildLaunchJudgment(judgeLaunchStep(id, program, index, Boolean(mistake))) }))
    await screen.findByTestId('mock-blockly')
    reveal.mockClear()
    fireEvent.click(screen.getByTestId('launch-v3-complete-step'))
    expect(await screen.findByTestId('launch-v3-cloud-failed')).toBeInTheDocument()
    expect(reveal).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

describe('OPS-056 复审 HOLD P1：续学到练习关时的「刚完成的小结果」（对齐原课堂 TQ-011）', () => {
  it('resuming at a practice step shows the progress card; the first step shows none', async () => {
    const lessonId = 'lesson-04-meadow-scene'
    const target = getLaunchV3Lesson(lessonId)!
    const index = target.steps.findIndex((s) => getPracticeStepFor(lessonId, s))
    expect(index).toBeGreaterThan(0)
    const draft = emptyLaunchDraft(lessonId)
    draft.stepIndex = index
    renderSlot(lessonId, draft)
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('lesson-feedback-card')).toHaveTextContent('刚完成的小结果')
    expect(screen.getByTestId('lesson-feedback-preview').textContent?.length ?? 0).toBeGreaterThan(0)
    cleanup()
    renderSlot(lessonId, emptyLaunchDraft(lessonId))
    await screen.findByTestId('mock-blockly')
    expect(screen.queryByTestId('lesson-feedback-card')).toBeNull()
  })
})
