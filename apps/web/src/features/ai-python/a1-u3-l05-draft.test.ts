import { describe, expect, it } from 'vitest'
import {
  loadDraft,
  saveDraft as saveShellDraft,
  type StorageLike,
} from '../lessons/workspace/workspace-draft'
import { CitationAdapter } from './a1-u3-l05-adapter'
import {
  L05_DRAFT_KEY,
  coerceDraft,
  emptyDraft,
  isValidDraftShape,
} from './a1-u3-l05-draft'
import type { L05Draft } from './a1-u3-l05'

/** 内存 StorageLike：不依赖 window/localStorage，确定性测信封往返。 */
function memoryStorage(): StorageLike & { size: () => number } {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
    size: () => map.size,
  }
}

const EMPTY_VERDICTS = {
  E1: null,
  E2: null,
  P1: null,
  P2: null,
  P3: null,
  P4: null,
  T1: null,
  T2: null,
} as const

describe('A1-U3-L05 draft save/restore', () => {
  it('the draft key follows the spec envelope format', () => {
    expect(L05_DRAFT_KEY).toBe('kidscoding-draft:A1-U3-L05')
  })

  it('empty draft has all eight items unpicked', () => {
    expect(emptyDraft()).toEqual({
      version: 1,
      lessonId: 'A1-U3-L05',
      verdicts: { ...EMPTY_VERDICTS },
    })
  })

  it('coerceDraft keeps valid drafts and degrades damaged ones to defaults', () => {
    const valid: L05Draft = {
      version: 1,
      lessonId: 'A1-U3-L05',
      verdicts: { ...EMPTY_VERDICTS, E1: '可信', E2: '编造数字' },
    }
    expect(coerceDraft(valid)).toEqual(valid)
    expect(isValidDraftShape(valid)).toBe(true)
    expect(coerceDraft(null)).toEqual(emptyDraft())
    expect(coerceDraft('not an object')).toEqual(emptyDraft())
    expect(coerceDraft({ version: 2, lessonId: 'A1-U3-L05', verdicts: {} })).toEqual(emptyDraft())
    expect(coerceDraft({ version: 1, lessonId: 'A1-U3-L06', verdicts: {} })).toEqual(
      emptyDraft(),
    )
    expect(coerceDraft({ version: 1, lessonId: 'A1-U3-L05' })).toEqual(emptyDraft())
    expect(
      coerceDraft({ version: 1, lessonId: 'A1-U3-L05', verdicts: 'not an object' }),
    ).toEqual(emptyDraft())
  })

  it('coerceDraft filters unknown items and bad verdicts, keeps nulls', () => {
    const filtered = coerceDraft({
      version: 1,
      lessonId: 'A1-U3-L05',
      verdicts: { E1: '可信', E9: '可信', E2: '也许', P1: null, T2: '编造来源' },
    })
    expect(filtered.verdicts).toEqual({ ...EMPTY_VERDICTS, E1: '可信', T2: '编造来源' })
  })

  it('isValidDraftShape is strict about version, lessonId, keys and values', () => {
    const valid: L05Draft = {
      version: 1,
      lessonId: 'A1-U3-L05',
      verdicts: { ...EMPTY_VERDICTS, E1: '可信' },
    }
    expect(isValidDraftShape(valid)).toBe(true)
    expect(isValidDraftShape({ ...valid, version: 2 })).toBe(false)
    expect(isValidDraftShape({ ...valid, lessonId: 'A1-U3-L06' })).toBe(false)
    expect(
      isValidDraftShape({
        ...valid,
        verdicts: { ...valid.verdicts, E9: '可信' },
      }),
    ).toBe(false)
    expect(
      isValidDraftShape({
        ...valid,
        verdicts: { ...valid.verdicts, E1: '也许' },
      }),
    ).toBe(false)
    expect(isValidDraftShape({ version: 1, lessonId: 'A1-U3-L05' })).toBe(false)
    expect(isValidDraftShape({ version: 1, lessonId: 'A1-U3-L05', verdicts: null })).toBe(false)
    expect(
      isValidDraftShape({
        version: 1,
        lessonId: 'A1-U3-L05',
        verdicts: { E1: null },
      }),
    ).toBe(true)
  })
})

describe('A1-U3-L05 shell envelope round-trip (real workspace-draft helpers)', () => {
  const goodDraft: L05Draft = {
    version: 1,
    lessonId: 'A1-U3-L05',
    verdicts: { ...EMPTY_VERDICTS, E1: '可信', E2: '编造数字' },
  }

  it('a valid draft survives save -> load -> coerce -> adapter check', () => {
    const storage = memoryStorage()
    expect(saveShellDraft(storage, 'A1-U3-L05', goodDraft).ok).toBe(true)
    const loaded = loadDraft(storage, 'A1-U3-L05')
    expect(loaded.reason).toBeNull()
    expect(loaded.data).toEqual(goodDraft)
    expect(isValidDraftShape(loaded.data)).toBe(true)
    expect(coerceDraft(loaded.data)).toEqual(goodDraft)
    const adapter = new CitationAdapter(loaded.data)
    // 只选对 E1 与 E2：核对是 2 通过（不是 8）。
    expect(adapter.checkItems().passed).toBe(false)
    expect(adapter.getCitationState().passedCount).toBe(2)
  })

  it('an envelope written for another lesson is never restored for this one', () => {
    const storage = memoryStorage()
    expect(saveShellDraft(storage, 'A1-U3-L02', goodDraft).ok).toBe(true)
    // 另一课的信封存在另一把键下：本课键下无内容，data 为 null 且无错课提示
    // （reason 为 null 表示“无草稿”，不是“草稿属于别的课”）。
    const loaded = loadDraft(storage, 'A1-U3-L05')
    expect(loaded.data).toBeNull()
    expect(loaded.reason).toBeNull()
    // 真正的错课：本课键下放着 lessonId 是别课的信封 → 拒绝恢复并给原因。
    storage.setItem(
      'kidscoding-draft:A1-U3-L05',
      JSON.stringify({ lessonId: 'A1-U3-L02', savedAt: '2026-11-06T00:00:00.000Z', script: goodDraft, version: 1 }),
    )
    const mismatched = loadDraft(storage, 'A1-U3-L05')
    expect(mismatched.data).toBeNull()
    expect(mismatched.reason).toContain('其他课节')
    // 不支持的信封版本同样拒绝恢复。
    storage.setItem(
      'kidscoding-draft:A1-U3-L05',
      JSON.stringify({ lessonId: 'A1-U3-L05', savedAt: '2026-11-06T00:00:00.000Z', script: goodDraft, version: 2 }),
    )
    const wrongVersion = loadDraft(storage, 'A1-U3-L05')
    expect(wrongVersion.data).toBeNull()
    expect(wrongVersion.reason).toContain('版本')
  })

  it('a corrupt script inside a valid envelope fails validateDraft and degrades to empty', () => {
    const storage = memoryStorage()
    expect(saveShellDraft(storage, 'A1-U3-L05', 'not an object').ok).toBe(true)
    const loaded = loadDraft(storage, 'A1-U3-L05')
    expect(loaded.reason).toBeNull()
    expect(loaded.data).toBe('not an object')
    expect(isValidDraftShape(loaded.data)).toBe(false)
    expect(coerceDraft(loaded.data)).toEqual(emptyDraft())
    // 外壳回落到初始脚本：适配器载入空草稿，核对是 0 通过（不是 8）。
    const adapter = new CitationAdapter(loaded.data)
    adapter.checkItems()
    expect(adapter.getCitationState().passedCount).toBe(0)
    expect(adapter.getCitationState().checked).toBe(true)
    // 存储里的坏草稿原样不动（不覆盖、不删除）。
    expect(loadDraft(storage, 'A1-U3-L05').data).toBe('not an object')
  })

  it('an over-64KB draft is refused, never truncated', () => {
    const storage = memoryStorage()
    const big = {
      ...goodDraft,
      verdicts: { ...goodDraft.verdicts, E1: 'x'.repeat(70 * 1024) },
    }
    const saved = saveShellDraft(storage, 'A1-U3-L05', big)
    expect(saved.ok).toBe(false)
    expect(loadDraft(storage, 'A1-U3-L05').data).toBeNull()
  })
})
