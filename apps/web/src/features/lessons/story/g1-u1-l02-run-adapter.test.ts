import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RunEvent } from '@/features/lessons/workspace/workspace-adapters'
import { emptyStoryDraft } from './g1-u1-l02-draft'
import { buildTurnTakingJudgment, judgeTurnTakingProgram } from './g1-u1-l02-judging'
import { TurnTakingAdapter, TurnTakingRunAdapter, currentTurnTakingProgram } from './g1-u1-l02-run-adapter'

const START = { type: 'when_start' }
const SAY_HELLO = { type: 'say_line', line: 'hello' }
const SWITCH = { type: 'switch_character' }
const SAY_GLAD = { type: 'say_line', line: 'glad' }
const CORRECT = [START, SAY_HELLO, SWITCH, SAY_GLAD]

function draftWith(program: unknown[], stepIndex = 2) {
  const draft = emptyStoryDraft()
  draft.stepIndex = stepIndex
  draft.programs['build-turn-taking'] = program as never
  return draft
}

describe('TurnTakingRunAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('plays frame by frame (450ms), finishes with score 1, and only then reports the judgment (Q8)', () => {
    const adapter = new TurnTakingRunAdapter()
    const events: RunEvent[] = []
    const draft = draftWith(CORRECT)
    expect(adapter.getJudgmentResult()).toBeNull()
    adapter.runProgram(draft, (event) => events.push(event))
    // First frame is emitted synchronously; the judgment is not yet assigned.
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('frame')
    expect(events[0].state).toEqual({ x: 0, score: 0, running: true, frames: 1 })
    expect(adapter.getState().running).toBe(true)
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.getStageState()).toEqual({ foxX: 0, rabbitX: 0, speaker: 'fox', bubble: '你好', frameIndex: 0 })

    // Second frame is the switch: speaker and bubble stay on the fox line.
    vi.advanceTimersByTime(450)
    expect(events).toHaveLength(2)
    expect(events[1].kind).toBe('frame')
    expect(events[1].state).toEqual({ x: 0, score: 0, running: true, frames: 2 })
    expect(adapter.getStageState()).toEqual({ foxX: 0, rabbitX: 0, speaker: 'fox', bubble: '你好', frameIndex: 1 })

    // Third frame is the rabbit reply.
    vi.advanceTimersByTime(450)
    expect(events).toHaveLength(3)
    expect(events[2].kind).toBe('frame')
    expect(adapter.getStageState()).toEqual({ foxX: 0, rabbitX: 0, speaker: 'rabbit', bubble: '很高兴见到你', frameIndex: 2 })

    vi.advanceTimersByTime(450)
    expect(events).toHaveLength(4)
    expect(events[3].kind).toBe('finished')
    expect(events[3].state).toEqual({ x: 0, score: 1, running: false, frames: 3 })
    expect(adapter.getState()).toEqual({ x: 0, score: 1, running: false, frames: 3 })
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
    expect(adapter.getJudgmentResult()?.conclusion).toContain('已完成')
    expect(adapter.getLastRunError()).toBeNull()
  })

  it('finishes immediately on an empty program without faking playback', () => {
    const adapter = new TurnTakingRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith([]), (event) => events.push(event))
    expect(events).toEqual([{ kind: 'finished', state: { x: 0, score: 0, running: false, frames: 0 } }])
    expect(adapter.getJudgmentResult()?.passed).toBe(false)
    expect(adapter.getJudgmentResult()?.layers[1].detail).toContain('程序为空')
  })

  it('stop() cancels pending frames synchronously, keeps the script and stage, never finishes', () => {
    const adapter = new TurnTakingRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draftWith(CORRECT), (event) => events.push(event))
    expect(events).toHaveLength(1)
    adapter.stop()
    expect(adapter.getState().running).toBe(false)
    expect(adapter.getState().x).toBe(0)
    vi.advanceTimersByTime(10_000)
    expect(events).toHaveLength(1)
    expect(adapter.getJudgmentResult()).toBeNull()
    // The script is untouched: a re-run of the same draft passes again.
    adapter.runProgram(draftWith(CORRECT), (event) => events.push(event))
    vi.advanceTimersByTime(10_000)
    expect(events.at(-1)).toEqual({
      kind: 'finished',
      state: { x: 0, score: 1, running: false, frames: 3 },
    })
  })

  it('a new run replaces the old one; re-running scores 1 again, never accumulates', () => {
    const adapter = new TurnTakingRunAdapter()
    const events: RunEvent[] = []
    const draft = draftWith(CORRECT)
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
    const draft = draftWith(CORRECT, 2)
    draft.programs['run-verify'] = [START, SWITCH]
    expect(currentTurnTakingProgram(draft)).toEqual(CORRECT)
    const adapter = new TurnTakingRunAdapter()
    const events: RunEvent[] = []
    adapter.runProgram(draft, (event) => events.push(event))
    vi.advanceTimersByTime(10_000)
    expect(events.at(-1)?.state.score).toBe(1)
    expect(adapter.getJudgmentResult()).toEqual(
      buildTurnTakingJudgment(judgeTurnTakingProgram(CORRECT)),
    )
  })

  it('getState never throws and validateDraft follows the data owner', () => {
    const adapter = new TurnTakingRunAdapter()
    expect(() => adapter.getState()).not.toThrow()
    expect(adapter.validateDraft?.(emptyStoryDraft())).toBe(true)
    expect(adapter.validateDraft?.({ version: 2, lessonId: 'G1-U1-L02' })).toBe(false)
    expect(adapter.validateDraft?.({ version: 1, lessonId: 'G1-U1-L01' })).toBe(false)
  })

  it('TurnTakingAdapter is a thin carrier: run finishes immediately with no judgment', () => {
    const adapter = new TurnTakingAdapter()
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
