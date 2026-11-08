/**
 * A1-U3-L06 本机草稿：只存学生的课堂选择，不存判定结果。
 *
 * 存：每问的预测（能答/拒答）、已问过的问号、自写迁移问题及其预测、
 * 两个错误示例的学生归类、提示级数。
 * 不存：八问核对结果与迁移核对结果——刷新后须重新点“核对八问”才出结果。
 * 损坏草稿：字段级过滤（未知问号、非法预测值、超长/超量自写问题、
 * 非法错误种类一律丢弃），其余保留；整体损坏回空草稿，不崩溃。
 * 本课没有污染资格标志：资格规则是教学口径（旧问题重复问是练习记录，
 * 最终核验须用新问题），不是草稿里的一个布尔值；草稿只记学生做了什么，
 * 资格判断由核对函数与作品总结实时算出。
 *
 * 草稿键已改为规范格式 kidscoding-draft:A1-U3-L06（与契约一致）。
 * hintLevel 只为旧草稿兼容保留：外壳抽屉揭示态不回写草稿，插槽不显示它。
 * 外壳信封草稿 kidscoding-draft:A1-U3-L06 接管保存与恢复：本文件只留
 * 草稿形状与整形（isValidDraftShape / coerceDraft / emptyDraft），
 * 供外壳与适配器使用。
 */

import {
  ERROR_EXAMPLE_IDS,
  KNOWN_QUESTION_IDS,
  MAX_CUSTOM_COUNT,
  MAX_CUSTOM_LENGTH,
  type HallucinationKind,
  type L06Draft,
  type QaCustomQuestion,
  type QaPrediction,
} from './a1-u3-l06'
import { L06_DRAFT_KEY } from './a1-u3-l06-contract'

export { L06_DRAFT_KEY }
export type { L06Draft, QaCustomQuestion, QaPrediction }

export function emptyDraft(): L06Draft {
  return { version: 1, predictions: {}, asked: [], custom: [], errorChecks: {}, hintLevel: 0 }
}

function isKnownQuestionId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (KNOWN_QUESTION_IDS as readonly string[]).includes(value)
  )
}

function isPrediction(value: unknown): value is QaPrediction {
  return value === '能答' || value === '拒答'
}

function isHallucinationKind(value: unknown): value is HallucinationKind {
  return value === '通过' || value === '编造数字' || value === '编造来源'
}

function isHintLevel(value: unknown): value is L06Draft['hintLevel'] {
  return typeof value === 'number' && [0, 1, 2, 3].includes(value)
}

/**
 * 严格形状（不降级）：任一字段不对即 false。hintLevel 缺失视为合法（补 0）。
 */
export function isValidDraftShape(value: unknown): value is L06Draft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<L06Draft>
  if (draft.version !== 1) return false
  if (draft.hintLevel !== undefined && !isHintLevel(draft.hintLevel)) return false
  if (!draft.predictions || typeof draft.predictions !== 'object') return false
  for (const [key, prediction] of Object.entries(draft.predictions)) {
    if (!isKnownQuestionId(key) || !isPrediction(prediction)) return false
  }
  if (!Array.isArray(draft.asked)) return false
  if (!draft.asked.every((id) => isKnownQuestionId(id))) return false
  if (!Array.isArray(draft.custom)) return false
  if (draft.custom.length > MAX_CUSTOM_COUNT) return false
  for (const item of draft.custom) {
    if (!item || typeof item !== 'object') return false
    const custom = item as Partial<QaCustomQuestion>
    if (
      typeof custom.text !== 'string' ||
      custom.text.length === 0 ||
      custom.text.length > MAX_CUSTOM_LENGTH ||
      !isPrediction(custom.predicted)
    ) {
      return false
    }
  }
  if (!draft.errorChecks || typeof draft.errorChecks !== 'object') return false
  for (const [key, kind] of Object.entries(draft.errorChecks)) {
    if (!(ERROR_EXAMPLE_IDS as readonly string[]).includes(key) || !isHallucinationKind(kind)) {
      return false
    }
  }
  return true
}

/**
 * 外壳信封解包后的草稿整形（字段级过滤，与 L02 的 parseDraft 同款）：
 * - 整体损坏（非对象 / version 非 1）→ 空草稿；
 * - predictions 只留已知问号与合法预测值；asked 只留已知问号并去重；
 * - custom 只留非空、≤200 字、预测合法者并截到 3 条；
 * - errorChecks 只留 ans2/ans3 与合法种类；hintLevel 非法回落 0。
 */
export function coerceDraft(value: unknown): L06Draft {
  if (!value || typeof value !== 'object') return emptyDraft()
  const raw = value as Partial<L06Draft>
  if (raw.version !== 1) return emptyDraft()
  const predictions: Record<string, QaPrediction> = {}
  if (raw.predictions && typeof raw.predictions === 'object') {
    for (const [key, prediction] of Object.entries(raw.predictions)) {
      if (isKnownQuestionId(key) && isPrediction(prediction)) {
        predictions[key] = prediction
      }
    }
  }
  const asked: string[] = []
  if (Array.isArray(raw.asked)) {
    for (const id of raw.asked) {
      if (isKnownQuestionId(id) && !asked.includes(id)) asked.push(id)
    }
  }
  const custom: QaCustomQuestion[] = []
  if (Array.isArray(raw.custom)) {
    for (const item of raw.custom) {
      if (custom.length >= MAX_CUSTOM_COUNT) break
      if (!item || typeof item !== 'object') continue
      const candidate = item as Partial<QaCustomQuestion>
      if (
        typeof candidate.text === 'string' &&
        candidate.text.length > 0 &&
        candidate.text.length <= MAX_CUSTOM_LENGTH &&
        isPrediction(candidate.predicted)
      ) {
        custom.push({ text: candidate.text, predicted: candidate.predicted })
      }
    }
  }
  const errorChecks: Record<string, HallucinationKind> = {}
  if (raw.errorChecks && typeof raw.errorChecks === 'object') {
    for (const [key, kind] of Object.entries(raw.errorChecks)) {
      if (
        (ERROR_EXAMPLE_IDS as readonly string[]).includes(key) &&
        isHallucinationKind(kind)
      ) {
        errorChecks[key] = kind
      }
    }
  }
  return {
    version: 1,
    predictions,
    asked,
    custom,
    errorChecks,
    hintLevel: isHintLevel(raw.hintLevel) ? raw.hintLevel : 0,
  }
}
