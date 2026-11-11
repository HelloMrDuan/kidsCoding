/**
 * A1-U3-L04 本机草稿：只存学生实际编辑的检索作业与提示级数。
 *
 * 存：关键词、四问答案、可用清单、规则说明、已揭示到的提示级数。
 * 不存：校验结果与可用结论——刷新后须重新点校验才出结果。
 * 损坏草稿：解析失败或结构不对 → 默认空草稿，不崩溃。
 * 本课没有污染资格概念；刷新恢复的是编辑内容本身。
 *
 * 草稿键已是规范格式 kidscoding-draft:A1-U3-L04（与契约一致）；
 * 外壳信封草稿接管保存与恢复，本文件只留草稿形状与整形
 * （isValidDraftShape / coerceDraft / parseDraft / emptyDraft），
 * 供外壳与适配器使用。
 * hintLevel 只为旧草稿兼容保留：外壳抽屉揭示态不回写草稿，插槽不显示它。
 */

import type { CardId, FourAnswers } from './a1-u3-l04'
import { CARD_IDS, CREDIBILITY_QUESTIONS } from './a1-u3-l04'
import { L04_DRAFT_KEY } from './a1-u3-l04-contract'

export { L04_DRAFT_KEY }

/** 单课草稿上限（与共享规范一致，不得擅自提高）。 */
export const MAX_DRAFT_BYTES = 64 * 1024

/** 规则说明输入防护上限（超过截断，不撑爆草稿）。 */
export const MAX_RULE_TEXT_LENGTH = 2000

/** 关键词输入防护上限（超过截断；截断后的词由检查 1 另行判定）。 */
export const MAX_KEYWORD_LENGTH = 10

export type L04Draft = {
  version: 1
  keywords: string[]
  answers: Partial<Record<CardId, FourAnswers>>
  usable: string[]
  ruleText: string
  hintLevel: 0 | 1 | 2 | 3
}

export function emptyDraft(): L04Draft {
  return { version: 1, keywords: [], answers: {}, usable: [], ruleText: '', hintLevel: 0 }
}

const QUESTION_KEYS = new Set<string>(CREDIBILITY_QUESTIONS.map((q) => q.key))
const CARD_ID_SET = new Set<string>(CARD_IDS)

function isFourAnswers(value: unknown): value is FourAnswers {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (!QUESTION_KEYS.has(key)) return false
    const answer = record[key]
    if (answer !== null && typeof answer !== 'boolean') return false
  }
  return true
}

/**
 * 外壳信封解包后的草稿整形：
 * - 有效草稿原样返回（缺失字段补默认：keywords 缺省 []、answers 缺省 {}、
 *   usable 缺省 []、ruleText 缺省 ''、hintLevel 缺失补 0）；
 * - 无效草稿（非对象 / version 非 1 / keywords 非字符串数组 /
 *   answers 含 A–F 以外键或答案值非 boolean|null / usable 含 A–F 以外 id /
 *   ruleText 非字符串 / hintLevel 非法）回落为空草稿，不抛错。
 */
export function isValidDraftShape(value: unknown): value is L04Draft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<L04Draft>
  if (draft.version !== 1) return false
  if (draft.keywords !== undefined) {
    if (!Array.isArray(draft.keywords)) return false
    if (draft.keywords.some((keyword) => typeof keyword !== 'string')) return false
  }
  if (draft.answers !== undefined) {
    if (!draft.answers || typeof draft.answers !== 'object' || Array.isArray(draft.answers)) {
      return false
    }
    for (const [cardId, answers] of Object.entries(draft.answers)) {
      if (!CARD_ID_SET.has(cardId)) return false
      if (!isFourAnswers(answers)) return false
    }
  }
  if (draft.usable !== undefined) {
    if (!Array.isArray(draft.usable)) return false
    if (draft.usable.some((id) => typeof id !== 'string' || !CARD_ID_SET.has(id))) return false
  }
  if (draft.ruleText !== undefined && typeof draft.ruleText !== 'string') return false
  if (
    draft.hintLevel !== undefined &&
    (typeof draft.hintLevel !== 'number' || ![0, 1, 2, 3].includes(draft.hintLevel))
  ) {
    return false
  }
  return true
}

export function coerceDraft(value: unknown): L04Draft {
  if (!isValidDraftShape(value)) return emptyDraft()
  const draft = value as Partial<L04Draft>
  const answers: Partial<Record<CardId, FourAnswers>> = {}
  for (const [cardId, four] of Object.entries(draft.answers ?? {})) {
    if (CARD_ID_SET.has(cardId) && isFourAnswers(four)) {
      answers[cardId as CardId] = { ...four }
    }
  }
  return {
    version: 1,
    keywords: (draft.keywords ?? []).map((keyword) => keyword.slice(0, MAX_KEYWORD_LENGTH)),
    answers,
    usable: [...new Set(draft.usable ?? [])],
    ruleText: (draft.ruleText ?? '').slice(0, MAX_RULE_TEXT_LENGTH),
    hintLevel: ([0, 1, 2, 3].includes(draft.hintLevel as number)
      ? draft.hintLevel
      : 0) as L04Draft['hintLevel'],
  }
}

/**
 * 解析存储的草稿：字符串先 JSON 解析再整形；对象直接整形；
 * 其他值或解析失败返回空草稿（不抛错）。
 */
export function parseDraft(value: unknown): L04Draft {
  if (typeof value === 'string') {
    try {
      return coerceDraft(JSON.parse(value))
    } catch {
      return emptyDraft()
    }
  }
  return coerceDraft(value)
}
