import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { g0u2EventLessons } from '@/content/curriculum/g0-u2-event-lessons'
import type { RunEvent } from '@/features/lessons/workspace/workspace-adapters'
import type { EventEffect } from '../event/event-engine'
import { emptyEventDraft, type EventActorPrograms, type EventSlotData } from './event-v3-draft'
import {
  EVENT_FRAME_MS,
  EventAdapter,
  EventRunAdapter,
  emptyEventExecutionSnapshot,
  eventBeatSteps,
  eventStepScripts,
  visibleEffects,
} from './event-v3-run-adapter'

const L01 = g0u2EventLessons['G0-U2-L01']
const L02 = g0u2EventLessons['G0-U2-L02']

const start = { type: 'when_start' }
const clicked = { type: 'when_clicked' }
const wake = { type: 'wake_up' }
const hello = { type: 'say_hello' }

function draftAt(lesson: typeof L01, stepIndex: number, programs: EventActorPrograms): EventSlotData {
  const draft = emptyEventDraft(lesson)
  draft.stepIndex = stepIndex
  draft.programs[lesson.steps[stepIndex].id] = programs
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

describe('EventRunAdapter — real engine check, played one action per EVENT_FRAME_MS', () => {
  it('plays the real checkEventGoal effects step by step and judges only at the end', () => {
    const adapter = new EventRunAdapter(L01)
    const { events, onEvent } = collect()
    // L01 第 2 关（wake-then-hello）真实解：开始时 → 睁开眼睛 → 说早上好。
    adapter.runProgram(draftAt(L01, 1, { fox: [start, wake, hello] }), onEvent)

    let snapshot = adapter.getExecutionSnapshot()
    expect(snapshot.stepId).toBe('wake-then-hello')
    expect(snapshot.stepIndex).toBe(1)
    expect(snapshot.executionState).toBe('running')
    expect(snapshot.playing).toBe(true)
    expect(snapshot.needsPick).toBe(false)
    expect(snapshot.check?.passed).toBe(true)
    expect(snapshot.check?.run.effects.map((e) => [e.actor, e.action])).toEqual([
      ['fox', 'wake_up'],
      ['fox', 'say_hello'],
    ])
    expect(snapshot.total).toBe(2)
    expect(snapshot.shown).toBe(0)
    expect(snapshot.checkPlan).toBe('按开始旗')
    expect(visibleEffects(snapshot)).toEqual([])
    // 播放中绝不提前判定。
    expect(adapter.getJudgmentResult()).toBeNull()

    vi.advanceTimersByTime(EVENT_FRAME_MS)
    snapshot = adapter.getExecutionSnapshot()
    expect(snapshot.shown).toBe(1)
    expect(visibleEffects(snapshot).map((e) => e.action)).toEqual(['wake_up'])
    expect(framesOf(events)).toHaveLength(1)
    expect(adapter.getJudgmentResult()).toBeNull()

    vi.advanceTimersByTime(EVENT_FRAME_MS)
    snapshot = adapter.getExecutionSnapshot()
    expect(snapshot.executionState).toBe('success')
    expect(snapshot.playing).toBe(false)
    expect(snapshot.shown).toBe(2)
    expect(framesOf(events)).toHaveLength(2)
    expect(events[events.length - 1].kind).toBe('finished')

    const judgment = adapter.getJudgmentResult()
    expect(judgment?.passed).toBe(true)
    expect(judgment?.layers.map((layer) => layer.id)).toEqual(['stage', 'task', 'knowledge'])
    expect(judgment?.conclusion).toContain('通过')
    expect(judgment?.methodEvidence).toContain('共 2 个动作')
    expect(adapter.getState()).toEqual({ x: 2, score: 1, running: false, frames: 2 })
  })

  it('a wrong order is a real failure judgment naming the lesson diagnosis', () => {
    const adapter = new EventRunAdapter(L01)
    const { onEvent } = collect()
    adapter.runProgram(draftAt(L01, 1, { fox: [start, hello, wake] }), onEvent)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 5)
    const snapshot = adapter.getExecutionSnapshot()
    expect(snapshot.check?.failure).toBe('wrong_order')
    expect(snapshot.executionState).toBe('error')
    const judgment = adapter.getJudgmentResult()
    expect(judgment?.passed).toBe(false)
    expect(judgment?.conclusion).toContain(L01.diagnoses.wrong_order!)
    // 真实引擎只在脚本问题 / wrong_actor / wrong_trigger 时点名角色；顺序错误不点名。
    expect(snapshot.check?.actor).toBeUndefined()
    expect(judgment?.layers[0].detail).not.toContain('看看')
  })

  it('the error-lab starter finishes synchronously (no invented playback) and counts as seeing the error', () => {
    const adapter = new EventRunAdapter(L01)
    const { events, onEvent } = collect()
    // 第 1 关预置错误程序：事件在最下面，什么都不会动。
    adapter.runProgram(emptyEventDraft(L01), onEvent)

    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('finished')
    expect(vi.getTimerCount()).toBe(0)
    const snapshot = adapter.getExecutionSnapshot()
    expect(snapshot.check?.failure).toBe('hat_not_on_top')
    expect(snapshot.check?.actor).toBe('fox')
    expect(snapshot.observedNow).toBe(true)
    expect(snapshot.total).toBe(0)
    expect(snapshot.executionState).toBe('error')
    const judgment = adapter.getJudgmentResult()
    expect(judgment?.passed).toBe(false)
    expect(judgment?.conclusion).toContain(L01.steps[0].errorLab!.actual)
    expect(judgment?.layers[0].detail).toContain('看看小狐狸的积木')
    expect(adapter.getState()).toEqual({ x: 0, score: 0, running: false, frames: 0 })
  })

  it('an error lab fixed before the error was ever seen does not pass; once observed it does', () => {
    const adapter = new EventRunAdapter(L01)
    const fixed = draftAt(L01, 0, { fox: [start, wake, hello] })

    adapter.runProgram(fixed, collect().onEvent)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 3)
    expect(adapter.getExecutionSnapshot().check?.passed).toBe(true)
    let judgment = adapter.getJudgmentResult()
    expect(judgment?.passed).toBe(false)
    expect(judgment?.layers[0].passed).toBe(true)
    expect(judgment?.conclusion).toContain('错误实验')
    expect(adapter.getExecutionSnapshot().executionState).toBe('error')

    adapter.runProgram({ ...fixed, observed: [L01.steps[0].id] }, collect().onEvent)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 3)
    judgment = adapter.getJudgmentResult()
    expect(judgment?.passed).toBe(true)
    expect(adapter.getExecutionSnapshot().executionState).toBe('success')
  })

  it('never runs or judges a creative step before a friend is picked, and clears the old judgment', () => {
    const adapter = new EventRunAdapter(L01)
    adapter.runProgram(draftAt(L01, 1, { fox: [start] }), collect().onEvent)
    expect(adapter.getJudgmentResult()?.passed).toBe(false)

    const { events, onEvent } = collect()
    adapter.runProgram(draftAt(L01, 4, { bird: [clicked, wake, hello] }), onEvent)
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('finished')
    const snapshot = adapter.getExecutionSnapshot()
    expect(snapshot.needsPick).toBe(true)
    expect(snapshot.check).toBeNull()
    expect(snapshot.playing).toBe(false)
    expect(snapshot.executionState).toBe('idle')
    expect(snapshot.level).toBe(L01.steps[4].level)
    // 上一次的失败判定不会冒充这一次的结果。
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('uses the picked friend for the check: the card fits its own pick only', () => {
    const adapter = new EventRunAdapter(L01)
    const card = draftAt(L01, 4, { bird: [clicked, wake, hello] })

    adapter.runProgram({ ...card, creative: { 'my-wake-card': { target: 'bird' } } }, collect().onEvent)
    expect(adapter.getExecutionSnapshot().checkPlan).toContain('点小鸟')
    vi.advanceTimersByTime(EVENT_FRAME_MS * 5)
    expect(adapter.getJudgmentResult()?.passed).toBe(true)

    adapter.runProgram({ ...card, creative: { 'my-wake-card': { target: 'fox' } } }, collect().onEvent)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 5)
    expect(adapter.getJudgmentResult()?.passed).toBe(false)
  })
})

describe('EventRunAdapter — stop vs reset', () => {
  it('stop cancels playback, keeps the stage and never judges; reset clears everything', () => {
    const adapter = new EventRunAdapter(L01)
    const { events, onEvent } = collect()
    adapter.runProgram(draftAt(L01, 1, { fox: [start, wake, hello] }), onEvent)
    vi.advanceTimersByTime(EVENT_FRAME_MS)
    const seen = events.length

    adapter.stop()
    const snapshot = adapter.getExecutionSnapshot()
    expect(snapshot.executionState).toBe('idle')
    expect(snapshot.playing).toBe(false)
    expect(snapshot.shown).toBe(1)
    expect(snapshot.check).not.toBeNull()
    expect(adapter.getState().running).toBe(false)
    expect(adapter.getJudgmentResult()).toBeNull()

    vi.advanceTimersByTime(EVENT_FRAME_MS * 10)
    expect(events).toHaveLength(seen)
    expect(adapter.getJudgmentResult()).toBeNull()

    adapter.reset()
    expect(adapter.getExecutionSnapshot()).toEqual(emptyEventExecutionSnapshot())
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.getState()).toEqual({ x: 0, score: 0, running: false, frames: 0 })
  })

  it('validates drafts against this lesson only, also when called detached from the instance', () => {
    const adapter = new EventRunAdapter(L01)
    const { validateDraft } = adapter
    expect(validateDraft(emptyEventDraft(L01))).toBe(true)
    expect(validateDraft(emptyEventDraft(L02))).toBe(false)
    expect(validateDraft(null)).toBe(false)

    const shellAdapter = new EventAdapter(L01)
    const detached = shellAdapter.validateDraft
    expect(detached(emptyEventDraft(L01))).toBe(true)
    expect(detached(emptyEventDraft(L02))).toBe(false)
    expect(shellAdapter.getJudgmentResult()).toBeNull()
  })
})

describe('event-v3 run helpers', () => {
  it('a cleared editable character runs nothing; untouched ones fall back to the starter', () => {
    const step = L01.steps[3] // woke-too-early：小兔子名下预置了不该有的“开始时”
    const fixedScripts = eventStepScripts(step, { programs: { [step.id]: { fox: [clicked, wake, hello], rabbit: [] } } })
    expect(Object.keys(fixedScripts)).toEqual(['fox'])
    const untouched = eventStepScripts(step, { programs: {} })
    expect(untouched.rabbit).toEqual(step.starter!.rabbit)
  })

  it('a parallel stage groups the same interaction and beat into one playback step', () => {
    const effect = (interaction: number, beat: number): EventEffect =>
      ({ actor: 'fox', action: 'say_hello', interaction, blockIndex: 1, beat }) as EventEffect
    expect(eventBeatSteps([effect(0, 0), effect(0, 0), effect(0, 1), effect(1, 0)])).toEqual([0, 0, 1, 2])
  })
})
