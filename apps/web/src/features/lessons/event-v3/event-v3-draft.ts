/**
 * OPS-053：G0-U2 事件课的 V3 草稿（新路由 /studio/blockly/event/<lessonId>）。
 *
 * 存：当前关（stepIndex）、每关每个可编辑角色的程序（programs：关 id → 角色 →
 * 积木）、已通过的关（passed，只由真实运行检查写）、失败次数（failures，供三层
 * 提示逐层揭示）、创意关选的角色（creative）、反思选择（reflection）、错误实验里
 * 亲眼看到过的关（observed）、真实遇到过的失败码（mistakes）、是否完成（finished）。
 * 不存：判定结果（刷新后须重新运行检查才出结果）、回放进度、自由试玩记录。
 *
 * 草稿键由外壳信封管理，键名必须是 kidscoding-draft:<lessonId>（契约校验）。
 * 旧事件课堂只写过未分键的 kids-event-lesson-v1:<id>（从未写过分键版本）；本模块
 * 只读旧键做一次性兼容导入（不写、不删、不复制旧键，也不写认领戳），且只读当前
 * owner 归属已确认的旧草稿：同 owner 分键版本优先（与 grid 对称，防御性检查）；
 * 未分键版本仅在已有认领戳与当前 owner 完全一致时可读（严格策略，与 OPS-052
 * grid 同一语义，见 hasMatchingLegacyEventClaim），其余情况只提示原键已保留。
 *
 * 校验分层（与 grid-v3-draft 同一策略）：
 * - isValidEventDraft：严格形状，任一字段不对即 false（fail-closed）。
 * - coerceEventDraft：字段级整形，用于插槽挂载与运行适配器读取。
 * - 程序一律按“本关 allowedBlocks + 本关可编辑角色”过滤，别关积木、别的角色
 *   都不进入本关草稿。
 */
import type { EventLesson, EventLessonStep } from '@/content/curriculum/g0-u2-event-lessons'
import { REPEAT_BLOCK, repeatTimes } from '@/features/lessons/blockly/program-tree'

import { eventDraftKey, parseEventDraft } from '../event/event-draft'
import type { EventActorId, EventBlock, EventFailure } from '../event/event-engine'
import { isKnownOwner, readLegacyDraftClaim } from '../legacy-draft-claim'
import { scopedLessonDraftKey } from '../scoped-draft-key'

/** 单个角色脚本的积木上限（顶层 + 循环体合计，防止外部文件撑爆草稿）。 */
export const EVENT_MAX_SCRIPT_BLOCKS = 24
/** 循环体积木上限（与旧事件课堂 cleanBlocks 一致）。 */
const EVENT_MAX_REPEAT_BODY = 12

/** 已知失败码全集（`satisfies` 保证与引擎的 EventFailure 联合类型同步）。 */
const KNOWN_FAILURES = new Set<string>(
  Object.keys({
    no_hat: true,
    hat_not_on_top: true,
    disconnected: true,
    unknown_block: true,
    cannot_do: true,
    loop: true,
    too_early: true,
    nothing_happened: true,
    wrong_actor: true,
    wrong_order: true,
    missing_effect: true,
    extra_effect: true,
    wrong_trigger: true,
    empty_repeat: true,
    out_of_sync: true,
    left_glowing: true,
  } satisfies Record<EventFailure, true>),
)

export type EventActorPrograms = Partial<Record<EventActorId, EventBlock[]>>

export type EventSlotData = {
  version: 1
  lessonId: string
  stepIndex: number
  /** 关 id → 可编辑角色 → 该角色脚本。 */
  programs: Record<string, EventActorPrograms>
  passed: string[]
  failures: number
  reflection?: number
  /** 错误实验里真正跑出预期失败、亲眼看到了错误的关（本机记录）。 */
  observed?: string[]
  /** 创意关：孩子自己选的角色。 */
  creative?: Record<string, { target: string }>
  /** 本课真实遇到过的引擎失败（复盘用）。 */
  mistakes?: EventFailure[]
  finished?: boolean
}

/**
 * 按本关白名单整形一个角色脚本：只留允许的积木；循环只允许出现在顶层，
 * 循环体是平的、最多 12 块、次数取合法选项；顶层与循环体合计不超过上限。
 */
export function cleanEventBlocks(step: EventLessonStep, value: unknown): EventBlock[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set<string>(step.allowedBlocks)
  let budget = EVENT_MAX_SCRIPT_BLOCKS
  const parse = (list: unknown[], top: boolean): EventBlock[] => {
    const out: EventBlock[] = []
    for (const item of list) {
      if (budget <= 0) break
      const b = item as { type?: unknown; disconnected?: unknown; times?: unknown; body?: unknown } | null
      if (!b || typeof b !== 'object' || typeof b.type !== 'string' || !allowed.has(b.type)) continue
      if (!top && b.type === REPEAT_BLOCK) continue
      budget -= 1
      const block: EventBlock = { type: b.type }
      if (top && b.disconnected === true) block.disconnected = true
      if (b.type === REPEAT_BLOCK) {
        block.times = repeatTimes({ type: b.type, times: b.times as number })
        block.body = Array.isArray(b.body) ? parse(b.body.slice(0, EVENT_MAX_REPEAT_BODY), false) : []
      }
      out.push(block)
    }
    return out
  }
  return parse(value, true)
}

const PROGRAM_KEYS = new Set(['type', 'disconnected', 'times', 'body'])

/** 严格结构比较：实际值必须与整形后的脚本逐块相同（多余键、越权积木、截断都不合法）。 */
function sameCleanBlocks(actual: unknown, clean: EventBlock[]): boolean {
  if (!Array.isArray(actual) || actual.length !== clean.length) return false
  return clean.every((block, index) => {
    const item = actual[index] as Record<string, unknown> | null
    if (!item || typeof item !== 'object') return false
    if (Object.keys(item).some((key) => !PROGRAM_KEYS.has(key))) return false
    if (item.type !== block.type) return false
    if (item.disconnected !== undefined && item.disconnected !== true) return false
    if ((item.disconnected === true) !== (block.disconnected === true)) return false
    if (block.times !== undefined) {
      if (item.times !== block.times) return false
    } else if (item.times !== undefined) {
      return false
    }
    if (block.body) {
      if (!sameCleanBlocks(item.body, block.body)) return false
    } else if (item.body !== undefined) {
      return false
    }
    return true
  })
}

function cloneBlocks(blocks: EventBlock[]): EventBlock[] {
  return blocks.map((block) => {
    const copy: EventBlock = { type: block.type }
    if (block.disconnected === true) copy.disconnected = true
    if (typeof block.times === 'number') copy.times = block.times
    if (block.body) copy.body = cloneBlocks(block.body)
    return copy
  })
}

/** 本关某个可编辑角色的初始脚本（错误实验关有预置错误程序，其余多为空）。 */
export function eventStarterBlocks(step: EventLessonStep, actor: EventActorId): EventBlock[] {
  const starter = step.starter?.[actor]
  return starter ? cloneBlocks(starter) : []
}

/** 本关全部可编辑角色的初始脚本。 */
export function eventStarterPrograms(step: EventLessonStep): EventActorPrograms {
  return Object.fromEntries(step.editable.map((actor) => [actor, eventStarterBlocks(step, actor)])) as EventActorPrograms
}

export function emptyEventDraft(lesson: EventLesson): EventSlotData {
  return {
    version: 1,
    lessonId: lesson.id,
    stepIndex: 0,
    programs: Object.fromEntries(lesson.steps.map((step) => [step.id, eventStarterPrograms(step)])),
    passed: [],
    failures: 0,
  }
}

/** 空草稿 = 与初始草稿逐字段相同（新草稿为空时才可提示导入旧草稿）。 */
export function isEmptyEventDraft(lesson: EventLesson, data: EventSlotData): boolean {
  return JSON.stringify(data) === JSON.stringify(emptyEventDraft(lesson))
}

/** 当前关（stepIndex 钳制在 0..steps.length-1）。 */
export function eventCurrentStep(lesson: EventLesson, data: Pick<EventSlotData, 'stepIndex'>): EventLessonStep {
  return lesson.steps[Math.min(Math.max(data.stepIndex, 0), lesson.steps.length - 1)]
}

/** 某关某个角色的脚本（缺失时回填本关初始脚本）。 */
export function eventActorProgram(
  step: EventLessonStep,
  data: Pick<EventSlotData, 'programs'>,
  actor: EventActorId,
): EventBlock[] {
  return data.programs[step.id]?.[actor] ?? eventStarterBlocks(step, actor)
}

/** 本关程序是否与初始程序相同（错误实验“恢复预置程序”按钮的显示条件）。 */
export function isStarterProgram(step: EventLessonStep, data: Pick<EventSlotData, 'programs'>): boolean {
  return step.editable.every(
    (actor) => JSON.stringify(eventActorProgram(step, data, actor)) === JSON.stringify(eventStarterBlocks(step, actor)),
  )
}

/** 一关的通过记录是否可信：错误实验须亲眼看过错误，创意关须带着合法的选择。 */
function passTrusted(step: EventLessonStep, observed: readonly string[], creative: EventSlotData['creative']): boolean {
  if (step.errorLab && !observed.includes(step.id)) return false
  if (step.creative && !creative?.[step.id]) return false
  return true
}

/**
 * 严格形状（不降级）：任一字段不对即 false。
 * - version 必须为 1，lessonId 必须为本课；stepIndex 必须是合法整数下标；
 * - programs 的键只能是本课关 id；每关只能有本关可编辑角色；脚本只能是本关
 *   允许的积木（结构须与整形结果逐块相同）；
 * - passed / observed 只能含本课关 id（observed 只能是错误实验关）；
 * - 错误实验关的通过记录须同时在 observed 里；创意关的通过记录须带有合法选择；
 * - creative 只能选本关给出的角色；reflection 只能是反思选项下标；mistakes 只能
 *   是已知失败码；failures 必须是非负整数；finished 若在须为布尔。
 */
export function isValidEventDraft(lesson: EventLesson, value: unknown): value is EventSlotData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const draft = value as Partial<EventSlotData>
  if (draft.version !== 1) return false
  if (draft.lessonId !== lesson.id) return false
  const steps = new Map(lesson.steps.map((step) => [step.id, step]))
  if (
    typeof draft.stepIndex !== 'number' ||
    !Number.isInteger(draft.stepIndex) ||
    draft.stepIndex < 0 ||
    draft.stepIndex >= lesson.steps.length
  ) {
    return false
  }
  if (!draft.programs || typeof draft.programs !== 'object' || Array.isArray(draft.programs)) return false
  for (const [stepId, perActor] of Object.entries(draft.programs)) {
    const step = steps.get(stepId)
    if (!step || !perActor || typeof perActor !== 'object' || Array.isArray(perActor)) return false
    for (const [actor, blocks] of Object.entries(perActor)) {
      if (!step.editable.includes(actor as EventActorId)) return false
      if (!Array.isArray(blocks) || blocks.length > EVENT_MAX_SCRIPT_BLOCKS) return false
      if (!sameCleanBlocks(blocks, cleanEventBlocks(step, blocks))) return false
    }
  }
  if (!Array.isArray(draft.passed) || !draft.passed.every((id) => typeof id === 'string' && steps.has(id))) return false
  if (new Set(draft.passed).size !== draft.passed.length) return false
  if (typeof draft.failures !== 'number' || !Number.isInteger(draft.failures) || draft.failures < 0) return false
  if (draft.reflection !== undefined) {
    const options = lesson.reflectionCheck.options.length
    if (!Number.isInteger(draft.reflection) || draft.reflection < 0 || draft.reflection >= options) return false
  }
  if (draft.observed !== undefined) {
    if (!Array.isArray(draft.observed) || !draft.observed.every((id) => typeof id === 'string' && !!steps.get(id)?.errorLab)) {
      return false
    }
  }
  if (draft.creative !== undefined) {
    if (!draft.creative || typeof draft.creative !== 'object' || Array.isArray(draft.creative)) return false
    for (const [id, entry] of Object.entries(draft.creative)) {
      const step = steps.get(id)
      if (!step?.creative || !entry || typeof entry !== 'object' || typeof entry.target !== 'string') return false
      if (Object.keys(entry).some((key) => key !== 'target')) return false
      if (!step.creative.choices.includes(entry.target)) return false
    }
  }
  for (const id of draft.passed) {
    if (!passTrusted(steps.get(id)!, draft.observed ?? [], draft.creative)) return false
  }
  if (draft.mistakes !== undefined) {
    if (!Array.isArray(draft.mistakes) || !draft.mistakes.every((m) => typeof m === 'string' && KNOWN_FAILURES.has(m))) {
      return false
    }
  }
  if (draft.finished !== undefined && typeof draft.finished !== 'boolean') return false
  return true
}

/**
 * 外壳信封解包后的草稿整形（字段级过滤）：
 * - 整体损坏（非对象 / version 非 1 / lessonId 非本课）→ 空草稿；
 * - stepIndex 越界钳制；未知关、未知角色的程序丢弃；缺失的角色脚本回填初始脚本；
 * - 不可信的通过记录（错误实验未观察、创意关无合法选择）丢弃；
 * - 非法失败码、越界反思下标、非法创意选择丢弃；failures 非法时归零。
 */
export function coerceEventDraft(lesson: EventLesson, value: unknown): EventSlotData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyEventDraft(lesson)
  const raw = value as Partial<EventSlotData>
  if (raw.version !== 1) return emptyEventDraft(lesson)
  if (raw.lessonId !== lesson.id) return emptyEventDraft(lesson)
  const stepIds = lesson.steps.map((step) => step.id)
  const rawPrograms = raw.programs && typeof raw.programs === 'object' ? (raw.programs as Record<string, unknown>) : {}
  const programs: Record<string, EventActorPrograms> = {}
  for (const step of lesson.steps) {
    const perActor = rawPrograms[step.id]
    const source = perActor && typeof perActor === 'object' ? (perActor as Record<string, unknown>) : {}
    const kept: EventActorPrograms = {}
    for (const actor of step.editable) {
      kept[actor] = Array.isArray(source[actor]) ? cleanEventBlocks(step, source[actor]) : eventStarterBlocks(step, actor)
    }
    programs[step.id] = kept
  }
  const observed = Array.isArray(raw.observed)
    ? [...new Set(raw.observed.filter((id): id is string => typeof id === 'string' && !!lesson.steps.find((s) => s.id === id)?.errorLab))]
    : []
  const creative: NonNullable<EventSlotData['creative']> = {}
  if (raw.creative && typeof raw.creative === 'object') {
    for (const step of lesson.steps) {
      const target = ((raw.creative as Record<string, unknown>)[step.id] as { target?: unknown } | undefined)?.target
      if (step.creative && typeof target === 'string' && step.creative.choices.includes(target)) {
        creative[step.id] = { target }
      }
    }
  }
  const passed = Array.isArray(raw.passed)
    ? [...new Set(raw.passed.filter((id): id is string => typeof id === 'string' && stepIds.includes(id)))]
        .filter((id) => passTrusted(lesson.steps.find((s) => s.id === id)!, observed, creative))
    : []
  const mistakes = Array.isArray(raw.mistakes)
    ? [...new Set(raw.mistakes.filter((m): m is EventFailure => typeof m === 'string' && KNOWN_FAILURES.has(m)))]
    : []
  const options = lesson.reflectionCheck.options.length
  const reflection =
    Number.isInteger(raw.reflection) && (raw.reflection as number) >= 0 && (raw.reflection as number) < options
      ? (raw.reflection as number)
      : undefined
  const next: EventSlotData = {
    version: 1,
    lessonId: lesson.id,
    stepIndex:
      typeof raw.stepIndex === 'number' && Number.isFinite(raw.stepIndex)
        ? Math.min(Math.max(Math.floor(raw.stepIndex), 0), lesson.steps.length - 1)
        : 0,
    programs,
    passed,
    failures: typeof raw.failures === 'number' && Number.isInteger(raw.failures) && raw.failures >= 0 ? raw.failures : 0,
  }
  if (reflection !== undefined) next.reflection = reflection
  if (observed.length > 0) next.observed = observed
  if (Object.keys(creative).length > 0) next.creative = creative
  if (mistakes.length > 0) next.mistakes = mistakes
  if (raw.finished === true) next.finished = true
  return next
}

/**
 * 严格归属判定（与 OPS-052 hasMatchingLegacyGridClaim 同一语义，只作用于
 * G0-U2 事件课导入，不改共享 legacy-draft-claim.ts）：未分键旧键没有归属信息，
 * 戳为空、裸 `guest` 戳都不算可信证据；只有已存在的认领戳与当前 owner 完全一致
 * 时才视为归属已确认。本模块从不写认领戳。
 */
export function hasMatchingLegacyEventClaim(owner?: string | null): owner is string {
  if (!isKnownOwner(owner)) return false
  return readLegacyDraftClaim() === owner
}

/**
 * 旧事件课堂草稿键（只读），只返回当前 owner 归属已确认的候选键：
 * - 当前 owner 的分键版本（旧课堂从未写过，保留为防御性检查，与 grid 对称）；
 * - 未分键的 `kids-event-lesson-v1:<lessonId>`：仅当认领戳与当前 owner 完全一致。
 * 身份未知返回空列表。
 */
export function legacyEventDraftKeys(lessonId: string, owner?: string | null): string[] {
  if (!isKnownOwner(owner)) return []
  const keys = [scopedLessonDraftKey(owner, eventDraftKey(lessonId))]
  if (hasMatchingLegacyEventClaim(owner)) keys.push(eventDraftKey(lessonId))
  return keys
}

function readLegacy(lessonId: string, owner?: string | null): { key: string; raw: string } | null {
  if (typeof window === 'undefined') return null
  for (const key of legacyEventDraftKeys(lessonId, owner)) {
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
 * 未分键旧草稿存在、但当前 owner 没有可信且匹配的归属证据：只检查键是否存在，
 * 不读内容、不解析、不展示、不认领、不导入，只供提示“原草稿已保留”。旧键保留。
 */
export function hasUnclaimableLegacyEventDraft(lesson: EventLesson, owner?: string | null): boolean {
  if (typeof window === 'undefined') return false
  if (hasMatchingLegacyEventClaim(owner)) return false
  if (readLegacy(lesson.id, owner)) return false
  try {
    return window.localStorage.getItem(eventDraftKey(lesson.id)) !== null
  } catch {
    return false
  }
}

/** 旧事件课堂是否留有当前 owner 归属已确认的可读草稿。 */
export function hasLegacyEventDraft(lesson: EventLesson, owner?: string | null): boolean {
  return readLegacy(lesson.id, owner) !== null
}

export type LegacyEventImport =
  | {
      ok: true
      data: EventSlotData
      /** 旧草稿所到的关（0 起）。 */
      fromStep: number
      /** 旧草稿里至少一个角色有程序的关数。 */
      importedSteps: number
    }
  | { ok: false; reason: string }

/**
 * 一次性兼容导入：把旧事件课堂草稿转成 V3 草稿。
 * - 只读旧键，永不覆盖新草稿、永不删除原草稿、从不写认领戳（调用方只在新草稿
 *   为空时才提示导入，并在点击时重新校验）。
 * - 旧草稿先经旧课堂的防御性解析器 parseEventDraft，再按本关白名单收紧。
 * - passed / observed / creative / reflection / mistakes 是旧课堂在同一台设备上
 *   用同一引擎真实跑出的记录，随程序带过来（不可信的通过记录丢弃）；failures
 *   无法从旧草稿恢复，归零；savedAt 不带过来。
 * - 缺失的角色脚本按本关初始脚本回填；全部关都通过时 finished = true。
 */
export function importLegacyEventDraft(lesson: EventLesson, owner?: string | null): LegacyEventImport {
  const found = readLegacy(lesson.id, owner)
  if (found === null) return { ok: false, reason: '旧课堂没有找到可导入的草稿。' }
  const parsed = parseEventDraft(lesson, found.raw)
  if (!parsed) return { ok: false, reason: '旧课堂的草稿格式不对，无法导入。' }
  const programs: Record<string, EventActorPrograms> = {}
  let importedSteps = 0
  for (const step of lesson.steps) {
    const perActor = parsed.programs[step.id] ?? {}
    const kept: EventActorPrograms = {}
    let any = false
    for (const actor of step.editable) {
      const blocks = perActor[actor]
      if (Array.isArray(blocks)) {
        kept[actor] = cleanEventBlocks(step, blocks)
        if (blocks.length > 0) any = true
      } else {
        kept[actor] = eventStarterBlocks(step, actor)
      }
    }
    programs[step.id] = kept
    if (any) importedSteps += 1
  }
  const observed = parsed.observed ?? []
  const creative = parsed.creative ?? {}
  const passed = parsed.passed.filter((id) => {
    const step = lesson.steps.find((s) => s.id === id)
    return !!step && passTrusted(step, observed, creative)
  })
  const stepIndex = Math.min(Math.max(parsed.stepIndex, 0), lesson.steps.length - 1)
  const data: EventSlotData = { version: 1, lessonId: lesson.id, stepIndex, programs, passed, failures: 0 }
  if (parsed.reflection !== undefined) data.reflection = parsed.reflection
  if (observed.length > 0) data.observed = observed
  if (Object.keys(creative).length > 0) data.creative = creative
  if (parsed.mistakes && parsed.mistakes.length > 0) data.mistakes = parsed.mistakes
  if (passed.length === lesson.steps.length) data.finished = true
  return { ok: true, data, fromStep: stepIndex, importedSteps }
}
