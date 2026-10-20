import { describe, expect, it } from 'vitest'

import {
  allKidsBlockLabels,
  getKidsBlockLabel,
  motionVerbForLesson,
} from '@/features/lessons/blockly/block-labels'
import { evaluateObservable, simulateProgram } from '@/features/lessons/blockly/observable-run'
import { explainRunFailure } from '@/features/lessons/blockly/run-feedback'
import { getStepJudgeOptions } from '@/features/lessons/blockly/step-judge-options'
import { restoreBlockSequence } from '@/features/lessons/blockly/restore-block-sequence'

import { launchLessons, launchTemplates } from './launch-lessons'
import { getMistakeStep, getMistakeStepAt, mistakeStepCopy, mistakeSteps } from './mistake-steps'

/**
 * TQ-010 (= TQ-002d): each Blockly lesson 01–09 has exactly one designed
 * real mistake → observe → fix step. The wrong program fails on stage with the intended
 * specific reason, the fixed program passes, and the copy quotes only real block labels.
 */
const SINGLE_ACTOR = launchLessons.slice(0, 9)
const CHARACTER = { fox: '小狐狸', butterfly: '小蝴蝶' } as const

/** Expected design per lesson (from docs/roadmap/evidence/TQ-002 item 4). */
const EXPECTED: Record<string, { stepId: string; code: string }> = {
  'lesson-01-forest-hello': { stepId: 'step-5', code: 'missing-start' },
  'lesson-02-forest-greeting': { stepId: 'step-4', code: 'say-too-early' },
  'lesson-03-forest-story': { stepId: 'step-4', code: 'say-too-early' },
  'lesson-04-meadow-scene': { stepId: 'step-5', code: 'scene-switch-early' },
  'lesson-05-meadow-order': { stepId: 'step-5', code: 'repeat-without-move' },
  'lesson-06-meadow-story': { stepId: 'step-5', code: 'scene-switch-late' },
  'lesson-07-garden-click': { stepId: 'step-3', code: 'needs-click-trigger' },
  'lesson-08-garden-dialogue': { stepId: 'step-5', code: 'say-too-early' },
  'lesson-09-garden-story': { stepId: 'step-5', code: 'say-too-early' },
}

/** Quoted UI words that are not block names. */
const UI_QUOTES = new Set(['运行'])

function stepOf(lessonId: string, stepId: string) {
  const lesson = launchLessons.find((item) => item.id === lessonId)!
  const index = lesson.steps.findIndex((step) => step.id === stepId)
  return { lesson, step: lesson.steps[index], index }
}

function actorFor(lessonId: string) {
  const lesson = launchLessons.find((item) => item.id === lessonId)!
  const template = launchTemplates.find((item) => item.id === lesson.templateId)!
  return CHARACTER[template.starterCharacters[0] as keyof typeof CHARACTER]
}

describe('TQ-010 one designed mistake step per lesson 01–09', () => {
  it('each of lessons 01–09 has exactly one mistake step, at the planned step, and lessons 10–12 have none here', () => {
    for (const lesson of SINGLE_ACTOR) {
      const designs = mistakeSteps.filter((design) => design.lessonId === lesson.id)
      expect(designs, lesson.id).toHaveLength(1)
      expect(designs[0].stepId, lesson.id).toBe(EXPECTED[lesson.id].stepId)
      const matching = lesson.steps.filter((step) => getMistakeStep(lesson.id, step.id))
      expect(matching, lesson.id).toHaveLength(1)
    }
    expect(mistakeSteps).toHaveLength(9)
    for (const lesson of launchLessons.slice(9)) {
      expect(mistakeSteps.some((design) => design.lessonId === lesson.id), lesson.id).toBe(false)
    }
  })

  it('the stored step index matches the lesson, and lessons keep their 5 关', () => {
    for (const design of mistakeSteps) {
      const { lesson, index } = stepOf(design.lessonId, design.stepId)
      expect(lesson.steps, design.lessonId).toHaveLength(5)
      expect(index, design.lessonId).toBe(design.stepIndex)
      expect(getMistakeStepAt(design.lessonId, design.stepIndex)).toBe(design)
    }
  })

  it('the step title and instruction announce the find-and-fix experiment', () => {
    for (const design of mistakeSteps) {
      const { step } = stepOf(design.lessonId, design.stepId)
      expect(step.title, design.lessonId).toContain('找错再修好')
      expect(step.instruction, design.lessonId).toMatch(/积木区.*摆|积木区有/)
      expect(step.voiceover, design.lessonId).toMatch(/修好/)
    }
  })

  it('the wrong program fails with the intended specific reason (never the generic copy)', () => {
    for (const design of mistakeSteps) {
      const { step } = stepOf(design.lessonId, design.stepId)
      const verdict = evaluateObservable(step.requiredBlockTypes, design.wrongProgram, getStepJudgeOptions(design.lessonId, design.stepId))
      expect(verdict.passed, design.lessonId).toBe(false)
      expect(verdict.code, design.lessonId).toBe(EXPECTED[design.lessonId].code)
      expect(design.expectedCode, design.lessonId).toBe(EXPECTED[design.lessonId].code)
      const kid = explainRunFailure(verdict, actorFor(design.lessonId), motionVerbForLesson(design.lessonId))
      expect(kid.length, design.lessonId).toBeGreaterThan(0)
      expect(kid, design.lessonId).not.toContain('和任务要求')
      expect(kid, design.lessonId).not.toBe('再看看积木的顺序吧！')
    }
  })

  it('what goes wrong is visible on the stage', () => {
    const observe = (lessonId: string) => simulateProgram(mistakeSteps.find((design) => design.lessonId === lessonId)!.wrongProgram)
    // L01 / L05: the program cannot start, so the fox stays at 0 steps.
    expect(observe('lesson-01-forest-hello').ok).toBe(false)
    expect(observe('lesson-05-meadow-order').ok).toBe(false)
    // L02 / L03 / L08 / L09: the line is spoken at 0 steps, before moving.
    for (const id of ['lesson-02-forest-greeting', 'lesson-03-forest-story', 'lesson-08-garden-dialogue', 'lesson-09-garden-story']) {
      const run = observe(id)
      expect(run.ok && run.observed.messageAt, id).toBe(0)
      expect(run.ok && run.observed.position, id).toBeGreaterThan(0)
    }
    // L04: the scene changes before the first step; L06: only after 200 steps in the forest.
    const l04 = observe('lesson-04-meadow-scene')
    expect(l04.ok && l04.observed).toMatchObject({ scene: 'meadow', sceneSwitchAt: 0, position: 100 })
    const l06 = observe('lesson-06-meadow-story')
    expect(l06.ok && l06.observed).toMatchObject({ scene: 'meadow', sceneSwitchAt: 200 })
    // L07: “开始时” starts on run — the butterfly flies 100 steps without any click.
    const l07 = observe('lesson-07-garden-click')
    expect(l07.ok && l07.observed).toMatchObject({ trigger: 'start', position: 100 })
  })

  it('the fixed program passes the step goal', () => {
    for (const design of mistakeSteps) {
      const { step } = stepOf(design.lessonId, design.stepId)
      const verdict = evaluateObservable(step.requiredBlockTypes, design.fixedProgram, getStepJudgeOptions(design.lessonId, design.stepId))
      expect(verdict, design.lessonId).toMatchObject({ passed: true, code: null })
    }
  })

  it('lesson 09 accepts both reply timings after the fix (fly once or twice, then reply)', () => {
    const options = getStepJudgeOptions('lesson-09-garden-story', 'step-5')
    const required = stepOf('lesson-09-garden-story', 'step-5').step.requiredBlockTypes
    const late = ['when_clicked', 'move_right', 'repeat_twice', 'say_line'].map((type) => ({ type }))
    expect(evaluateObservable(required, late, options).passed).toBe(true)
  })

  it('the wrong and fixed programs only use blocks the step offers (nothing is dropped on restore)', () => {
    for (const design of mistakeSteps) {
      const { step } = stepOf(design.lessonId, design.stepId)
      expect(restoreBlockSequence(design.wrongProgram, step.allowedBlocks), design.lessonId).toEqual(design.wrongProgram)
      expect(restoreBlockSequence(design.fixedProgram, step.allowedBlocks), design.lessonId).toEqual(design.fixedProgram)
    }
  })

  it('each question has one right answer and at least one other choice, each with a reply', () => {
    for (const design of mistakeSteps) {
      expect(design.question, design.lessonId).toMatch(/？$/)
      expect(design.choices.length, design.lessonId).toBeGreaterThanOrEqual(2)
      expect(design.choices.filter((choice) => choice.correct), design.lessonId).toHaveLength(1)
      expect(new Set(design.choices.map((choice) => choice.id)).size, design.lessonId).toBe(design.choices.length)
      for (const choice of design.choices) expect(choice.reply.length, `${design.lessonId} ${choice.id}`).toBeGreaterThan(0)
      expect(design.choices.find((choice) => choice.correct)!.reply, design.lessonId).toMatch(/^对！/)
    }
  })
})

describe('TQ-010 mistake copy matches what the blocks and stage show', () => {
  it('every quoted block name (or quoted sequence) is a real label of that lesson\'s blocks', () => {
    const unknown: string[] = []
    for (const design of mistakeSteps) {
      const names = new Set(allKidsBlockLabels(motionVerbForLesson(design.lessonId)))
      const { step } = stepOf(design.lessonId, design.stepId)
      for (const text of [...mistakeStepCopy(design), step.title, step.instruction]) {
        for (const [, quote] of text.matchAll(/“([^”]+)”/g)) {
          if (UI_QUOTES.has(quote)) continue
          for (const part of quote.split(' → ')) if (!names.has(part)) unknown.push(`${design.lessonId}: “${part}” in: ${text}`)
        }
      }
    }
    expect(unknown).toEqual([])
  })

  it('the quoted wrong program in the setup is exactly the program put on the workspace', () => {
    for (const design of mistakeSteps) {
      const sequence = design.setup.match(/“([^”]+ → [^”]+)”/)
      if (!sequence) continue
      const verb = motionVerbForLesson(design.lessonId)
      const labels = design.wrongProgram.map((block) => getKidsBlockLabel(block.type, verb))
      expect(sequence[1].split(' → '), design.lessonId).toEqual(labels)
    }
  })

  it('butterfly lessons (07–09) never say the butterfly walks, and name the butterfly', () => {
    for (const design of mistakeSteps.filter((item) => motionVerbForLesson(item.lessonId) === 'fly')) {
      const copy = mistakeStepCopy(design).join('')
      expect(copy, design.lessonId).not.toContain('走')
      expect(copy, design.lessonId).toContain('蝴蝶')
      expect(copy, design.lessonId).not.toContain('角色')
    }
  })

  it('fox lessons (01–06) name 小狐狸, never a generic “小动物”', () => {
    for (const design of mistakeSteps.filter((item) => motionVerbForLesson(item.lessonId) === 'walk')) {
      const copy = mistakeStepCopy(design).join('')
      expect(copy, design.lessonId).toContain('小狐狸')
      expect(copy, design.lessonId).not.toContain('小动物')
    }
  })

  it('lesson steps are “关”, distances are “步”', () => {
    for (const design of mistakeSteps) {
      for (const text of mistakeStepCopy(design)) expect(text, text).not.toMatch(/第\s*\d+\s*步|这一步|本步|走一步/)
    }
  })

  it('distances in the copy are whole moves and never more than the wrong or fixed program walks', () => {
    for (const design of mistakeSteps) {
      const wrong = simulateProgram(design.wrongProgram)
      const fixed = simulateProgram(design.fixedProgram)
      const most = Math.max(wrong.ok ? wrong.observed.position : 0, fixed.ok ? fixed.observed.position : 0)
      for (const text of mistakeStepCopy(design)) {
        for (const [, n] of text.matchAll(/(\d+) 步/g)) {
          expect(Number(n) % 100, text).toBe(0)
          expect(Number(n), text).toBeLessThanOrEqual(most)
        }
      }
    }
  })
})
