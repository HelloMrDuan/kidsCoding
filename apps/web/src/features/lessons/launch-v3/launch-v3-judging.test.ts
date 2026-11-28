import { describe, expect, it } from 'vitest'

import { mistakeSteps } from '@/content/curriculum/mistake-steps'
import { practiceSteps } from '@/content/curriculum/practice-steps'
import type { ProgramBlock } from '@/features/lessons/blockly/observable-run'
import { getSayLineChoices } from '@/features/lessons/blockly/step-judge-options'

import { buildLaunchJudgment, judgeLaunchStep } from './launch-v3-judging'
import { getLaunchV3Lesson, LAUNCH_V3_LESSON_IDS, launchV3DuoMode } from './launch-v3-lessons'

const ids = LAUNCH_V3_LESSON_IDS as readonly string[]
const b = (...types: string[]): ProgramBlock[] => types.map((type) => ({ type }))

/** lesson-02 的对白必须从预设里选：给未选句的说话积木补上第一句预设。 */
function withLine(lessonId: string, blocks: readonly ProgramBlock[]): ProgramBlock[] {
  const line = getSayLineChoices(lessonId)?.[0]?.id
  return blocks.map((block) =>
    line && block.type === 'say_line' && !block.line ? { ...block, line } : { ...block },
  )
}

const single = ids.filter((id) => !launchV3DuoMode(id))
const duo = ids.filter((id) => launchV3DuoMode(id))

describe('OPS-056 launch-v3 registry', () => {
  it('covers lesson-02..12, with L10-L12 as duo lessons', () => {
    expect(ids).toHaveLength(11)
    expect(duo).toEqual([
      'lesson-10-second-friend',
      'lesson-11-duo-rehearsal',
      'lesson-12-graduation-show',
    ])
    for (const id of ids) expect(getLaunchV3Lesson(id)?.id).toBe(id)
    expect(getLaunchV3Lesson('lesson-01-forest-hello')).toBeNull()
  })
})

describe('OPS-056 single-role lessons (evaluateObservable)', () => {
  it.each(single)('%s: every step target program passes', (id) => {
    const lesson = getLaunchV3Lesson(id)!
    lesson.steps.forEach((step, index) => {
      const result = judgeLaunchStep(id, withLine(id, b(...step.requiredBlockTypes)), index)
      expect({ step: step.id, passed: result.passed, failure: result.failure }).toEqual({
        step: step.id,
        passed: true,
        failure: null,
      })
      expect(buildLaunchJudgment(result).passed).toBe(true)
    })
  })

  const mistakes = mistakeSteps.filter((m) => ids.includes(m.lessonId))

  it('has a designed mistake step for every single-role lesson', () => {
    expect(new Set(mistakes.map((m) => m.lessonId))).toEqual(new Set(single))
  })

  it.each(mistakes.map((m) => [m.lessonId, m] as const))(
    '%s: the wrong program is the experiment first, then a real failure; the fix passes',
    (id, m) => {
      const first = judgeLaunchStep(id, m.wrongProgram, m.stepIndex, false)
      expect(first.passed).toBe(false)
      expect(first.designedMistake).toBe(true)
      expect(first.failure).toBe(m.expectedCode)
      const again = judgeLaunchStep(id, m.wrongProgram, m.stepIndex, true)
      expect(again.passed).toBe(false)
      expect(again.designedMistake).toBe(false)
      const fixed = judgeLaunchStep(id, withLine(id, m.fixedProgram), m.stepIndex, true)
      expect(fixed.passed).toBe(true)
    },
  )

  const practices = practiceSteps.filter((p) => ids.includes(p.lessonId))

  it.each(practices.map((p) => [p.lessonId, p] as const))(
    '%s: the practice reference program passes',
    (id, p) => {
      expect(judgeLaunchStep(id, withLine(id, p.referenceProgram), p.stepIndex).passed).toBe(true)
    },
  )

  it('lesson-04: frames walk in the forest, then switch to the meadow', () => {
    const result = judgeLaunchStep(
      'lesson-04-meadow-scene',
      b('when_start', 'move_right', 'switch_scene'),
      1,
    )
    expect(result.passed).toBe(true)
    expect(result.frames.map((f) => [f.mainPosition, f.scene, f.log])).toEqual([
      [100, 'forest', '向右走 100 步'],
      [100, 'meadow', '切换场景到草地'],
    ])
  })

  it('lesson-04: switching the scene before moving runs but fails', () => {
    const result = judgeLaunchStep(
      'lesson-04-meadow-scene',
      b('when_start', 'switch_scene', 'move_right'),
      1,
      true,
    )
    expect(result.passed).toBe(false)
    expect(result.canRun).toBe(true)
  })

  it('lesson-06: a line said in the forest is cleared when the scene switches', () => {
    const result = judgeLaunchStep(
      'lesson-06-meadow-story',
      b('when_start', 'move_right', 'say_line', 'switch_scene', 'repeat_twice'),
      2,
    )
    const sayFrame = result.frames.find((f) => f.mainAction === 'speaking')
    expect(sayFrame?.mainMessage).toBeTruthy()
    expect(result.final.scene).toBe('meadow')
    expect(result.final.mainMessage).toBeNull()
  })

  it('lesson-08: a click program reports the click trigger and speaks after flying', () => {
    const result = judgeLaunchStep(
      'lesson-08-garden-dialogue',
      b('when_clicked', 'move_right', 'say_line'),
      1,
    )
    expect(result.trigger).toBe('click')
    expect(result.passed).toBe(true)
    expect(result.frames[1].mainAction).toBe('speaking')
    expect(result.final.mainMessage).toBeTruthy()
  })

  it('lesson-09: repeat adds a second 100 steps as its own frame', () => {
    const result = judgeLaunchStep(
      'lesson-09-garden-story',
      b('when_clicked', 'move_right', 'say_line', 'repeat_twice'),
      1,
    )
    expect(result.passed).toBe(true)
    expect(result.frames.map((f) => f.mainPosition)).toEqual([100, 100, 200])
    expect(result.frames[2].log).toBe('再走 100 步（重复）')
  })

  it('a program that cannot run never plays frames and fails knowledge', () => {
    const result = judgeLaunchStep('lesson-03-forest-story', b('move_right', 'move_right'), 0)
    expect(result.canRun).toBe(false)
    expect(result.frames).toEqual([])
    expect(result.passed).toBe(false)
    expect(buildLaunchJudgment(result).layers.find((l) => l.id === 'knowledge')?.passed).toBe(false)
  })
})

describe('OPS-056 duo lessons (judgeDuoProgram)', () => {
  it.each(duo)('%s: every step target program passes', (id) => {
    const lesson = getLaunchV3Lesson(id)!
    lesson.steps.forEach((step, index) => {
      const result = judgeLaunchStep(id, b(...step.requiredBlockTypes), index)
      expect({ step: step.id, passed: result.passed, failure: result.failure }).toEqual({
        step: step.id,
        passed: true,
        failure: null,
      })
    })
  })

  it('lesson-10: forgetting the switch moves only the fox and fails', () => {
    const result = judgeLaunchStep(
      'lesson-10-second-friend',
      b('when_start', 'move_right', 'move_right'),
      2,
    )
    expect(result.passed).toBe(false)
    expect(result.final.partnerPosition).toBe(0)
  })

  it('lesson-11: only the bear says the departure line', () => {
    const result = judgeLaunchStep(
      'lesson-11-duo-rehearsal',
      b('when_start', 'move_right', 'switch_character', 'move_right', 'say_line'),
      2,
    )
    expect(result.passed).toBe(true)
    expect(result.final.partnerMessage).toBe('我们一起出发吧！')
    expect(result.final.mainMessage).toBeNull()
    expect(result.final.activeActor).toBe('partner')
  })

  it('lesson-12: the gift appears only when the fox is at 100 and the bear at 200', () => {
    const ok = judgeLaunchStep(
      'lesson-12-graduation-show',
      b('when_start', 'move_right', 'switch_character', 'move_right', 'repeat_twice'),
      2,
    )
    expect(ok.passed).toBe(true)
    expect(ok.giftFound).toBe(true)
    expect([ok.final.mainPosition, ok.final.partnerPosition]).toEqual([100, 200])
    const short = judgeLaunchStep(
      'lesson-12-graduation-show',
      b('when_start', 'move_right', 'switch_character', 'move_right'),
      3,
      true,
    )
    expect(short.passed).toBe(false)
    expect(short.giftFound).toBe(false)
  })

  it('a duo program without the start hat never runs', () => {
    const result = judgeLaunchStep('lesson-10-second-friend', b('move_right'), 1)
    expect(result.canRun).toBe(false)
    expect(result.frames).toEqual([])
  })
})
