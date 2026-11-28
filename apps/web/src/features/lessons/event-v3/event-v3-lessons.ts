/**
 * OPS-053 第二批：G0-U2 六节事件课迁入 V3 工作台。
 *
 * 课程数据仍以 `g0-u2-event-lessons.ts` 为唯一来源（本模块只做登记，
 * 不改动、不复制课程内容）。OPS-053 登记六个 G0-U2 id，OPS-054 追加
 * G0-U3-L04（见下方列表）；未登记的 id 一律 notFound。
 *
 * 路由约定（与 grid-v3 同一套 V3 外壳）：
 * - 新入口：`/studio/blockly/event/<lessonId>`
 * - 旧入口：`/learn/event-lab/<lessonId>` 对已登记 id 做 308 兼容跳转
 *   （课程内容与数据不变，只换页面系统；旧草稿由插槽按严格归属策略提示导入）。
 * - 不得为每节课复制工作台外壳：六节课共用 event-v3 唯一一套插槽。
 */
import { g0u2EventLessons, type EventLesson } from '@/content/curriculum/g0-u2-event-lessons'
import { g0u3EventLessons } from '@/content/curriculum/g0-u3-event-loop-lessons'

/**
 * 已迁入 V3 的事件课节（顺序与课程数据登记顺序一致）。
 * OPS-054 第三批追加 G0-U3-L04 萤火虫事件 + 循环课（同一套 event-v3 插槽，
 * 真实 loop 积木与多角色同步）。单元内序号与“上一课”由 `v3-unit-context.ts`
 * 按单元计算，不按本数组。
 */
export const EVENT_V3_LESSON_IDS = [
  'G0-U2-L01',
  'G0-U2-L02',
  'G0-U2-L03',
  'G0-U2-L04',
  'G0-U2-L05',
  'G0-U2-L06',
  'G0-U3-L04',
] as const

export type EventV3LessonId = (typeof EVENT_V3_LESSON_IDS)[number]

export const EVENT_V3_ROUTE_PREFIX = '/studio/blockly/event/'

/** 旧课堂入口（兼容跳转的来源）。 */
export const EVENT_V3_LEGACY_ROUTE_PREFIX = '/learn/event-lab/'

export function eventV3Route(lessonId: string): string {
  return `${EVENT_V3_ROUTE_PREFIX}${lessonId}`
}

export function isEventV3LessonId(value: string): value is EventV3LessonId {
  return (EVENT_V3_LESSON_IDS as readonly string[]).includes(value)
}

/** 已登记课节数据；未登记的 id 返回 null（调用方 notFound）。 */
export function getEventV3Lesson(lessonId: string): EventLesson | null {
  if (!isEventV3LessonId(lessonId)) return null
  return g0u2EventLessons[lessonId] ?? g0u3EventLessons[lessonId] ?? null
}

/** 本课在已登记事件课中的位置（0 起）；单元内序号请用 v3-unit-context。 */
export function eventV3LessonIndex(lessonId: string): number {
  return (EVENT_V3_LESSON_IDS as readonly string[]).indexOf(lessonId)
}

/** 同一单元内、同为事件课的上一课（第一课或不同单元时为 null）。 */
export function getPreviousEventV3Lesson(lessonId: string): EventLesson | null {
  const index = eventV3LessonIndex(lessonId)
  if (index <= 0) return null
  const previousId = EVENT_V3_LESSON_IDS[index - 1]
  if (previousId.slice(0, 5) !== lessonId.slice(0, 5)) return null
  return getEventV3Lesson(previousId)
}
