import { describe, expect, it } from 'vitest'

import { g0u1GridLessons } from '@/content/curriculum/g0-u1-grid-lessons'
import { validateLessonContract } from '../workspace/lesson-contract'
import {
  buildGridActivities,
  buildGridContract,
  buildGridGoal5,
  buildGridHelp,
  buildGridHints,
  buildGridMethodSteps,
  buildGridScopeGap,
  buildGridStudioLesson,
  GRID_HINT_TITLES,
  gridStepKindLabel,
} from './grid-v3-contract'
import { GRID_V3_LESSON_IDS, getGridV3Lesson, isGridV3LessonId } from './grid-v3-lessons'

const L01 = g0u1GridLessons['G0-U1-L01']
const L05 = g0u1GridLessons['G0-U1-L05']

describe('grid-v3 lesson registry (batch 1 only)', () => {
  it('registers exactly the six G0-U1 lessons, in curriculum order', () => {
    expect(GRID_V3_LESSON_IDS).toEqual([
      'G0-U1-L01',
      'G0-U1-L02',
      'G0-U1-L03',
      'G0-U1-L04',
      'G0-U1-L05',
      'G0-U1-L06',
    ])
    expect(Object.keys(g0u1GridLessons)).toHaveLength(6)
    for (const id of GRID_V3_LESSON_IDS) expect(getGridV3Lesson(id)).toBe(g0u1GridLessons[id])
  })

  it('never claims lessons outside this batch (G0-U2 / G0-U3 / launch lessons)', () => {
    expect(isGridV3LessonId('G0-U2-L01')).toBe(false)
    expect(getGridV3Lesson('G0-U3-L01')).toBeNull()
    expect(getGridV3Lesson('lesson-01-forest-hello')).toBeNull()
  })
})

describe('grid-v3 contract', () => {
  it.each(GRID_V3_LESSON_IDS)('%s passes validateLessonContract with zero errors', (id) => {
    const lesson = getGridV3Lesson(id)!
    const contract = buildGridContract(lesson)
    expect(validateLessonContract(contract)).toEqual([])
    expect(contract.engine).toBe('slot')
    expect(contract.lessonId).toBe(lesson.id)
    expect(contract.title).toBe(lesson.title)
    expect(contract.draftKey).toBe(`kidscoding-draft:${lesson.id}`)
    expect(contract.judging.scopeLabel).toBe('教学定向')
    // 关进度由插槽实时渲染：外壳的静态 progress 会在切关后说谎。
    expect(contract.progress).toBeUndefined()
    expect(contract.goal5).toHaveLength(5)
  })

  it('derives goal5 from the lesson data verbatim', () => {
    const goal5 = buildGridGoal5(L05)
    expect(goal5[0]).toBe(`今天学什么：${L05.concept}。`)
    expect(goal5[1]).toBe(`要解决什么问题：${L05.steps[0].predict}`)
    expect(goal5[2]).toBe(`学完能做什么：${L05.objectives[0]}`)
    expect(goal5[3]).toContain('上一课《')
    expect(goal5[3]).toContain('G0 森林寻路单元的第 5 课')
    expect(goal5[4]).toBe(
      `走完 ${L05.steps.length} 关：${L05.steps.map((step) => step.title).join('、')}。`,
    )
    // 第一课如实写“无前置课节”。
    expect(buildGridGoal5(L01)[3]).toContain('无前置课节')
  })

  it('reuses the first step’s three hints as the contract’s three layers', () => {
    const hints = buildGridHints(L05)
    expect(hints.map((hint) => hint.level)).toEqual([1, 2, 3])
    expect(hints.map((hint) => hint.title)).toEqual([...GRID_HINT_TITLES])
    hints.forEach((hint, index) => {
      expect(hint.text).toBe(`以第一关“${L05.steps[0].title}”为例：${L05.steps[0].hints[index]}`)
    })
    const contract = buildGridContract(L05)
    expect(contract.hints).toEqual(hints.map((hint) => hint.text))
    expect(contract.structuredHints).toEqual(hints)
  })

  it('lists every step as a method step with its real kind and instruction', () => {
    const methodSteps = buildGridMethodSteps(L05)
    expect(methodSteps).toHaveLength(L05.steps.length)
    L05.steps.forEach((step, index) => {
      expect(methodSteps[index]).toBe(
        `第 ${index + 1} 关（${gridStepKindLabel(step)}）${step.title}：${step.instruction}`,
      )
    })
    expect(gridStepKindLabel(L05.steps[0])).toBe('错误实验')
    expect(gridStepKindLabel(L05.steps[4])).toBe('创意改造')
  })

  it('groups activities by the step kinds that really exist (no invented activity)', () => {
    const activities = buildGridActivities(L05)
    expect(activities.map((activity) => activity.level)).toEqual([1, 2, 3])
    expect(activities[0].text).toContain(L05.steps[1].title)
    expect(activities[1].text).toContain(L05.steps[2].title)
    expect(activities[2].text).toContain(L05.steps[0].title)
    expect(activities[2].text).toContain(L05.steps[4].title)

    // 只有引导关的课程不会虚报更高层活动。
    const guidedOnly = {
      ...L05,
      steps: L05.steps.filter((step) => step.kind === 'guided'),
    }
    expect(buildGridActivities(guidedOnly).map((activity) => activity.level)).toEqual([1])
  })

  it('states the trial scope gap and never claims a formal grade', () => {
    expect(buildGridScopeGap(L05)).toContain('实验课（trial）')
    expect(buildGridScopeGap(L05)).toContain('只保存在这台设备的浏览器里')
    expect(buildGridScopeGap(L05)).toContain(L05.concept)
    expect(buildGridStudioLesson(L05).backHref).toBe(`/learn/catalog/${L05.id}`)
  })

  it('builds the studio help drawer from the real gameplay and the real steps', () => {
    const help = buildGridHelp(L05)
    expect(help.title).toBe(`${L05.title} · 玩法帮助`)
    expect(help.body[0]).toContain('按“运行”')
    expect(help.body.slice(2)).toEqual(buildGridMethodSteps(L05))
    for (const line of help.body) expect(line.length).toBeGreaterThan(0)
  })
})
