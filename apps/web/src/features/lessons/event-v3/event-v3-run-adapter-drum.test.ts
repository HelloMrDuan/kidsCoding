import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { g0u2EventLessons, type EventLesson } from '@/content/curriculum/g0-u2-event-lessons'
import type { RunEvent } from '@/features/lessons/workspace/workspace-adapters'
import type { EventAction, EventActorId, EventLevel } from '../event/event-engine'
import { EventDrumKit, type DrumAudioContext } from './event-v3-audio'
import { emptyEventDraft, type EventActorPrograms, type EventSlotData } from './event-v3-draft'
import { EVENT_FRAME_MS, EventRunAdapter, eventStepScripts, visibleFreeEffects } from './event-v3-run-adapter'

/**
 * OPS-055（G0-U3-L06）：EventRunAdapter 的鼓声接线。
 * 这里注入假的 AudioContext，只验证“哪一拍敲、敲几下、何时释放”；浏览器里是否真的出声，
 * 由真实 Chrome E2E 读取舞台 data 属性另行证明，不以本 mock 冒充。
 */
function fakeContext() {
  const ctx = {
    currentTime: 0,
    state: 'running',
    destination: {},
    resume: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    createOscillator() {
      return {
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null as (() => void) | null,
      }
    },
    createGain() {
      return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }
    },
  }
  return { ctx: ctx as unknown as DrumAudioContext, raw: ctx }
}

const can: EventAction[] = ['enter_stage', 'drum_beat', 'jump']
const BAND: EventLevel = {
  actors: [
    { id: 'fox', name: '小狐狸', can: [...can], x: 30, y: 62, offstage: true },
    { id: 'rabbit', name: '小兔子', can: [...can], x: 70, y: 62, offstage: true },
  ],
  parallel: true,
}
const UNIT = ['drum_beat', 'drum_beat', 'jump']
const ROUNDS = 2

/** 单关测试课：两人第 0 拍入场，然后 重复 2 次（咚、咚、跳）。 */
const DRUM_LESSON: EventLesson = {
  id: 'TEST-DRUM',
  title: '测试：鼓声',
  story: '',
  concept: '',
  objectives: [],
  diagnoses: {},
  steps: [
    {
      id: 'drum-two-rounds',
      kind: 'guided',
      title: '两轮节奏',
      instruction: '',
      predict: '',
      level: BAND,
      editable: ['fox', 'rabbit'],
      allowedBlocks: ['when_start', 'enter_stage', 'drum_beat', 'jump', 'repeat_times'],
      goal: {
        expectations: [{
          interaction: { kind: 'start' },
          effects: (['fox', 'rabbit'] as EventActorId[]).flatMap((id) => [
            [id, 'enter_stage'] as [EventActorId, EventAction],
            ...Array.from({ length: ROUNDS }, () => UNIT.map((a) => [id, a] as [EventActorId, EventAction])).flat(),
          ]),
        }],
      },
      hints: ['', '', ''],
      solutions: [],
      counterExamples: [],
    },
  ],
  reflection: '',
  reflectionCheck: { question: '', options: [], why: '' },
  parentQuestion: '',
  review: { whatIf: '', answer: '' },
  project: { stepId: 'drum-two-rounds', title: '', passedText: '' },
}

const act = (n: number, body: string[]) => [
  { type: 'when_start' },
  { type: 'enter_stage' },
  { type: 'repeat_times', times: n, body: body.map((type) => ({ type })) },
]

function draft(programs: unknown): EventSlotData {
  const d = emptyEventDraft(DRUM_LESSON)
  d.stepIndex = 0
  d.programs[DRUM_LESSON.steps[0].id] = programs as EventActorPrograms
  return d
}

const both = (n = ROUNDS, body = UNIT) => draft({ fox: act(n, body), rabbit: act(n, body) })

function collect() {
  const events: RunEvent[] = []
  return { events, onEvent: (event: RunEvent) => events.push(event) }
}

function kitWithFake() {
  const fake = fakeContext()
  const factory = vi.fn(() => fake.ctx)
  const kit = new EventDrumKit(factory)
  return { kit, factory, fake }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('EventRunAdapter drums (OPS-055, G0-U3-L06)', () => {
  it('hits only on the revealed drum beats, in step with the actions; the jump beat is silent', () => {
    const { kit, factory } = kitWithFake()
    const adapter = new EventRunAdapter(DRUM_LESSON, kit)
    const { events, onEvent } = collect()
    adapter.runProgram(both(), onEvent)

    // AudioContext 在 runProgram（运行按钮的点击手势）内创建；还没有揭示任何一拍。
    expect(factory).toHaveBeenCalledTimes(1)
    const snapshot = adapter.getExecutionSnapshot()
    expect(snapshot.check?.passed).toBe(true)
    // 1 拍入场 + 2 轮 ×（咚、咚、跳）= 7 拍；两个角色同拍，所以每个鼓点那一拍敲 2 下。
    expect(snapshot.total).toBe(7)
    expect(adapter.getDrumStats().hits).toBe(0)

    const perBeat: number[] = []
    for (let beat = 0; beat < 7; beat += 1) {
      vi.advanceTimersByTime(EVENT_FRAME_MS)
      perBeat.push(adapter.getDrumStats().hits)
    }
    // 入场 0 → 咚 2 → 咚 4 → 跳 4 → 咚 6 → 咚 8 → 跳 8。
    expect(perBeat).toEqual([0, 2, 4, 4, 6, 8, 8])
    expect(events[events.length - 1].kind).toBe('finished')
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
    expect(adapter.getDrumStats().supported).toBe(true)
  })

  it('a wrong rhythm still sounds exactly its own drum beats and does not pass', () => {
    const { kit } = kitWithFake()
    const adapter = new EventRunAdapter(DRUM_LESSON, kit)
    // 两人都排成 咚、跳、咚：鼓点数一样，但顺序错。
    adapter.runProgram(both(ROUNDS, ['drum_beat', 'jump', 'drum_beat']), collect().onEvent)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 7)
    expect(adapter.getDrumStats().hits).toBe(8)
    expect(adapter.getJudgmentResult()?.passed).toBe(false)
    expect(adapter.getExecutionSnapshot().check?.failure).toBe('wrong_order')
  })

  it('stop silences every scheduled drum node and no later beat sounds', () => {
    const { kit } = kitWithFake()
    const adapter = new EventRunAdapter(DRUM_LESSON, kit)
    adapter.runProgram(both(), collect().onEvent)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 3)
    expect(adapter.getDrumStats().hits).toBe(4)
    expect(adapter.getDrumStats().liveNodes).toBe(4)

    adapter.stop()
    expect(adapter.getDrumStats().liveNodes).toBe(0)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 10)
    expect(adapter.getDrumStats().hits).toBe(4)
    expect(adapter.getDrumStats().liveNodes).toBe(0)
    expect(adapter.getJudgmentResult()).toBeNull()
  })

  it('a rerun begins a fresh run: old nodes are released and the count starts again (no stacking)', () => {
    const { kit, factory } = kitWithFake()
    const beginRun = vi.spyOn(kit, 'beginRun')
    const adapter = new EventRunAdapter(DRUM_LESSON, kit)
    adapter.runProgram(both(), collect().onEvent)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 3)
    expect(adapter.getDrumStats().liveNodes).toBe(4)

    adapter.runProgram(both(), collect().onEvent)
    expect(beginRun).toHaveBeenCalledTimes(2)
    expect(adapter.getDrumStats()).toMatchObject({ hits: 0, liveNodes: 0 })
    // 同一个 AudioContext 复用，不会每次运行新建一个。
    expect(factory).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 7)
    expect(adapter.getDrumStats().hits).toBe(8)
  })

  it('reset releases the nodes; dispose also closes the AudioContext', () => {
    const { kit, fake } = kitWithFake()
    const adapter = new EventRunAdapter(DRUM_LESSON, kit)
    adapter.runProgram(both(), collect().onEvent)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 2)
    expect(adapter.getDrumStats().liveNodes).toBe(2)
    adapter.reset()
    expect(adapter.getDrumStats()).toMatchObject({ hits: 0, liveNodes: 0 })
    expect(fake.raw.close).not.toHaveBeenCalled()

    adapter.runProgram(both(), collect().onEvent)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 2)
    adapter.dispose()
    expect(adapter.getDrumStats().liveNodes).toBe(0)
    expect(fake.raw.close).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 10)
    expect(adapter.getDrumStats().hits).toBe(0)
  })

  it('a lesson where nobody can drum never creates an AudioContext and never hits', () => {
    const L01 = g0u2EventLessons['G0-U2-L01']
    const { kit, factory } = kitWithFake()
    const unlock = vi.spyOn(kit, 'unlock')
    const adapter = new EventRunAdapter(L01, kit)
    const d = emptyEventDraft(L01)
    d.stepIndex = 1
    d.programs[L01.steps[1].id] = { fox: [{ type: 'when_start' }, { type: 'wake_up' }, { type: 'say_hello' }] } as unknown as EventActorPrograms
    adapter.runProgram(d, collect().onEvent)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 5)
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
    expect(unlock).not.toHaveBeenCalled()
    expect(factory).not.toHaveBeenCalled()
    expect(adapter.getDrumStats().hits).toBe(0)
  })

  it('without Web Audio the show still plays and judges the same, silently', () => {
    const kit = new EventDrumKit(() => null)
    const adapter = new EventRunAdapter(DRUM_LESSON, kit)
    adapter.runProgram(both(), collect().onEvent)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 7)
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
    expect(adapter.getDrumStats()).toEqual({ hits: 8, liveNodes: 0, supported: false })
  })
})

describe('EventRunAdapter free play (OPS-055, G0-U3-L06): beat by beat, real drums, no judgment', () => {
  const step = DRUM_LESSON.steps[0]
  const scripts = () => eventStepScripts(step, both())

  it('the start flag plays the real script one beat at a time; drums sound on their own beats, never all at once', () => {
    const { kit, factory } = kitWithFake()
    const adapter = new EventRunAdapter(DRUM_LESSON, kit)
    const onFrame = vi.fn()
    adapter.playFree(step, scripts(), [{ kind: 'start' }], onFrame)

    // 点击手势内解锁；还没揭示任何一拍，一下鼓都没响。
    expect(factory).toHaveBeenCalledTimes(1)
    const first = adapter.getFreePlaySnapshot()
    expect(first).toMatchObject({ stepId: step.id, shown: 0, total: 7, playing: true })
    expect(adapter.getDrumStats().hits).toBe(0)

    const perBeat: number[] = []
    for (let beat = 0; beat < 7; beat += 1) {
      vi.advanceTimersByTime(EVENT_FRAME_MS)
      perBeat.push(adapter.getDrumStats().hits)
    }
    // 与运行检查同一时间轴：入场 0 → 咚 2 → 咚 4 → 跳 4 → 咚 6 → 咚 8 → 跳 8。
    expect(perBeat).toEqual([0, 2, 4, 4, 6, 8, 8])
    expect(adapter.getFreePlaySnapshot().playing).toBe(false)
    expect(visibleFreeEffects(adapter.getFreePlaySnapshot())).toHaveLength(first.effects.length)
    // 自由试玩不产生判定，也没有运行检查快照。
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.getExecutionSnapshot().check).toBeNull()
    vi.advanceTimersByTime(EVENT_FRAME_MS)
    expect(onFrame).toHaveBeenCalledTimes(8)
    expect(adapter.getDrumStats().hits).toBe(8)
  })

  it('a second tap shows what already played and only beats the new interaction (no stacking)', () => {
    const { kit } = kitWithFake()
    const adapter = new EventRunAdapter(DRUM_LESSON, kit)
    adapter.playFree(step, scripts(), [{ kind: 'start' }], () => undefined)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 3)
    expect(adapter.getDrumStats().liveNodes).toBe(4)

    adapter.playFree(step, scripts(), [{ kind: 'start' }, { kind: 'start' }], () => undefined)
    const snap = adapter.getFreePlaySnapshot()
    // 旧声音全部释放、计数归零；第一次交互的动作直接显示，第二次从头逐拍演。
    expect(adapter.getDrumStats()).toMatchObject({ hits: 0, liveNodes: 0 })
    expect(visibleFreeEffects(snap).every((effect) => effect.interaction === 0)).toBe(true)
    expect(visibleFreeEffects(snap).length).toBe(snap.effects.filter((effect) => effect.interaction === 0).length)
    vi.advanceTimersByTime(EVENT_FRAME_MS)
    expect(adapter.getDrumStats().hits).toBeLessThanOrEqual(2)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 20)
    const drumsInSecond = snap.effects.filter((effect) => effect.interaction === 1 && effect.action === 'drum_beat').length
    expect(adapter.getDrumStats().hits).toBe(drumsInSecond)
  })

  it('stop, reset (step change / edit), a run check and dispose all clear the free-play timer and every drum node', () => {
    const { kit, fake } = kitWithFake()
    const adapter = new EventRunAdapter(DRUM_LESSON, kit)
    const tap = () => adapter.playFree(step, scripts(), [{ kind: 'start' }], () => undefined)

    tap()
    vi.advanceTimersByTime(EVENT_FRAME_MS * 2)
    adapter.stop()
    expect(adapter.getDrumStats().liveNodes).toBe(0)
    const stoppedAt = adapter.getDrumStats().hits
    vi.advanceTimersByTime(EVENT_FRAME_MS * 10)
    expect(adapter.getDrumStats().hits).toBe(stoppedAt)
    expect(adapter.getFreePlaySnapshot().playing).toBe(false)

    tap()
    vi.advanceTimersByTime(EVENT_FRAME_MS * 2)
    adapter.reset()
    expect(adapter.getDrumStats()).toMatchObject({ hits: 0, liveNodes: 0 })
    expect(adapter.getFreePlaySnapshot().stepId).toBeNull()
    vi.advanceTimersByTime(EVENT_FRAME_MS * 10)
    expect(adapter.getDrumStats().hits).toBe(0)

    // 运行检查接管：自由试玩的拍子不会再插进来，鼓声只按运行检查的 8 下。
    tap()
    vi.advanceTimersByTime(EVENT_FRAME_MS * 2)
    adapter.runProgram(both(), collect().onEvent)
    expect(adapter.getFreePlaySnapshot().stepId).toBeNull()
    vi.advanceTimersByTime(EVENT_FRAME_MS * 20)
    expect(adapter.getDrumStats().hits).toBe(8)
    expect(adapter.getJudgmentResult()?.passed).toBe(true)

    tap()
    vi.advanceTimersByTime(EVENT_FRAME_MS * 2)
    adapter.dispose()
    expect(adapter.getDrumStats().liveNodes).toBe(0)
    expect(fake.raw.close).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 10)
    expect(adapter.getDrumStats().hits).toBe(0)
  })

  it('a lesson where nobody can drum is untouched: playFree never unlocks audio, schedules nothing, plays nothing', () => {
    const L01 = g0u2EventLessons['G0-U2-L01']
    const { kit, factory } = kitWithFake()
    const adapter = new EventRunAdapter(L01, kit)
    const s = L01.steps[1]
    const d = emptyEventDraft(L01)
    d.programs[s.id] = { fox: [{ type: 'when_start' }, { type: 'wake_up' }, { type: 'say_hello' }] } as unknown as EventActorPrograms
    const onFrame = vi.fn()
    adapter.playFree(s, eventStepScripts(s, d), [{ kind: 'start' }], onFrame)
    vi.advanceTimersByTime(EVENT_FRAME_MS * 10)
    expect(factory).not.toHaveBeenCalled()
    expect(onFrame).not.toHaveBeenCalled()
    expect(adapter.getFreePlaySnapshot().stepId).toBeNull()
    expect(adapter.getDrumStats().hits).toBe(0)
  })
})
