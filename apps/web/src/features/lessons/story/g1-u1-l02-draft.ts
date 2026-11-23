/**
 * G1-U1-L02 本机草稿：只存学生的课内进度与程序，不存判定结果。
 *
 * 存：当前关（stepIndex）、每关程序（programs，按关分键）、已通过的关
 * （passed）、失败码（mistakes）、已观察的错误实验（observed）、复盘答案
 * （reflection）、是否完成（finished）。
 * 不存：判定结果（刷新后须重新运行才出结果）、预测选择 guess（组件内状态，
 *   与旧课堂一致，不持久化）、savedAt（由外壳信封持有）。
 *
 * 草稿键已改为规范格式 kidscoding-draft:G1-U1-L02（与契约一致）。
 * 旧键 kids-story-lesson-v1:G1-U1-L02 已废弃、不迁移（Q9 方案 A：课未发布、
 * 无真实用户数据，无物可迁；路由层不做一次性迁移）。旧键常量只供测试与
 * E2E 断言“旧键不存在 / 未被写入”时引用，不得用于读写草稿。
 * 外壳信封草稿接管保存与恢复：本文件只留草稿形状与整形
 * （isValidStoryDraft / coerceStoryDraft / emptyStoryDraft），供外壳与
 * 适配器使用。
 *
 * 本课积木箱：开始事件、对白、切换角色（无移动；say_together 不是
 * Blockly 注册积木，草稿不收，判定层仍保留 overlap 码位）。
 */
import {
  G1_U1_L02_STORY_LESSON,
  type StoryLesson,
} from '@/content/curriculum/g1-u1-story-lessons'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'

import type { TurnTakingFailure } from './g1-u1-l02-judging'

export const G1_LESSON_ID = 'G1-U1-L02'
export const STORY_DRAFT_KEY = 'kidscoding-draft:G1-U1-L02'
/** 已废弃的旧键（Q9 方案 A）：只供测试/E2E 断言其不存在，不得读写。 */
export const LEGACY_STORY_DRAFT_KEY = 'kids-story-lesson-v1:G1-U1-L02'

export type StorySlotData = {
  version: 1
  lessonId: 'G1-U1-L02'
  stepIndex: number
  programs: Record<string, ProgramBlock[]>
  passed: string[]
  mistakes: string[]
  observed: string[]
  reflection?: number
  finished?: boolean
}

const KNOWN_BLOCK_TYPES = ['when_start', 'say_line', 'switch_character']
const KNOWN_FAILURES: TurnTakingFailure[] = [
  'missing_start',
  'missing_line',
  'wrong_actor',
  'wrong_text',
  'reversed_order',
  'overlap',
  'too_many',
  'unknown_block',
  'invalid_program',
]

function stepIds(lesson: StoryLesson): string[] {
  return lesson.steps.map((step) => step.id)
}

export function emptyStoryDraft(lesson: StoryLesson = G1_U1_L02_STORY_LESSON): StorySlotData {
  return {
    version: 1,
    lessonId: 'G1-U1-L02',
    stepIndex: 0,
    programs: Object.fromEntries(lesson.steps.map((step) => [step.id, step.starterBlocks ?? []])),
    passed: [],
    mistakes: [],
    observed: [],
  }
}

function isValidBlock(value: unknown): value is ProgramBlock {
  if (!value || typeof value !== 'object') return false
  const block = value as Partial<ProgramBlock>
  if (typeof block.type !== 'string' || !KNOWN_BLOCK_TYPES.includes(block.type)) return false
  if (block.line !== undefined && typeof block.line !== 'string') return false
  if (block.disconnected !== undefined && typeof block.disconnected !== 'boolean') return false
  return true
}

function coerceProgram(
  value: unknown,
  fallback: ProgramBlock[],
): ProgramBlock[] {
  if (!Array.isArray(value)) return [...fallback]
  return value.filter(isValidBlock).map((block) => {
    const clean: ProgramBlock = { type: block.type }
    if (typeof block.line === 'string') clean.line = block.line
    if (block.disconnected === true) clean.disconnected = true
    return clean
  })
}

/**
 * 严格形状（不降级）：任一字段不对即 false。
 * - version 必须为 1，lessonId 必须为本课；
 * - stepIndex 必须为 0..6 的整数；
 * - programs 的键只能是已知关 id，值只能是已知积木组成的程序；
 * - passed / observed 只能含已知关 id；mistakes 只能含 9 种失败码；
 * - reflection 若在，须为 0..2 的整数；finished 若在，须为布尔值。
 */
export function isValidStoryDraft(value: unknown): value is StorySlotData {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<StorySlotData>
  if (draft.version !== 1) return false
  if (draft.lessonId !== 'G1-U1-L02') return false
  const lesson = G1_U1_L02_STORY_LESSON
  const ids = stepIds(lesson)
  if (typeof draft.stepIndex !== 'number' || !Number.isInteger(draft.stepIndex) || draft.stepIndex < 0 || draft.stepIndex >= lesson.steps.length) return false
  if (!draft.programs || typeof draft.programs !== 'object') return false
  for (const [key, program] of Object.entries(draft.programs)) {
    if (!ids.includes(key)) return false
    if (!Array.isArray(program) || !program.every(isValidBlock)) return false
  }
  if (!Array.isArray(draft.passed) || !draft.passed.every((id) => ids.includes(id))) return false
  if (!Array.isArray(draft.mistakes) || !draft.mistakes.every((code) => (KNOWN_FAILURES as string[]).includes(code))) return false
  if (!Array.isArray(draft.observed) || !draft.observed.every((id) => ids.includes(id))) return false
  if (draft.reflection !== undefined && (!Number.isInteger(draft.reflection) || draft.reflection < 0 || draft.reflection > 2)) return false
  if (draft.finished !== undefined && typeof draft.finished !== 'boolean') return false
  return true
}

/**
 * 外壳信封解包后的草稿整形（字段级过滤）：
 * - 整体损坏（非对象 / version 非 1 / lessonId 非本课）→ 空草稿；
 * - stepIndex 越界钳制到末关；未知关 id 的程序 / 通过 / 观察记录丢弃；
 *   缺失关的程序回填 starterBlocks；非法失败码丢弃；reflection 越界丢弃。
 */
export function coerceStoryDraft(
  value: unknown,
  lesson: StoryLesson = G1_U1_L02_STORY_LESSON,
): StorySlotData {
  if (!value || typeof value !== 'object') return emptyStoryDraft(lesson)
  const raw = value as Partial<StorySlotData>
  if (raw.version !== 1) return emptyStoryDraft(lesson)
  if (raw.lessonId !== 'G1-U1-L02') return emptyStoryDraft(lesson)
  const ids = stepIds(lesson)
  const programs: Record<string, ProgramBlock[]> = {}
  for (const step of lesson.steps) {
    const program = (raw.programs as Record<string, unknown> | undefined)?.[step.id]
    programs[step.id] = coerceProgram(program, step.starterBlocks ?? [])
  }
  const filterIds = (list: unknown): string[] =>
    Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string' && ids.includes(id)) : []
  const next: StorySlotData = {
    version: 1,
    lessonId: 'G1-U1-L02',
    stepIndex:
      typeof raw.stepIndex === 'number'
        ? Math.min(Math.max(Math.floor(raw.stepIndex), 0), lesson.steps.length - 1)
        : 0,
    programs,
    passed: filterIds(raw.passed),
    mistakes: Array.isArray(raw.mistakes)
      ? raw.mistakes.filter((code): code is string => typeof code === 'string' && (KNOWN_FAILURES as string[]).includes(code))
      : [],
    observed: filterIds(raw.observed),
  }
  if (typeof raw.reflection === 'number' && Number.isInteger(raw.reflection) && raw.reflection >= 0 && raw.reflection <= 2) {
    next.reflection = raw.reflection
  }
  if (raw.finished === true) next.finished = true
  return next
}
