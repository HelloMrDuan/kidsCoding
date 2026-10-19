import { describe, expect, it } from 'vitest'

import {
  allKidsBlockLabels,
  getKidsBlockLabel,
  motionVerbForLesson,
  motionVerbForTemplate,
  type MotionVerb,
} from '@/features/lessons/blockly/block-labels'
import { simulateProgram, STEP_DISTANCE } from '@/features/lessons/blockly/observable-run'
import { explainRunFailure } from '@/features/lessons/blockly/run-feedback'
import { getFoundationLessonFeedback } from '@/features/lessons/foundation-lesson-feedback'
import { buildProjectCompletionCopy } from '@/features/projects/build-project-completion-copy'

import { duoLessonHints, launchLessons } from './launch-lessons'
import { remedialLessons } from './remedial-lessons'

/**
 * TQ-009: lessons 01–12 must say exactly what the blocks and the stage show.
 * One move = STEP_DISTANCE steps, block names quoted in copy are the real labels,
 * and the repeat block is described as repeating the move (not “the last block”).
 */

const SINGLE_ACTOR = launchLessons.slice(0, 9)

function lessonCopy(lesson: (typeof launchLessons)[number]) {
  const feedback = (['initial', 'progress', 'retry'] as const).map((kind) => getFoundationLessonFeedback(lesson.id, kind))
  const completion = buildProjectCompletionCopy(lesson.id)
  return [
    lesson.goal,
    lesson.parentAdvice ?? '',
    ...lesson.steps.flatMap((step) => [step.title, step.instruction, step.voiceover ?? '']),
    ...lesson.hintLayers.map((layer) => layer.copy),
    ...feedback,
    completion.summary,
    completion.spotlightBody ?? '',
  ].filter(Boolean)
}

function remedialCopy(lesson: (typeof remedialLessons)[number]) {
  return [
    lesson.title,
    lesson.focus,
    ...(lesson.keyPoints ?? []),
    lesson.practice?.prompt ?? '',
    lesson.practice?.success ?? '',
  ].filter(Boolean)
}

/** Each piece of copy with the wording (“走” or “飞”) its own lesson's blocks show. */
const COPY_BY_VERB: Array<{ owner: string; verb: MotionVerb; texts: string[] }> = [
  ...launchLessons.map((lesson) => ({ owner: lesson.id, verb: motionVerbForLesson(lesson.id), texts: lessonCopy(lesson) })),
  { owner: 'duo-hints', verb: 'walk' as const, texts: Object.values(duoLessonHints).flat() },
  ...remedialLessons.map((lesson) => ({ owner: lesson.id, verb: motionVerbForLesson(lesson.id), texts: remedialCopy(lesson) })),
]

const ALL_COPY = COPY_BY_VERB.flatMap((entry) => entry.texts)

/** Quoted phrases that are not block names: dialogue lines and on-screen UI words. */
const NON_BLOCK_QUOTES = new Set([
  '我们一起出发吧！',
  '选一句对白',
  '启动',
  '开始',
  '运行',
  '从森林出发',
  '点一下，先飞再说',
  '先出场，再说话',
])

const BUTTERFLY_LESSONS = launchLessons.slice(6, 9)

describe('TQ-009 block labels say what the block does', () => {
  it('the move block names its real distance', () => {
    expect(getKidsBlockLabel('move_right')).toBe(`向右走 ${STEP_DISTANCE} 步`)
  })

  it('the repeat block says it repeats the move, so it is right even after “切换场景” or “说一句话”', () => {
    expect(getKidsBlockLabel('repeat_twice')).toBe(`重复：再走 ${STEP_DISTANCE} 步`)
    // Lesson 05: repeat after the scene switch walks again; it does not switch again.
    const lesson05 = simulateProgram(['when_start', 'move_right', 'switch_scene', 'repeat_twice'].map((type) => ({ type })))
    expect(lesson05.ok && lesson05.observed).toMatchObject({ position: 2 * STEP_DISTANCE, scene: 'meadow', sceneSwitchAt: STEP_DISTANCE })
    // Lesson 09: repeat after the say block walks again; it does not speak again.
    const lesson09 = simulateProgram(['when_clicked', 'move_right', 'say_line', 'repeat_twice'].map((type) => ({ type })))
    expect(lesson09.ok && lesson09.observed).toMatchObject({ position: 2 * STEP_DISTANCE, messageAt: STEP_DISTANCE })
  })

  it('the butterfly flies: lessons 07–09 (garden) show “飞” on the move and repeat blocks', () => {
    expect(getKidsBlockLabel('move_right', 'fly')).toBe(`向右飞 ${STEP_DISTANCE} 步`)
    expect(getKidsBlockLabel('repeat_twice', 'fly')).toBe(`重复：再飞 ${STEP_DISTANCE} 步`)
    // Other blocks do not change with the verb.
    expect(getKidsBlockLabel('when_clicked', 'fly')).toBe('被点击时')
    expect(getKidsBlockLabel('say_line', 'fly')).toBe('说一句话')
    for (const lesson of BUTTERFLY_LESSONS) {
      expect(lesson.templateId).toBe('garden-interaction-stage')
      expect(motionVerbForTemplate(lesson.templateId), lesson.id).toBe('fly')
      expect(motionVerbForLesson(lesson.id), lesson.id).toBe('fly')
    }
    for (const lesson of launchLessons.filter((item) => !BUTTERFLY_LESSONS.includes(item))) {
      expect(motionVerbForTemplate(lesson.templateId), lesson.id).toBe('walk')
      expect(motionVerbForLesson(lesson.id), lesson.id).toBe('walk')
    }
    expect(motionVerbForLesson('remedial-click-trigger')).toBe('fly')
  })

  it('grid blocks keep the parallel “向…走一格” wording', () => {
    expect(['move_up', 'move_down', 'move_left', 'move_right_cell', 'move_forward'].map((type) => getKidsBlockLabel(type)))
      .toEqual(['向上走一格', '向下走一格', '向左走一格', '向右走一格', '向前走一格'])
  })
})

describe('TQ-009 lesson 01–12 copy matches blocks and stage', () => {
  it('never uses the old block names or “一步” for a 100-step move', () => {
    for (const text of ALL_COPY) {
      expect(text, text).not.toContain('向右移动')
      expect(text, text).not.toContain('“再做一次”')
      expect(text, text).not.toMatch(/走一步|往前走一次|再往前走|靠近一步|边出场边/)
    }
  })

  it('every quoted block name (or quoted block sequence) is a label that lesson\'s own blocks show', () => {
    const unknown: string[] = []
    for (const { owner, verb, texts } of COPY_BY_VERB) {
      const names = new Set(allKidsBlockLabels(verb))
      for (const text of texts) {
        for (const [, quote] of text.matchAll(/“([^”]+)”/g)) {
          if (NON_BLOCK_QUOTES.has(quote)) continue
          for (const part of quote.split(' → ')) if (!names.has(part)) unknown.push(`${owner}: “${part}” in: ${text}`)
        }
      }
    }
    expect(unknown).toEqual([])
  })

  it('butterfly copy (lessons 07–09 and the click remedial) never says the butterfly walks', () => {
    const butterflyCopy = COPY_BY_VERB.filter((entry) => entry.verb === 'fly').flatMap((entry) => entry.texts)
    expect(butterflyCopy.length).toBeGreaterThan(0)
    for (const text of butterflyCopy) expect(text, text).not.toContain('走')
  })

  it('lesson steps are “关”, distances are “步”: lesson copy never numbers a lesson step with “第 N 步” / “这一步”', () => {
    for (const text of ALL_COPY) expect(text, text).not.toMatch(/第\s*\d+\s*步|这一步|本步/)
  })

  it('remedial practice cards show the same labels as the lesson blocks', () => {
    for (const lesson of remedialLessons) {
      if (lesson.practice?.kind !== 'order') continue
      for (const card of lesson.practice.cards) expect(card.label).toBe(getKidsBlockLabel(card.type, motionVerbForLesson(lesson.id)))
    }
  })

  it('lesson 05 only offers blocks its steps use (no unused “说一句话”)', () => {
    const lesson05 = launchLessons.find((lesson) => lesson.id === 'lesson-05-meadow-order')!
    const used = new Set(lesson05.steps.flatMap((step) => step.requiredBlockTypes))
    for (const step of lesson05.steps) {
      expect(step.allowedBlocks, step.id).not.toContain('say_line')
      for (const type of step.allowedBlocks) expect(used.has(type), `${step.id} ${type}`).toBe(true)
    }
  })

  it('lessons 04–06 name the character the stage shows (小狐狸), not “小动物”', () => {
    for (const lesson of launchLessons.slice(3, 6)) {
      for (const text of lessonCopy(lesson).filter((line) => line !== lesson.title)) expect(text, text).not.toContain('小动物')
    }
  })

  it('lessons 07–09 instructions name the butterfly instead of a generic “角色”', () => {
    for (const lesson of launchLessons.slice(6, 9)) {
      for (const step of lesson.steps) expect(step.instruction, step.instruction).not.toContain('角色')
    }
  })

  it('every distance in a single-actor step is a whole number of moves and never more than the step program walks', () => {
    for (const lesson of SINGLE_ACTOR) {
      for (const step of lesson.steps) {
        const run = simulateProgram(step.requiredBlockTypes.map((type) => ({ type })))
        expect(run.ok).toBe(true)
        if (!run.ok) continue
        for (const [, n] of step.instruction.matchAll(/(\d+) 步/g)) {
          const distance = Number(n)
          expect(distance % STEP_DISTANCE, `${lesson.id} ${step.id}`).toBe(0)
          expect(distance, `${lesson.id} ${step.id}: ${step.instruction}`).toBeLessThanOrEqual(run.observed.position)
        }
        for (const [, total] of step.instruction.matchAll(/一共[^。]*?(\d+) 步/g)) {
          expect(Number(total), `${lesson.id} ${step.id}: ${step.instruction}`).toBe(run.observed.position)
        }
      }
    }
  })

  it('lesson 05 goal only promises what lesson 05 steps actually build (no speech step)', () => {
    const lesson05 = launchLessons.find((lesson) => lesson.id === 'lesson-05-meadow-order')!
    expect(lesson05.steps.some((step) => step.requiredBlockTypes.includes('say_line'))).toBe(false)
    expect(lesson05.goal).not.toMatch(/说|感受/)
    expect(lesson05.goal).toContain(`${STEP_DISTANCE} 步`)
  })

  it('failure feedback quotes the real block names and distances', () => {
    const repeat = explainRunFailure({ code: 'repeat-without-move', goal: null, actual: null })
    expect(repeat).toContain(`“${getKidsBlockLabel('repeat_twice')}”`)
    expect(repeat).toContain(`“${getKidsBlockLabel('move_right')}”`)
    const goal = { trigger: 'start' as const, position: 100, scene: 'meadow' as const, sceneSwitchAt: 100, message: null, messageAt: null }
    expect(explainRunFailure({ code: 'scene-switch-early', goal, actual: null })).toContain('先在森林走 100 步')
    expect(explainRunFailure({ code: 'too-few-moves', goal: { ...goal, position: 200 }, actual: { ...goal, position: 100 } })).toContain('再多走 100 步')
  })

  it('butterfly failure feedback says “飞” and quotes the “飞” blocks', () => {
    const repeat = explainRunFailure({ code: 'repeat-without-move', goal: null, actual: null }, '小蝴蝶', 'fly')
    expect(repeat).toContain('“重复：再飞 100 步”')
    expect(repeat).toContain('“向右飞 100 步”')
    const goal = { trigger: 'click' as const, position: 200, scene: 'forest' as const, sceneSwitchAt: null, message: '蝴蝶收到你的点击啦！', messageAt: 100 }
    const codes = ['too-few-moves', 'too-many-moves', 'say-too-early', 'say-too-late'] as const
    for (const code of codes) {
      const text = explainRunFailure({ code, goal, actual: { ...goal, position: code === 'too-many-moves' ? 300 : 100 } }, '小蝴蝶', 'fly')
      expect(text, code).not.toContain('走')
      expect(text, code).toContain('飞')
    }
  })
})
