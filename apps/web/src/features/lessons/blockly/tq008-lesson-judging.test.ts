import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'

import { evaluateStep } from './evaluate-step'
import { evaluateObservable, simulateProgram, type ProgramBlock } from './observable-run'
import { FOREST_GREETING_LINES } from './say-line-presets'
import { getSayLineChoices, getStepJudgeOptions } from './step-judge-options'

const b = (...types: string[]): ProgramBlock[] => types.map((type) => ({ type }))
const lesson = (id: string) => launchLessons.find((item) => item.id === id)!
const stepOf = (lessonId: string, stepId: string) => lesson(lessonId).steps.find((step) => step.id === stepId)!

describe('lesson-02 step-5: the preset dialogue choice is real (TQ-008)', () => {
  const step = stepOf('lesson-02-forest-greeting', 'step-5')
  const options = getStepJudgeOptions('lesson-02-forest-greeting', 'step-5')

  it('offers 3–4 fixed kid-safe preset lines and no free text', () => {
    const choices = getSayLineChoices('lesson-02-forest-greeting')!
    expect(choices.length).toBeGreaterThanOrEqual(3)
    expect(choices.length).toBeLessThanOrEqual(4)
    for (const choice of choices) expect(choice.text.length).toBeLessThanOrEqual(8)
    expect(step.instruction).toContain('选一句对白')
  })

  it.each(FOREST_GREETING_LINES.map((line) => [line.id, line.text]))('accepts preset “%s” and the stage says it', (id, text) => {
    const program: ProgramBlock[] = [{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line: id }]
    const run = simulateProgram(program)
    expect(run.ok && run.observed.message).toBe(text)
    expect(evaluateStep(step.requiredBlockTypes, program, options)).toBe(true)
  })

  it('still rejects the wrong order with a chosen line (say before moving)', () => {
    const program: ProgramBlock[] = [{ type: 'when_start' }, { type: 'say_line', line: 'lets-play' }, { type: 'move_right' }]
    const verdict = evaluateObservable(step.requiredBlockTypes, program, options)
    expect(verdict.passed).toBe(false)
    expect(verdict.code).toBe('say-too-early')
  })

  it('an unknown line id never reaches the stage (falls back to the default greeting)', () => {
    const run = simulateProgram([{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line: 'free text!' }])
    expect(run.ok && run.observed.message).toBe('你好！')
  })

  it('the choice is scoped: lessons without presets keep their fixed line', () => {
    expect(getSayLineChoices('lesson-03-forest-story')).toBeUndefined()
    const verdict = evaluateObservable(['when_start', 'move_right', 'say_line'], [{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line: 'hi-all' }], getStepJudgeOptions('lesson-03-forest-story', 'step-5'))
    expect(verdict.code).toBe('wrong-line')
  })

  it('parent advice no longer promises something the classroom cannot do', () => {
    expect(lesson('lesson-02-forest-greeting').parentAdvice).toContain('预设对白')
  })
})

describe('lesson-09 step-5: instruction and judge agree (TQ-008)', () => {
  const step = stepOf('lesson-09-garden-story', 'step-5')
  const options = getStepJudgeOptions('lesson-09-garden-story', 'step-5')

  it('the instruction describes flying twice with the line after either flight', () => {
    expect(step.instruction).toContain('一共飞两次')
    expect(step.instruction).not.toContain('连着动两次，再回一句话')
  })

  it('accepts the reference program (move → say → repeat)', () => {
    expect(evaluateStep(step.requiredBlockTypes, b('when_clicked', 'move_right', 'say_line', 'repeat_twice'), options)).toBe(true)
  })

  it('accepts following the instruction literally: fly twice, then reply (move → repeat → say)', () => {
    expect(evaluateStep(step.requiredBlockTypes, b('when_clicked', 'move_right', 'repeat_twice', 'say_line'), options)).toBe(true)
    expect(evaluateStep(step.requiredBlockTypes, b('when_clicked', 'move_right', 'move_right', 'say_line'), options)).toBe(true)
  })

  it.each([
    ['speaks before flying', b('when_clicked', 'say_line', 'move_right', 'repeat_twice'), 'say-too-early'],
    ['flies only once', b('when_clicked', 'move_right', 'say_line'), 'too-few-moves'],
    ['never replies', b('when_clicked', 'move_right', 'repeat_twice'), 'missing-say'],
    ['starts without a click', b('when_start', 'move_right', 'say_line', 'repeat_twice'), 'needs-click-trigger'],
    ['flies three times', b('when_clicked', 'move_right', 'repeat_twice', 'repeat_twice', 'say_line'), 'too-many-moves'],
  ])('rejects a truly wrong program: %s', (_name, program, code) => {
    const verdict = evaluateObservable(step.requiredBlockTypes, program, options)
    expect(verdict.passed).toBe(false)
    expect(verdict.code).toBe(code)
  })

  it('the say-timing flexibility is limited to lesson-09 step-5', () => {
    expect(getStepJudgeOptions('lesson-09-garden-story', 'step-4').sayAnyTimeAfterMove).toBeUndefined()
    expect(getStepJudgeOptions('lesson-06-meadow-story', 'step-5').sayAnyTimeAfterMove).toBeUndefined()
    // lesson-06 still insists on speaking after the full journey
    const l06 = stepOf('lesson-06-meadow-story', 'step-5')
    expect(evaluateStep(l06.requiredBlockTypes, b('when_start', 'move_right', 'switch_scene', 'say_line', 'repeat_twice'), getStepJudgeOptions('lesson-06-meadow-story', 'step-5'))).toBe(false)
  })
})
