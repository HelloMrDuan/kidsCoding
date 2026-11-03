/**
 * Spec-key localStorage drafts — WORKSPACE-API.md §4 / LESSON-CONTRACT.md.
 *
 * Key format is exactly `kidscoding-draft:{lessonId}` (NOT the older
 * kids-grid-lesson-v1: / kids-event-lesson-v1: keys and NOT the single-key
 * G3 trial key). Old keys are deliberately NOT migrated here: migration is a
 * chief-level decision (see ENGINE-AUDIT §7); this module only reads and
 * writes the spec key.
 *
 * Fail-closed rules, all enforced here and never in the shell:
 * - Over-cap (64KB) saves are refused with a reason, never silently truncated.
 * - Loads of corrupt JSON, oversized payloads, non-object envelopes, or
 *   wrong-lesson envelopes return null + a reason and never overwrite a good
 *   draft (callers keep the previous good value on failure).
 * - saveDraftForSwitch / loadDraft are the lesson-switching helpers: save the
 *   current lesson under its own key first, then load the target lesson.
 */

import { draftKeyFor } from './lesson-contract'

/** Draft byte cap: 64KB. Refuse over-cap, never truncate. */
export const DRAFT_MAX_BYTES = 64 * 1024

export type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export type SaveResult = { ok: true } | { ok: false; reason: string }

export type LoadResult = { data: unknown | null; reason: string | null }

type DraftEnvelope = {
  lessonId: string
  savedAt: string
  script: unknown
}

function byteLength(text: string): number {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length
  return text.length
}

function defaultStorage(): StorageLike | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  return window.localStorage
}

export function saveDraft(
  storage: StorageLike | null,
  lessonId: string,
  script: unknown,
): SaveResult {
  if (!storage) return { ok: false, reason: '本机存储不可用，未能保存' }
  let text: string
  try {
    const envelope: DraftEnvelope = { lessonId, savedAt: new Date().toISOString(), script }
    text = JSON.stringify(envelope)
  } catch {
    return { ok: false, reason: '草稿无法序列化，未能保存' }
  }
  if (byteLength(text) > DRAFT_MAX_BYTES) {
    return { ok: false, reason: `草稿超过 64KB 上限（${DRAFT_MAX_BYTES} 字节），未能保存` }
  }
  try {
    storage.setItem(draftKeyFor(lessonId), text)
  } catch {
    return { ok: false, reason: '写入本机存储失败，未能保存' }
  }
  return { ok: true }
}

export function loadDraft(storage: StorageLike | null, lessonId: string): LoadResult {
  if (!storage) return { data: null, reason: '本机存储不可用' }
  let raw: string | null
  try {
    raw = storage.getItem(draftKeyFor(lessonId))
  } catch {
    return { data: null, reason: '读取本机存储失败' }
  }
  if (raw === null) return { data: null, reason: null }
  if (byteLength(raw) > DRAFT_MAX_BYTES) {
    return { data: null, reason: '草稿超过 64KB 上限，已拒绝恢复' }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { data: null, reason: '草稿已损坏，已拒绝恢复' }
  }
  const envelope = parsed as Partial<DraftEnvelope> | null
  if (!envelope || typeof envelope !== 'object' || !('script' in envelope)) {
    return { data: null, reason: '草稿格式无效，已拒绝恢复' }
  }
  if (envelope.lessonId !== lessonId) {
    return { data: null, reason: '草稿属于其他课节，已拒绝恢复' }
  }
  return { data: envelope.script, reason: null }
}

/** Lesson-switch helper: save the current lesson's script under its own key. */
export function saveDraftForSwitch(
  storage: StorageLike | null,
  lessonId: string,
  script: unknown,
): SaveResult {
  return saveDraft(storage, lessonId, script)
}

/** Lesson-switch helper: load the target lesson's draft (null when none/invalid). */
export function loadDraftForSwitch(storage: StorageLike | null, lessonId: string): LoadResult {
  return loadDraft(storage, lessonId)
}

/** localStorage-backed convenience wrappers for the shell. */
export function saveDraftToLocal(lessonId: string, script: unknown): SaveResult {
  return saveDraft(defaultStorage(), lessonId, script)
}

export function loadDraftFromLocal(lessonId: string): LoadResult {
  return loadDraft(defaultStorage(), lessonId)
}
