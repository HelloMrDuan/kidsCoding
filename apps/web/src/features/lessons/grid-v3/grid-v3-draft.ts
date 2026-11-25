/**
 * OPS-052：G0-U1 grid 课的 V3 草稿（新路由 /studio/blockly/grid/<lessonId>）。
 *
 * 存：当前关（stepIndex）、每关程序（programs，按关 id 分键）、已通过的关
 * （passed，只由真实运行写）、失败次数（failures，供三层提示逐层揭示）、
 * 创意关选的目标格（creative）、反思选择（reflection）、真实遇到过的失败码
 * （mistakes，供复盘）、是否完成（finished）。
 * 不存：判定结果（刷新后须重新运行才出结果）、当前播放帧（会话内）。
 *
 * 草稿键由外壳信封管理，键名必须是 kidscoding-draft:<lessonId>
 * （契约校验）。旧课堂的草稿在未按账号分键的 kids-grid-lesson-v1:<id>；
 * 本模块只读旧键做一次性兼容导入（不写、不删、不复制旧键，也不写认领戳），
 * 且只读当前 owner 归属已确认的旧草稿：同 owner 分键版本优先；未分键版本
 * 仅在已有认领戳与当前 owner 完全一致时可读（严格策略，见
 * hasMatchingLegacyGridClaim），其余情况只提示原键已保留。
 *
 * 校验分层（与 lesson-01-forest-hello 同一策略）：
 * - isValidGridDraft：严格形状，任一字段不对即 false；外壳恢复/导入时
 *   用它决定是否接受（fail-closed，不降级猜测）。
 * - coerceGridDraft：字段级整形（越界钳制、未知关/积木丢弃、缺失关回填
 *   初始程序），用于插槽挂载与运行适配器读取。
 * - 程序一律经 sanitizeProgram 按“本关 allowedBlocks”过滤，任何别关积木
 *   都不进入本关草稿。
 */
import type { GridLesson, GridLessonStep } from '@/content/curriculum/g0-u1-grid-lessons'
import { sanitizeProgram, type ProgramBlock } from '@/features/lessons/blockly/program-tree'

import { GRID_MAX_ACTIONS, type Cell, type GridFailure } from '../grid/grid-engine'
import { gridDraftKey, parseGridDraft } from '../grid/grid-draft'
import { isKnownOwner, readLegacyDraftClaim } from '../legacy-draft-claim'

const MAX_PROGRAM_BLOCKS = GRID_MAX_ACTIONS + 1

/** 已知失败码全集（`satisfies` 保证与引擎的 GridFailure 联合类型同步，缺一即编译失败）。 */
const KNOWN_FAILURES = new Set<string>(
  Object.keys({
    no_start: true,
    disconnected: true,
    unknown_block: true,
    too_many: true,
    out_of_bounds: true,
    hit_rock: true,
    fell_in_water: true,
    door_locked: true,
    no_key_here: true,
    not_at_door: true,
    need_key: true,
    not_at_goal: true,
    empty_repeat: true,
    too_deep: true,
    repeat_required: true,
    stamp_twice: true,
    no_pot_here: true,
    watered_twice: true,
    pots_missed: true,
    wrong_pattern: true,
    pattern_short: true,
    wrong_route: true,
    wrong_facing: true,
  } satisfies Record<GridFailure, true>),
)

export type GridSlotData = {
  version: 1
  lessonId: string
  stepIndex: number
  programs: Record<string, ProgramBlock[]>
  passed: string[]
  failures: number
  reflection?: number
  /** 错误实验里真正跑出预期失败、亲眼看到了错误的关（本机记录）。 */
  observed?: string[]
  /** 创意关：孩子自己选的目标格。 */
  creative?: Record<string, { goal: Cell }>
  /** 本课真实遇到过的引擎失败（复盘用）。 */
  mistakes?: GridFailure[]
  finished?: boolean
}

/** 本关允许的积木集合（when_start 已在课程数据里，不需要另加）。 */
export function gridAllowedSet(step: GridLessonStep): Set<string> {
  return new Set<string>(step.allowedBlocks)
}

function cleanProgram(step: GridLessonStep, value: unknown): ProgramBlock[] {
  return sanitizeProgram(value, gridAllowedSet(step), MAX_PROGRAM_BLOCKS)
}

const PROGRAM_KEYS = new Set(['type', 'disconnected', 'times', 'body'])

/**
 * 严格结构比较：实际值必须与按白名单整形后的程序逐块相同（多余的键、
 * 越权积木、被截断的循环体都算不合法）。不比较键顺序，避免把 JSON 键
 * 顺序当成数据差异。
 */
function sameCleanProgram(actual: unknown, clean: ProgramBlock[]): boolean {
  if (!Array.isArray(actual) || actual.length !== clean.length) return false
  return clean.every((block, index) => {
    const item = actual[index] as Record<string, unknown> | null
    if (!item || typeof item !== 'object') return false
    if (Object.keys(item).some((key) => !PROGRAM_KEYS.has(key))) return false
    if (item.type !== block.type) return false
    if ((item.disconnected === true) !== (block.disconnected === true)) return false
    if (block.times !== undefined) {
      if (item.times !== block.times) return false
    } else if (item.times !== undefined) {
      return false
    }
    if (block.body) {
      if (!sameCleanProgram(item.body, block.body)) return false
    } else if (item.body !== undefined) {
      return false
    }
    return true
  })
}

function cloneProgram(blocks: ProgramBlock[]): ProgramBlock[] {
  return blocks.map((block) => {
    const copy: ProgramBlock = { type: block.type }
    if (typeof block.line === 'string') copy.line = block.line
    if (typeof block.times === 'number') copy.times = block.times
    if (block.disconnected === true) copy.disconnected = true
    if (block.body) copy.body = cloneProgram(block.body)
    return copy
  })
}

/** 本关初始程序：error-lab 关有预置错误程序，其余为空。 */
export function gridStarterProgram(step: GridLessonStep): ProgramBlock[] {
  return step.starterBlocks ? cloneProgram(step.starterBlocks) : []
}

export function emptyGridDraft(lesson: GridLesson): GridSlotData {
  return {
    version: 1,
    lessonId: lesson.id,
    stepIndex: 0,
    programs: Object.fromEntries(lesson.steps.map((step) => [step.id, gridStarterProgram(step)])),
    passed: [],
    failures: 0,
  }
}

/** 空草稿 = 与初始草稿逐字段相同（新草稿为空时才可提示导入旧草稿）。 */
export function isEmptyGridDraft(lesson: GridLesson, data: GridSlotData): boolean {
  return JSON.stringify(data) === JSON.stringify(emptyGridDraft(lesson))
}

/** 当前关数据（stepIndex 钳制在 0..steps.length-1）。 */
export function gridCurrentStep(lesson: GridLesson, data: Pick<GridSlotData, 'stepIndex'>): GridLessonStep {
  return lesson.steps[Math.min(Math.max(data.stepIndex, 0), lesson.steps.length - 1)]
}

/** 当前关程序（缺失时回填本关初始程序）。 */
export function gridCurrentProgram(
  lesson: GridLesson,
  data: Pick<GridSlotData, 'stepIndex' | 'programs'>,
): ProgramBlock[] {
  const step = gridCurrentStep(lesson, data)
  return data.programs[step.id] ?? gridStarterProgram(step)
}

/**
 * 严格形状（不降级）：任一字段不对即 false。
 * - version 必须为 1，lessonId 必须为本课；
 * - stepIndex 必须是 0..关数-1 的整数；
 * - programs 的键只能是本课关 id，值只能是本关允许的积木（不限动作数则
 *   按 GRID_MAX_ACTIONS+1 截断视为不合法，防止外部文件撑爆草稿）；
 * - passed / observed 只能含本课关 id；failures 必须是非负整数；
 * - 创意关出现在 passed 里时，creative 必须带有该关可选的目标格（否则无法
 *   重放，不能算通过）；
 * - reflection 只能是反思选项下标；creative 的目标格必须是该关给出的
 *   选项；mistakes 只能是已知失败码；finished 若在须为布尔。
 */
export function isValidGridDraft(lesson: GridLesson, value: unknown): value is GridSlotData {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<GridSlotData>
  if (draft.version !== 1) return false
  if (draft.lessonId !== lesson.id) return false
  const stepIds = lesson.steps.map((step) => step.id)
  if (
    typeof draft.stepIndex !== 'number' ||
    !Number.isInteger(draft.stepIndex) ||
    draft.stepIndex < 0 ||
    draft.stepIndex >= lesson.steps.length
  ) {
    return false
  }
  if (!draft.programs || typeof draft.programs !== 'object') return false
  for (const [key, program] of Object.entries(draft.programs)) {
    const step = lesson.steps.find((item) => item.id === key)
    if (!step) return false
    if (!Array.isArray(program) || program.length > MAX_PROGRAM_BLOCKS) return false
    if (!sameCleanProgram(program, cleanProgram(step, program))) return false
  }
  if (!Array.isArray(draft.passed) || !draft.passed.every((id) => stepIds.includes(id))) return false
  if (typeof draft.failures !== 'number' || !Number.isInteger(draft.failures) || draft.failures < 0) {
    return false
  }
  if (draft.reflection !== undefined) {
    const options = lesson.reflectionCheck.options.length
    if (!Number.isInteger(draft.reflection) || draft.reflection < 0 || draft.reflection >= options) {
      return false
    }
  }
  if (draft.observed !== undefined) {
    const errorLabIds = lesson.steps.filter((step) => step.kind === 'error-lab').map((step) => step.id)
    if (!Array.isArray(draft.observed) || !draft.observed.every((id) => errorLabIds.includes(id))) {
      return false
    }
  }
  if (draft.creative !== undefined) {
    if (!draft.creative || typeof draft.creative !== 'object') return false
    for (const [id, entry] of Object.entries(draft.creative)) {
      const step = lesson.steps.find((item) => item.id === id)
      if (!step?.creative || !entry?.goal) return false
      if (!step.creative.goalChoices.some((cell) => cell.x === entry.goal.x && cell.y === entry.goal.y)) {
        return false
      }
    }
  }
  // 创意关的通过记录必须带着当时选的目标格才能重放：没有目标格的不信
  // （与 coerceGridDraft / 旧课堂解析器同一 fail-closed 语义）。
  for (const id of draft.passed) {
    const step = lesson.steps.find((item) => item.id === id)
    if (step?.creative && !draft.creative?.[id]) return false
  }
  if (draft.mistakes !== undefined) {
    if (!Array.isArray(draft.mistakes) || !draft.mistakes.every((m) => KNOWN_FAILURES.has(m))) {
      return false
    }
  }
  if (draft.finished !== undefined && typeof draft.finished !== 'boolean') return false
  return true
}

/**
 * 外壳信封解包后的草稿整形（字段级过滤）：
 * - 整体损坏（非对象 / version 非 1 / lessonId 非本课）→ 空草稿；
 * - stepIndex 越界钳制；未知关的程序 / 通过记录 / 观察记录丢弃；
 * - 缺失关的程序回填本关初始程序；非法失败码、越界反思下标、非法创意
 *   目标格丢弃；failures 非法时归零。
 */
export function coerceGridDraft(lesson: GridLesson, value: unknown): GridSlotData {
  if (!value || typeof value !== 'object') return emptyGridDraft(lesson)
  const raw = value as Partial<GridSlotData>
  if (raw.version !== 1) return emptyGridDraft(lesson)
  if (raw.lessonId !== lesson.id) return emptyGridDraft(lesson)
  const stepIds = lesson.steps.map((step) => step.id)
  const programs: Record<string, ProgramBlock[]> = {}
  for (const step of lesson.steps) {
    const program = (raw.programs as Record<string, unknown> | undefined)?.[step.id]
    programs[step.id] = Array.isArray(program) ? cleanProgram(step, program) : gridStarterProgram(step)
  }
  const passed = Array.isArray(raw.passed)
    ? [...new Set(raw.passed.filter((id): id is string => typeof id === 'string' && stepIds.includes(id)))]
    : []
  const errorLabIds = lesson.steps.filter((step) => step.kind === 'error-lab').map((step) => step.id)
  const observed = Array.isArray(raw.observed)
    ? [...new Set(raw.observed.filter((id): id is string => typeof id === 'string' && errorLabIds.includes(id)))]
    : []
  const creative: NonNullable<GridSlotData['creative']> = {}
  if (raw.creative && typeof raw.creative === 'object') {
    for (const step of lesson.steps) {
      const entry = (raw.creative as Record<string, unknown>)[step.id] as { goal?: { x?: unknown; y?: unknown } } | undefined
      const goal = entry?.goal
      if (!step.creative || !goal) continue
      const match = step.creative.goalChoices.find((cell) => cell.x === goal.x && cell.y === goal.y)
      if (match) creative[step.id] = { goal: { x: match.x, y: match.y } }
    }
  }
  const mistakes = Array.isArray(raw.mistakes)
    ? [...new Set(raw.mistakes.filter((m): m is GridFailure => typeof m === 'string' && KNOWN_FAILURES.has(m)))]
    : []
  const options = lesson.reflectionCheck.options.length
  const reflection =
    Number.isInteger(raw.reflection) && (raw.reflection as number) >= 0 && (raw.reflection as number) < options
      ? (raw.reflection as number)
      : undefined
  const next: GridSlotData = {
    version: 1,
    lessonId: lesson.id,
    stepIndex:
      typeof raw.stepIndex === 'number'
        ? Math.min(Math.max(Math.floor(raw.stepIndex), 0), lesson.steps.length - 1)
        : 0,
    programs,
    // 创意关的通过记录必须带着当时选的目标格才能重放：没有目标格的不信。
    passed: passed.filter((id) => {
      const step = lesson.steps.find((item) => item.id === id)
      return !step?.creative || creative[id]
    }),
    failures:
      typeof raw.failures === 'number' && Number.isInteger(raw.failures) && raw.failures >= 0
        ? raw.failures
        : 0,
  }
  if (reflection !== undefined) next.reflection = reflection
  if (observed.length > 0) next.observed = observed
  if (Object.keys(creative).length > 0) next.creative = creative
  if (mistakes.length > 0) next.mistakes = mistakes
  if (raw.finished === true) next.finished = true
  return next
}

/**
 * OPS-052 复审 #7149447993：本批 grid 导入的严格归属判定（只作用于 G0-U1
 * grid 导入，不改共享 legacy-draft-claim.ts 的语义，不扩展其他课程）。
 * 未分键旧键本身没有归属信息；“首个打开页面的访客”不等于历史草稿所有者，
 * 所以戳为空、裸 `guest` 戳都不算可信证据。只有已存在的认领戳与当前 owner
 * 完全一致时，才视为归属已确认。本模块从不写认领戳。
 */
export function hasMatchingLegacyGridClaim(owner?: string | null): owner is string {
  if (!isKnownOwner(owner)) return false
  return readLegacyDraftClaim() === owner
}

/**
 * 旧课堂草稿键（只读），只返回当前 owner 归属已确认的候选键：
 * - 当前 owner 的分键旧草稿 `gridDraftKey(id, owner)`：归属由键本身证明，
 *   优先读取；
 * - 未分键的 `kids-grid-lesson-v1:<lessonId>`（G0-U1 旧课堂实际写入位置）：
 *   仅当已有认领戳且与当前 owner 完全一致时可读（hasMatchingLegacyGridClaim）；
 *   无戳、裸 guest 戳、他人戳、已登录账号未认领、身份未知一律不可读。
 * 身份未知（含 undefined / 空串 / 非 user:/guest: 前缀）返回空列表。
 */
export function legacyGridDraftKeys(lessonId: string, owner?: string | null): string[] {
  if (!isKnownOwner(owner)) return []
  const keys = [gridDraftKey(lessonId, owner)]
  if (hasMatchingLegacyGridClaim(owner)) keys.push(gridDraftKey(lessonId))
  return keys
}

function readLegacy(lessonId: string, owner?: string | null): { key: string; raw: string } | null {
  if (typeof window === 'undefined') return null
  for (const key of legacyGridDraftKeys(lessonId, owner)) {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) return { key, raw }
    } catch {
      // 存储被禁：视为没有旧草稿；本课仍可用。
      return null
    }
  }
  return null
}

/**
 * 未分键旧草稿存在、但当前 owner 没有可信且匹配的归属证据（无戳 / 裸 guest 戳 /
 * 他人戳 / 已登录账号 / 身份未知）：只检查键是否存在，不读内容、不解析、不展示、
 * 不认领、不导入，只供提示“原草稿已保留”。旧键保留。
 */
export function hasUnclaimableLegacyGridDraft(lesson: GridLesson, owner?: string | null): boolean {
  if (typeof window === 'undefined') return false
  if (hasMatchingLegacyGridClaim(owner)) return false
  if (readLegacy(lesson.id, owner)) return false
  try {
    return window.localStorage.getItem(gridDraftKey(lesson.id)) !== null
  } catch {
    return false
  }
}

/** 旧课堂是否留有当前 owner 归属已确认的可读草稿。 */
export function hasLegacyGridDraft(lesson: GridLesson, owner?: string | null): boolean {
  return readLegacy(lesson.id, owner) !== null
}

export type LegacyGridImport =
  | {
      ok: true
      data: GridSlotData
      /** 旧草稿所到的关（0 起）。 */
      fromStep: number
      /** 旧草稿里有程序的关数。 */
      importedSteps: number
    }
  | { ok: false; reason: string }

/**
 * 一次性兼容导入：把旧课堂草稿转成新草稿。
 * - 只读旧键，永不覆盖新草稿、永不删除原草稿（调用方只在新草稿为空时才
 *   提示导入；本函数本身不判断新草稿是否为空）。
 * - 程序逐关按本关 allowedBlocks 过滤（旧课堂草稿解析器已做过一次全局
 *   过滤；这里再按本关白名单收紧，别关积木不会混进本关）。
 * - passed / observed / creative / reflection / mistakes 是旧课堂在同一
 *   台设备上用同一引擎真实跑出的记录，随程序一起带过来；failures 无法
 *   从旧草稿恢复，归零。
 * - 缺失关按本关初始程序回填（error-lab 关回填预置错误程序）。
 */
export function importLegacyGridDraft(lesson: GridLesson, owner?: string | null): LegacyGridImport {
  const found = readLegacy(lesson.id, owner)
  if (found === null) {
    return { ok: false, reason: '旧课堂没有找到可导入的草稿。' }
  }
  const parsed = parseGridDraft(lesson, found.raw)
  if (!parsed) {
    return { ok: false, reason: '旧课堂的草稿格式不对，无法导入。' }
  }
  // 严格策略：本函数只读，从不写认领戳（提示出现 ≠ 归属确认）。未分键旧键
  // 只有在已有匹配认领戳时才会被 readLegacy 返回。
  const programs: Record<string, ProgramBlock[]> = {}
  let importedSteps = 0
  for (const step of lesson.steps) {
    const program = parsed.programs[step.id]
    programs[step.id] = Array.isArray(program) && program.length > 0
      ? cleanProgram(step, program)
      : gridStarterProgram(step)
    if (Array.isArray(program) && program.length > 0) importedSteps += 1
  }
  const stepIndex = Math.min(Math.max(parsed.stepIndex, 0), lesson.steps.length - 1)
  const data: GridSlotData = {
    version: 1,
    lessonId: lesson.id,
    stepIndex,
    programs,
    passed: parsed.passed,
    failures: 0,
  }
  if (parsed.reflection !== undefined) data.reflection = parsed.reflection
  if (parsed.observed && parsed.observed.length > 0) data.observed = parsed.observed
  if (parsed.creative && Object.keys(parsed.creative).length > 0) data.creative = parsed.creative
  if (parsed.mistakes && parsed.mistakes.length > 0) data.mistakes = parsed.mistakes
  if (parsed.passed.length === lesson.steps.length) data.finished = true
  return { ok: true, data, fromStep: stepIndex, importedSteps }
}
