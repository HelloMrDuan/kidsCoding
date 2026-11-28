/**
 * V3 工作台共用的“单元上下文”：本课属于哪个单元、是第几课、共几课、上一课是什么。
 *
 * grid-v3 与 event-v3 的课节契约都用它生成“和上节课的联系”，使跨引擎的单元
 * （G0-U3：L01–L03/L05 为网格课，L04 为萤火虫事件课）也能如实算出序号与上一课。
 * 只读取课程数据（唯一来源仍是 content/curriculum），不改动、不复制课程内容。
 */
import { g0u1GridLessons } from '@/content/curriculum/g0-u1-grid-lessons'
import { g0u2EventLessons } from '@/content/curriculum/g0-u2-event-lessons'
import { g0u3LoopLessons } from '@/content/curriculum/g0-u3-loop-lessons'
import { g0u3EventLessons } from '@/content/curriculum/g0-u3-event-loop-lessons'

type UnitLessonRef = { title: string; concept: string }

type V3Unit = {
  /** 文案里使用的单元名，例如“G0 森林寻路单元”。 */
  name: string
  /** 课程大纲中的全部课节（含尚无可玩实现的课节，用于如实给出“共 N 课”）。 */
  lessonIds: readonly string[]
}

const UNITS: Record<string, V3Unit> = {
  'G0-U1': {
    name: 'G0 森林寻路单元',
    lessonIds: ['G0-U1-L01', 'G0-U1-L02', 'G0-U1-L03', 'G0-U1-L04', 'G0-U1-L05', 'G0-U1-L06'],
  },
  'G0-U2': {
    name: 'G0 森林事件单元',
    lessonIds: ['G0-U2-L01', 'G0-U2-L02', 'G0-U2-L03', 'G0-U2-L04', 'G0-U2-L05', 'G0-U2-L06'],
  },
  'G0-U3': {
    name: 'G0 循环与规律单元',
    lessonIds: ['G0-U3-L01', 'G0-U3-L02', 'G0-U3-L03', 'G0-U3-L04', 'G0-U3-L05', 'G0-U3-L06'],
  },
}

function lessonRef(lessonId: string): UnitLessonRef | null {
  const lesson =
    g0u1GridLessons[lessonId] ??
    g0u2EventLessons[lessonId] ??
    g0u3LoopLessons[lessonId] ??
    g0u3EventLessons[lessonId]
  return lesson ? { title: lesson.title, concept: lesson.concept } : null
}

export type V3UnitContext = {
  unitName: string
  /** 本课在单元中的序号（0 起）。 */
  index: number
  total: number
  previous: UnitLessonRef | null
}

/** 未登记单元的课节返回 null。 */
export function v3UnitContext(lessonId: string): V3UnitContext | null {
  const unit = UNITS[lessonId.slice(0, 5)]
  if (!unit) return null
  const index = unit.lessonIds.indexOf(lessonId)
  if (index < 0) return null
  return {
    unitName: unit.name,
    index,
    total: unit.lessonIds.length,
    previous: index > 0 ? lessonRef(unit.lessonIds[index - 1]) : null,
  }
}

/** “和上节课的联系”一句话；grid-v3 与 event-v3 共用，G0-U1/U2 文案与原来逐字一致。 */
export function v3PreviousLessonLine(lessonId: string, concept: string): string {
  const ctx = v3UnitContext(lessonId)
  if (!ctx) return '和上节课的联系：无前置课节。'
  return ctx.previous
    ? `和上节课的联系：上一课《${ctx.previous.title}》学的是“${ctx.previous.concept}”；本课接着学“${concept}”，是 ${ctx.unitName}的第 ${ctx.index + 1} 课（共 ${ctx.total} 课）。`
    : `和上节课的联系：无前置课节，本课是 ${ctx.unitName}的第 1 课（共 ${ctx.total} 课）。`
}
