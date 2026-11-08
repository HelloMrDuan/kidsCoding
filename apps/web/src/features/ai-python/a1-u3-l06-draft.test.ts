import { describe, expect, it } from 'vitest'
import {
  loadDraft,
  saveDraft as saveShellDraft,
  type StorageLike,
} from '../lessons/workspace/workspace-draft'
import { QaAdapter } from './a1-u3-l06-adapter'
import {
  L06_DRAFT_KEY,
  coerceDraft,
  emptyDraft,
  isValidDraftShape,
} from './a1-u3-l06-draft'

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

describe('A1-U3-L06 draft save/restore', () => {
  it('the draft key follows the spec envelope format', () => {
    expect(L06_DRAFT_KEY).toBe('kidscoding-draft:A1-U3-L06')
  })

  it('coerceDraft keeps valid drafts and degrades damaged ones to defaults', () => {
    const valid = {
      version: 1 as const,
      predictions: { Q1: '能答' as const, Q7: '拒答' as const },
      asked: ['Q1', 'Q7'],
      custom: [{ text: '金帅苹果有多重？', predicted: '能答' as const }],
      errorChecks: { ans2: '编造数字' as const },
      hintLevel: 2 as const,
    }
    expect(coerceDraft(valid)).toEqual(valid)
    expect(isValidDraftShape(valid)).toBe(true)
    expect(
      coerceDraft({
        version: 1,
        predictions: { Q1: '能答' },
        asked: ['Q1'],
        custom: [],
        errorChecks: {},
      }),
    ).toEqual({
      version: 1,
      predictions: { Q1: '能答' },
      asked: ['Q1'],
      custom: [],
      errorChecks: {},
      hintLevel: 0,
    })
    expect(coerceDraft(null)).toEqual(emptyDraft())
    expect(coerceDraft('not an object')).toEqual(emptyDraft())
    expect(coerceDraft({ version: 2, predictions: {} })).toEqual(emptyDraft())
    expect(coerceDraft({ version: 1, predictions: 'not an object' })).toEqual({
      version: 1,
      predictions: {},
      asked: [],
      custom: [],
      errorChecks: {},
      hintLevel: 0,
    })
  })

  it('coerceDraft filters unknown questions, bad predictions and over-long custom questions', () => {
    const filtered = coerceDraft({
      version: 1,
      predictions: { Q1: '能答', Q9: '能答', Q2: '也许' },
      asked: ['Q1', 'Q9', 'Q1'],
      custom: [
        { text: '金帅苹果有多重？', predicted: '能答' },
        { text: 'x'.repeat(201), predicted: '能答' },
        { text: '恐龙吃什么？', predicted: '拒答' },
        { text: '今天天气怎么样？', predicted: '拒答' },
        { text: '再写一个？', predicted: '能答' },
      ],
      errorChecks: { ans2: '编造数字', ans9: '编造数字', ans3: '不知道' },
      hintLevel: 0,
    })
    expect(filtered.predictions).toEqual({ Q1: '能答' })
    expect(filtered.asked).toEqual(['Q1'])
    expect(filtered.custom).toEqual([
      { text: '金帅苹果有多重？', predicted: '能答' },
      { text: '恐龙吃什么？', predicted: '拒答' },
      { text: '今天天气怎么样？', predicted: '拒答' },
    ])
    expect(filtered.errorChecks).toEqual({ ans2: '编造数字' })
  })

  it('coerceDraft rejects non-number, fractional and string hint levels', () => {
    const base = {
      version: 1,
      predictions: {},
      asked: [],
      custom: [],
      errorChecks: {},
    }
    expect(coerceDraft({ ...base, hintLevel: '2' })).toEqual({ ...base, hintLevel: 0 })
    expect(isValidDraftShape({ ...base, hintLevel: '2' })).toBe(false)
    expect(coerceDraft({ ...base, hintLevel: 1.5 })).toEqual({ ...base, hintLevel: 0 })
    expect(isValidDraftShape({ ...base, hintLevel: 1.5 })).toBe(false)
    expect(coerceDraft({ ...base, hintLevel: null })).toEqual({ ...base, hintLevel: 0 })
    expect(coerceDraft({ ...base, hintLevel: 9 })).toEqual({ ...base, hintLevel: 0 })
    expect(isValidDraftShape({ ...base, hintLevel: 9 })).toBe(false)
    expect(coerceDraft({ version: '1', predictions: {} })).toEqual(emptyDraft())
    expect(isValidDraftShape({ version: '1', predictions: {} })).toBe(false)
  })

  it('isValidDraftShape is strict about every field', () => {
    const valid = {
      version: 1,
      predictions: { Q1: '能答' },
      asked: ['Q1'],
      custom: [],
      errorChecks: {},
      hintLevel: 0,
    }
    expect(isValidDraftShape(valid)).toBe(true)
    expect(isValidDraftShape({ ...valid, predictions: { Q9: '能答' } })).toBe(false)
    expect(isValidDraftShape({ ...valid, asked: ['Q9'] })).toBe(false)
    expect(
      isValidDraftShape({
        ...valid,
        custom: [
          { text: 'a', predicted: '能答' },
          { text: 'b', predicted: '能答' },
          { text: 'c', predicted: '能答' },
          { text: 'd', predicted: '能答' },
        ],
      }),
    ).toBe(false)
    expect(
      isValidDraftShape({ ...valid, custom: [{ text: 'x'.repeat(201), predicted: '能答' }] }),
    ).toBe(false)
    expect(isValidDraftShape({ ...valid, errorChecks: { ans3: '不知道' } })).toBe(false)
  })
})

describe('A1-U3-L06 shell envelope round-trip (real workspace-draft helpers)', () => {
  const goodDraft = {
    version: 1 as const,
    predictions: { Q1: '能答' as const, Q7: '拒答' as const },
    asked: ['Q1', 'Q7'],
    custom: [{ text: '金帅苹果有多重？', predicted: '能答' as const }],
    errorChecks: { ans2: '编造数字' as const },
    hintLevel: 0 as const,
  }

  it('a valid draft survives save -> load -> coerce -> adapter check', () => {
    const storage = memoryStorage()
    expect(saveShellDraft(storage, 'A1-U3-L06', goodDraft).ok).toBe(true)
    const loaded = loadDraft(storage, 'A1-U3-L06')
    expect(loaded.reason).toBeNull()
    expect(loaded.data).toEqual(goodDraft)
    expect(isValidDraftShape(loaded.data)).toBe(true)
    expect(coerceDraft(loaded.data)).toEqual(goodDraft)
    const adapter = new QaAdapter(loaded.data)
    // 只问了 Q1 与 Q7 且预测都对：核对是 2 通过（不是 8）。
    expect(adapter.checkQa().passed).toBe(false)
    expect(adapter.getQaState().passedCount).toBe(2)
  })

  it('an envelope written for another lesson is never restored for this one', () => {
    const storage = memoryStorage()
    expect(saveShellDraft(storage, 'A1-U3-L02', goodDraft).ok).toBe(true)
    // 另一课的信封存在另一把键下：本课键下无内容，data 为 null 且无错课提示
    // （reason 为 null 表示“无草稿”，不是“草稿属于别的课”）。
    const loaded = loadDraft(storage, 'A1-U3-L06')
    expect(loaded.data).toBeNull()
    expect(loaded.reason).toBeNull()
    // 真正的错课：本课键下放着 lessonId 是别课的信封 → 拒绝恢复并给原因。
    storage.setItem(
      'kidscoding-draft:A1-U3-L06',
      JSON.stringify({ lessonId: 'A1-U3-L02', savedAt: '2026-11-06T00:00:00.000Z', script: goodDraft, version: 1 }),
    )
    const mismatched = loadDraft(storage, 'A1-U3-L06')
    expect(mismatched.data).toBeNull()
    expect(mismatched.reason).toContain('其他课节')
    // 不支持的信封版本同样拒绝恢复。
    storage.setItem(
      'kidscoding-draft:A1-U3-L06',
      JSON.stringify({ lessonId: 'A1-U3-L06', savedAt: '2026-11-06T00:00:00.000Z', script: goodDraft, version: 2 }),
    )
    const wrongVersion = loadDraft(storage, 'A1-U3-L06')
    expect(wrongVersion.data).toBeNull()
    expect(wrongVersion.reason).toContain('版本')
  })

  it('a corrupt script inside a valid envelope fails validateDraft and degrades to empty', () => {
    const storage = memoryStorage()
    expect(saveShellDraft(storage, 'A1-U3-L06', 'not an object').ok).toBe(true)
    const loaded = loadDraft(storage, 'A1-U3-L06')
    expect(loaded.reason).toBeNull()
    expect(loaded.data).toBe('not an object')
    expect(isValidDraftShape(loaded.data)).toBe(false)
    expect(coerceDraft(loaded.data)).toEqual(emptyDraft())
    // 外壳回落到初始脚本：适配器载入空草稿，核对是 0 通过（不是 8）。
    const adapter = new QaAdapter(loaded.data)
    adapter.checkQa()
    expect(adapter.getQaState().passedCount).toBe(0)
    expect(adapter.getQaState().checked).toBe(true)
    // 存储里的坏草稿原样不动（不覆盖、不删除）。
    expect(loadDraft(storage, 'A1-U3-L06').data).toBe('not an object')
  })

  it('an over-64KB draft is refused, never truncated', () => {
    const storage = memoryStorage()
    const big = {
      ...goodDraft,
      custom: [{ text: 'x'.repeat(70 * 1024), predicted: '能答' as const }],
    }
    const saved = saveShellDraft(storage, 'A1-U3-L06', big)
    expect(saved.ok).toBe(false)
    expect(loadDraft(storage, 'A1-U3-L06').data).toBeNull()
  })
})
