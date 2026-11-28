/**
 * OPS-056：启蒙课 lesson-02～lesson-12 的 V3 课程登记。
 *
 * 只读课程数据（launch-lessons.ts / mistake-steps.ts），不复制第二份课程内容。
 * lesson-01 由 OPS-041 的 forest-hello 负责，不在此登记。
 */
import { launchLessons, launchTemplates } from '@/content/curriculum/launch-lessons'
import { getMistakeStep } from '@/content/curriculum/mistake-steps'
import type { DuoMode } from '@/features/lessons/playable-stage/duo-judge'

export const LAUNCH_V3_LESSON_IDS = [
  'lesson-02-forest-greeting',
  'lesson-03-forest-story',
  'lesson-04-meadow-scene',
  'lesson-05-meadow-order',
  'lesson-06-meadow-story',
  'lesson-07-garden-click',
  'lesson-08-garden-dialogue',
  'lesson-09-garden-story',
  'lesson-10-second-friend',
  'lesson-11-duo-rehearsal',
  'lesson-12-graduation-show',
] as const

export type LaunchV3LessonId = (typeof LAUNCH_V3_LESSON_IDS)[number]

/** 双角色课与旧课堂 DuoStage 同一模式（independent / dialogue / graduation）。 */
const DUO_MODES: Partial<Record<LaunchV3LessonId, DuoMode>> = {
  'lesson-10-second-friend': 'independent',
  'lesson-11-duo-rehearsal': 'dialogue',
  'lesson-12-graduation-show': 'graduation',
}

export function isLaunchV3LessonId(value: unknown): value is LaunchV3LessonId {
  return typeof value === 'string' && (LAUNCH_V3_LESSON_IDS as readonly string[]).includes(value)
}

/** V3 studio 路由前缀（/studio/blockly/launch/<lessonId>，十一节课共用一个动态路由）。 */
export const LAUNCH_V3_ROUTE_PREFIX = '/studio/blockly/launch/'

export function launchV3Route(lessonId: string): string {
  return `${LAUNCH_V3_ROUTE_PREFIX}${lessonId}`
}

export function getLaunchV3Lesson(lessonId: string) {
  if (!isLaunchV3LessonId(lessonId)) return null
  return launchLessons.find((lesson) => lesson.id === lessonId) ?? null
}

export function getLaunchV3Template(lessonId: string) {
  const lesson = getLaunchV3Lesson(lessonId)
  return lesson ? launchTemplates.find((template) => template.id === lesson.templateId) : undefined
}

export function launchV3DuoMode(lessonId: string): DuoMode | null {
  return isLaunchV3LessonId(lessonId) ? (DUO_MODES[lessonId] ?? null) : null
}

export function launchV3StepIds(lessonId: string): string[] {
  return getLaunchV3Lesson(lessonId)?.steps.map((step) => step.id) ?? []
}

/** 本课出现过的全部积木（各关 allowed / required 与设计错误程序的并集）。 */
export function launchV3KnownBlockTypes(lessonId: string): string[] {
  const lesson = getLaunchV3Lesson(lessonId)
  if (!lesson) return []
  const types = new Set<string>()
  for (const step of lesson.steps) {
    step.allowedBlocks.forEach((type) => types.add(type))
    step.requiredBlockTypes.forEach((type) => types.add(type))
    getMistakeStep(lessonId, step.id)?.wrongProgram.forEach((block) => types.add(block.type))
  }
  return [...types]
}
