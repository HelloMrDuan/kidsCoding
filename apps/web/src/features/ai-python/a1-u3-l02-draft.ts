/**
 * A1-U3-L02 本机草稿：只存学生的课堂选择，不存判定结果。
 *
 * 存：动手摘要所选句子编号、自加句文本、事实核对每条的选择、已揭示到的提示级数。
 * 不存：五项检查结果与核对正误——刷新后须重新检查、重新核对才出结果。
 * 恢复默认：清空选择、自加句与提示级数，回到未做状态。
 *
 * 与 U1-L06 草稿同一模式：localStorage 单键、防御解析、损坏降级、
 * 写入失败返回 false（由页面提示“未能保存”，不悄悄丢修改）。
 * 本课没有“污染资格”概念，不设污染标志；不要把 L06 的资格规则搬过来。
 */

import type { FactKind } from './a1-u3-l02'
import { allSentenceIds } from './a1-u3-l02'

export const L02_DRAFT_KEY = 'a1-u3-l02-draft-v1'

export type L02Draft = {
  version: 1
  selected: string[]
  custom: string[]
  facts: Record<string, FactKind | undefined>
  hintLevel: 0 | 1 | 2 | 3
}

export function emptyDraft(): L02Draft {
  return { version: 1, selected: [], custom: [], facts: {}, hintLevel: 0 }
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
        .filter((text): text is string => typeof text === 'string' && text.trim() !== '')
        .slice(0, 5)
    : []
  const rawFacts = (record['facts'] ?? {}) as Record<string, unknown>
  const facts: Record<string, FactKind | undefined> = {}
  for (const [key, value] of Object.entries(rawFacts)) {
    if (isFactKind(value)) facts[key] = value
  }
  const hintLevel = record['hintLevel']
  return {
    version: 1,
    selected,
    custom,
    facts,
    hintLevel: hintLevel === 1 || hintLevel === 2 || hintLevel === 3 ? hintLevel : 0,
  }
}

export function serializeDraft(draft: L02Draft): string {
  return JSON.stringify(draft)
}

/** 恢复默认：只清空选择、自加句与提示级数，不动其他键。 */
export function restoreDefaultDraft(): L02Draft {
  return emptyDraft()
}

/** 写入失败返回 false，不抛错；调用方负责向学生提示“未能保存”。 */
export function saveDraft(draft: L02Draft): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false
    window.localStorage.setItem(L02_DRAFT_KEY, serializeDraft(draft))
    return true
  } catch {
    return false
  }
}

function readStoredRaw(): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage.getItem(L02_DRAFT_KEY)
  } catch {
    return null
  }
}

let cachedDraft: L02Draft | null = null
const listeners = new Set<() => void>()

function loadDraft(): L02Draft {
  if (cachedDraft === null) cachedDraft = parseDraft(readStoredRaw())
  return cachedDraft
}

export function subscribeDraft(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === L02_DRAFT_KEY) {
      cachedDraft = parseDraft(event.newValue)
      listeners.forEach((fn) => fn())
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function getDraftSnapshot(): L02Draft {
  return loadDraft()
}

const SERVER_DRAFT: L02Draft = emptyDraft()

export function getServerDraftSnapshot(): L02Draft {
  return SERVER_DRAFT
}

/** 写草稿并通知同页订阅者（storage 事件不触发同页监听，须手动通知）。 */
export function storeDraft(draft: L02Draft): boolean {
  const ok = saveDraft(draft)
  if (ok) {
    cachedDraft = draft
    listeners.forEach((fn) => fn())
  }
  return ok
}
