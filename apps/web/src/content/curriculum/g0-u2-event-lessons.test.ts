import { describe, expect, it } from 'vitest'
import { checkEventGoal } from '@/features/lessons/event/event-engine'
import { g0u2EventLessons, resolveEventGoal, toEventScripts } from './g0-u2-event-lessons'

const lessons = Object.values(g0u2EventLessons)

describe('G0-U2 event lessons (Hark A formal course)', () => {
  for (const lesson of lessons) {
    describe(lesson.id, () => {
      it('has the formal five-step shape: error lab, guided, two different practices, creative', () => {
        expect(lesson.steps.map(s => s.kind)).toEqual(['error-lab', 'guided', 'practice-a', 'practice-b', 'creative'])
        const a = lesson.steps.find(s => s.kind === 'practice-a')!
        const b = lesson.steps.find(s => s.kind === 'practice-b')!
        expect(a.instruction).not.toBe(b.instruction)
        expect(Object.keys(b.starter ?? {}).length).toBeGreaterThan(0)
        expect(a.starter ?? {}).toEqual({})
      })

      it('every solution passes the real engine check and uses only allowed blocks on editable characters', () => {
        for (const step of lesson.steps) {
          const { expectations, probes } = resolveEventGoal(step)
          for (const spec of step.solutions) {
            expect(checkEventGoal(step.level, toEventScripts(spec), expectations, probes).passed, `${step.id}`).toBe(true)
            for (const [actor, types] of Object.entries(spec)) {
              expect(step.editable, `${step.id} ${actor}`).toContain(actor)
              for (const t of types ?? []) expect(step.allowedBlocks, `${step.id} ${t}`).toContain(t)
            }
          }
        }
      })

      it('every counter-example fails with the named failure', () => {
        for (const step of lesson.steps) {
          const { expectations, probes } = resolveEventGoal(step)
          for (const c of step.counterExamples) {
            expect(checkEventGoal(step.level, toEventScripts(c.scripts), expectations, probes).failure, `${step.id} ${JSON.stringify(c.scripts)}`).toBe(c.failure)
          }
        }
      })

      it('starter programs fail before the fix; the error lab produces its planned failure', () => {
        for (const step of lesson.steps.filter(s => s.starter)) {
          const { expectations, probes } = resolveEventGoal(step)
          const check = checkEventGoal(step.level, step.starter!, expectations, probes)
          expect(check.passed, step.id).toBe(false)
          if (step.errorLab) expect(check.failure).toBe(step.errorLab.expect)
        }
        const lab = lesson.steps.find(s => s.errorLab)!
        expect(lab.predictChoices!.map(c => c.when)).toContain(lab.errorLab!.expect)
      })

      it('nothing happens before any interaction: every goal starts with the stage still', () => {
        for (const step of lesson.steps) for (const a of step.level.actors) expect(a.asleep ?? false, `${step.id} ${a.id}`).toBe(true)
      })

      it('the creative step works for every character the child may pick, and one card never fits another pick', () => {
        const step = lesson.steps.find(s => s.kind === 'creative')!
        const cards = step.creative!.choices.map(target => ({ target, scripts: toEventScripts({ [target]: ['when_clicked', 'wake_up', 'say_hello'] }) }))
        for (const card of cards) {
          for (const other of cards) {
            const { expectations, probes } = resolveEventGoal(step, other.target)
            expect(checkEventGoal(step.level, card.scripts, expectations, probes).passed, `${card.target}→${other.target}`).toBe(card.target === other.target)
          }
        }
        expect(step.creative!.labels).toHaveLength(step.creative!.choices.length)
      })

      it('three distinct hint layers per step, a review with an answer, and the creative step is the saved work', () => {
        for (const step of lesson.steps) expect(new Set(step.hints).size, step.id).toBe(3)
        expect(lesson.review.answer.length).toBeGreaterThan(6)
        expect(lesson.steps.find(s => s.id === lesson.project.stepId)?.kind).toBe('creative')
        expect(lesson.reflectionCheck.options.filter(o => o.correct)).toHaveLength(1)
      })
    })
  }

  it('every character stands inside the stage (stage units 0–100, room for its body and name)', () => {
    for (const lesson of Object.values(g0u2EventLessons)) for (const step of lesson.steps) for (const a of step.level.actors) {
      expect(a.x, `${step.id}/${a.id}`).toBeGreaterThanOrEqual(10)
      expect(a.x, `${step.id}/${a.id}`).toBeLessThanOrEqual(90)
      expect(a.y, `${step.id}/${a.id}`).toBeGreaterThanOrEqual(20)
      expect(a.y, `${step.id}/${a.id}`).toBeLessThanOrEqual(70)
    }
  })
})
