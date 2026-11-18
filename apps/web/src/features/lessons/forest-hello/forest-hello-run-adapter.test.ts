import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RunEvent } from '@/features/lessons/workspace/workspace-adapters'
import { emptyForestDraft } from './forest-hello-draft'
import { ForestAdapter, ForestRunAdapter, currentForestProgram, FOREST_FRAME_MS } from './forest-hello-run-adapter'

const START = { type: 'when_start' }
const MOVE = { type: 'move_right' }

function draftWith(program: unknown[], stepIndex = 1) {
  const draft = emptyForestDraft()
  draft.stepIndex = stepIndex
  draft.programs[['step-1', 'step-2', 'step-3', 'step-4'][stepIndex]] = program as never
  return draft
}

describe('ForestRunAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('plays one move frame per 330ms, finishes with score 1, and only then reports the judgment', () => {
    const adapter = new ForestRunAdapter()
    const events: RunEvent[] = []
    expect(adapter.getJudgmentResult()).toBeNull()
    adapter.runProgram(draftWith([START, MOVE], 1), (event) => events.push(event))
    // No frame yet: the first block lands after one beat, like the old executor.
    expect(events).toHaveLength(0)
    expect(adapter.getState().running).toBe(true)
    expect(adapter.getJudgmentResult()).toBeNull()

    vi.advanceTimersByTime(FOREST_FRAME_MS)
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ kind: 'frame', state: { x: 100, score: 0, running: true, frames: 1 } })
    expect(events[1]).toEqual({ kind: 'finished', state: { x: 100, score: 1, running: false, frames: 1 } })
    expect(adapter.getState()).toEqual({ x: 100, score: 1, running: false, frames: 1 })
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
    expect(adapter.getJudgmentResult()?.conclusion).toContain('已完成')
    expect(adapter.getExecutionSnapshot()).toMatchObject({
      executionState: 'success',
      foxPosition: 100,
      actionLog: ['向右走 100 步'],
    })
    expect(adapter.getStageState().foxX).toBe(100)
    expect(adapter.getLastRunError()).toBeNull()
  })

  it('step-3 plays two frames, 100 then 200 steps', () => {
    const adapter = new ForestRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([START, MOVE, MOVE], 2), (event) => events.push(event))
    vi.advanceTimersByTime(FOREST_FRAME_MS)
    expect(events).toHaveLength(1)
    expect(events[0].state.x).toBe(100)
    vi.advanceTimersByTime(FOREST_FRAME_MS)
    expect(events).toHaveLength(3)
    expect(events[1].state.x).toBe(200)
    expect(events[2].kind).toBe('finished')
    expect(events[2].state).toEqual({ x: 200, score: 1, running: false, frames: 2 })
    expect(adapter.getExecutionSnapshot().actionLog).toEqual(['向右走 100 步', '向右走 100 步'])
  })

  it('step-1 (only when_start) finishes immediately with success and the fox at 0', () => {
    const adapter = new ForestRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([START], 0), (event) => events.push(event))
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ kind: 'finished', state: { x: 0, score: 1, running: false, frames: 0 } })
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
    expect(adapter.getExecutionSnapshot()).toMatchObject({ executionState: 'success', foxPosition: 0 })
  })

  it('step-4 wrong program is the designed experiment (not a failure) until observed', () => {
    const adapter = new ForestRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([MOVE], 3), (event) => events.push(event))
    expect(events).toHaveLength(1)
    expect(events[0].state).toEqual({ x: 0, score: 0, running: false, frames: 0 })
    expect(adapter.getJudgmentResult()?.conclusion).toContain('错误实验已观察')
    expect(adapter.getExecutionSnapshot()).toMatchObject({
      executionState: 'error',
      designedMistake: true,
    })
  })

  it('step-4 wrong program after observation is a real failure', () => {
    const adapter = new ForestRunAdapter({ isStepObserved: () => true })
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([MOVE], 3), (event) => events.push(event))
    expect(adapter.getJudgmentResult()?.conclusion).toContain('未合格')
    expect(adapter.getExecutionSnapshot().designedMistake).toBe(false)
  })

  it('stop mid-run cancels playback, keeps the stage, and reports no judgment', () => {
    const adapter = new ForestRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([START, MOVE, MOVE], 2), (event) => events.push(event))
    vi.advanceTimersByTime(FOREST_FRAME_MS)
    expect(events).toHaveLength(1)
    adapter.stop()
    expect(adapter.getState().running).toBe(false)
    expect(adapter.getExecutionSnapshot().foxPosition).toBe(100)
    vi.advanceTimersByTime(10_000)
    expect(events).toHaveLength(1)
    expect(adapter.getJudgmentResult()).toBeNull()
    // Re-run after stop gives the same conclusion.
    adapter.runProgram(draftWith([START, MOVE, MOVE], 2), (event) => events.push(event))
    vi.advanceTimersByTime(FOREST_FRAME_MS * 2)
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
  })

  it('reset() after a successful run returns the snapshot to idle and clears the judgment (OPS-045)', () => {
    const adapter = new ForestRunAdapter()
    adapter.runProgram(draftWith([START, MOVE], 1), () => {})
    vi.advanceTimersByTime(FOREST_FRAME_MS)
    expect(adapter.getExecutionSnapshot().executionState).toBe('success')
    expect(adapter.getJudgmentResult()?.passed).toBe(true)

    adapter.reset()
    expect(adapter.getExecutionSnapshot()).toEqual({
      executionState: 'idle',
      foxPosition: 0,
      message: null,
      actionLog: [],
      frameIndex: 0,
      designedMistake: false,
    })
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.getState()).toEqual({ x: 0, score: 0, running: false, frames: 0 })
    // A fresh run after reset behaves exactly like a first run.
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([START, MOVE], 1), (event) => events.push(event))
    vi.advanceTimersByTime(FOREST_FRAME_MS)
    expect(events[events.length - 1].kind).toBe('finished')
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
  })

  it('reset() mid-run cancels playback and leaves no late frames (OPS-045)', () => {
    const adapter = new ForestRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([START, MOVE, MOVE], 2), (event) => events.push(event))
    vi.advanceTimersByTime(FOREST_FRAME_MS)
    expect(events).toHaveLength(1)
    adapter.reset()
    expect(adapter.getState().running).toBe(false)
    expect(adapter.getExecutionSnapshot().executionState).toBe('idle')
    vi.advanceTimersByTime(10_000)
    expect(events).toHaveLength(1)
    expect(adapter.getJudgmentResult()).toBeNull()
  })

  it('reset() clears the step-4 designed-mistake error snapshot (OPS-045)', () => {
    const adapter = new ForestRunAdapter()
    adapter.runProgram(draftWith([MOVE], 3), () => {})
    expect(adapter.getExecutionSnapshot()).toMatchObject({
      executionState: 'error',
      designedMistake: true,
    })
    adapter.reset()
    expect(adapter.getExecutionSnapshot()).toMatchObject({
      executionState: 'idle',
      designedMistake: false,
    })
  })

  it('a new run replaces a live run (old timers never fire late)', () => {
    const adapter = new ForestRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([START, MOVE, MOVE], 2), (event) => events.push(event))
    vi.advanceTimersByTime(FOREST_FRAME_MS)
    adapter.runProgram(draftWith([START], 0), (event) => events.push(event))
    vi.advanceTimersByTime(10_000)
    // First run contributed one frame; the second run finished immediately.
    expect(events.map((event) => event.kind)).toEqual(['frame', 'finished'])
    expect(adapter.getState()).toEqual({ x: 0, score: 1, running: false, frames: 0 })
  })

  it('validateDraft follows the draft owner (invalid data rejected)', () => {
    const adapter = new ForestRunAdapter()
    expect(adapter.validateDraft(emptyForestDraft())).toBe(true)
    expect(adapter.validateDraft({ ...emptyForestDraft(), stepIndex: 9 })).toBe(false)
    expect(adapter.validateDraft(null)).toBe(false)
  })

  it('currentForestProgram only takes the current step program', () => {
    const draft = emptyForestDraft()
    draft.stepIndex = 2
    draft.programs['step-3'] = [START, MOVE, MOVE]
    draft.programs['step-2'] = [START, MOVE]
    expect(currentForestProgram(draft)).toEqual([START, MOVE, MOVE])
  })
})

describe('ForestAdapter', () => {
  it('round-trips the draft, never judges, and offers all file operations', () => {
    const adapter = new ForestAdapter()
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.getFileCapabilities()).toEqual({
      canNew: true,
      canSave: true,
      canExport: true,
      canImport: true,
      canReset: true,
    })
    const draft = draftWith([START, MOVE], 1)
    adapter.loadScript(draft)
    expect(adapter.getScript()).toEqual(draft)
    const events: RunEvent[] = []
    adapter.run((event) => events.push(event))
    expect(events).toEqual([{ kind: 'finished', state: { x: 0, score: 0, running: false, frames: 0 } }])
    expect(adapter.validateDraft(draft)).toBe(true)
    expect(adapter.validateDraft({ version: 9 })).toBe(false)
  })

  it('V3: without a workspace bridge the rail capabilities stay honestly absent', () => {
    const adapter = new ForestAdapter()
    expect(adapter.getBlockCategories()).toEqual([])
    expect(adapter.getBlockInventory()).toEqual([])
    expect(adapter.selectCategory('开始')).toBeNull()
    expect(adapter.insertBlock('when_start')).toBe(false)
  })

  it('V3: with a bridge, categories and inventory derive from the step’s allowed blocks', () => {
    const adapter = new ForestAdapter(undefined, {
      getAllowedBlocks: () => ['when_start', 'move_right'],
    })
    expect(adapter.getBlockCategories()).toEqual([
      { id: '开始', label: '开始', color: '#ffbf00' },
      { id: '移动', label: '移动', color: '#4c97ff' },
    ])
    const inventory = adapter.getBlockInventory()
    expect(inventory.map((item) => item.type)).toEqual(['when_start', 'move_right'])
    expect(inventory.find((item) => item.type === 'move_right')?.categoryId).toBe('移动')
    // 页面上还没有真实工作区时，选择/插入如实失败，绝不冒充成功。
    expect(adapter.selectCategory('移动')).toBeNull()
    expect(adapter.insertBlock('move_right')).toBe(false)
    expect(adapter.insertBlock('say_line')).toBe(false)
  })
})
