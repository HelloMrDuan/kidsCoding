/**
 * OPS-052 第一批：G0-U1 六节森林寻路课迁入 V3 工作台。
 *
 * 课程数据仍以 `g0u1-grid-lessons.ts` 为唯一来源（本模块只做登记，
 * 不改动、不复制课程内容）。OPS-052 登记六个 G0-U1 id，OPS-054 追加 G0-U3
 * 的四节网格课（见下方列表）；未登记的 id 一律 notFound，旧
 * `/learn/grid-lab/<id>` 继续服务其余未迁移课程。
 *
 * 路由约定（与 lesson-01-forest-hello 的 studio 路由同一套 V3 外壳）：
 * - 新入口：`/studio/blockly/grid/<lessonId>`
 * - 旧入口：`/learn/grid-lab/<lessonId>` 对已登记 id 做 308 兼容跳转
 *   （课程内容与数据不变，只换页面系统；旧草稿由插槽提示一键导入）。
 * - 不得为每节课复制工作台外壳：六节课共用 grid-v3 唯一一套插槽。
 */
import {
  g0u1GridLessons,
  type GridLesson,
} from '@/content/curriculum/g0-u1-grid-lessons'
import { g0u3LoopLessons } from '@/content/curriculum/g0-u3-loop-lessons'

/**
 * 已迁入 V3 的网格课节（顺序与课程数据登记顺序一致）。
 * OPS-054 第三批追加 G0-U3 的四节网格课（L01/L02/L03/L05）；G0-U3-L04 与
 * G0-U3-L06（OPS-055 森林节奏演出）是事件课，走 event-v3，不在本表登记。
 * 单元内序号与“上一课”由 `v3-unit-context.ts` 按单元计算，不按本数组。
 */
export const GRID_V3_LESSON_IDS = [
  'G0-U1-L01',
  'G0-U1-L02',
  'G0-U1-L03',
  'G0-U1-L04',
  'G0-U1-L05',
  'G0-U1-L06',
  'G0-U3-L01',
  'G0-U3-L02',
  'G0-U3-L03',
  'G0-U3-L05',
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

/** 已登记课节数据；未登记的 id 返回 null（调用方 notFound）。 */
export function getGridV3Lesson(lessonId: string): GridLesson | null {
  if (!isGridV3LessonId(lessonId)) return null
  return g0u1GridLessons[lessonId] ?? g0u3LoopLessons[lessonId] ?? null
}

/** 本课在已登记网格课中的位置（0 起）；单元内序号请用 v3-unit-context。 */
export function gridV3LessonIndex(lessonId: string): number {
  return (GRID_V3_LESSON_IDS as readonly string[]).indexOf(lessonId)
}

/** 同一单元内、同为网格课的上一课（第一课或不同单元时为 null）。 */
export function getPreviousGridV3Lesson(lessonId: string): GridLesson | null {
  const index = gridV3LessonIndex(lessonId)
  if (index <= 0) return null
  const previousId = GRID_V3_LESSON_IDS[index - 1]
  if (previousId.slice(0, 5) !== lessonId.slice(0, 5)) return null
  return getGridV3Lesson(previousId)
}
