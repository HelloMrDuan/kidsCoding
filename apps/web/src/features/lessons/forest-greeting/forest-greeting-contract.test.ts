import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'
import { foundationUnits } from '@/content/curriculum/foundation-units'
import { foundationVoiceovers } from '@/content/curriculum/foundation-voiceovers'
import { validateLessonContract } from '../workspace/lesson-contract'
import {
  GREETING_GOAL5,
  GREETING_HINTS,
  GREETING_LESSON_ID,
  GREETING_METHOD_STEPS,
  GREETING_REWARD_CARD_ID,
  GREETING_SOURCE_LESSON,
  GREETING_SOURCE_UNIT,
  GREETING_STEPS,
  GREETING_VOICEOVERS,
  GREETING_WORKSPACE_CONTRACT,
} from './forest-greeting-contract'

const SOURCE = launchLessons.find((lesson) => lesson.id === GREETING_LESSON_ID)!

describe('forest-greeting contract', () => {
  it('derives from the launch lesson-02 source (not a second copy)', () => {
    expect(GREETING_SOURCE_LESSON).toBe(SOURCE)
    expect(SOURCE.title).toBe('小狐狸打招呼')
    expect(SOURCE.goal).toBe('让小狐狸出场后说一句欢迎的话。')
    expect(SOURCE.sortOrder).toBe(2)
    expect(SOURCE.rewardCardId).toBe('theme-forest-rabbit')
    expect(GREETING_REWARD_CARD_ID).toBe(SOURCE.rewardCardId)
    expect(SOURCE.phase).toBe('trial')
    expect(SOURCE.templateId).toBe('forest-meetup-stage')
    // Unit: the second lesson of 《森林见面会》 (lesson-01 comes first).
    expect(GREETING_SOURCE_UNIT).toBe(
      foundationUnits.find((unit) => unit.id === 'unit-1-forest-meetup'),
    )
    expect(GREETING_SOURCE_UNIT?.title).toBe('森林见面会')
    expect(GREETING_SOURCE_UNIT?.lessonIds[0]).toBe('lesson-01-forest-hello')
    expect(GREETING_SOURCE_UNIT?.lessonIds[1]).toBe(GREETING_LESSON_ID)
  })

  it('passes validateLessonContract with zero errors', () => {
    expect(validateLessonContract(GREETING_WORKSPACE_CONTRACT)).toEqual([])
    expect(GREETING_WORKSPACE_CONTRACT.engine).toBe('slot')
    expect(GREETING_WORKSPACE_CONTRACT.draftKey).toBe('kidscoding-draft:lesson-02-forest-greeting')
    expect(GREETING_WORKSPACE_CONTRACT.judging.scopeLabel).toBe('教学定向')
    expect(GREETING_WORKSPACE_CONTRACT.progress).toBeUndefined()
  })

  it('goal5 is mechanically derived from the source (verbatim fragments)', () => {
    expect(GREETING_GOAL5).toHaveLength(5)
    expect(GREETING_GOAL5[0]).toBe(`今天学什么：${SOURCE.goal}`)
    expect(GREETING_GOAL5[1]).toContain('先出场还是先说话')
    expect(GREETING_GOAL5[1]).toContain('它会在哪里说话')
    expect(SOURCE.steps[2].instruction).toContain('它会在哪里说话')
    expect(GREETING_GOAL5[2]).toContain('“说一句话”接在移动后面')
    expect(SOURCE.steps[1].instruction).toContain('把“说一句话”接在移动后面')
    expect(GREETING_GOAL5[3]).toContain('上节课')
    expect(GREETING_GOAL5[3]).toContain('小狐狸出场')
    expect(GREETING_GOAL5[4]).toBe(
      `当前要完成哪一步：走完 4 关：${SOURCE.steps.map((step) => step.title).join('、')}。`,
    )
  })

  it('hints are the three hintLayers copies verbatim', () => {
    expect(GREETING_HINTS).toHaveLength(3)
    expect(GREETING_HINTS.map((hint) => hint.text)).toEqual(
      SOURCE.hintLayers.map((layer) => layer.copy),
    )
    expect(GREETING_HINTS[0].text).toBe('先让小狐狸出场，再在后面接上一句欢迎话。')
    expect(GREETING_HINTS[1].text).toBe('顺序要是“开始时 → 向右走 100 步 → 说一句话”。')
    expect(GREETING_HINTS[2].text).toBe('先看一下“先出场，再说话”的小示意。')
    expect(SOURCE.hintLayers[2].remedialLessonId).toBe('remedial-start-sequence')
  })

  it('steps and voiceovers are the four source steps, one voiceover each', () => {
    expect(GREETING_STEPS.map((step) => step.id)).toEqual(['step-1', 'step-2', 'step-3', 'step-4'])
    expect(GREETING_STEPS.map((step) => step.title)).toEqual(
      SOURCE.steps.map((step) => step.title),
    )
    expect(GREETING_STEPS.map((step) => step.instruction)).toEqual(
      SOURCE.steps.map((step) => step.instruction),
    )
    expect(GREETING_VOICEOVERS).toEqual(foundationVoiceovers[GREETING_LESSON_ID])
    expect(GREETING_VOICEOVERS).toHaveLength(4)
    expect(GREETING_STEPS[2].voiceover).toBe('猜一猜，没有移动积木，小狐狸会在哪里说话。')
    expect(GREETING_STEPS[1].requiredBlockTypes).toEqual(['when_start', 'move_right', 'say_line'])
    expect(GREETING_STEPS[2].requiredBlockTypes).toEqual(['when_start', 'say_line'])
    expect(GREETING_STEPS[3].requiredBlockTypes).toEqual(['when_start', 'move_right', 'say_line'])
  })

  it('judging rules describe this lesson (move first, then speak)', () => {
    expect(GREETING_WORKSPACE_CONTRACT.judging.stageRule).toBe(
      '运行后小狐狸先向右走 100 步，再说出所选对白（第三关不走路，在原地说话）。',
    )
    expect(GREETING_WORKSPACE_CONTRACT.judging.taskRule).toBe(
      '程序顺序与本关目标一致（开始时 → 移动 → 说话；第三关为开始时 → 说话）且运行成功。',
    )
    expect(GREETING_WORKSPACE_CONTRACT.judging.knowledgeRule).toBe(
      '动作与对白按积木顺序发生：先出场、再说话；说话排在移动前面就是顺序反了。',
    )
  })

  it('method steps are the four step titles + guidance, verbatim', () => {
    expect(GREETING_METHOD_STEPS).toHaveLength(4)
    expect(GREETING_METHOD_STEPS[0]).toBe(
      `${SOURCE.steps[0].title}：${SOURCE.steps[0].instruction}`,
    )
  })

  it('fail-closed: short goal5 / short hints / mismatched draftKey are rejected', () => {
    expect(
      validateLessonContract({ ...GREETING_WORKSPACE_CONTRACT, goal5: ['只有一条'] }),
    ).not.toEqual([])
    expect(
      validateLessonContract({ ...GREETING_WORKSPACE_CONTRACT, hints: ['只有一条'] }),
    ).not.toEqual([])
    expect(
      validateLessonContract({
        ...GREETING_WORKSPACE_CONTRACT,
        draftKey: 'kidscoding-draft:someone-else',
      }),
    ).not.toEqual([])
    expect(
      validateLessonContract({ ...GREETING_WORKSPACE_CONTRACT, engine: 'blockly' }),
    ).toEqual([])
    // engine 'blockly' passes the generic validator but is forbidden for this
    // lesson: the contract must stay 'slot' (BlocklyAdapter is demo-only).
    expect(GREETING_WORKSPACE_CONTRACT.engine).toBe('slot')
  })
})
