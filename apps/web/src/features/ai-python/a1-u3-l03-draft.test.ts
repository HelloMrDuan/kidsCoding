import { describe, expect, it, vi } from 'vitest'
import {
  loadDraft,
  saveDraft as saveShellDraft,
  type StorageLike,
} from '../lessons/workspace/workspace-draft'
import { JsonAdapter } from './a1-u3-l03-adapter'
import {
  L03_DRAFT_KEY,
  coerceDraft,
  emptyDraft,
  isValidDraftShape,
  parseDraft,
  restoreDefaultDraft,
  saveDraft,
  serializeDraft,
} from './a1-u3-l03-draft'

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

describe('A1-U3-L03 draft save/restore', () => {
  it('round-trips edited JSON text and hint level', () => {
    const draft = {
      version: 1 as const,
      jsonText: '{"名称": "苹果", "颜色": "红", "重量": 182}',
      hintLevel: 2 as const,
    }
    expect(parseDraft(serializeDraft(draft))).toEqual(draft)
  })

  it('degrades damaged drafts to defaults', () => {
    expect(parseDraft('not json')).toEqual(emptyDraft())
    expect(parseDraft(null)).toEqual(emptyDraft())
    expect(parseDraft(JSON.stringify({ version: 2, jsonText: '{}' }))).toEqual(emptyDraft())
    const restored = parseDraft(
      JSON.stringify({ version: 1, jsonText: 42, hintLevel: 9 }),
    )
    expect(restored).toEqual(emptyDraft())
  })

  it('restore-default empties everything', () => {
    expect(restoreDefaultDraft()).toEqual(emptyDraft())
  })

  it('the draft key follows the spec envelope format', () => {
    expect(L03_DRAFT_KEY).toBe('kidscoding-draft:A1-U3-L03')
  })

  it('coerceDraft keeps valid drafts and degrades damaged ones to defaults', () => {
    const valid = {
      version: 1 as const,
      jsonText: '{"名称": "苹果"}',
      hintLevel: 2 as const,
    }
    expect(coerceDraft(valid)).toEqual(valid)
    expect(isValidDraftShape(valid)).toBe(true)
    expect(coerceDraft({ version: 1, jsonText: '{"名称": "苹果"}' })).toEqual({
      version: 1,
      jsonText: '{"名称": "苹果"}',
      hintLevel: 0,
    })
    expect(coerceDraft(null)).toEqual(emptyDraft())
    expect(coerceDraft('not an object')).toEqual(emptyDraft())
    expect(coerceDraft({ version: 2, jsonText: '{}' })).toEqual(emptyDraft())
    expect(coerceDraft({ version: 1, jsonText: 42 })).toEqual(emptyDraft())
    expect(coerceDraft({ version: 1, jsonText: '{}', hintLevel: 9 })).toEqual(emptyDraft())
    expect(isValidDraftShape({ version: 1, jsonText: '{}', hintLevel: 9 })).toBe(false)
  })

  it('coerceDraft rejects non-number, fractional and string hint levels', () => {
    expect(coerceDraft({ version: 1, jsonText: '{}', hintLevel: '2' })).toEqual(emptyDraft())
    expect(isValidDraftShape({ version: 1, jsonText: '{}', hintLevel: '2' })).toBe(false)
    expect(coerceDraft({ version: 1, jsonText: '{}', hintLevel: 1.5 })).toEqual(emptyDraft())
    expect(isValidDraftShape({ version: 1, jsonText: '{}', hintLevel: 1.5 })).toBe(false)
    expect(coerceDraft({ version: 1, jsonText: '{}', hintLevel: null })).toEqual(emptyDraft())
    expect(coerceDraft({ version: '1', jsonText: '{}' })).toEqual(emptyDraft())
    expect(isValidDraftShape({ version: '1', jsonText: '{}' })).toBe(false)
  })

  it('parseDraft degrades arrays, numbers and missing jsonText to defaults', () => {
    expect(parseDraft('[]')).toEqual(emptyDraft())
    expect(parseDraft('123')).toEqual(emptyDraft())
    expect(parseDraft('"str"')).toEqual(emptyDraft())
    expect(parseDraft('{"version":1}')).toEqual(emptyDraft())
    expect(parseDraft('{"version":1,"jsonText":"{}","hintLevel":null}')).toEqual({
      version: 1,
      jsonText: '{}',
      hintLevel: 0,
    })
  })

  it('saveDraft returns false (never throws) when the store refuses the write', () => {
    const draft = { ...emptyDraft(), jsonText: '{"名称": "苹果"}' }
    // jsdom 的 localStorage 方法在 Storage 原型上：直接 spy 实例会被绕过，
    // 必须 spy 原型才能让 saveDraft 里的 setItem 调用抛错。
    const spy = vi.spyOn(window.Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError')
    })
    try {
      expect(saveDraft(draft)).toBe(false)
    } finally {
      spy.mockRestore()
    }
    // 恢复后写入重新成功，失败的一次没有留下半截草稿。
    expect(saveDraft(draft)).toBe(true)
    expect(window.localStorage.getItem(L03_DRAFT_KEY)).toBe(serializeDraft(draft))
    window.localStorage.removeItem(L03_DRAFT_KEY)
  })

  it('saveDraft persists when a window exists and never throws', () => {
    const draft = { ...emptyDraft(), jsonText: '{"名称": "苹果"}' }
    expect(() => saveDraft(draft)).not.toThrow()
    if (typeof window !== 'undefined' && window.localStorage) {
      expect(saveDraft(draft)).toBe(true)
      expect(window.localStorage.getItem(L03_DRAFT_KEY)).toBe(serializeDraft(draft))
      window.localStorage.removeItem(L03_DRAFT_KEY)
    }
  })
})

describe('A1-U3-L03 shell envelope round-trip (real workspace-draft helpers)', () => {
  const goodDraft = {
    version: 1 as const,
    jsonText: '{"名称": "苹果", "颜色": "红", "重量": 182, "直径": 7.6}',
    hintLevel: 0 as const,
  }

  it('a valid draft survives save -> load -> coerce -> adapter check', () => {
    const storage = memoryStorage()
    expect(saveShellDraft(storage, 'A1-U3-L03', goodDraft).ok).toBe(true)
    const loaded = loadDraft(storage, 'A1-U3-L03')
    expect(loaded.reason).toBeNull()
    expect(loaded.data).toEqual(goodDraft)
    expect(isValidDraftShape(loaded.data)).toBe(true)
    expect(coerceDraft(loaded.data)).toEqual(goodDraft)
    const adapter = new JsonAdapter(loaded.data)
    expect(adapter.checkRecord().passed).toBe(true)
    expect(adapter.getJsonState().passedCount).toBe(5)
  })

  it('an envelope written for another lesson is never restored for this one', () => {
    const storage = memoryStorage()
    expect(saveShellDraft(storage, 'A1-U3-L02', goodDraft).ok).toBe(true)
    // 另一课的信封存在另一把键下：本课键下无内容，data 为 null 且无错课提示
    // （reason 为 null 表示“无草稿”，不是“草稿属于别的课”）。
    const loaded = loadDraft(storage, 'A1-U3-L03')
    expect(loaded.data).toBeNull()
    expect(loaded.reason).toBeNull()
    // 真正的错课：本课键下放着 lessonId 是别课的信封 → 拒绝恢复并给原因。
    storage.setItem(
      'kidscoding-draft:A1-U3-L03',
      JSON.stringify({ lessonId: 'A1-U3-L02', savedAt: '2026-11-06T00:00:00.000Z', script: goodDraft, version: 1 }),
    )
    const mismatched = loadDraft(storage, 'A1-U3-L03')
    expect(mismatched.data).toBeNull()
    expect(mismatched.reason).toContain('其他课节')
    // 不支持的信封版本同样拒绝恢复。
    storage.setItem(
      'kidscoding-draft:A1-U3-L03',
      JSON.stringify({ lessonId: 'A1-U3-L03', savedAt: '2026-11-06T00:00:00.000Z', script: goodDraft, version: 2 }),
    )
    const wrongVersion = loadDraft(storage, 'A1-U3-L03')
    expect(wrongVersion.data).toBeNull()
    expect(wrongVersion.reason).toContain('版本')
  })

  it('a corrupt script inside a valid envelope fails validateDraft and degrades to empty', () => {
    const storage = memoryStorage()
    expect(saveShellDraft(storage, 'A1-U3-L03', 'not an object').ok).toBe(true)
    const loaded = loadDraft(storage, 'A1-U3-L03')
    expect(loaded.reason).toBeNull()
    expect(loaded.data).toBe('not an object')
    expect(isValidDraftShape(loaded.data)).toBe(false)
    expect(coerceDraft(loaded.data)).toEqual(emptyDraft())
    // 外壳回落到初始脚本：适配器载入空草稿，校验是 0 通过（不是 5）。
    const adapter = new JsonAdapter(loaded.data)
    adapter.checkRecord()
    expect(adapter.getJsonState().passedCount).toBe(0)
    expect(adapter.getJsonState().checked).toBe(true)
    // 存储里的坏草稿原样不动（不覆盖、不删除）。
    expect(loadDraft(storage, 'A1-U3-L03').data).toBe('not an object')
  })

  it('an over-64KB draft is refused, never truncated', () => {
    const storage = memoryStorage()
    const big = { ...goodDraft, jsonText: `{"名称": "苹果", "颜色": "红", "重量": 182, "备注": "${'x'.repeat(70 * 1024)}"}` }
    const saved = saveShellDraft(storage, 'A1-U3-L03', big)
    expect(saved.ok).toBe(false)
    expect(loadDraft(storage, 'A1-U3-L03').data).toBeNull()
  })
})
