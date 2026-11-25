/**
 * OPS-053 第二批：G0-U2 六节事件课迁入 V3 工作台。
 *
 * 课程数据仍以 `g0-u2-event-lessons.ts` 为唯一来源（本模块只做登记，
 * 不改动、不复制课程内容）。六个 id 是本批迁移的全部范围；G0-U3（事件 +
 * 循环）不在本批，未登记的 id 一律 notFound，旧 `/learn/event-lab/<id>`
 * 继续服务 G0-U3。
 *
 * 路由约定（与 grid-v3 同一套 V3 外壳）：
 * - 新入口：`/studio/blockly/event/<lessonId>`
 * - 旧入口：`/learn/event-lab/<lessonId>` 对六个 G0-U2 id 做 308 兼容跳转
 *   （课程内容与数据不变，只换页面系统；旧草稿由插槽按严格归属策略提示导入）。
 * - 不得为每节课复制工作台外壳：六节课共用 event-v3 唯一一套插槽。
 */
import { g0u2EventLessons, type EventLesson } from '@/content/curriculum/g0-u2-event-lessons'

/** 本批迁移的六个课节（顺序与课程数据登记顺序一致）。 */
export const EVENT_V3_LESSON_IDS = [
  'G0-U2-L01',
  'G0-U2-L02',
  'G0-U2-L03',
  'G0-U2-L04',
  'G0-U2-L05',
  'G0-U2-L06',
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

/** 本批课节数据；不属于本批的 id 返回 null（调用方 notFound）。 */
export function getEventV3Lesson(lessonId: string): EventLesson | null {
  if (!isEventV3LessonId(lessonId)) return null
  return g0u2EventLessons[lessonId] ?? null
}

/** 本课在 G0-U2 单元中的序号（0 起），供“和上节课的联系”如实生成。 */
export function eventV3LessonIndex(lessonId: string): number {
  return (EVENT_V3_LESSON_IDS as readonly string[]).indexOf(lessonId)
}

/** 上一课的课程数据（第一课为 null）。 */
export function getPreviousEventV3Lesson(lessonId: string): EventLesson | null {
  const index = eventV3LessonIndex(lessonId)
  if (index <= 0) return null
  return getEventV3Lesson(EVENT_V3_LESSON_IDS[index - 1])
}
