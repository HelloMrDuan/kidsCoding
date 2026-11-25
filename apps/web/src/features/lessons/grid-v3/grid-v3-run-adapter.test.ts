import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { g0u1GridLessons } from '@/content/curriculum/g0-u1-grid-lessons'
import type { RunEvent } from '@/features/lessons/workspace/workspace-adapters'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { emptyGridDraft, type GridSlotData } from './grid-v3-draft'
import {
  emptyGridExecutionSnapshot,
  GRID_FRAME_MS,
  GridAdapter,
  GridRunAdapter,
} from './grid-v3-run-adapter'

const L01 = g0u1GridLessons['G0-U1-L01']
const L05 = g0u1GridLessons['G0-U1-L05']

const S = { type: 'when_start' }
const r = { type: 'move_right_cell' }
const u = { type: 'move_up' }
const d = { type: 'move_down' }
const k = { type: 'pick_key' }
const o = { type: 'open_door' }

function draftAt(lesson: typeof L01, stepIndex: number, program: ProgramBlock[]): GridSlotData {
  const draft = emptyGridDraft(lesson)
  draft.stepIndex = stepIndex
  draft.programs[lesson.steps[stepIndex].id] = program
  return draft
}

function collect() {
  const events: RunEvent[] = []
  return { events, onEvent: (event: RunEvent) => events.push(event) }
}

function framesOf(events: RunEvent[]) {
  return events.filter((event) => event.kind === 'frame')
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GridRunAdapter — real frame-by-frame run', () => {
  it('plays the real engine frames once per GRID_FRAME_MS and judges only at the end', () => {
    const adapter = new GridRunAdapter(L05)
    const { events, onEvent } = collect()
    // L05 第 2 关的真实解：向右1 → 向上1 → 捡钥匙 → 向下1 → 向右2 → 开门 → 向右2。
    adapter.runProgram(
      draftAt(L05, 1, [S, r, u, k, d, r, r, o, r, r]),
      onEvent,
    )

    let snapshot = adapter.getExecutionSnapshot()
    expect(snapshot.stepId).toBe('key-off-path')
    expect(snapshot.executionState).toBe('running')
    expect(snapshot.playing).toBe(true)
    expect(snapshot.needsGoal).toBe(false)
    expect(snapshot.frameIndex).toBe(-1)
    expect(snapshot.run?.passed).toBe(true)
    expect(snapshot.run?.frames).toHaveLength(9)
    expect(adapter.getJudgmentResult()).toBeNull()

    vi.advanceTimersByTime(GRID_FRAME_MS * 4)
    snapshot = adapter.getExecutionSnapshot()
    expect(snapshot.frameIndex).toBe(3)
    expect(framesOf(events)).toHaveLength(4)
    expect(framesOf(events).map((event) => event.state.running)).toEqual([true, true, true, true])
    // 播放中绝不提前判定。
    expect(adapter.getJudgmentResult()).toBeNull()

    vi.advanceTimersByTime(GRID_FRAME_MS * 5)
    snapshot = adapter.getExecutionSnapshot()
    expect(snapshot.executionState).toBe('success')
    expect(snapshot.playing).toBe(false)
    expect(snapshot.frameIndex).toBe(8)
    expect(framesOf(events)).toHaveLength(9)
    expect(events[events.length - 1].kind).toBe('finished')

    const judgment = adapter.getJudgmentResult()
    expect(judgment?.passed).toBe(true)
    expect(judgment?.layers.map((layer) => layer.id)).toEqual(['stage', 'task', 'knowledge'])
    expect(judgment?.conclusion).toContain('通过')
    expect(judgment?.methodEvidence).toContain('9 个动作')
    // 最终引擎状态来自真实 run.final（目标格 x=5）。
    expect(adapter.getState()).toEqual({ x: 5, score: 1, running: false, frames: 9 })
  })

  it('finishes a zero-frame run synchronously (no invented playback) with a real failure judgment', () => {
    const adapter = new GridRunAdapter(L01)
    const { events, onEvent } = collect()
    // L01 第 1 关的预置错误程序：只有一块箭头，没有“开始时”。
    adapter.runProgram(draftAt(L01, 0, [r]), onEvent)

    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('finished')
    expect(vi.getTimerCount()).toBe(0)
    const snapshot = adapter.getExecutionSnapshot()
    expect(snapshot.executionState).toBe('error')
    expect(snapshot.playing).toBe(false)
    expect(snapshot.frameIndex).toBe(0)
    expect(snapshot.run?.failure).toBe('no_start')
    expect(snapshot.run?.frames).toEqual([])
    expect(adapter.getJudgmentResult()?.passed).toBe(false)
    expect(adapter.getJudgmentResult()?.conclusion).toContain('未通过')
    expect(adapter.getState()).toEqual({ x: 0, score: 0, running: false, frames: 0 })
  })

  it('never runs or judges a creative step before the child picks a goal, and clears the old judgment', () => {
    const adapter = new GridRunAdapter(L05)
    const first = collect()
    // 先制造一次真实失败判定。
    adapter.runProgram(draftAt(L05, 1, [S]), first.onEvent)
    expect(adapter.getJudgmentResult()?.passed).toBe(false)

    const { events, onEvent } = collect()
    adapter.runProgram(draftAt(L05, 4, []), onEvent)
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('finished')
    const snapshot = adapter.getExecutionSnapshot()
    expect(snapshot.needsGoal).toBe(true)
    expect(snapshot.playing).toBe(false)
    expect(snapshot.executionState).toBe('idle')
    expect(snapshot.run).toBeNull()
    expect(snapshot.level).toBe(L05.steps[4].level)
    // 上一次的失败判定不会冒充这一次的结果。
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('uses the child’s chosen goal cell for both the run and the judgment', () => {
    const adapter = new GridRunAdapter(L05)
    const { onEvent } = collect()
    const draft = draftAt(L05, 4, [S, r, u, k, d, r, o, r, r, r, d])
    draft.creative = { 'my-key-card': { goal: { x: 5, y: 2 } } }
    adapter.runProgram(draft, onEvent)

    expect(adapter.getExecutionSnapshot().level?.goal).toEqual({ x: 5, y: 2 })
    vi.advanceTimersByTime(GRID_FRAME_MS * 12)
    expect(adapter.getExecutionSnapshot().executionState).toBe('success')
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
    expect(adapter.getState().x).toBe(5)
  })
})

describe('GridRunAdapter — stop vs reset', () => {
  it('stop cancels playback but keeps the run on stage and never judges it', () => {
    const adapter = new GridRunAdapter(L05)
    const { events, onEvent } = collect()
    adapter.runProgram(draftAt(L05, 1, [S, r, u, k, d, r, r, o, r, r]), onEvent)
    vi.advanceTimersByTime(GRID_FRAME_MS * 2)
    const seen = events.length

    adapter.stop()
    const snapshot = adapter.getExecutionSnapshot()
    expect(snapshot.executionState).toBe('idle')
    expect(snapshot.playing).toBe(false)
    expect(snapshot.frameIndex).toBe(1)
    expect(snapshot.run).not.toBeNull()
    expect(adapter.getState().running).toBe(false)
    expect(adapter.getJudgmentResult()).toBeNull()

    vi.advanceTimersByTime(GRID_FRAME_MS * 20)
    expect(events).toHaveLength(seen)
    expect(adapter.getJudgmentResult()).toBeNull()

    adapter.reset()
    expect(adapter.getExecutionSnapshot()).toEqual(emptyGridExecutionSnapshot())
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.getState()).toEqual({ x: 0, score: 0, running: false, frames: 0 })
  })

  it('validates drafts against this lesson only (fail closed)', () => {
    const adapter = new GridRunAdapter(L05)
    expect(adapter.validateDraft(emptyGridDraft(L05))).toBe(true)
    expect(adapter.validateDraft(emptyGridDraft(L01))).toBe(false)
    expect(adapter.validateDraft(null)).toBe(false)
  })

  it('keeps validating when the shell calls validateDraft detached from the instance', () => {
    // lesson-workspace.tsx restores drafts (and imports files) via
    // `const validator = runAdapter?.validateDraft ?? adapter.validateDraft`
    // and then `validator(data)` — no receiver. A prototype method loses
    // `this` there, throws, and the shell fail-closes every saved draft.
    const adapter = new GridRunAdapter(L05)
    const { validateDraft } = adapter
    expect(validateDraft(emptyGridDraft(L05))).toBe(true)
    expect(validateDraft(emptyGridDraft(L01))).toBe(false)

    const shellAdapter = new GridAdapter(L05)
    const detached = shellAdapter.validateDraft
    expect(detached(emptyGridDraft(L05))).toBe(true)
    expect(detached(emptyGridDraft(L01))).toBe(false)
  })
})
