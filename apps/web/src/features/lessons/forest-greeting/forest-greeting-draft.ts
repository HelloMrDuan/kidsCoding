/**
 * lesson-02-forest-greeting 本机草稿（新路由 /studio/blockly/lesson-02-forest-greeting）。
 *
 * 存：当前关（stepIndex）、每关程序（programs，按关 id 分键）、已通过的关
 * （passed）、失败次数（failures）、是否完成（finished）。
 * 不存：判定结果（刷新后须重新运行才出结果）、错误实验的观察与回答
 * （与旧课堂一致，会话内状态，不持久化）、savedAt（由外壳信封持有）。
 *
 * 草稿键为规范格式 kidscoding-draft:lesson-02-forest-greeting（与契约一致）。
 * 旧键 kc-lesson-draft:lesson-02-forest-greeting:{step}（sessionStorage，按步）
 * 只读不写：首次访问兼容导入的唯一来源（裁定 5），导入后原草稿原样保留、
 * 永不删除；新路由永不向旧键写入。
 * 外壳信封草稿接管保存与恢复：本文件只留草稿形状、整形与旧草稿导入
 * （isValidGreetingDraft / coerceGreetingDraft / emptyGreetingDraft /
 * importLegacyGreetingDraft），供外壳、适配器与插槽使用。
 */
import {
  loadLessonDraft,
  readLastLessonStep,
} from '@/features/progress/lesson-draft'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { FOREST_GREETING_LINES } from '@/features/lessons/blockly/say-line-presets'

export const GREETING_LESSON_ID = 'lesson-02-forest-greeting'
export const GREETING_DRAFT_KEY = 'kidscoding-draft:lesson-02-forest-greeting'
/** 旧课堂草稿键前缀（sessionStorage，按步分存），只读，不写、不删。 */
export const LEGACY_GREETING_DRAFT_PREFIX = 'kc-lesson-draft:lesson-02-forest-greeting'

export const GREETING_STEP_IDS = ['step-1', 'step-2', 'step-3', 'step-4'] as const
export type GreetingStepId = (typeof GREETING_STEP_IDS)[number]

/** 本课工具箱内的三种积木：开始事件、固定 100 步的移动、说一句话。 */
export const GREETING_KNOWN_BLOCK_TYPES = ['when_start', 'move_right', 'say_line'] as const

/** say_line 可携带的对白 id：只能是森林问候预设（say-line-presets.ts），无自由文本。 */
export const GREETING_KNOWN_LINE_IDS = FOREST_GREETING_LINES.map((line) => line.id)

export type GreetingSlotData = {
  version: 1
  lessonId: 'lesson-02-forest-greeting'
  stepIndex: number
  programs: Record<string, ProgramBlock[]>
  passed: string[]
  failures: number
  finished?: boolean
}

/**
 * 每关的初始程序：第 4 关预置设计错误程序（mistake-steps.ts 原文：
 * 开始时 → 说一句话 → 向右移动，先说话再出场，顺序反了；say 无 line
 * 时说默认对白“你好！”）。
 */
export function greetingStarterProgram(stepId: GreetingStepId): ProgramBlock[] {
  return stepId === 'step-4'
    ? [{ type: 'when_start' }, { type: 'say_line' }, { type: 'move_right' }]
    : []
}

export function emptyGreetingDraft(): GreetingSlotData {
  return {
    version: 1,
    lessonId: 'lesson-02-forest-greeting',
    stepIndex: 0,
    programs: Object.fromEntries(
      GREETING_STEP_IDS.map((id) => [id, greetingStarterProgram(id)]),
    ),
    passed: [],
    failures: 0,
  }
}

/** 空草稿 = 与初始草稿逐字段相同（新草稿为空时才可提示导入旧草稿）。 */
export function isEmptyGreetingDraft(data: GreetingSlotData): boolean {
  return JSON.stringify(data) === JSON.stringify(emptyGreetingDraft())
}

function isValidBlock(value: unknown): value is ProgramBlock {
  if (!value || typeof value !== 'object') return false
  const block = value as Partial<ProgramBlock>
  if (typeof block.type !== 'string' || !(GREETING_KNOWN_BLOCK_TYPES as readonly string[]).includes(block.type)) return false
  if (block.line !== undefined) {
    // 对白只能挂在 say_line 上，且必须是已知预设 id（未知 id 视为篡改/过期快照，严格校验不通过）。
    if (block.type !== 'say_line') return false
    if (typeof block.line !== 'string' || !GREETING_KNOWN_LINE_IDS.includes(block.line)) return false
  }
  if (block.disconnected !== undefined && typeof block.disconnected !== 'boolean') return false
  return true
}

/** 整形用（宽松）：已知积木保留；say_line 的未知对白 id 只剥掉 line 本身（回落默认对白），不丢整块。 */
function sanitizeBlock(value: unknown): ProgramBlock | null {
  if (!value || typeof value !== 'object') return null
  const block = value as Partial<ProgramBlock>
  if (typeof block.type !== 'string' || !(GREETING_KNOWN_BLOCK_TYPES as readonly string[]).includes(block.type)) return null
  const clean: ProgramBlock = { type: block.type }
  if (block.type === 'say_line' && typeof block.line === 'string' && GREETING_KNOWN_LINE_IDS.includes(block.line)) {
    clean.line = block.line
  }
  if (block.disconnected === true) clean.disconnected = true
  return clean
}

function coerceProgram(
  value: unknown,
  fallback: ProgramBlock[],
): ProgramBlock[] {
  if (!Array.isArray(value)) return [...fallback]
  return value.map(sanitizeBlock).filter((block): block is ProgramBlock => block !== null)
}

/**
 * 严格形状（不降级）：任一字段不对即 false。
 * - version 必须为 1，lessonId 必须为本课；
 * - stepIndex 必须为 0..3 的整数；
 * - programs 的键只能是已知关 id，值只能是已知积木组成的程序；
 * - passed 只能含已知关 id；failures 必须是非负整数；
 * - finished 若在，须为布尔值。
 */
export function isValidGreetingDraft(value: unknown): value is GreetingSlotData {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<GreetingSlotData>
  if (draft.version !== 1) return false
  if (draft.lessonId !== 'lesson-02-forest-greeting') return false
  if (typeof draft.stepIndex !== 'number' || !Number.isInteger(draft.stepIndex) || draft.stepIndex < 0 || draft.stepIndex >= GREETING_STEP_IDS.length) return false
  if (!draft.programs || typeof draft.programs !== 'object') return false
  for (const [key, program] of Object.entries(draft.programs)) {
    if (!(GREETING_STEP_IDS as readonly string[]).includes(key)) return false
    if (!Array.isArray(program) || !program.every(isValidBlock)) return false
  }
  if (!Array.isArray(draft.passed) || !draft.passed.every((id) => (GREETING_STEP_IDS as readonly string[]).includes(id))) return false
  if (typeof draft.failures !== 'number' || !Number.isInteger(draft.failures) || draft.failures < 0) return false
  if (draft.finished !== undefined && typeof draft.finished !== 'boolean') return false
  return true
}

/**
 * 外壳信封解包后的草稿整形（字段级过滤）：
 * - 整体损坏（非对象 / version 非 1 / lessonId 非本课）→ 空草稿；
 * - stepIndex 越界钳制到末关；未知关 id 的程序 / 通过记录丢弃；
 *   缺失关的程序回填初始程序；failures 非法时归零。
 */
export function coerceGreetingDraft(value: unknown): GreetingSlotData {
  if (!value || typeof value !== 'object') return emptyGreetingDraft()
  const raw = value as Partial<GreetingSlotData>
  if (raw.version !== 1) return emptyGreetingDraft()
  if (raw.lessonId !== 'lesson-02-forest-greeting') return emptyGreetingDraft()
  const programs: Record<string, ProgramBlock[]> = {}
  for (const stepId of GREETING_STEP_IDS) {
    const program = (raw.programs as Record<string, unknown> | undefined)?.[stepId]
    programs[stepId] = coerceProgram(program, greetingStarterProgram(stepId))
  }
  const next: GreetingSlotData = {
    version: 1,
    lessonId: 'lesson-02-forest-greeting',
    stepIndex:
      typeof raw.stepIndex === 'number'
        ? Math.min(Math.max(Math.floor(raw.stepIndex), 0), GREETING_STEP_IDS.length - 1)
        : 0,
    programs,
    passed: Array.isArray(raw.passed)
      ? raw.passed.filter((id): id is string => typeof id === 'string' && (GREETING_STEP_IDS as readonly string[]).includes(id))
      : [],
    failures:
      typeof raw.failures === 'number' && Number.isInteger(raw.failures) && raw.failures >= 0
        ? raw.failures
        : 0,
  }
  if (raw.finished === true) next.finished = true
  return next
}

/** 旧课堂是否留有有效草稿（任一关有可读的旧键）。 */
export function hasLegacyGreetingDraft(): boolean {
  return readLastLessonStep(GREETING_LESSON_ID) !== null
}

export type LegacyGreetingImport =
  | {
      ok: true
      data: GreetingSlotData
      /** 旧草稿所到的最远关（0..3）。 */
      fromStep: number
      /** 成功读到的旧关草稿数。 */
      importedSteps: number
    }
  | { ok: false; reason: string }

/**
 * 首次访问兼容导入（裁定 5）：把旧课堂按步草稿转成新草稿。
 * - 只读旧键，永不覆盖新草稿、永不删除原草稿（调用方只在新草稿为空时
 *   才提示导入；本函数本身不判断新草稿是否为空）。
 * - 逐关校验：积木须为本课已知的两种；出现未知积木即整单失败
 *   （fail-closed，如实提示，不导入一半）。
 * - 通过记录无法从旧草稿推断（旧草稿只存程序）：导入后 passed 为空，
 *   须重新运行才能通过；失败次数归零。
 * - 缺失的中间关按初始程序回填（第 4 关为设计错误程序，其余为空）。
 */
export function importLegacyGreetingDraft(): LegacyGreetingImport {
  const lastStep = readLastLessonStep(GREETING_LESSON_ID)
  if (lastStep === null) {
    return { ok: false, reason: '旧课堂没有找到可导入的草稿。' }
  }
  const programs: Record<string, ProgramBlock[]> = {}
  let importedSteps = 0
  for (let index = 0; index <= lastStep; index += 1) {
    const stepId = GREETING_STEP_IDS[index]
    const legacy = loadLessonDraft(GREETING_LESSON_ID, index)
    if (!legacy) {
      programs[stepId] = greetingStarterProgram(stepId)
      continue
    }
    if (!Array.isArray(legacy.blocks)) {
      return { ok: false, reason: `旧课堂第 ${index + 1} 关的草稿格式不对，无法导入。` }
    }
    const clean: ProgramBlock[] = []
    for (const block of legacy.blocks) {
      if (!block || typeof block !== 'object' || typeof (block as { type?: unknown }).type !== 'string') {
        return { ok: false, reason: `旧课堂第 ${index + 1} 关的草稿格式不对，无法导入。` }
      }
      const type = (block as { type: string }).type
      if (!(GREETING_KNOWN_BLOCK_TYPES as readonly string[]).includes(type)) {
        return { ok: false, reason: `旧课堂第 ${index + 1} 关里有这节课没有的积木（${type}），无法导入。` }
      }
      const line = (block as { line?: unknown }).line
      if (line !== undefined) {
        // 旧草稿的对白选择一并导入；未知对白 id 整单失败（fail-closed，不导入一半）。
        if (type !== 'say_line' || typeof line !== 'string' || !GREETING_KNOWN_LINE_IDS.includes(line)) {
          return { ok: false, reason: `旧课堂第 ${index + 1} 关里有一句这里不能用的对白，无法导入。` }
        }
        clean.push({ type, line })
        continue
      }
      clean.push({ type })
    }
    programs[stepId] = clean
    importedSteps += 1
  }
  for (let index = lastStep + 1; index < GREETING_STEP_IDS.length; index += 1) {
    programs[GREETING_STEP_IDS[index]] = greetingStarterProgram(GREETING_STEP_IDS[index])
  }
  return {
    ok: true,
    data: {
      version: 1,
      lessonId: 'lesson-02-forest-greeting',
      stepIndex: Math.min(Math.max(lastStep, 0), GREETING_STEP_IDS.length - 1),
      programs,
      passed: [],
      failures: 0,
    },
    fromStep: lastStep,
    importedSteps,
  }
}
