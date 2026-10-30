import { describe, expect, it } from 'vitest'

import { expandProgram, type ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { runGridProgram } from '@/features/lessons/grid/grid-engine'
import { stepLevel } from '@/features/lessons/grid/grid-lab'

import { toGridBlocks } from './g0-u1-grid-lessons'
import { g0u3LoopLessons } from './g0-u3-loop-lessons'

const lessons = Object.values(g0u3LoopLessons)
const usesRepeat = (program: Array<string | ProgramBlock>) => program.some(b => typeof b !== 'string' && b.type === 'repeat_times')
const typesIn = (program: Array<string | ProgramBlock>) => {
  const out: string[] = []
  const walk = (list: ProgramBlock[]) => list.forEach(b => { out.push(b.type); if (b.body) walk(b.body) })
  walk(toGridBlocks(program))
  return out
}

describe('G0-U3 loop lessons (Hark A, SYS-107 repeat on the grid engine)', () => {
  for (const lesson of lessons) {
    describe(lesson.id, () => {
      it('keeps the formal five-step shape: error lab, guided, two different practices, creative', () => {
        expect(lesson.steps.map(s => s.kind)).toEqual(['error-lab', 'guided', 'practice-a', 'practice-b', 'creative'])
      })

      it('every solution really passes and uses only allowed blocks (bodies included)', () => {
        for (const step of lesson.steps) {
          expect(step.solutions.length, step.id).toBeGreaterThan(0)
          for (const program of step.solutions) {
            expect(runGridProgram(step.level, toGridBlocks(program)).passed, `${step.id} ${JSON.stringify(program)}`).toBe(true)
            for (const type of typesIn(program)) expect(step.allowedBlocks, `${step.id} ${type}`).toContain(type)
          }
        }
      })

      it('every counter-example fails with the expected engine failure', () => {
        for (const step of lesson.steps) {
          expect(step.counterExamples.length, step.id).toBeGreaterThan(0)
          for (const c of step.counterExamples) {
            expect(runGridProgram(step.level, toGridBlocks(c.program)).failure, `${step.id} ${JSON.stringify(c.program)}`).toBe(c.failure)
          }
        }
      })

      it('the error lab and the debug practice start from a program that really fails, and the predictions are two concrete outcomes', () => {
        const lab = lesson.steps.find(s => s.kind === 'error-lab')!
        expect(runGridProgram(lab.level, lab.starterBlocks!).failure).toBe(lab.errorLab!.expect)
        const [a, b] = lab.predictChoices!
        expect(a.when).not.toBe(b.when)
        expect([a.when, b.when]).toContain(lab.errorLab!.expect)
        const debug = lesson.steps.find(s => s.kind === 'practice-b')!
        expect(debug.starterBlocks?.length ?? 0).toBeGreaterThan(0)
        expect(runGridProgram(debug.level, debug.starterBlocks!).passed).toBe(false)
        expect(lesson.steps.find(s => s.kind === 'practice-a')!.starterBlocks ?? []).toHaveLength(0)
      })

      it('the loop is real: a repeat solution and its unrolled form run the same actions', () => {
        const step = lesson.steps.find(s => s.solutions.some(usesRepeat))!
        const looped = step.solutions.find(usesRepeat)!
        const unrolled = expandProgram(toGridBlocks(looped).slice(1), 80)
        expect(unrolled.ok).toBe(true)
        if (!unrolled.ok) return
        const flat = [{ type: 'when_start' }, ...unrolled.steps.map(s => ({ type: s.block.type }))]
        const a = runGridProgram(step.level, toGridBlocks(looped))
        const b = runGridProgram(step.level, flat)
        expect(a.trail).toEqual(b.trail)
        expect(a.final).toEqual(b.final)
      })

      it('accepts more than one correct program somewhere (loop or unrolled)', () => {
        expect(lesson.steps.some(s => new Set(s.solutions.map(p => JSON.stringify(p))).size >= 2)).toBe(true)
      })

      it('hints are three distinct layers; diagnoses are lesson-specific', () => {
        for (const step of lesson.steps) expect(new Set(step.hints).size, step.id).toBe(3)
        for (const text of Object.values(lesson.diagnoses)) expect(text).not.toMatch(/检查「/)
        expect(lesson.reflectionCheck.options.filter(o => o.correct)).toHaveLength(1)
      })
    })
  }

  describe('G0-U3-L01 蘑菇小路的规律', () => {
    const lesson = g0u3LoopLessons['G0-U3-L01']
    const creative = lesson.steps.find(s => s.kind === 'creative')!

    it('the error lab is “only two pairs”: changing only the count from 2 to 4 fixes it', () => {
      const lab = lesson.steps[0]
      const fixed = JSON.parse(JSON.stringify(lab.starterBlocks)) as ProgramBlock[]
      fixed[1].times = 4
      expect(runGridProgram(lab.level, fixed).passed).toBe(true)
      expect(runGridProgram(lab.level, lab.starterBlocks!).trail).toHaveLength(4)
    })

    it('the swapped-colour debug names the first wrong footprint', () => {
      const debug = lesson.steps.find(s => s.kind === 'practice-b')!
      expect(runGridProgram(debug.level, debug.starterBlocks!).message).toContain('第 1 个脚印应该是红色')
    })

    it('every rhythm the child may pick is a different pattern; one program never fits two rhythms', () => {
      const { goalChoices, patterns, labels } = creative.creative!
      expect(goalChoices.length).toBeGreaterThanOrEqual(3)
      expect(patterns).toHaveLength(goalChoices.length)
      expect(labels).toHaveLength(goalChoices.length)
      const units: Record<number, string[]> = { 0: ['stamp_red', 'stamp_blue'], 1: ['stamp_red', 'stamp_red', 'stamp_blue'], 2: ['stamp_red', 'stamp_blue', 'stamp_blue'] }
      const rounds = [2, 2, 3]
      const programs = goalChoices.map((_, i) => [{ type: 'when_start' }, { type: 'repeat_times', times: rounds[i], body: units[i].flatMap(t => [{ type: t }, { type: 'move_forward' }]) }])
      goalChoices.forEach((goal, i) => {
        const level = stepLevel(creative, { creative: { [creative.id]: { goal } } })
        expect(level.footprints).toEqual(patterns![i])
        programs.forEach((program, j) => {
          expect(runGridProgram(level, program).passed, `rhythm ${i} with program ${j}`).toBe(i === j)
        })
      })
      // before a choice there is nothing to copy (the run is blocked until the child picks)
      expect(stepLevel(creative, {}).footprints).toBeUndefined()
    })

    it('the creative remake is the saved work, and review explains changing only the count', () => {
      expect(lesson.project?.stepId).toBe(creative.id)
      expect(lesson.review?.answer).toContain('次数')
    })

    it('every step shows the original mushroom-path scenery and ghost footprints to copy', () => {
      for (const step of lesson.steps) {
        expect(step.level.scenery, step.id).toBe('mushroompath')
        expect(step.level.footprints?.length ?? 0, step.id).toBeGreaterThan(0)
      }
    })
  })
  describe('G0-U3-L02 重复走两步', () => {
    const lesson = g0u3LoopLessons['G0-U3-L02']
    const creative = lesson.steps.find(s => s.kind === 'creative')!

    it('the error lab is “only one hop”: one more hop, or the same hop repeated 2 times, fixes it', () => {
      const lab = lesson.steps[0]
      expect(runGridProgram(lab.level, [...lab.starterBlocks!, { type: 'jump_forward' }]).passed).toBe(true)
      expect(runGridProgram(lab.level, [{ type: 'when_start' }, { type: 'repeat_times', times: 2, body: [{ type: 'jump_forward' }] }]).passed).toBe(true)
    })

    it('walking instead of hopping always lands in a puddle', () => {
      for (const step of lesson.steps) {
        const walk = [{ type: 'when_start' }, ...Array(step.level.goal.x).fill({ type: 'move_forward' })]
        expect(runGridProgram(stepLevel(step, {}), walk).failure, step.id).toBe('fell_in_water')
      }
    })

    it('the repeat count equals the number of puddles for every road the child may pick, and one count fits only its own road', () => {
      const { goalChoices, waters, labels } = creative.creative!
      expect(goalChoices.length).toBeGreaterThanOrEqual(3)
      expect(waters).toHaveLength(goalChoices.length)
      expect(labels).toHaveLength(goalChoices.length)
      const programs = waters!.map(w => [{ type: 'when_start' }, { type: 'repeat_times', times: w.length, body: [{ type: 'jump_forward' }] }])
      goalChoices.forEach((goal, i) => {
        const level = stepLevel(creative, { creative: { [creative.id]: { goal } } })
        expect(level.water).toEqual(waters![i])
        programs.forEach((program, j) => expect(runGridProgram(level, program).passed, `road ${i} with ${j}`).toBe(i === j))
      })
    })

    it('the debug practice is about the order inside the loop body, not the count', () => {
      const debug = lesson.steps.find(s => s.kind === 'practice-b')!
      const body = debug.starterBlocks![1].body!
      const swapped = [{ type: 'when_start' }, { type: 'repeat_times', times: debug.starterBlocks![1].times, body: [body[1], body[0]] }]
      expect(runGridProgram(debug.level, swapped).passed).toBe(true)
    })

    it('every step shows the rabbit and the original puddle sign; review explains changing only the count', () => {
      for (const step of lesson.steps) {
        expect(step.level.actor, step.id).toBe('rabbit')
        expect(step.level.scenery, step.id).toBe('puddlesign')
      }
      expect(lesson.project?.stepId).toBe(creative.id)
      expect(lesson.review?.answer).toContain('次数')
    })
  })
  describe('G0-U3-L03 花园浇水机器', () => {
    const lesson = g0u3LoopLessons['G0-U3-L03']
    const creative = lesson.steps.find(s => s.kind === 'creative')!
    const F = { type: 'move_forward' }
    const Wt = { type: 'water_plant' }
    const loop = (times: number, ...body: { type: string }[]) => [{ type: 'when_start' }, { type: 'repeat_times', times, body }]

    it('the error lab is “repeated three times”: only the count changes to 4', () => {
      const lab = lesson.steps[0]
      expect(runGridProgram(lab.level, lab.starterBlocks!).failure).toBe('pots_missed')
      expect(runGridProgram(lab.level, loop(4, F, Wt)).passed).toBe(true)
    })

    it('moving without watering, watering before moving, and one round too many each fail with their own reason', () => {
      const a = lesson.steps.find(s => s.kind === 'practice-a')!
      expect(runGridProgram(a.level, loop(4, F)).failure).toBe('pots_missed')
      expect(runGridProgram(a.level, loop(4, Wt, F)).failure).toBe('no_pot_here')
      expect(runGridProgram(a.level, loop(5, F, Wt)).failure).toBe('out_of_bounds')
      expect(runGridProgram(a.level, [{ type: 'when_start' }, F, Wt, Wt]).failure).toBe('watered_twice')
    })

    it('spaced pots need a different loop body, not a different count', () => {
      const b = lesson.steps.find(s => s.kind === 'practice-b')!
      expect(b.starterBlocks![1].times).toBe(4)
      expect(runGridProgram(b.level, loop(4, F, F, Wt)).passed).toBe(true)
    })

    it('each garden the child may pick accepts only its own loop (count = pots, body = step to the next pot + water)', () => {
      const { goalChoices, pots, labels } = creative.creative!
      expect(pots).toHaveLength(goalChoices.length)
      expect(labels).toHaveLength(goalChoices.length)
      const programs = pots!.map(p => loop(p.length, ...(p[1].x - p[0].x === 2 ? [F, F] : [F]), Wt))
      goalChoices.forEach((goal, i) => {
        const level = stepLevel(creative, { creative: { [creative.id]: { goal } } })
        expect(level.pots).toEqual(pots![i])
        programs.forEach((program, j) => expect(runGridProgram(level, program).passed, `garden ${i} with ${j}`).toBe(i === j))
      })
    })

    it('every step shows the robot and the original watering plan; the reflection contrasts water inside vs after the loop', () => {
      for (const step of lesson.steps) {
        expect(step.level.actor, step.id).toBe('robot')
        expect(step.level.scenery, step.id).toBe('wateringplan')
        expect(step.level.pots?.length, step.id).toBeGreaterThan(0)
      }
      const after = [{ type: 'when_start' }, { type: 'repeat_times', times: 4, body: [F] }, Wt]
      expect(runGridProgram(lesson.steps[2].level, after).failure).toBe('pots_missed')
      expect(lesson.project?.stepId).toBe(creative.id)
    })
  })
})
