/**
 * A1-U4-L01 本机草稿：只存学生的课堂选择，不存判定结果。
 *
 * 存：六条探索描述的分类、选中的讨论例与三句问题陈述、四问可行性检查
 * 结论与备注、迁移场景与三句迁移陈述、成绩题答案、提示级数。
 * 不存：探索、问题卡、迁移的核对结果——刷新后须重新点“核对本课”才出结果。
 * 损坏草稿：字段级过滤（未知编号、非法分类值、超长三句话、超长备注、
 * 非法可行性结论、非法成绩选项一律丢弃或截断），其余保留；整体损坏回空草稿，不崩溃。
 * 本课没有污染资格标志：资格规则是教学口径（问题卡全过只表示本次课堂练习合格，
 * 不等于能直接做真实校园项目），不是草稿里的一个布尔值；草稿只记学生做了什么，
 * 资格判断由核对函数与作品总结实时算出。
 *
 * 草稿键已改为规范格式 kidscoding-draft:A1-U4-L01（与契约一致）。
 * hintLevel 只为旧草稿兼容保留：外壳抽屉揭示态不回写草稿，插槽不显示它。
 * 外壳信封草稿 kidscoding-draft:A1-U4-L01 接管保存与恢复：本文件只留
 * 草稿形状与整形（isValidDraftShape / coerceDraft / emptyDraft），
 * 供外壳与适配器使用。
 */

import {
  EXPLORE_IDS,
  FEASIBILITY_IDS,
  MAX_NOTE_LENGTH,
  MAX_STATEMENT_LENGTH,
  type ExploreClassification,
  type FeasibilityAnswer,
  type GradesOption,
  type L01Draft,
  type ProblemExampleId,
  type ProblemStatement,
  type TransferScenarioId,
} from './a1-u4-l01'
import { L01_DRAFT_KEY } from './a1-u4-l01-contract'

export { L01_DRAFT_KEY }
export type { L01Draft, ProblemStatement }

export function emptyDraft(): L01Draft {
  return {
    version: 1,
    explore: {},
    chosenExample: null,
    statement: { target: '', data: '', success: '' },
    feasibility: {},
    feasibilityNotes: {},
    transferScenario: null,
    transferStatement: { target: '', data: '', success: '' },
    gradesAnswer: null,
    hintLevel: 0,
  }
}

function isExploreId(value: unknown): value is string {
  return typeof value === 'string' && (EXPLORE_IDS as readonly string[]).includes(value)
}

function isClassification(value: unknown): value is ExploreClassification {
  return value === '有效' || value === '模糊'
}

function isProblemExampleId(value: unknown): value is ProblemExampleId {
  return value === 'E1' || value === 'E2' || value === 'E3'
}

function isFeasibilityId(value: unknown): value is string {
  return typeof value === 'string' && (FEASIBILITY_IDS as readonly string[]).includes(value)
}

function isFeasibilityAnswer(value: unknown): value is FeasibilityAnswer {
  return value === '通过' || value === '不可行'
}

function isTransferScenarioId(value: unknown): value is TransferScenarioId {
  return value === 'T1' || value === 'T2'
}

function isGradesOption(value: unknown): value is GradesOption {
  return value === 'A' || value === 'B' || value === 'C'
}

function isHintLevel(value: unknown): value is L01Draft['hintLevel'] {
  return typeof value === 'number' && [0, 1, 2, 3].includes(value)
}

function isStatementShape(value: unknown): value is ProblemStatement {
  if (!value || typeof value !== 'object') return false
  const statement = value as Partial<ProblemStatement>
  return (
    typeof statement.target === 'string' &&
    statement.target.length <= MAX_STATEMENT_LENGTH &&
    typeof statement.data === 'string' &&
    statement.data.length <= MAX_STATEMENT_LENGTH &&
    typeof statement.success === 'string' &&
    statement.success.length <= MAX_STATEMENT_LENGTH
  )
}

/**
 * 严格形状（不降级）：任一字段不对即 false。hintLevel 缺失视为合法（补 0）。
 * 三句话为空字符串是合法形状（只是未完成，不算通过）。
 */
export function isValidDraftShape(value: unknown): value is L01Draft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<L01Draft>
  if (draft.version !== 1) return false
  if (draft.hintLevel !== undefined && !isHintLevel(draft.hintLevel)) return false
  if (!draft.explore || typeof draft.explore !== 'object') return false
  for (const [key, classification] of Object.entries(draft.explore)) {
    if (!isExploreId(key) || !isClassification(classification)) return false
  }
  if (draft.chosenExample !== null && !isProblemExampleId(draft.chosenExample)) return false
  if (!isStatementShape(draft.statement)) return false
  if (!draft.feasibility || typeof draft.feasibility !== 'object') return false
  for (const [key, answer] of Object.entries(draft.feasibility)) {
    if (!isFeasibilityId(key) || !isFeasibilityAnswer(answer)) return false
  }
  if (!draft.feasibilityNotes || typeof draft.feasibilityNotes !== 'object') return false
  for (const [key, note] of Object.entries(draft.feasibilityNotes)) {
    if (
      !isFeasibilityId(key) ||
      typeof note !== 'string' ||
      note.length > MAX_NOTE_LENGTH
    ) {
      return false
    }
  }
  if (draft.transferScenario !== null && !isTransferScenarioId(draft.transferScenario)) {
    return false
  }
  if (!isStatementShape(draft.transferStatement)) return false
  if (draft.gradesAnswer !== null && !isGradesOption(draft.gradesAnswer)) return false
  return true
}

function coerceStatement(value: unknown): ProblemStatement {
  const fallback: ProblemStatement = { target: '', data: '', success: '' }
  if (!value || typeof value !== 'object') return fallback
  const raw = value as Partial<ProblemStatement>
  return {
    target:
      typeof raw.target === 'string' ? raw.target.slice(0, MAX_STATEMENT_LENGTH) : '',
    data: typeof raw.data === 'string' ? raw.data.slice(0, MAX_STATEMENT_LENGTH) : '',
    success:
      typeof raw.success === 'string' ? raw.success.slice(0, MAX_STATEMENT_LENGTH) : '',
  }
}

/**
 * 外壳信封解包后的草稿整形（字段级过滤，与 L06 的 coerceDraft 同款）：
 * - 整体损坏（非对象 / version 非 1）→ 空草稿；
 * - explore 只留已知编号与合法分类值；chosenExample 只留 E1/E2/E3；
 * - 三句话只留字符串并截到 200 字；feasibility 只留 Q1–Q4 与合法结论；
 * - 备注只留 Q1–Q4 与字符串并截到 100 字；transferScenario 只留 T1/T2；
 * - gradesAnswer 只留 A/B/C；hintLevel 非法回落 0。
 */
export function coerceDraft(value: unknown): L01Draft {
  if (!value || typeof value !== 'object') return emptyDraft()
  const raw = value as Partial<L01Draft>
  if (raw.version !== 1) return emptyDraft()
  const explore: Record<string, ExploreClassification> = {}
  if (raw.explore && typeof raw.explore === 'object') {
    for (const [key, classification] of Object.entries(raw.explore)) {
      if (isExploreId(key) && isClassification(classification)) {
        explore[key] = classification
      }
    }
  }
  const feasibility: Record<string, FeasibilityAnswer> = {}
  if (raw.feasibility && typeof raw.feasibility === 'object') {
    for (const [key, answer] of Object.entries(raw.feasibility)) {
      if (isFeasibilityId(key) && isFeasibilityAnswer(answer)) {
        feasibility[key] = answer
      }
    }
  }
  const feasibilityNotes: Record<string, string> = {}
  if (raw.feasibilityNotes && typeof raw.feasibilityNotes === 'object') {
    for (const [key, note] of Object.entries(raw.feasibilityNotes)) {
      if (isFeasibilityId(key) && typeof note === 'string') {
        feasibilityNotes[key] = note.slice(0, MAX_NOTE_LENGTH)
      }
    }
  }
  return {
    version: 1,
    explore,
    chosenExample: isProblemExampleId(raw.chosenExample) ? raw.chosenExample : null,
    statement: coerceStatement(raw.statement),
    feasibility,
    feasibilityNotes,
    transferScenario: isTransferScenarioId(raw.transferScenario)
      ? raw.transferScenario
      : null,
    transferStatement: coerceStatement(raw.transferStatement),
    gradesAnswer: isGradesOption(raw.gradesAnswer) ? raw.gradesAnswer : null,
    hintLevel: isHintLevel(raw.hintLevel) ? raw.hintLevel : 0,
  }
}
