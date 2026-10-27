import { describe, expect, it } from 'vitest'
import { runGridProgram } from '@/features/lessons/grid/grid-engine'
import { stepLevel } from '@/features/lessons/grid/grid-lab'
import { g0u1GridLessons } from './g0-u1-grid-lessons'

const toBlocks = (program: string[]) => program.map(type => ({ type }))
const lessons = Object.values(g0u1GridLessons)

describe('EDU-104 G0-U1 grid lessons (TQ-001 rewrite)', () => {
  it('covers L01–L06; L01 has five steps (formal-course pass), the rest four; L06 is the unit project', () => {
    expect(lessons.map(l => l.id)).toEqual(['G0-U1-L01', 'G0-U1-L02', 'G0-U1-L03', 'G0-U1-L04', 'G0-U1-L05', 'G0-U1-L06'])
    const project = g0u1GridLessons['G0-U1-L06'].project!
    expect(g0u1GridLessons['G0-U1-L06'].steps.find(s => s.id === project.stepId)?.kind).toBe('practice-a')
    for (const lesson of lessons) expect(lesson.steps).toHaveLength(lesson.id === 'G0-U1-L01' ? 5 : 4)
  })

  for (const lesson of lessons) {
    describe(lesson.id, () => {
      it('every solution really passes and uses only allowed blocks', () => {
        for (const step of lesson.steps) {
          expect(step.solutions.length, step.id).toBeGreaterThan(0)
          for (const program of step.solutions) {
            expect(runGridProgram(step.level, toBlocks(program)).passed, `${step.id} ${program}`).toBe(true)
            for (const type of program) expect(step.allowedBlocks, `${step.id} ${type}`).toContain(type)
          }
        }
      })

      it('every counter-example fails with the expected engine failure', () => {
        for (const step of lesson.steps) {
          expect(step.counterExamples.length, step.id).toBeGreaterThan(0)
          for (const c of step.counterExamples) expect(runGridProgram(step.level, toBlocks(c.program)).failure, `${step.id} ${c.program}`).toBe(c.failure)
        }
      })

      it('accepts at least two different correct programs (not one fixed answer)', () => {
        expect(lesson.steps.some(s => new Set(s.solutions.map(p => p.join())).size >= 2)).toBe(true)
      })

      it('has two hands-on practices with different goals', () => {
        const a = lesson.steps.find(s => s.kind === 'practice-a')!
        const b = lesson.steps.find(s => s.kind === 'practice-b')!
        expect(a && b).toBeTruthy()
        expect(a.instruction).not.toBe(b.instruction)
        expect(b.starterBlocks?.length ?? 0).toBeGreaterThan(0) // practice B is debugging a given program
        expect(a.starterBlocks ?? []).toHaveLength(0)
      })

      it('starter programs of debug practice fail before the fix', () => {
        for (const step of lesson.steps.filter(s => s.starterBlocks?.length)) {
          expect(runGridProgram(step.level, step.starterBlocks!).passed, step.id).toBe(false)
        }
      })

      it('hints are three distinct layers and diagnoses are lesson-specific, not templates', () => {
        for (const step of lesson.steps) {
          expect(new Set(step.hints).size, step.id).toBe(3)
          expect(step.predict.length).toBeGreaterThan(4)
        }
        const diagnoses = Object.values(lesson.diagnoses)
        expect(diagnoses.length).toBeGreaterThanOrEqual(3)
        for (const text of diagnoses) expect(text).not.toMatch(/检查「/)
      })

      it('needs no offline paper/floor activity and no loop yet', () => {
        const text = JSON.stringify(lesson)
        expect(text).not.toMatch(/网格纸|地面|repeat|循环|同伴/)
      })
    })
  }

  it('every lesson has a one-tap reflection check with exactly one right answer', () => {
    for (const lesson of lessons) {
      const check = lesson.reflectionCheck
      expect(check.options.length, lesson.id).toBeGreaterThanOrEqual(2)
      expect(check.options.filter(o => o.correct), lesson.id).toHaveLength(1)
      expect(check.why.length, lesson.id).toBeGreaterThan(8)
    }
  })

  describe('G0-U1-L01 formal-course pass (error lab, creative remake, review)', () => {
    const lesson = g0u1GridLessons['G0-U1-L01']
    const lab = lesson.steps.find(s => s.kind === 'error-lab')!
    const creative = lesson.steps.find(s => s.kind === 'creative')!

    it('the error lab starter really produces the planned failure, and its predictions are two concrete, different outcomes', () => {
      expect(runGridProgram(lab.level, lab.starterBlocks!).failure).toBe(lab.errorLab!.expect)
      const [a, b] = lab.predictChoices!
      expect(a.when).not.toBe(b.when)
      expect([a.when, b.when]).toContain(lab.errorLab!.expect)
      expect(lab.errorLab!.expected).not.toBe(lab.errorLab!.actual)
    })

    it('every goal the child may choose is reachable with the allowed blocks, and the old route fails after a move', () => {
      expect(creative.creative!.goalChoices.length).toBeGreaterThanOrEqual(3)
      for (const goal of creative.creative!.goalChoices) {
        const level = stepLevel(creative, { creative: { [creative.id]: { goal } } })
        const steps = goal.x - level.start.x
        const right = ['when_start', ...Array(steps).fill('move_right_cell')]
        const forward = ['when_start', ...Array(steps).fill('move_forward')]
        expect(runGridProgram(level, toBlocks(right)).passed, `goal ${goal.x}`).toBe(true)
        expect(runGridProgram(level, toBlocks(forward)).passed, `goal ${goal.x}`).toBe(true)
        expect(runGridProgram(level, toBlocks(right.slice(0, -1))).failure, `goal ${goal.x}`).toBe('not_at_goal')
      }
      // Two children placing the house differently make two different valid works.
      const near = stepLevel(creative, { creative: { [creative.id]: { goal: { x: 2, y: 0 } } } })
      expect(runGridProgram(near, toBlocks(['when_start', 'move_right_cell', 'move_right_cell', 'move_right_cell'])).passed).toBe(false)
    })

    it('the creative remake is the saved lesson work, and review has a what-if with an answer', () => {
      expect(lesson.project?.stepId).toBe(creative.id)
      expect(lesson.review?.whatIf.length).toBeGreaterThan(6)
      expect(lesson.review?.answer.length).toBeGreaterThan(6)
    })

    it('keeps two practices with different goals besides the error lab and the remake', () => {
      expect(lesson.steps.map(s => s.kind)).toEqual(['error-lab', 'guided', 'practice-a', 'practice-b', 'creative'])
    })
  })
})
