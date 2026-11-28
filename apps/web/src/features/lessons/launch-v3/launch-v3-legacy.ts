/**
 * OPS-056：启蒙课 V3 首次访问兼容导入（按课程 ID 参数化，语义同 OPS-041 importLegacyForestDraft）。
 *
 * 归属策略（复审 HOLD P0，复用 OPS-052 grid / OPS-053 event 已验收的严格机制）：
 * - 旧课堂按步草稿（sessionStorage `kc-lesson-draft:<lessonId>:<step>`）写入时没有 owner。
 *   只有当前 owner 身份已知、且本浏览器的认领戳（`kc-lesson-draft-owner-v1`）与当前
 *   owner 完全一致时，才允许读取内容与导入；空戳、裸 `guest` 戳、他人戳、未知身份一律
 *   不读内容（fail-closed）。
 * - 本模块从不写认领戳、从不修改或删除任何旧键。
 * - 归属无法确认时只检查键是否存在（hasUnclaimableLegacyLaunchDraft），不读内容，仅用于
 *   如实提示「原草稿已原样保留」。
 *
 * 导入内容规则（未变）：
 * - 逐关校验：积木须为本课已知积木；出现未知积木即整单失败（fail-closed，如实提示，不导入一半）。
 * - 对白 id 未知时只剥 line、保留积木（与 coerceLaunchDraft 同口径）。
 * - 通过记录无法从旧草稿推断：导入后 passed 为空，须重新运行才能通过；失败次数归零。
 * - 缺失的中间关、未到达的后续关按初始程序回填（设计错误关为错误程序，其余为空）。
 */
import type { ProgramBlock } from '@/features/lessons/blockly/observable-run'
import { isKnownSayLine } from '@/features/lessons/blockly/say-line-presets'
import { isKnownOwner, readLegacyDraftClaim } from '@/features/lessons/legacy-draft-claim'
import { loadLessonDraft, readLastLessonStep } from '@/features/progress/lesson-draft'

import { launchStarterProgram, type LaunchSlotData } from './launch-v3-draft'
import { launchV3KnownBlockTypes, launchV3StepIds } from './launch-v3-lessons'

export type LegacyLaunchImport =
  | { ok: true; data: LaunchSlotData; fromStep: number; importedSteps: number }
  | { ok: false; reason: string }

/** 当前 owner 是否持有与本浏览器认领戳完全一致的归属证据（严格：空戳与裸 guest 戳都不算）。 */
export function hasMatchingLegacyLaunchClaim(owner?: string | null): owner is string {
  if (typeof window === 'undefined') return false
  if (!isKnownOwner(owner)) return false
  return readLegacyDraftClaim() === owner
}

/** 旧课堂按步草稿键是否存在（只看键名，不读内容）。 */
function legacyLaunchKeyExists(lessonId: string): boolean {
  if (typeof window === 'undefined') return false
  const prefix = `kc-lesson-draft:${lessonId}:`
  try {
    const storage = window.sessionStorage
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key && key.startsWith(prefix)) return true
    }
  } catch {
    return false
  }
  return false
}

/** 旧课堂是否留有当前 owner 归属已确认的可读草稿。 */
export function hasLegacyLaunchDraft(lessonId: string, owner?: string | null): boolean {
  if (launchV3StepIds(lessonId).length === 0) return false
  if (!hasMatchingLegacyLaunchClaim(owner)) return false
  return readLastLessonStep(lessonId) !== null
}

/**
 * 本浏览器有该课的旧草稿键，但当前 owner 没有可信且匹配的归属证据：只检查键是否存在，
 * 不读内容、不导入、不认领。
 */
export function hasUnclaimableLegacyLaunchDraft(lessonId: string, owner?: string | null): boolean {
  if (launchV3StepIds(lessonId).length === 0) return false
  if (hasMatchingLegacyLaunchClaim(owner)) return false
  return legacyLaunchKeyExists(lessonId)
}

export function importLegacyLaunchDraft(lessonId: string, owner?: string | null): LegacyLaunchImport {
  const stepIds = launchV3StepIds(lessonId)
  if (stepIds.length === 0) return { ok: false, reason: '这节课没有登记，无法导入旧草稿。' }
  if (!hasMatchingLegacyLaunchClaim(owner)) {
    return { ok: false, reason: '无法确认旧草稿属于当前账号，原草稿已原样保留。' }
  }
  const lastStep = readLastLessonStep(lessonId)
  if (lastStep === null) return { ok: false, reason: '旧课堂没有找到可导入的草稿。' }
  const known = launchV3KnownBlockTypes(lessonId)
  const reach = Math.min(Math.max(lastStep, 0), stepIds.length - 1)
  const programs: Record<string, ProgramBlock[]> = {}
  let importedSteps = 0
  for (let index = 0; index <= reach; index += 1) {
    const stepId = stepIds[index]
    const legacy = loadLessonDraft(lessonId, index)
    if (!legacy) {
      programs[stepId] = launchStarterProgram(lessonId, stepId)
      continue
    }
    if (!Array.isArray(legacy.blocks)) {
      return { ok: false, reason: `旧课堂第 ${index + 1} 关的草稿格式不对，无法导入。` }
    }
    const clean: ProgramBlock[] = []
    for (const block of legacy.blocks as unknown[]) {
      if (!block || typeof block !== 'object' || typeof (block as { type?: unknown }).type !== 'string') {
        return { ok: false, reason: `旧课堂第 ${index + 1} 关的草稿格式不对，无法导入。` }
      }
      const { type, line, disconnected } = block as { type: string; line?: unknown; disconnected?: unknown }
      if (!known.includes(type)) {
        return { ok: false, reason: `旧课堂第 ${index + 1} 关里有这节课没有的积木（${type}），无法导入。` }
      }
      const next: ProgramBlock = { type }
      if (typeof line === 'string' && isKnownSayLine(line)) next.line = line
      if (disconnected === true) next.disconnected = true
      clean.push(next)
    }
    programs[stepId] = clean
    importedSteps += 1
  }
  for (let index = reach + 1; index < stepIds.length; index += 1) {
    programs[stepIds[index]] = launchStarterProgram(lessonId, stepIds[index])
  }
  return {
    ok: true,
    data: { version: 1, lessonId, stepIndex: reach, programs, passed: [], failures: 0 },
    fromStep: reach,
    importedSteps,
  }
}
