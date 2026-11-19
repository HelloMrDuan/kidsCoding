import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RunEvent } from '@/features/lessons/workspace/workspace-adapters'
import { emptyGreetingDraft } from './forest-greeting-draft'
import {
  GreetingAdapter,
  GreetingRunAdapter,
  currentGreetingProgram,
  emptyGreetingExecutionSnapshot,
  GREETING_FRAME_MS,
} from './forest-greeting-run-adapter'

const START = { type: 'when_start' }
const MOVE = { type: 'move_right' }
const SAY_HI_ALL = { type: 'say_line', line: 'hi-all' }
const SAY_LETS_PLAY = { type: 'say_line', line: 'lets-play' }

function draftWith(program: unknown[], stepIndex = 1) {
  const draft = emptyGreetingDraft()
  draft.stepIndex = stepIndex
  draft.programs[['step-1', 'step-2', 'step-3', 'step-4'][stepIndex]] = program as never
  return draft
}

describe('GreetingRunAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('step-2 plays move then say, one frame per 330ms, and only then reports the judgment', () => {
    const adapter = new GreetingRunAdapter()
    const events: RunEvent[] = []
    expect(adapter.getJudgmentResult()).toBeNull()
    adapter.runProgram(draftWith([START, MOVE, SAY_HI_ALL], 1), (event) => events.push(event))
    expect(events).toHaveLength(0)
    expect(adapter.getState().running).toBe(true)
    expect(adapter.getJudgmentResult()).toBeNull()

    // 第一帧：先移动，此时还没有说话。
    vi.advanceTimersByTime(GREETING_FRAME_MS)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ kind: 'frame', state: { x: 100, score: 0, running: true, frames: 1 } })
    expect(adapter.getExecutionSnapshot()).toMatchObject({ foxPosition: 100, message: null })
    expect(adapter.getJudgmentResult()).toBeNull()

    // 第二帧：在 100 步处说出所选对白，随后 finished。
    vi.advanceTimersByTime(GREETING_FRAME_MS)
    expect(events).toHaveLength(3)
    expect(events[1]).toEqual({ kind: 'frame', state: { x: 100, score: 0, running: true, frames: 2 } })
    expect(events[2]).toEqual({ kind: 'finished', state: { x: 100, score: 1, running: false, frames: 2 } })
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
    expect(adapter.getJudgmentResult()?.conclusion).toContain('已完成')
    expect(adapter.getExecutionSnapshot()).toMatchObject({
      executionState: 'success',
      foxPosition: 100,
      message: '大家好呀！',
      actionLog: ['向右走 100 步', '说：“大家好呀！”'],
    })
    expect(adapter.getStageState().foxX).toBe(100)
    expect(adapter.getLastRunError()).toBeNull()
  })

  it('step-3 speaks in place: one say frame at position 0', () => {
    const adapter = new GreetingRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([START, SAY_LETS_PLAY], 2), (event) => events.push(event))
    vi.advanceTimersByTime(GREETING_FRAME_MS)
    expect(events.map((event) => event.kind)).toEqual(['frame', 'finished'])
    expect(events[1].state).toEqual({ x: 0, score: 1, running: false, frames: 1 })
    expect(adapter.getExecutionSnapshot()).toMatchObject({
      executionState: 'success',
      foxPosition: 0,
      message: '一起来玩吧！',
      actionLog: ['说：“一起来玩吧！”'],
    })
  })

  it('step-1 (start + move) passes with one move frame and no message', () => {
    const adapter = new GreetingRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([START, MOVE], 0), (event) => events.push(event))
    vi.advanceTimersByTime(GREETING_FRAME_MS)
    expect(events.map((event) => event.kind)).toEqual(['frame', 'finished'])
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
    expect(adapter.getExecutionSnapshot()).toMatchObject({
      executionState: 'success',
      foxPosition: 100,
      message: null,
    })
  })

  it('an empty program finishes immediately with an error and no fake playback', () => {
    const adapter = new GreetingRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([], 0), (event) => events.push(event))
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ kind: 'finished', state: { x: 0, score: 0, running: false, frames: 0 } })
    expect(adapter.getJudgmentResult()?.passed).toBe(false)
    expect(adapter.getExecutionSnapshot()).toMatchObject({ executionState: 'error', foxPosition: 0 })
  })

  it('step-4 wrong program plays say-then-move and is the designed experiment until observed', () => {
    const adapter = new GreetingRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([START, { type: 'say_line' }, MOVE], 3), (event) => events.push(event))
    vi.advanceTimersByTime(GREETING_FRAME_MS)
    // 先说话（0 步处），气泡先出现。
    expect(adapter.getExecutionSnapshot()).toMatchObject({ foxPosition: 0, message: '你好！' })
    vi.advanceTimersByTime(GREETING_FRAME_MS)
    expect(events.map((event) => event.kind)).toEqual(['frame', 'frame', 'finished'])
    expect(adapter.getJudgmentResult()?.conclusion).toContain('错误实验已观察')
    expect(adapter.getExecutionSnapshot()).toMatchObject({
      executionState: 'error',
      foxPosition: 100,
      designedMistake: true,
      actionLog: ['说：“你好！”', '向右走 100 步'],
    })
  })

  it('step-4 wrong program after observation is a real failure', () => {
    const adapter = new GreetingRunAdapter({ isStepObserved: () => true })
    adapter.runProgram(draftWith([START, { type: 'say_line' }, MOVE], 3), () => {})
    vi.advanceTimersByTime(GREETING_FRAME_MS * 2)
    expect(adapter.getJudgmentResult()?.conclusion).toContain('未合格')
    expect(adapter.getExecutionSnapshot().designedMistake).toBe(false)
  })

  it('reset clears the previous step’s success, message and judgment (no cross-step leak)', () => {
    const adapter = new GreetingRunAdapter()
    adapter.runProgram(draftWith([START, MOVE, SAY_HI_ALL], 1), () => {})
    vi.advanceTimersByTime(GREETING_FRAME_MS * 2)
    expect(adapter.getExecutionSnapshot().executionState).toBe('success')
    expect(adapter.getJudgmentResult()).not.toBeNull()

    adapter.reset()
    expect(adapter.getExecutionSnapshot()).toEqual(emptyGreetingExecutionSnapshot())
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.getState()).toEqual({ x: 0, score: 0, running: false, frames: 0 })

    // 复位后下一关从干净状态重新运行，结论只属于下一关。
    adapter.runProgram(draftWith([START, SAY_LETS_PLAY], 2), () => {})
    vi.advanceTimersByTime(GREETING_FRAME_MS)
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
    expect(adapter.getExecutionSnapshot().message).toBe('一起来玩吧！')
  })

  it('stop mid-run cancels playback, keeps the stage, and reports no judgment', () => {
    const adapter = new GreetingRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([START, MOVE, SAY_HI_ALL], 1), (event) => events.push(event))
    vi.advanceTimersByTime(GREETING_FRAME_MS)
    expect(events).toHaveLength(1)
    adapter.stop()
    expect(adapter.getState().running).toBe(false)
    expect(adapter.getExecutionSnapshot().foxPosition).toBe(100)
    vi.advanceTimersByTime(10_000)
    expect(events).toHaveLength(1)
    expect(adapter.getJudgmentResult()).toBeNull()
    // Re-run after stop gives the same conclusion.
    adapter.runProgram(draftWith([START, MOVE, SAY_HI_ALL], 1), (event) => events.push(event))
    vi.advanceTimersByTime(GREETING_FRAME_MS * 2)
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
  })

  it('a new run replaces a live run (old timers never fire late)', () => {
    const adapter = new GreetingRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([START, MOVE, SAY_HI_ALL], 1), (event) => events.push(event))
    vi.advanceTimersByTime(GREETING_FRAME_MS)
    adapter.runProgram(draftWith([], 0), (event) => events.push(event))
    vi.advanceTimersByTime(10_000)
    // First run contributed one frame; the second run finished immediately.
    expect(events.map((event) => event.kind)).toEqual(['frame', 'finished'])
    expect(adapter.getState()).toEqual({ x: 0, score: 0, running: false, frames: 0 })
  })

  it('validateDraft follows the draft owner (invalid data rejected)', () => {
    const adapter = new GreetingRunAdapter()
    expect(adapter.validateDraft(emptyGreetingDraft())).toBe(true)
    expect(adapter.validateDraft({ ...emptyGreetingDraft(), stepIndex: 9 })).toBe(false)
    expect(adapter.validateDraft(null)).toBe(false)
  })

  it('currentGreetingProgram only takes the current step program', () => {
    const draft = emptyGreetingDraft()
    draft.stepIndex = 2
    draft.programs['step-3'] = [START, SAY_LETS_PLAY]
    draft.programs['step-2'] = [START, MOVE]
    expect(currentGreetingProgram(draft)).toEqual([START, SAY_LETS_PLAY])
  })
})

describe('GreetingAdapter', () => {
  it('round-trips the draft, never judges, and offers all file operations', () => {
    const adapter = new GreetingAdapter()
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
})
