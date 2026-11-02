/**
 * A1-U3-L03 本机草稿：只存学生实际编辑的 JSON 文本与提示级数。
 *
 * 存：编辑区里的 JSON 文本、已揭示到的提示级数。
 * 不存：校验结果与作品总结——刷新后须重新点校验才出结果。
 * 写入失败：saveDraft 返回 false，页面显示“未能保存”提示。
 * 损坏草稿：解析失败或结构不对 → 默认空编辑区，不崩溃。
 * 恢复默认：清空编辑区与提示级数，回到未做状态。
 * 本课没有污染资格概念；刷新恢复的是编辑文本本身。
 */

import { useSyncExternalStore } from 'react'

export const L03_DRAFT_KEY = 'a1-u3-l03-draft-v1'

export type L03Draft = {
  version: 1
  jsonText: string
  hintLevel: 0 | 1 | 2 | 3
}

export function emptyDraft(): L03Draft {
  return { version: 1, jsonText: '', hintLevel: 0 }
}

export function serializeDraft(draft: L03Draft): string {
  return JSON.stringify(draft)
}

export function parseDraft(raw: string | null): L03Draft {
  if (raw === null) return emptyDraft()
  try {
    const record = JSON.parse(raw) as Record<string, unknown>
    if (record['version'] !== 1) return emptyDraft()
    const jsonText = typeof record['jsonText'] === 'string' ? record['jsonText'] : ''
    const hintLevel = record['hintLevel']
    return {
      version: 1,
      jsonText,
      hintLevel: hintLevel === 1 || hintLevel === 2 || hintLevel === 3 ? hintLevel : 0,
    }
  } catch {
    return emptyDraft()
  }
}

function readStoredRaw(): string | null {
  try {
    return window.localStorage.getItem(L03_DRAFT_KEY)
  } catch {
    return null
  }
}

/** 写入失败返回 false（例如存储被禁或已满），由页面提示，不抛错。 */
export function saveDraft(draft: L03Draft): boolean {
  try {
    window.localStorage.setItem(L03_DRAFT_KEY, serializeDraft(draft))
    return true
  } catch {
    return false
  }
}

export function restoreDefaultDraft(): L03Draft {
  return emptyDraft()
}

let cachedDraft: L03Draft | null = null
const listeners = new Set<() => void>()

function loadDraft(): L03Draft {
  if (cachedDraft === null) cachedDraft = parseDraft(readStoredRaw())
  return cachedDraft
}

export function getDraftSnapshot(): L03Draft {
  return loadDraft()
}

const SERVER_DRAFT: L03Draft = emptyDraft()

export function getServerDraftSnapshot(): L03Draft {
  return SERVER_DRAFT
}

export function subscribeDraft(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === L03_DRAFT_KEY) {
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

/** 写草稿并通知同页订阅者（storage 事件不触发同页监听，须手动通知）。 */
export function storeDraft(draft: L03Draft): boolean {
  const ok = saveDraft(draft)
  if (ok) {
    cachedDraft = draft
    listeners.forEach((fn) => fn())
  }
  return ok
}

export function useL03Draft(): L03Draft {
  return useSyncExternalStore(subscribeDraft, getDraftSnapshot, getServerDraftSnapshot)
}
