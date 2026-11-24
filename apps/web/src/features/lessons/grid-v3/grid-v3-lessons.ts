/**
 * OPS-052 第一批：G0-U1 六节森林寻路课迁入 V3 工作台。
 *
 * 课程数据仍以 `g0u1-grid-lessons.ts` 为唯一来源（本模块只做登记，
 * 不改动、不复制课程内容）。六个 id 是本批迁移的全部范围；G0-U2 /
 * G0-U3 / lesson-02…12 不在本批，未登记的 id 一律 notFound，旧
 * `/learn/grid-lab/<id>` 继续服务它们。
 *
 * 路由约定（与 lesson-01-forest-hello 的 studio 路由同一套 V3 外壳）：
 * - 新入口：`/studio/blockly/grid/<lessonId>`
 * - 旧入口：`/learn/grid-lab/<lessonId>` 对六个 G0-U1 id 做 308 兼容跳转
 *   （课程内容与数据不变，只换页面系统；旧草稿由插槽提示一键导入）。
 * - 不得为每节课复制工作台外壳：六节课共用 grid-v3 唯一一套插槽。
 */
import {
  g0u1GridLessons,
  type GridLesson,
} from '@/content/curriculum/g0-u1-grid-lessons'

/** 本批迁移的六个课节（顺序与课程数据登记顺序一致）。 */
export const GRID_V3_LESSON_IDS = [
  'G0-U1-L01',
  'G0-U1-L02',
  'G0-U1-L03',
  'G0-U1-L04',
  'G0-U1-L05',
  'G0-U1-L06',
] as const

export type GridV3LessonId = (typeof GRID_V3_LESSON_IDS)[number]

export const GRID_V3_ROUTE_PREFIX = '/studio/blockly/grid/'

/** 旧课堂入口（兼容跳转的来源）。 */
export const GRID_V3_LEGACY_ROUTE_PREFIX = '/learn/grid-lab/'

export function gridV3Route(lessonId: string): string {
  return `${GRID_V3_ROUTE_PREFIX}${lessonId}`
}

export function isGridV3LessonId(value: string): value is GridV3LessonId {
  return (GRID_V3_LESSON_IDS as readonly string[]).includes(value)
}

/** 本批课节数据；不属于本批的 id 返回 null（调用方 notFound）。 */
export function getGridV3Lesson(lessonId: string): GridLesson | null {
  if (!isGridV3LessonId(lessonId)) return null
  return g0u1GridLessons[lessonId] ?? null
}

/** 本课在 G0-U1 单元中的序号（0 起），供“和上节课的联系”如实生成。 */
export function gridV3LessonIndex(lessonId: string): number {
  return (GRID_V3_LESSON_IDS as readonly string[]).indexOf(lessonId)
}

/** 上一课的课程数据（第一课为 null）。 */
export function getPreviousGridV3Lesson(lessonId: string): GridLesson | null {
  const index = gridV3LessonIndex(lessonId)
  if (index <= 0) return null
  return getGridV3Lesson(GRID_V3_LESSON_IDS[index - 1])
}
