import { describe, expect, it } from 'vitest'
import { checkEventGoal, runEventProgram, stageStateAfter, type EventActorId, type EventScripts } from '@/features/lessons/event/event-engine'
import { stepScripts } from '@/features/lessons/event/event-lab'
import { parseEventDraft } from '@/features/lessons/event/event-draft'
import { resolveEventGoal, toEventScripts } from './g0-u2-event-lessons'
import { g0u3EventLessons } from './g0-u3-event-loop-lessons'

const lesson = g0u3EventLessons['G0-U3-L04']
const judge = (step: (typeof lesson.steps)[number], scripts: ReturnType<typeof toEventScripts>, target?: string) => {
  const { expectations, probes } = resolveEventGoal(step, target)
  return checkEventGoal(step.level, scripts, expectations, probes)
}

describe('G0-U3-L04 萤火虫闪三次 (Hark A)', () => {
  it('has the formal course shape: error lab first, guided, two practices, a creative remake, a saved work', () => {
    expect(lesson.steps.map(s => s.kind)).toEqual(['error-lab', 'guided', 'practice-a', 'practice-b', 'creative'])
    expect(lesson.project.stepId).toBe(lesson.steps[4].id)
    for (const step of lesson.steps) {
      expect(step.level.parallel, step.id).toBe(true)
      expect(step.level.scenery, step.id).toBe('firefly-night')
      expect(step.hints).toHaveLength(3)
    }
  })

  it('every solution passes and every counter-example fails with its own reason (real engine)', () => {
    for (const step of lesson.steps) {
      for (const solution of step.solutions) expect(judge(step, toEventScripts(solution)).passed, step.id).toBe(true)
      for (const counter of step.counterExamples) expect(judge(step, toEventScripts(counter.scripts)).failure, `${step.id} ${counter.failure}`).toBe(counter.failure)
    }
  })

  it('a loop is really used: some step has a repeat solution and a flat one that both pass', () => {
    const step = lesson.steps[0]
    expect(step.solutions.some(s => s.firefly_a?.some(b => typeof b !== 'string'))).toBe(true)
    expect(step.solutions.some(s => s.firefly_a?.every(b => typeof b === 'string'))).toBe(true)
  })

  it('the starter of the error lab and of the debug practice fail as planned; characters the child cannot edit keep their solution script', () => {
    const lab = lesson.steps[0]
    expect(judge(lab, stepScripts(lab, { programs: {} })).failure).toBe(lab.errorLab!.expect)
    const debug = lesson.steps[3]
    expect(judge(debug, stepScripts(debug, { programs: {} })).failure).toBe('out_of_sync')
    for (const step of lesson.steps) {
      for (const id of Object.keys(step.starter ?? {}) as EventActorId[]) {
        if (step.editable.includes(id)) continue
        expect(stepScripts(step, { programs: {} })[id], `${step.id} ${id}`).toEqual(toEventScripts(step.solutions[0])[id])
      }
    }
  })

  it('the out-of-sync firefly is the one the child edits, and its light log really differs on the first beat', () => {
    const debug = lesson.steps[3]
    const check = judge(debug, stepScripts(debug, { programs: {} }))
    expect(check.actor).toBe('firefly_c')
    const first = check.run.effects.filter(e => e.beat === 0)
    expect(first.map(e => e.action)).toEqual(['glow_on', 'glow_on', 'glow_off'])
  })

  it('after a correct three-round show the 6th action leaves the light off', () => {
    const step = lesson.steps[0]
    const run = runEventProgram(step.level, toEventScripts(step.solutions[0]), [{ kind: 'start' }])
    expect(run.effects).toHaveLength(6)
    expect(run.effects[5].action).toBe('glow_off')
    expect(stageStateAfter(step.level, run.effects).firefly_a.glowing).toBe(false)
  })

  it('creative: each pick of rounds accepts only scripts whose two counts both match it', () => {
    const step = lesson.steps[4]
    const { choices, goals, labels } = step.creative!
    expect(goals).toHaveLength(choices.length)
    expect(labels).toHaveLength(choices.length)
    const cards = [3, 4, 5].map(n => toEventScripts({ firefly_a: ['when_start', { repeat: n, body: ['glow_on', 'glow_off'] }], firefly_b: ['when_start', { repeat: n, body: ['glow_on', 'glow_off'] }] }))
    choices.forEach((target, i) => cards.forEach((card, j) => expect(judge(step, card, target).passed, `${target} ${j}`).toBe(i === j)))
    const half = toEventScripts({ firefly_a: ['when_start', { repeat: 5, body: ['glow_on', 'glow_off'] }], firefly_b: ['when_start', { repeat: 3, body: ['glow_on', 'glow_off'] }] })
    expect(judge(step, half, 'rounds-5').passed).toBe(false)
  })

  it('drafts keep repeat bodies and counts, drop forged blocks and clamp forged counts', () => {
    const raw = JSON.stringify({
      stepIndex: 4,
      programs: { 'my-firefly-show': { firefly_a: [{ type: 'when_start' }, { type: 'repeat_times', times: 99, body: [{ type: 'glow_on' }, { type: 'fly_away' }, { type: 'repeat_times', body: [] }, { type: 'glow_off' }] }] } },
      passed: [],
      creative: { 'my-firefly-show': { target: 'rounds-5' }, 'one-flash': { target: 'rounds-5' } },
      savedAt: null,
    })
    const draft = parseEventDraft(lesson, raw)!
    const a = draft.programs['my-firefly-show'].firefly_a!
    expect(a[1].times).toBe(2)
    expect(a[1].body!.map(b => b.type)).toEqual(['glow_on', 'glow_off'])
    expect(draft.creative).toEqual({ 'my-firefly-show': { target: 'rounds-5' } })
  })
})

/*
 * OPS-055：G0-U3-L06 森林节奏演出。判定全部走真实引擎（checkEventGoal / runEventProgram），
 * 不看声音是否“播放过”；声音与动作同拍由 event-v3-run-adapter-drum.test.ts 与 Chrome E2E 另行证明。
 */
const show = g0u3EventLessons['G0-U3-L06']
const judgeShow = (step: (typeof show.steps)[number], scripts: EventScripts, target?: string) => {
  const { expectations, probes } = resolveEventGoal(step, target)
  return checkEventGoal(step.level, scripts, expectations, probes)
}
const UNIT = ['drum_beat', 'drum_beat', 'jump']
const player = (rounds: number, unit = UNIT, chorus?: { rounds: number; unit: string[] }) => [
  'when_start',
  'enter_stage',
  { repeat: rounds, body: unit },
  ...(chorus ? [{ repeat: chorus.rounds, body: chorus.unit }] : []),
]
const band = (fox: ReturnType<typeof player>, rabbit: ReturnType<typeof player>) => toEventScripts({ fox, rabbit }) as EventScripts

describe('G0-U3-L06 森林节奏演出 (OPS-055)', () => {
  it('has the formal course shape with the fox and the rabbit on one parallel stage', () => {
    expect(show.title).toBe('森林节奏演出')
    expect(show.steps.map(s => s.kind)).toEqual(['error-lab', 'guided', 'practice-a', 'practice-b', 'creative'])
    expect(show.project.stepId).toBe(show.steps[4].id)
    for (const step of show.steps) {
      expect(step.level.parallel, step.id).toBe(true)
      expect(step.hints).toHaveLength(3)
      for (const actor of step.level.actors) {
        expect(['fox', 'rabbit'], step.id).toContain(actor.id)
        expect(actor.can, step.id).toEqual(expect.arrayContaining(['drum_beat', 'jump']))
      }
    }
    // 第 3 关起两位乐手都在后台，靠“走上舞台”入场。
    for (const step of show.steps.slice(2)) {
      expect(step.level.actors.map(a => [a.id, a.offstage])).toEqual([['fox', true], ['rabbit', true]])
    }
  })

  it('every solution passes and every counter-example fails with its own reason (real engine)', () => {
    for (const step of show.steps) {
      for (const solution of step.solutions) expect(judgeShow(step, toEventScripts(solution) as EventScripts).passed, step.id).toBe(true)
      for (const counter of step.counterExamples) expect(judgeShow(step, toEventScripts(counter.scripts) as EventScripts).failure, `${step.id} ${counter.failure}`).toBe(counter.failure)
    }
  })

  it('a finite loop is really used: the error lab accepts both a repeat and a flat four-round rhythm', () => {
    const step = show.steps[0]
    expect(step.solutions.some(s => s.fox?.some(b => typeof b !== 'string'))).toBe(true)
    expect(step.solutions.some(s => s.fox?.every(b => typeof b === 'string'))).toBe(true)
  })

  it('four synced rounds: both players enter on beat 0, then drum, drum, jump on the same beats, 13 beats and then it stops', () => {
    const step = show.steps[2]
    const run = runEventProgram(step.level, band(player(4), player(4)), [{ kind: 'start' }])
    expect(run.effects).toHaveLength(26)
    const beats = [...new Set(run.effects.map(e => e.beat))].sort((a, b) => a - b)
    expect(beats).toEqual(Array.from({ length: 13 }, (_, i) => i))
    for (const beat of beats) {
      const here = run.effects.filter(e => e.beat === beat)
      expect(here.map(e => e.actor).sort(), `beat ${beat}`).toEqual(['fox', 'rabbit'])
      expect(new Set(here.map(e => e.action)).size, `beat ${beat}`).toBe(1)
    }
    const fox = run.effects.filter(e => e.actor === 'fox').map(e => e.action)
    expect(fox[0]).toBe('enter_stage')
    expect(fox.filter(a => a === 'drum_beat')).toHaveLength(8)
    expect(fox.filter(a => a === 'jump')).toHaveLength(4)
    expect(stageStateAfter(step.level, run.effects).fox.rhythm).toBe('ddjddjddjddj')
    expect(judgeShow(step, band(player(4), player(4))).passed).toBe(true)
  })

  it('a wrong rhythm, an empty loop, too few rounds or a missing entrance never pass', () => {
    const step = show.steps[2]
    expect(judgeShow(step, band(player(4, ['drum_beat', 'jump', 'drum_beat']), player(4, ['drum_beat', 'jump', 'drum_beat']))).passed).toBe(false)
    expect(judgeShow(step, band(player(4, []), player(4, []))).failure).toBe('empty_repeat')
    expect(judgeShow(step, band(player(3), player(3))).failure).toBe('missing_effect')
    expect(judgeShow(step, band(player(4), player(4, ['drum_beat', 'jump', 'drum_beat']))).failure).toBe('out_of_sync')
    const noEntrance = toEventScripts({ fox: player(4), rabbit: ['when_start', { repeat: 4, body: UNIT }] }) as EventScripts
    expect(judgeShow(step, noEntrance).passed).toBe(false)
  })

  it('the starter of the error lab and of the debug practice fail as planned; players the child cannot edit keep their solution script', () => {
    const lab = show.steps[0]
    expect(judgeShow(lab, stepScripts(lab, { programs: {} })).failure).toBe(lab.errorLab!.expect)
    const debug = show.steps[3]
    expect(judgeShow(debug, stepScripts(debug, { programs: {} })).failure).toBe('out_of_sync')
    for (const step of show.steps) {
      for (const id of Object.keys(step.starter ?? {}) as EventActorId[]) {
        if (step.editable.includes(id)) continue
        expect(stepScripts(step, { programs: {} })[id], `${step.id} ${id}`).toEqual(toEventScripts(step.solutions[0])[id])
      }
    }
  })

  it('debug: the off-beat player is the rabbit the child edits, and the two rhythm logs first differ on beat 2', () => {
    const debug = show.steps[3]
    expect(debug.editable).toEqual(['rabbit'])
    const check = judgeShow(debug, stepScripts(debug, { programs: {} }))
    expect(check.actor).toBe('rabbit')
    const firstDiff = Array.from({ length: 13 }, (_, beat) => beat).find((beat) => {
      const here = check.run.effects.filter(e => e.beat === beat)
      return new Set(here.map(e => e.action)).size > 1
    })
    expect(firstDiff).toBe(2)
  })

  it('creative chorus: each pick accepts only the matching second rhythm on both players', () => {
    const step = show.steps[4]
    const { choices, goals, labels } = step.creative!
    expect(goals).toHaveLength(choices.length)
    expect(labels).toHaveLength(choices.length)
    const choruses = [['jump', 'jump', 'drum_beat'], ['drum_beat', 'jump']]
    const cards = choruses.map(unit => band(player(4, UNIT, { rounds: 2, unit }), player(4, UNIT, { rounds: 2, unit })))
    choices.forEach((target, i) => cards.forEach((card, j) => expect(judgeShow(step, card, target).passed, `${target} ${j}`).toBe(i === j)))
    const oneSided = band(player(4, UNIT, { rounds: 2, unit: choruses[0] }), player(4))
    expect(judgeShow(step, oneSided, choices[0]).passed).toBe(false)
  })

  it('drafts keep both top-level repeats, drop forged blocks and nested repeats, clamp forged counts', () => {
    const raw = JSON.stringify({
      stepIndex: 4,
      programs: {
        'my-chorus': {
          fox: [
            { type: 'when_start' },
            { type: 'enter_stage' },
            { type: 'repeat_times', times: 99, body: [{ type: 'drum_beat' }, { type: 'fly_away' }, { type: 'repeat_times', body: [] }, { type: 'jump' }] },
            { type: 'repeat_times', times: 3, body: [{ type: 'jump' }, { type: 'drum_beat' }] },
          ],
        },
      },
      passed: [],
      creative: { 'my-chorus': { target: 'chorus-drum-jump' }, 'one-unit': { target: 'chorus-drum-jump' } },
      savedAt: null,
    })
    const draft = parseEventDraft(show, raw)!
    const fox = draft.programs['my-chorus'].fox!
    expect(fox.map(b => b.type)).toEqual(['when_start', 'enter_stage', 'repeat_times', 'repeat_times'])
    expect(fox[2].times).toBe(2)
    expect(fox[2].body!.map(b => b.type)).toEqual(['drum_beat', 'jump'])
    expect(fox[3].times).toBe(3)
    expect(draft.creative).toEqual({ 'my-chorus': { target: 'chorus-drum-jump' } })
  })
})
