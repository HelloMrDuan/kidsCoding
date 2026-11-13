import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RunEvent } from '@/features/lessons/workspace/workspace-adapters'
import { emptyStoryDraft } from './g1-u1-l01-draft'
import { buildStoryJudgment, judgeStoryProgram } from './g1-u1-l01-judging'
import { StoryAdapter, StoryRunAdapter, currentStoryProgram } from './g1-u1-l01-run-adapter'

const START = { type: 'when_start' }
const SAY_OPENING = { type: 'say_line', line: 'opening' }
const MOVE = { type: 'move_right' }

function draftWith(program: unknown[], stepIndex = 2) {
  const draft = emptyStoryDraft()
  draft.stepIndex = stepIndex
  draft.programs['build-opening'] = program as never
  return draft
}

describe('StoryRunAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('plays frame by frame (450ms), finishes with score 1, and only then reports the judgment (Q8)', () => {
    const adapter = new StoryRunAdapter()
    const events: RunEvent[] = []
    const draft = draftWith([START, SAY_OPENING, MOVE])
    expect(adapter.getJudgmentResult()).toBeNull()
    adapter.runProgram(draft, (event) => events.push(event))
    // First frame is emitted synchronously; the judgment is not yet assigned.
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('frame')
    expect(events[0].state).toEqual({ x: 0, score: 0, running: true, frames: 1 })
    expect(adapter.getState().running).toBe(true)
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.getStageState()).toEqual({ foxX: 0, speaker: 'fox', bubble: '欢迎来到森林剧场', frameIndex: 0 })

    vi.advanceTimersByTime(450)
    expect(events).toHaveLength(2)
    expect(events[1].kind).toBe('frame')
    expect(events[1].state.x).toBe(100)
    expect(adapter.getStageState().foxX).toBe(100)

    vi.advanceTimersByTime(450)
    expect(events).toHaveLength(3)
    expect(events[2].kind).toBe('finished')
    expect(events[2].state).toEqual({ x: 100, score: 1, running: false, frames: 2 })
    expect(adapter.getState()).toEqual({ x: 100, score: 1, running: false, frames: 2 })
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
    expect(adapter.getJudgmentResult()?.conclusion).toContain('已完成')
    expect(adapter.getLastRunError()).toBeNull()
  })

  it('finishes immediately on an empty program without faking playback', () => {
    const adapter = new StoryRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([]), (event) => events.push(event))
    expect(events).toEqual([{ kind: 'finished', state: { x: 0, score: 0, running: false, frames: 0 } }])
    expect(adapter.getJudgmentResult()?.passed).toBe(false)
    expect(adapter.getJudgmentResult()?.layers[1].detail).toContain('程序为空')
  })

  it('stop() cancels pending frames synchronously, keeps the script and stage, never finishes', () => {
    const adapter = new StoryRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([START, SAY_OPENING, MOVE]), (event) => events.push(event))
    expect(events).toHaveLength(1)
    adapter.stop()
    expect(adapter.getState().running).toBe(false)
    expect(adapter.getState().x).toBe(0)
    vi.advanceTimersByTime(10_000)
    expect(events).toHaveLength(1)
    expect(adapter.getJudgmentResult()).toBeNull()
    // The script is untouched: a re-run of the same draft passes again.
    adapter.runProgram(draftWith([START, SAY_OPENING, MOVE]), (event) => events.push(event))
    vi.advanceTimersByTime(10_000)
    expect(events.at(-1)).toEqual({
      kind: 'finished',
      state: { x: 100, score: 1, running: false, frames: 2 },
    })
  })

  it('a new run replaces the old one; re-running scores 1 again, never accumulates', () => {
    const adapter = new StoryRunAdapter()
    const events: RunEvent[] = []
    const draft = draftWith([START, SAY_OPENING, MOVE])
    adapter.runProgram(draft, (event) => events.push(event))
    vi.advanceTimersByTime(200)
    adapter.runProgram(draft, (event) => events.push(event))
    vi.advanceTimersByTime(10_000)
    const finished = events.filter((event) => event.kind === 'finished')
    expect(finished).toHaveLength(1)
    expect(finished[0].state.score).toBe(1)
    adapter.runProgram(draft, (event) => events.push(event))
    vi.advanceTimersByTime(10_000)
    expect(events.filter((event) => event.kind === 'finished')).toHaveLength(2)
    expect(adapter.getState().score).toBe(1)
  })

  it('judges only the current step program, never another step', () => {
    const draft = draftWith([START, SAY_OPENING, MOVE], 2)
    draft.programs['run-verify'] = [START, MOVE]
    expect(currentStoryProgram(draft)).toEqual([START, SAY_OPENING, MOVE])
    const adapter = new StoryRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draft, (event) => events.push(event))
    vi.advanceTimersByTime(10_000)
    expect(events.at(-1)?.state.score).toBe(1)
    expect(adapter.getJudgmentResult()).toEqual(
      buildStoryJudgment(judgeStoryProgram([START, SAY_OPENING, MOVE])),
    )
  })

  it('getState never throws and validateDraft follows the data owner', () => {
    const adapter = new StoryRunAdapter()
    expect(() => adapter.getState()).not.toThrow()
    expect(adapter.validateDraft?.(emptyStoryDraft())).toBe(true)
    expect(adapter.validateDraft?.({ version: 2, lessonId: 'G1-U1-L01' })).toBe(false)
    expect(adapter.validateDraft?.({ version: 1, lessonId: 'G1-U1-L02' })).toBe(false)
  })

  it('StoryAdapter is a thin carrier: run finishes immediately with no judgment', () => {
    const adapter = new StoryAdapter()
    const events: RunEvent[] = []
    adapter.run((event) => events.push(event))
    expect(events).toEqual([{ kind: 'finished', state: { x: 0, score: 0, running: false, frames: 0 } }])
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.validateDraft(emptyStoryDraft())).toBe(true)
    expect(adapter.getFileCapabilities()).toEqual({
      canNew: true,
      canSave: true,
      canExport: true,
      canImport: true,
      canReset: true,
    })
  })
})
