import { describe, expect, it } from 'vitest'

import { g0u2EventLessons } from '@/content/curriculum/g0-u2-event-lessons'
import { validateLessonContract } from '../workspace/lesson-contract'
import {
  buildEventActivities,
  buildEventContract,
  buildEventGoal5,
  buildEventHelp,
  buildEventHints,
  buildEventMethodSteps,
  buildEventScopeGap,
  buildEventStudioLesson,
  EVENT_HINT_TITLES,
  eventStepKindLabel,
} from './event-v3-contract'
import {
  EVENT_V3_LESSON_IDS,
  eventV3Route,
  getEventV3Lesson,
  getPreviousEventV3Lesson,
  isEventV3LessonId,
} from './event-v3-lessons'

const L01 = g0u2EventLessons['G0-U2-L01']
const L02 = g0u2EventLessons['G0-U2-L02']

describe('event-v3 lesson registry (batch 2 only)', () => {
  it('registers exactly the six G0-U2 lessons, in curriculum order', () => {
    expect(EVENT_V3_LESSON_IDS).toEqual([
      'G0-U2-L01',
      'G0-U2-L02',
      'G0-U2-L03',
      'G0-U2-L04',
      'G0-U2-L05',
      'G0-U2-L06',
    ])
    expect(Object.keys(g0u2EventLessons)).toEqual([...EVENT_V3_LESSON_IDS])
    for (const id of EVENT_V3_LESSON_IDS) expect(getEventV3Lesson(id)).toBe(g0u2EventLessons[id])
    expect(eventV3Route('G0-U2-L03')).toBe('/studio/blockly/event/G0-U2-L03')
  })

  it('never claims lessons outside this batch (G0-U1 / G0-U3 event+loop / launch lessons)', () => {
    expect(isEventV3LessonId('G0-U1-L01')).toBe(false)
    expect(isEventV3LessonId('G0-U3-L01')).toBe(false)
    expect(getEventV3Lesson('G0-U3-L02')).toBeNull()
    expect(getEventV3Lesson('lesson-01-forest-hello')).toBeNull()
    expect(getPreviousEventV3Lesson('G0-U2-L01')).toBeNull()
    expect(getPreviousEventV3Lesson('G0-U2-L02')).toBe(L01)
    expect(getPreviousEventV3Lesson('G0-U3-L01')).toBeNull()
  })
})

describe('event-v3 contract', () => {
  it.each(EVENT_V3_LESSON_IDS)('%s passes validateLessonContract with zero errors', (id) => {
    const lesson = getEventV3Lesson(id)!
    const contract = buildEventContract(lesson)
    expect(validateLessonContract(contract)).toEqual([])
    expect(contract.engine).toBe('slot')
    expect(contract.lessonId).toBe(lesson.id)
    expect(contract.title).toBe(lesson.title)
    expect(contract.draftKey).toBe(`kidscoding-draft:${lesson.id}`)
    expect(contract.judging.scopeLabel).toBe('教学定向')
    expect(contract.judging.knowledgeRule).toBe(`本课知识点：${lesson.concept}。`)
    // 关进度由插槽实时渲染：外壳的静态 progress 会在切关后说谎。
    expect(contract.progress).toBeUndefined()
    expect(contract.goal5).toHaveLength(5)
    for (const line of contract.goal5) expect(line.length).toBeGreaterThan(0)
    expect(contract.hints.every((hint) => hint.length > 0)).toBe(true)
    expect(buildEventStudioLesson(lesson).backHref).toBe(`/learn/catalog/${lesson.id}`)
  })

  it('derives goal5 from the lesson data verbatim', () => {
    const goal5 = buildEventGoal5(L02)
    expect(goal5[0]).toBe(`今天学什么：${L02.concept}。`)
    expect(goal5[1]).toBe(`要解决什么问题：${L02.steps[0].predict}`)
    expect(goal5[2]).toBe(`学完能做什么：${L02.objectives[0]}`)
    expect(goal5[3]).toContain(`上一课《${L01.title}》`)
    expect(goal5[3]).toContain('G0 森林事件单元的第 2 课（共 6 课）')
    expect(goal5[4]).toBe(`走完 ${L02.steps.length} 关：${L02.steps.map((step) => step.title).join('、')}。`)
    // 第一课如实写“无前置课节”。
    expect(buildEventGoal5(L01)[3]).toContain('无前置课节')
  })

  it('reuses the first step’s three hints as the contract’s three layers', () => {
    const hints = buildEventHints(L02)
    expect(hints.map((hint) => hint.level)).toEqual([1, 2, 3])
    expect(hints.map((hint) => hint.title)).toEqual([...EVENT_HINT_TITLES])
    hints.forEach((hint, index) => {
      expect(hint.text).toBe(`以第一关“${L02.steps[0].title}”为例：${L02.steps[0].hints[index]}`)
    })
    const contract = buildEventContract(L02)
    expect(contract.hints).toEqual(hints.map((hint) => hint.text))
    expect(contract.structuredHints).toEqual(hints)
  })

  it('lists every step as a method step with its real kind and instruction', () => {
    const methodSteps = buildEventMethodSteps(L01)
    expect(methodSteps).toHaveLength(L01.steps.length)
    L01.steps.forEach((step, index) => {
      expect(methodSteps[index]).toBe(`第 ${index + 1} 关（${eventStepKindLabel(step)}）${step.title}：${step.instruction}`)
    })
    expect(eventStepKindLabel(L01.steps[0])).toBe('错误实验')
    expect(eventStepKindLabel(L01.steps[L01.steps.length - 1])).toBe('创意改造')
  })

  it('groups activities by the step kinds that really exist (no invented activity)', () => {
    const titlesOf = (kinds: string[]) => L01.steps.filter((step) => kinds.includes(step.kind)).map((step) => step.title)
    const activities = buildEventActivities(L01)
    expect(activities.map((activity) => activity.level)).toEqual([1, 2, 3])
    for (const title of titlesOf(['guided'])) expect(activities[0].text).toContain(title)
    for (const title of titlesOf(['practice-a', 'practice-b'])) expect(activities[1].text).toContain(title)
    for (const title of titlesOf(['error-lab', 'creative'])) expect(activities[2].text).toContain(title)

    // 只有引导关的课程不会虚报更高层活动。
    const guidedOnly = { ...L01, steps: L01.steps.filter((step) => step.kind === 'guided') }
    expect(buildEventActivities(guidedOnly).map((activity) => activity.level)).toEqual([1])
  })

  it('states the trial scope gap and never claims a formal grade', () => {
    expect(buildEventScopeGap(L01)).toContain('实验课（trial）')
    expect(buildEventScopeGap(L01)).toContain('只保存在这台设备的浏览器里')
    expect(buildEventScopeGap(L01)).toContain(L01.concept)
  })

  it('builds the studio help drawer from the real gameplay and the real steps', () => {
    const help = buildEventHelp(L01)
    expect(help.title).toBe(`${L01.title} · 玩法帮助`)
    expect(help.body[0]).toContain('按“运行检查”')
    expect(help.body.slice(3)).toEqual(buildEventMethodSteps(L01))
    for (const line of help.body) expect(line.length).toBeGreaterThan(0)
  })
})
