import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'
import { foundationUnits } from '@/content/curriculum/foundation-units'
import { foundationVoiceovers } from '@/content/curriculum/foundation-voiceovers'
import { validateLessonContract } from '../workspace/lesson-contract'
import {
  FOREST_GOAL5,
  FOREST_HINTS,
  FOREST_LESSON_ID,
  FOREST_METHOD_STEPS,
  FOREST_SOURCE_LESSON,
  FOREST_SOURCE_UNIT,
  FOREST_STEPS,
  FOREST_VOICEOVERS,
  FOREST_WORKSPACE_CONTRACT,
} from './forest-hello-contract'

const SOURCE = launchLessons.find((lesson) => lesson.id === FOREST_LESSON_ID)!

describe('forest-hello contract', () => {
  it('derives from the launch lesson-01 source (not a second copy)', () => {
    expect(FOREST_SOURCE_LESSON).toBe(SOURCE)
    expect(SOURCE.title).toBe('小狐狸出场')
    expect(SOURCE.goal).toBe('让小狐狸向右走 100 步，完成第一次出场。')
    expect(SOURCE.sortOrder).toBe(1)
    expect(SOURCE.rewardCardId).toBe('theme-forest-fox')
    expect(SOURCE.phase).toBe('trial')
    // Unit: the first lesson of 《森林见面会》.
    expect(FOREST_SOURCE_UNIT).toBe(
      foundationUnits.find((unit) => unit.id === 'unit-1-forest-meetup'),
    )
    expect(FOREST_SOURCE_UNIT?.title).toBe('森林见面会')
    expect(FOREST_SOURCE_UNIT?.lessonIds[0]).toBe(FOREST_LESSON_ID)
  })

  it('passes validateLessonContract with zero errors', () => {
    expect(validateLessonContract(FOREST_WORKSPACE_CONTRACT)).toEqual([])
    expect(FOREST_WORKSPACE_CONTRACT.engine).toBe('slot')
    expect(FOREST_WORKSPACE_CONTRACT.draftKey).toBe('kidscoding-draft:lesson-01-forest-hello')
    expect(FOREST_WORKSPACE_CONTRACT.judging.scopeLabel).toBe('教学定向')
    expect(FOREST_WORKSPACE_CONTRACT.progress).toBeUndefined()
  })

  it('goal5 is mechanically derived from the source (verbatim fragments)', () => {
    expect(FOREST_GOAL5).toHaveLength(5)
    expect(FOREST_GOAL5[0]).toBe(`今天学什么：${SOURCE.goal}`)
    expect(FOREST_GOAL5[1]).toContain('只有“开始时”，小狐狸会走吗？')
    expect(SOURCE.steps[0].instruction).toContain('只有“开始时”，小狐狸会走吗？')
    expect(FOREST_GOAL5[2]).toContain('把“开始时”和“向右走 100 步”接好')
    expect(FOREST_GOAL5[2]).toContain('让小狐狸走上舞台')
    expect(FOREST_GOAL5[2]).toContain('走到小兔子身边')
    // 来源：step-2 指导“让小狐狸向右走 100 步、走上舞台”与 step-3 标题。
    expect(SOURCE.steps[1].instruction).toContain('让小狐狸向右走 100 步、走上舞台')
    expect(FOREST_GOAL5[3]).toContain('《森林见面会》')
    expect(FOREST_GOAL5[3]).toContain('无前置课节')
    expect(FOREST_GOAL5[4]).toBe(
      `当前要完成哪一步：走完 4 关：${SOURCE.steps.map((step) => step.title).join('、')}。`,
    )
  })

  it('hints are the three hintLayers copies verbatim', () => {
    expect(FOREST_HINTS).toHaveLength(3)
    expect(FOREST_HINTS.map((hint) => hint.text)).toEqual(
      SOURCE.hintLayers.map((layer) => layer.copy),
    )
    expect(FOREST_HINTS[0].text).toBe('先让小狐狸准备好出场，再接动作积木。')
    expect(FOREST_HINTS[1].text).toBe('把“开始时”放在最前面，再把“向右走 100 步”接上去。')
    expect(FOREST_HINTS[2].text).toBe('先看一个很短的示意，再回来试一次。')
    expect(SOURCE.hintLayers[2].remedialLessonId).toBe('remedial-start-sequence')
  })

  it('steps and voiceovers are the four source steps, one voiceover each', () => {
    expect(FOREST_STEPS.map((step) => step.id)).toEqual(['step-1', 'step-2', 'step-3', 'step-4'])
    expect(FOREST_STEPS.map((step) => step.title)).toEqual(
      SOURCE.steps.map((step) => step.title),
    )
    expect(FOREST_STEPS.map((step) => step.instruction)).toEqual(
      SOURCE.steps.map((step) => step.instruction),
    )
    expect(FOREST_VOICEOVERS).toEqual(foundationVoiceovers[FOREST_LESSON_ID])
    expect(FOREST_VOICEOVERS).toHaveLength(4)
    expect(FOREST_STEPS[2].voiceover).toBe('猜一猜，接两块移动积木，小狐狸会停在哪里。')
    expect(FOREST_STEPS[3].requiredBlockTypes).toEqual(['when_start', 'move_right'])
  })

  it('judging rules are the plan §6 draft, approved verbatim', () => {
    expect(FOREST_WORKSPACE_CONTRACT.judging.stageRule).toBe(
      '运行后小狐狸向右走 100 步（第三关 200 步）走到舞台/兔子身边。',
    )
    expect(FOREST_WORKSPACE_CONTRACT.judging.taskRule).toBe('程序为“开始时 → 移动”且运行成功。')
    expect(FOREST_WORKSPACE_CONTRACT.judging.knowledgeRule).toBe(
      '“开始时”必须在最前，移动接在后面；缺开始则狐狸不动。',
    )
  })

  it('method steps are the four step titles + guidance, verbatim', () => {
    expect(FOREST_METHOD_STEPS).toHaveLength(4)
    expect(FOREST_METHOD_STEPS[0]).toBe(
      `${SOURCE.steps[0].title}：${SOURCE.steps[0].instruction}`,
    )
  })

  it('fail-closed: short goal5 / short hints / mismatched draftKey are rejected', () => {
    expect(
      validateLessonContract({ ...FOREST_WORKSPACE_CONTRACT, goal5: ['只有一条'] }),
    ).not.toEqual([])
    expect(
      validateLessonContract({ ...FOREST_WORKSPACE_CONTRACT, hints: ['只有一条'] }),
    ).not.toEqual([])
    expect(
      validateLessonContract({
        ...FOREST_WORKSPACE_CONTRACT,
        draftKey: 'kidscoding-draft:someone-else',
      }),
    ).not.toEqual([])
    expect(
      validateLessonContract({ ...FOREST_WORKSPACE_CONTRACT, engine: 'blockly' }),
    ).toEqual([])
    // engine 'blockly' passes the generic validator but is forbidden for this
    // lesson: the contract must stay 'slot' (BlocklyAdapter is demo-only).
    expect(FOREST_WORKSPACE_CONTRACT.engine).toBe('slot')
  })
})
