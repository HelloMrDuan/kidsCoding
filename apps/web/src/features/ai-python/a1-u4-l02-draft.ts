/**
 * A1-U4-L02 本机草稿：只存学生的课堂选择，不存判定结果。
 *
 * 存：六项探索数据的分类、三行许可清单、否决题四行处置、scope 题答案、
 * 不覆盖事项选择、提示级数。
 * 不存：探索、清单、迁移的核对结果——刷新后须重新点“核对本课”才出结果。
 * 损坏草稿：字段级过滤（未知编号、非法分类值、超长清单文字、非法许可状态、
 * 非法处置、非法 scope 选项、未知不覆盖事项编号一律丢弃或截断），其余保留；
 * 整体损坏回空草稿，不崩溃。
 * 本课没有污染资格标志：资格规则是教学口径（清单全过只表示本次课堂练习合格，
 * 不等于系统里的许可映射已经存在），不是草稿里的一个布尔值；草稿只记学生做了什么，
 * 资格判断由核对函数与作品总结实时算出。
 *
 * 草稿键已改为规范格式 kidscoding-draft:A1-U4-L02（与契约一致）。
 * hintLevel 只为旧草稿兼容保留：外壳抽屉揭示态不回写草稿，插槽不显示它。
 * 外壳信封草稿 kidscoding-draft:A1-U4-L02 接管保存与恢复：本文件只留
 * 草稿形状与整形（isValidDraftShape / coerceDraft / emptyDraft），
 * 供外壳与适配器使用。
 */

import {
  CHECKLIST_ROWS,
  EXPLORE_IDS,
  MAX_TEXT_LENGTH,
  NON_COVERAGE_ITEMS,
  VETO_IDS,
  type ChecklistRow,
  type ChecklistStatus,
  type ChecklistDisposition,
  type ContainsPii,
  type ExploreClassification,
  type L02Draft,
  type ScopeOption,
  type VetoDisposition,
} from './a1-u4-l02'
import { L02_DRAFT_KEY } from './a1-u4-l02-contract'

export { L02_DRAFT_KEY }
export type { L02Draft, ChecklistRow }

export function emptyChecklistRow(): ChecklistRow {
  return {
    item: '',
    containsPii: null,
    permissionNeeded: '',
    status: null,
    disposition: null,
  }
}

export function emptyDraft(): L02Draft {
  return {
    version: 1,
    explore: {},
    checklist: [emptyChecklistRow(), emptyChecklistRow(), emptyChecklistRow()],
    veto: {},
    scopeAnswer: null,
    nonCoverage: [],
    hintLevel: 0,
  }
}

function isExploreId(value: unknown): value is string {
  return typeof value === 'string' && (EXPLORE_IDS as readonly string[]).includes(value)
}

function isClassification(value: unknown): value is ExploreClassification {
  return value === '聚合可用' || value === '缺许可即停'
}

function isContainsPii(value: unknown): value is ContainsPii {
  return value === '是' || value === '否'
}

function isChecklistStatus(value: unknown): value is ChecklistStatus {
  return value === '已授予' || value === '未授予' || value === '不适用'
}

function isChecklistDisposition(value: unknown): value is ChecklistDisposition {
  return value === '停' || value === '可用'
}

function isVetoId(value: unknown): value is string {
  return typeof value === 'string' && (VETO_IDS as readonly string[]).includes(value)
}

function isVetoDisposition(value: unknown): value is VetoDisposition {
  return value === '停' || value === '可用'
}

function isScopeOption(value: unknown): value is ScopeOption {
  return value === 'A' || value === 'B' || value === 'C'
}

const NON_COVERAGE_ID_SET = new Set(NON_COVERAGE_ITEMS.map((item) => item.id))

function isNonCoverageId(value: unknown): value is string {
  return typeof value === 'string' && NON_COVERAGE_ID_SET.has(value)
}

function isHintLevel(value: unknown): value is L02Draft['hintLevel'] {
  return typeof value === 'number' && [0, 1, 2, 3].includes(value)
}

function isChecklistRowShape(value: unknown): value is ChecklistRow {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<ChecklistRow>
  return (
    typeof row.item === 'string' &&
    row.item.length <= MAX_TEXT_LENGTH &&
    (row.containsPii === null || isContainsPii(row.containsPii)) &&
    typeof row.permissionNeeded === 'string' &&
    row.permissionNeeded.length <= MAX_TEXT_LENGTH &&
    (row.status === null || isChecklistStatus(row.status)) &&
    (row.disposition === null || isChecklistDisposition(row.disposition))
  )
}

/**
 * 严格形状（不降级）：任一字段不对即 false。hintLevel 缺失视为合法（补 0）。
 * 清单文字为空字符串是合法形状（只是未完成，不算通过）。
 * 清单须恰好 3 行（详案任务 1：数据项不少于 3 项，本课固定 3 行）。
 */
export function isValidDraftShape(value: unknown): value is L02Draft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<L02Draft>
  if (draft.version !== 1) return false
  if (draft.hintLevel !== undefined && !isHintLevel(draft.hintLevel)) return false
  if (!draft.explore || typeof draft.explore !== 'object') return false
  for (const [key, classification] of Object.entries(draft.explore)) {
    if (!isExploreId(key) || !isClassification(classification)) return false
  }
  if (!Array.isArray(draft.checklist) || draft.checklist.length !== CHECKLIST_ROWS) {
    return false
  }
  for (const row of draft.checklist) {
    if (!isChecklistRowShape(row)) return false
  }
  if (!draft.veto || typeof draft.veto !== 'object') return false
  for (const [key, disposition] of Object.entries(draft.veto)) {
    if (!isVetoId(key) || !isVetoDisposition(disposition)) return false
  }
  if (draft.scopeAnswer !== null && !isScopeOption(draft.scopeAnswer)) return false
  if (!Array.isArray(draft.nonCoverage)) return false
  for (const id of draft.nonCoverage) {
    if (!isNonCoverageId(id)) return false
  }
  return true
}

function coerceChecklistRow(value: unknown): ChecklistRow {
  const fallback = emptyChecklistRow()
  if (!value || typeof value !== 'object') return fallback
  const raw = value as Partial<ChecklistRow>
  return {
    item: typeof raw.item === 'string' ? raw.item.slice(0, MAX_TEXT_LENGTH) : '',
    containsPii: isContainsPii(raw.containsPii) ? raw.containsPii : null,
    permissionNeeded:
      typeof raw.permissionNeeded === 'string'
        ? raw.permissionNeeded.slice(0, MAX_TEXT_LENGTH)
        : '',
    status: isChecklistStatus(raw.status) ? raw.status : null,
    disposition: isChecklistDisposition(raw.disposition) ? raw.disposition : null,
  }
}

/**
 * 外壳信封解包后的草稿整形（字段级过滤，与 L01 的 coerceDraft 同款）：
 * - 整体损坏（非对象 / version 非 1）→ 空草稿；
 * - explore 只留已知编号与合法分类值；checklist 只留前 3 行、不足补空行，
 *   每行只留合法值并截到 200 字；veto 只留 W1–W4 与合法处置；
 * - scopeAnswer 只留 A/B/C；nonCoverage 只留 N1–N7 且去重；hintLevel 非法回落 0。
 */
export function coerceDraft(value: unknown): L02Draft {
  if (!value || typeof value !== 'object') return emptyDraft()
  const raw = value as Partial<L02Draft>
  if (raw.version !== 1) return emptyDraft()
  const explore: Record<string, ExploreClassification> = {}
  if (raw.explore && typeof raw.explore === 'object') {
    for (const [key, classification] of Object.entries(raw.explore)) {
      if (isExploreId(key) && isClassification(classification)) {
        explore[key] = classification
      }
    }
  }
  const checklist: ChecklistRow[] = []
  if (Array.isArray(raw.checklist)) {
    for (const row of raw.checklist.slice(0, CHECKLIST_ROWS)) {
      checklist.push(coerceChecklistRow(row))
    }
  }
  while (checklist.length < CHECKLIST_ROWS) checklist.push(emptyChecklistRow())
  const veto: Record<string, VetoDisposition> = {}
  if (raw.veto && typeof raw.veto === 'object') {
    for (const [key, disposition] of Object.entries(raw.veto)) {
      if (isVetoId(key) && isVetoDisposition(disposition)) {
        veto[key] = disposition
      }
    }
  }
  const nonCoverage: string[] = []
  if (Array.isArray(raw.nonCoverage)) {
    for (const id of raw.nonCoverage) {
      if (isNonCoverageId(id) && !nonCoverage.includes(id)) nonCoverage.push(id)
    }
  }
  return {
    version: 1,
    explore,
    checklist,
    veto,
    scopeAnswer: isScopeOption(raw.scopeAnswer) ? raw.scopeAnswer : null,
    nonCoverage,
    hintLevel: isHintLevel(raw.hintLevel) ? raw.hintLevel : 0,
  }
}
