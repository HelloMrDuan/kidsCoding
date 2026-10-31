import { describe, expect, it } from 'vitest'
import { checkEventGoal, runEventProgram, stageStateAfter, type EventActorId } from '@/features/lessons/event/event-engine'
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
