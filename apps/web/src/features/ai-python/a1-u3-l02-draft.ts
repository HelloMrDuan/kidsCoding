/**
 * A1-U3-L02 本机草稿：只存学生的课堂选择，不存判定结果。
 *
 * 存：动手摘要所选句子编号、自加句文本、事实核对每条的选择、已揭示到的提示级数、
 * 预测活动每候选的预测与揭示状态、迁移课文所选句、独立检查是否已做过、
 * 每项未通过检查的学生自写错误解释、一句话方法总结。
 * 不存：五项检查结果与核对正误——刷新后须重新检查、重新核对才出结果。
 * 恢复默认：清空全部课堂选择，回到未做状态。
 *
 * 与 U1-L06 草稿同一模式：单键、防御解析、损坏降级；但写入方已改为
 * 共享 LessonWorkspace（信封写同一键），本模块不再直接碰 localStorage。
 * 保存失败由外壳保存 chip 与保存消息提示（未能保存），不悄悄丢修改。
 * 本课没有“污染资格”概念，不设污染标志；不要把 L06 的资格规则搬过来。
 *
 * 草稿键（P0 契约格式）：kidscoding-draft:A1-U3-L02。旧 #462 草稿键
 * a1-u3-l02-draft-v1 不再读写——#462 从未合并发布，不存在已发布
 * 课堂下真实学生的旧草稿，无需迁移；新键与旧键互不干扰。
 */

import type { FactKind, L02CheckName } from './a1-u3-l02'
import { allSentenceIds, allTransferSentenceIds } from './a1-u3-l02'
import { L02_DRAFT_KEY, PREDICTION_CANDIDATES } from './a1-u3-l02-contract'

export { L02_DRAFT_KEY }

/** 自加句上限：最多 5 句、每句最多 200 字。超限在加入时提示，在读取时丢弃。 */
export const MAX_CUSTOM_COUNT = 5
export const MAX_CUSTOM_LENGTH = 200

export type L02Prediction = {
  verdict: '合格' | '未合格'
  firstFailed: L02CheckName | ''
}

export type L02Draft = {
  version: 1
  selected: string[]
  custom: string[]
  facts: Record<string, FactKind | undefined>
  hintLevel: 0 | 1 | 2 | 3
  /** 预测活动：每候选的学生预测（揭示前不存真实结果）。 */
  predictions: Record<string, L02Prediction | undefined>
  /** 预测活动：已揭示真实结果的候选编号。 */
  revealed: string[]
  /** 迁移课文所选句编号（T1/T2/T3 体系，与主课文分开存）。 */
  transferSelected: string[]
  /** 迁移课文是否已做过一次检查。 */
  transferChecked: boolean
  /** 独立摘要是否已做过一次检查（解锁正反例的门）。 */
  hasChecked: boolean
  /** 学生自写的错误解释：检查名 → 一句话。 */
  errorExplanations: Record<string, string>
  /** 学生一句话方法总结。 */
  methodSummary: string
}

export function emptyDraft(): L02Draft {
  return {
    version: 1,
    selected: [],
    custom: [],
    facts: {},
    hintLevel: 0,
    predictions: {},
    revealed: [],
    transferSelected: [],
    transferChecked: false,
    hasChecked: false,
    errorExplanations: {},
    methodSummary: '',
  }
}

function isFactKind(value: unknown): value is FactKind {
  return value === '原文事实' || value === '合理概括' || value === '无依据推断'
}

/** 损坏草稿安全降级：JSON 损坏、版本不对、字段非法时回默认草稿。 */
export function parseDraft(raw: string | null, fallback: L02Draft = emptyDraft()): L02Draft {
  if (!raw) return fallback
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return fallback
  }
  if (typeof parsed !== 'object' || parsed === null) return fallback
  const record = parsed as Record<string, unknown>
  if (record['version'] !== 1) return fallback
  const validIds = new Set(allSentenceIds())
  const selected = Array.isArray(record['selected'])
    ? (record['selected'] as unknown[]).filter(
        (id): id is string => typeof id === 'string' && validIds.has(id),
      )
    : []
  const custom = Array.isArray(record['custom'])
    ? (record['custom'] as unknown[])
        .filter(
          (text): text is string =>
            typeof text === 'string' && text.trim() !== '' && text.length <= MAX_CUSTOM_LENGTH,
        )
        .slice(0, MAX_CUSTOM_COUNT)
    : []
  const rawFacts = (record['facts'] ?? {}) as Record<string, unknown>
  const facts: Record<string, FactKind | undefined> = {}
  for (const [key, value] of Object.entries(rawFacts)) {
    if (isFactKind(value)) facts[key] = value
  }
  const hintLevel = record['hintLevel']
  const candidateIds = new Set(PREDICTION_CANDIDATES.map((item) => item.id))
  const checkNames = new Set(['漏要点', '添内容', '改原意', '抽取规范', '来源核验'])
  const rawPredictions = (record['predictions'] ?? {}) as Record<string, unknown>
  const predictions: Record<string, L02Prediction | undefined> = {}
  for (const [key, value] of Object.entries(rawPredictions)) {
    if (!candidateIds.has(key) || typeof value !== 'object' || value === null) continue
    const entry = value as Record<string, unknown>
    if (entry['verdict'] !== '合格' && entry['verdict'] !== '未合格') continue
    const firstFailedRaw = typeof entry['firstFailed'] === 'string' ? entry['firstFailed'] : ''
    if (firstFailedRaw !== '' && !checkNames.has(firstFailedRaw as L02CheckName)) continue
    predictions[key] = { verdict: entry['verdict'], firstFailed: firstFailedRaw as L02CheckName | '' }
  }
  const revealed = Array.isArray(record['revealed'])
    ? (record['revealed'] as unknown[]).filter(
        (id): id is string => typeof id === 'string' && candidateIds.has(id),
      )
    : []
  const validTransferIds = new Set(allTransferSentenceIds())
  const transferSelected = Array.isArray(record['transferSelected'])
    ? (record['transferSelected'] as unknown[]).filter(
        (id): id is string => typeof id === 'string' && validTransferIds.has(id),
      )
    : []
  const rawExplanations = (record['errorExplanations'] ?? {}) as Record<string, unknown>
  const errorExplanations: Record<string, string> = {}
  for (const [key, value] of Object.entries(rawExplanations)) {
    if (checkNames.has(key) && typeof value === 'string') errorExplanations[key] = value
  }
  return {
    version: 1,
    selected,
    custom,
    facts,
    hintLevel: hintLevel === 1 || hintLevel === 2 || hintLevel === 3 ? hintLevel : 0,
    predictions,
    revealed,
    transferSelected,
    transferChecked: record['transferChecked'] === true,
    hasChecked: record['hasChecked'] === true,
    errorExplanations,
    methodSummary: typeof record['methodSummary'] === 'string' ? record['methodSummary'] : '',
  }
}

export function serializeDraft(draft: L02Draft): string {
  return JSON.stringify(draft)
}

/** 恢复默认：只清空选择、自加句与提示级数，不动其他键。 */
export function restoreDefaultDraft(): L02Draft {
  return emptyDraft()
}

/**
 * 外壳信封说明（集成后）：草稿的唯一写入方是共享 LessonWorkspace，
 * 它以信封 { lessonId, savedAt, script, version } 写同一键
 * kidscoding-draft:A1-U3-L02。本模块不再直接写 localStorage——
 * 直接写裸对象会与外壳信封互相覆盖（外壳读裸对象判格式无效，
 * 本模块读信封也判格式无效），旧的裸写路径因此删除。
 * 本模块只保留纯函数：解析（字段级降级）、序列化、恢复默认、
 * 以及把外壳传来的任意 initial 值规整为合法草稿。
 */

/**
 * 把外壳传来的任意 initial 值规整为合法草稿：字符串走 parseDraft，
 * 对象走序列化后再解析（非法字段同样降级），其余回默认草稿。
 * 外壳导入（文件菜单导入）与旧裸草稿都经此规整，不抛错。
 */
export function coerceDraft(value: unknown): L02Draft {
  if (typeof value === 'string') return parseDraft(value)
  if (value !== null && typeof value === 'object') {
    try {
      return parseDraft(JSON.stringify(value))
    } catch {
      return emptyDraft()
    }
  }
  return emptyDraft()
}

/** 严格形状校验（适配器 validateDraft 用）：不降级，只判真假。 */
export function isValidDraftShape(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const v = value as Record<string, unknown>
  return (
    v.version === 1 &&
    Array.isArray(v.selected) &&
    Array.isArray(v.custom) &&
    v.facts !== null &&
    typeof v.facts === 'object' &&
    !Array.isArray(v.facts) &&
    (v.hintLevel === 0 || v.hintLevel === 1 || v.hintLevel === 2 || v.hintLevel === 3) &&
    Array.isArray(v.revealed) &&
    Array.isArray(v.transferSelected) &&
    typeof v.transferChecked === 'boolean' &&
    typeof v.hasChecked === 'boolean' &&
    v.errorExplanations !== null &&
    typeof v.errorExplanations === 'object' &&
    !Array.isArray(v.errorExplanations) &&
    typeof v.methodSummary === 'string'
  )
}
