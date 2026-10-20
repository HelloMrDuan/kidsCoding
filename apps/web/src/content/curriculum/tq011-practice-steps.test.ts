import { describe, expect, it } from 'vitest'

import { allKidsBlockLabels, getKidsBlockLabel, motionVerbForLesson } from '@/features/lessons/blockly/block-labels'
import { evaluateObservable, simulateProgram, type ObservedRun } from '@/features/lessons/blockly/observable-run'
import { restoreBlockSequence } from '@/features/lessons/blockly/restore-block-sequence'
import { getStepJudgeOptions } from '@/features/lessons/blockly/step-judge-options'

import { launchLessons, launchTemplates } from './launch-lessons'
import { mistakeSteps } from './mistake-steps'
import {
  asksClickPrediction,
  getPracticeStep,
  getPracticeStepAt,
  getPracticeStepFor,
  isPracticeAnswered,
  practiceStepCopy,
  practiceSteps,
} from './practice-steps'

/**
 * TQ-011 (= TQ-002e): each Blockly lesson 01–09 has exactly one second practice whose GOAL
 * differs from the main build; steps that only re-ran the same program are gone; lessons
 * 03 / 06 / 08 no longer repeat the previous lesson block for block.
 */
const SINGLE_ACTOR = launchLessons.slice(0, 9)
const CHARACTER = { fox: '小狐狸', butterfly: '小蝴蝶' } as const
const FRIEND = { rabbit: '小兔子', bird: '草地小鸟', frog: '小青蛙' } as const
/** Quoted words that are not block names: the run button, the line picker, and the lines the stage really says. */
const NON_BLOCK_QUOTES = new Set(['运行', '选一句对白', '你好！', '我到草地啦！', '蝴蝶收到你的点击啦！'])

const lessonOf = (id: string) => launchLessons.find((lesson) => lesson.id === id)!
const stepOf = (lessonId: string, stepId: string) => lessonOf(lessonId).steps.find((step) => step.id === stepId)!
const templateOf = (lessonId: string) => launchTemplates.find((template) => template.id === lessonOf(lessonId).templateId)!

function observe(types: string[]): ObservedRun {
  const run = simulateProgram(types.map((type) => ({ type })))
  if (!run.ok) throw new Error(`reference program cannot run: ${types.join(',')}`)
  return run.observed
}

describe('TQ-011 one second practice per lesson 01–09', () => {
  it('each of lessons 01–09 has exactly one practice step at its stored index; lessons 10–12 have none here', () => {
    expect(practiceSteps).toHaveLength(9)
    for (const lesson of SINGLE_ACTOR) {
      const designs = practiceSteps.filter((design) => design.lessonId === lesson.id)
      expect(designs, lesson.id).toHaveLength(1)
      const matching = lesson.steps.filter((step) => getPracticeStep(lesson.id, step.id))
      expect(matching, lesson.id).toHaveLength(1)
      const index = lesson.steps.findIndex((step) => step.id === designs[0].stepId)
      expect(index, lesson.id).toBe(designs[0].stepIndex)
      expect(getPracticeStepAt(lesson.id, index)).toBe(designs[0])
    }
    for (const lesson of launchLessons.slice(9)) {
      expect(practiceSteps.some((design) => design.lessonId === lesson.id), lesson.id).toBe(false)
    }
  })

  it('the panel only attaches to a step whose goal program is the design (a stale published copy gets no panel)', () => {
    for (const design of practiceSteps) {
      const step = stepOf(design.lessonId, design.stepId)
      expect(getPracticeStepFor(design.lessonId, step), design.lessonId).toBe(design)
      expect(getPracticeStepFor(design.lessonId, { id: step.id, requiredBlockTypes: ['when_start'] }), design.lessonId).toBeUndefined()
      expect(getPracticeStepFor(design.lessonId, stepOf(design.lessonId, design.mainStepId)), design.lessonId).toBeUndefined()
    }
    expect(getPracticeStepFor('lesson-01-forest-hello', undefined)).toBeUndefined()
  })

  it('the practice goal type differs from the main build, and the mode follows the goal type', () => {
    for (const design of practiceSteps) {
      expect(design.goalType, design.lessonId).not.toBe(design.mainGoalType)
      expect(design.mode, design.lessonId).toBe(design.goalType === 'change-distance' ? 'predict' : 'compare')
      expect(design.mainStepId, design.lessonId).not.toBe(design.stepId)
      expect(stepOf(design.lessonId, design.mainStepId), design.lessonId).toBeTruthy()
    }
    // The three goal types the audit asked for are all used.
    expect(new Set(practiceSteps.map((design) => design.goalType))).toEqual(new Set(['change-distance', 'compare-orders', 'compare-events']))
  })

  it('the practice and its lesson\'s mistake step are different steps, and every lesson keeps its TQ-010 mistake step', () => {
    for (const design of practiceSteps) {
      const mistakes = mistakeSteps.filter((item) => item.lessonId === design.lessonId)
      expect(mistakes, design.lessonId).toHaveLength(1)
      expect(mistakes[0].stepId, design.lessonId).not.toBe(design.stepId)
    }
  })

  it('the practice reference program is the step goal, passes, and uses only blocks the step offers', () => {
    for (const design of practiceSteps) {
      const step = stepOf(design.lessonId, design.stepId)
      expect(design.referenceProgram.map((block) => block.type), design.lessonId).toEqual(step.requiredBlockTypes)
      const verdict = evaluateObservable(step.requiredBlockTypes, design.referenceProgram, getStepJudgeOptions(design.lessonId, design.stepId))
      expect(verdict, design.lessonId).toMatchObject({ passed: true, code: null })
      expect(restoreBlockSequence(design.referenceProgram, step.allowedBlocks), design.lessonId).toEqual(design.referenceProgram)
    }
  })

  it('the practice has a different observable result from the main build: neither program passes the other step', () => {
    for (const design of practiceSteps) {
      const practice = stepOf(design.lessonId, design.stepId)
      const main = stepOf(design.lessonId, design.mainStepId)
      expect(observe(practice.requiredBlockTypes), design.lessonId).not.toEqual(observe(main.requiredBlockTypes))
      const mainProgram = main.requiredBlockTypes.map((type) => ({ type }))
      expect(evaluateObservable(practice.requiredBlockTypes, mainProgram, getStepJudgeOptions(design.lessonId, design.stepId)).passed, design.lessonId).toBe(false)
      expect(evaluateObservable(main.requiredBlockTypes, design.referenceProgram, getStepJudgeOptions(design.lessonId, design.mainStepId)).passed, design.lessonId).toBe(false)
    }
  })

  it('compare-orders keeps the same blocks in another order; compare-events swaps only the start event', () => {
    const sorted = (types: string[]) => [...types].sort().join(',')
    for (const design of practiceSteps) {
      const practice = stepOf(design.lessonId, design.stepId).requiredBlockTypes
      const main = stepOf(design.lessonId, design.mainStepId).requiredBlockTypes
      if (design.goalType === 'compare-orders') {
        expect(sorted(practice), design.lessonId).toBe(sorted(main))
        expect(practice, design.lessonId).not.toEqual(main)
      }
      if (design.goalType === 'compare-events') {
        expect(practice.slice(1), design.lessonId).toEqual(main.slice(1))
        expect(practice[0], design.lessonId).not.toBe(main[0])
      }
    }
  })
})

describe('TQ-011 no step only re-runs the previous one', () => {
  it('no two consecutive steps of lessons 01–09 have the same goal program or the same observable result', () => {
    for (const lesson of SINGLE_ACTOR) {
      for (let index = 1; index < lesson.steps.length; index += 1) {
        const before = lesson.steps[index - 1]
        const after = lesson.steps[index]
        expect(after.requiredBlockTypes, `${lesson.id} ${before.id}→${after.id}`).not.toEqual(before.requiredBlockTypes)
        expect(observe(after.requiredBlockTypes), `${lesson.id} ${before.id}→${after.id}`).not.toEqual(observe(before.requiredBlockTypes))
      }
    }
  })

  it('lessons stay short for 5–7 year olds: warm-up, main build, second practice, designed mistake', () => {
    for (const lesson of SINGLE_ACTOR) {
      expect(lesson.steps.length, lesson.id).toBeGreaterThanOrEqual(4)
      expect(lesson.steps.length, lesson.id).toBeLessThanOrEqual(6)
      expect(new Set(lesson.steps.map((step) => step.id)).size, lesson.id).toBe(lesson.steps.length)
      lesson.steps.forEach((step, index) => expect(step.id, lesson.id).toBe(`step-${index + 1}`))
    }
  })

  it('lessons 03 / 06 / 08 no longer repeat the previous lesson block for block', () => {
    const goals = (id: string) => lessonOf(id).steps.map((step) => step.requiredBlockTypes.join(','))
    for (const [lesson, previous] of [
      ['lesson-03-forest-story', 'lesson-02-forest-greeting'],
      ['lesson-06-meadow-story', 'lesson-05-meadow-order'],
      ['lesson-08-garden-dialogue', 'lesson-07-garden-click'],
    ]) {
      const earlier = new Set(goals(previous))
      const fresh = goals(lesson).filter((goal) => !earlier.has(goal))
      // More than a single new step: the main build or the practice is new to this lesson.
      expect(fresh.length, lesson).toBeGreaterThanOrEqual(2)
    }
    // Lesson 03's main build is the walk all the way to the rabbit, then the greeting.
    expect(stepOf('lesson-03-forest-story', 'step-2').requiredBlockTypes).toEqual(['when_start', 'move_right', 'move_right', 'say_line'])
    expect(stepOf('lesson-02-forest-greeting', 'step-2').requiredBlockTypes).toEqual(['when_start', 'move_right', 'say_line'])
  })
})

describe('TQ-011 practice questions and copy match the blocks and the stage', () => {
  it('each question has one right answer (and at least one other choice), each with a reply', () => {
    for (const design of practiceSteps) {
      expect(design.question, design.lessonId).toMatch(/？$/)
      expect(design.choices.length, design.lessonId).toBeGreaterThanOrEqual(2)
      expect(design.choices.filter((choice) => choice.correct), design.lessonId).toHaveLength(1)
      expect(new Set(design.choices.map((choice) => choice.id)).size, design.lessonId).toBe(design.choices.length)
      for (const choice of design.choices) expect(choice.reply.length, `${design.lessonId} ${choice.id}`).toBeGreaterThan(0)
      const right = design.choices.find((choice) => choice.correct)!
      expect(right.reply, design.lessonId).toMatch(design.mode === 'predict' ? /^猜对啦！/ : /^对！/)
    }
  })

  it('predict: the right guess names the distance the stage really shows', () => {
    for (const design of practiceSteps.filter((item) => item.mode === 'predict')) {
      const run = observe(stepOf(design.lessonId, design.stepId).requiredBlockTypes)
      const right = design.choices.find((choice) => choice.correct)!
      const named = [...right.label.matchAll(/(\d+) 步/g)].map(([, n]) => Number(n))
      expect(named.some((n) => n === run.position || n === run.sceneSwitchAt), `${design.lessonId}: ${right.label}`).toBe(true)
      // Every wrong guess names a different distance, never the real one.
      for (const wrong of design.choices.filter((choice) => !choice.correct)) {
        const numbers = [...wrong.label.matchAll(/(\d+) 步/g)].map(([, n]) => Number(n))
        expect(numbers, design.lessonId).not.toContain(run.sceneSwitchAt ?? run.position)
      }
    }
  })

  it('compare: the right answer names what really differs on stage (line, where it is said, or the start event)', () => {
    for (const design of practiceSteps.filter((item) => item.mode === 'compare')) {
      const practice = observe(stepOf(design.lessonId, design.stepId).requiredBlockTypes)
      const main = observe(stepOf(design.lessonId, design.mainStepId).requiredBlockTypes)
      const right = design.choices.find((choice) => choice.correct)!
      const text = `${right.label}${right.reply}`
      if (practice.message !== main.message) {
        expect(text, design.lessonId).toContain(`“${practice.message}”`)
        expect(text, design.lessonId).toContain(`“${main.message}”`)
      } else if (practice.messageAt !== main.messageAt) {
        expect(text, design.lessonId).toContain(`${practice.messageAt} 步`)
        expect(text, design.lessonId).toContain(`${main.messageAt} 步`)
      }
      if (practice.trigger !== main.trigger) {
        expect(text, design.lessonId).toContain(practice.trigger === 'start' ? '“开始时”' : '“被点击时”')
        expect(text, design.lessonId).toContain(main.trigger === 'start' ? '“开始时”' : '“被点击时”')
      }
    }
  })

  it('isPracticeAnswered: any guess before a predict run, only the right answer for a comparison', () => {
    for (const design of practiceSteps) {
      expect(isPracticeAnswered(design, null), design.lessonId).toBe(false)
      expect(isPracticeAnswered(design, 'not-a-choice'), design.lessonId).toBe(false)
      for (const choice of design.choices) {
        expect(isPracticeAnswered(design, choice.id), `${design.lessonId} ${choice.id}`).toBe(design.mode === 'predict' ? true : choice.correct)
      }
    }
    expect(isPracticeAnswered(undefined, null)).toBe(true)
  })

  it('every quoted block name (or quoted sequence) is a real label of that lesson\'s blocks', () => {
    const unknown: string[] = []
    for (const design of practiceSteps) {
      const names = new Set(allKidsBlockLabels(motionVerbForLesson(design.lessonId)))
      const step = stepOf(design.lessonId, design.stepId)
      for (const text of [...practiceStepCopy(design), step.title, step.instruction]) {
        for (const [, quote] of text.matchAll(/“([^”]+)”/g)) {
          if (NON_BLOCK_QUOTES.has(quote)) continue
          for (const part of quote.split(' → ')) if (!names.has(part)) unknown.push(`${design.lessonId}: “${part}” in: ${text}`)
        }
      }
    }
    expect(unknown).toEqual([])
  })

  it('a quoted program in the setup is exactly the step\'s reference program', () => {
    for (const design of practiceSteps) {
      const sequence = design.setup.match(/“([^”]+ → [^”]+)”/)
      if (!sequence) continue
      const verb = motionVerbForLesson(design.lessonId)
      expect(sequence[1].split(' → '), design.lessonId).toEqual(design.referenceProgram.map((block) => getKidsBlockLabel(block.type, verb)))
    }
  })

  it('the step title, instruction and voiceover announce the new practice', () => {
    for (const design of practiceSteps) {
      const step = stepOf(design.lessonId, design.stepId)
      expect(step.title, design.lessonId).toMatch(/^新练习：/)
      expect(design.title, design.lessonId).toBe(step.title)
      expect(step.voiceover, design.lessonId).toMatch(design.mode === 'predict' ? /猜/ : /比/)
      expect(step.instruction, design.lessonId).toMatch(design.mode === 'predict' ? /猜/ : /比一比/)
    }
  })

  it('characters match the stage: the fox walks (01–06), the butterfly flies and never walks (07–09), friends are the template\'s', () => {
    for (const design of practiceSteps) {
      const template = templateOf(design.lessonId)
      const step = stepOf(design.lessonId, design.stepId)
      const copy = [...practiceStepCopy(design), step.title, step.instruction].join('')
      const actor = CHARACTER[template.starterCharacters[0] as keyof typeof CHARACTER]
      const friend = FRIEND[template.starterCharacters[1] as keyof typeof FRIEND]
      if (actor === '小狐狸') {
        expect(copy, design.lessonId).toContain('小狐狸')
        expect(copy, design.lessonId).not.toMatch(/飞|蝴蝶/)
      } else {
        expect(copy, design.lessonId).toContain('蝴蝶')
        expect(copy, design.lessonId).not.toContain('走')
        expect(copy, design.lessonId).not.toContain('小狐狸')
      }
      // Only this stage's friend is named (“小鸟” covers the nametag “草地小鸟”).
      const short = { 小兔子: '小兔子', 草地小鸟: '小鸟', 小青蛙: '小青蛙' } as const
      for (const other of Object.values(FRIEND)) {
        if (other !== friend) expect(copy, design.lessonId).not.toContain(short[other])
      }
      if (/小兔子|小鸟|小青蛙/.test(copy)) expect(copy, design.lessonId).toContain(short[friend])
      expect(copy, design.lessonId).not.toContain('小动物')
      expect(copy, design.lessonId).not.toContain('角色')
    }
  })

  it('lesson steps are “关”, distances are “步” (whole moves, never past what the step\'s program can reach)', () => {
    for (const design of practiceSteps) {
      const run = observe(stepOf(design.lessonId, design.stepId).requiredBlockTypes)
      for (const text of practiceStepCopy(design)) {
        expect(text, text).not.toMatch(/第\s*\d+\s*步|这一步|本步|走一步/)
        for (const [, n] of text.matchAll(/(\d+) 步/g)) {
          expect(Number(n) % 100, text).toBe(0)
          expect(Number(n), text).toBeLessThanOrEqual(Math.max(run.position, 200))
        }
      }
    }
  })

  it('the garden “先猜一猜” about clicks is asked only in lesson 07\'s main build and its mistake step', () => {
    const asked = SINGLE_ACTOR.flatMap((lesson) => lesson.steps.filter((step) => asksClickPrediction(lesson.id, step.id)).map((step) => `${lesson.id}|${step.id}`))
    expect(asked).toEqual(['lesson-07-garden-click|step-2', 'lesson-07-garden-click|step-4'])
    expect(stepOf('lesson-07-garden-click', 'step-2').requiredBlockTypes[0]).toBe('when_clicked')
    expect(mistakeSteps.find((item) => item.lessonId === 'lesson-07-garden-click')!.stepId).toBe('step-4')
  })

  it('parent advice for lesson 08 no longer promises “不同的点法” (no such ability in the classroom)', () => {
    expect(lessonOf('lesson-08-garden-dialogue').parentAdvice).not.toContain('点法')
    expect(lessonOf('lesson-08-garden-dialogue').parentAdvice).toContain('“开始时”')
  })
})
