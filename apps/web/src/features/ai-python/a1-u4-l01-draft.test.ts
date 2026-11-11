import { describe, expect, it } from 'vitest'
import {
  loadDraft,
  saveDraft as saveShellDraft,
  type StorageLike,
} from '../lessons/workspace/workspace-draft'
import { L01Adapter } from './a1-u4-l01-adapter'
import {
  L01_DRAFT_KEY,
  coerceDraft,
  emptyDraft,
  isValidDraftShape,
} from './a1-u4-l01-draft'

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

describe('A1-U4-L01 draft save/restore', () => {
  it('the draft key follows the spec envelope format', () => {
    expect(L01_DRAFT_KEY).toBe('kidscoding-draft:A1-U4-L01')
  })

  it('coerceDraft keeps valid drafts and degrades damaged ones to defaults', () => {
    const valid = {
      version: 1 as const,
      explore: { E1: '有效' as const, V2: '模糊' as const },
      chosenExample: 'E1' as const,
      statement: { target: '哪类菜品剩得多', data: '每日各窗口剩菜总重量', success: '剩菜最多的两类菜品报对' },
      feasibility: { Q1: '通过' as const },
      feasibilityNotes: { Q1: '数据是聚合计数，拿得到' },
      transferScenario: 'T1' as const,
      transferStatement: { target: '哪种器材最常被借空', data: '各器材每日借出次数', success: '最常被借空的两种器材报对' },
      gradesAnswer: 'A' as const,
      hintLevel: 2 as const,
    }
    expect(coerceDraft(valid)).toEqual(valid)
    expect(isValidDraftShape(valid)).toBe(true)
    expect(
      coerceDraft({
        version: 1,
        explore: { E1: '有效' },
        chosenExample: 'E1',
        statement: { target: '', data: '', success: '' },
        feasibility: {},
        feasibilityNotes: {},
        transferScenario: null,
        transferStatement: { target: '', data: '', success: '' },
        gradesAnswer: null,
      }),
    ).toEqual({
      version: 1,
      explore: { E1: '有效' },
      chosenExample: 'E1',
      statement: { target: '', data: '', success: '' },
      feasibility: {},
      feasibilityNotes: {},
      transferScenario: null,
      transferStatement: { target: '', data: '', success: '' },
      gradesAnswer: null,
      hintLevel: 0,
    })
    expect(coerceDraft(null)).toEqual(emptyDraft())
    expect(coerceDraft('not an object')).toEqual(emptyDraft())
    expect(coerceDraft({ version: 2, explore: {} })).toEqual(emptyDraft())
    expect(coerceDraft({ version: 1, explore: 'not an object' })).toEqual({
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
    })
  })

  it('coerceDraft filters unknown ids, bad values and truncates over-long text', () => {
    const filtered = coerceDraft({
      version: 1,
      explore: { E1: '有效', E9: '有效', V1: '也许' },
      chosenExample: 'E9',
      statement: {
        target: 'x'.repeat(201),
        data: '每日各窗口剩菜总重量',
        success: 42,
      },
      feasibility: { Q1: '通过', Q9: '通过', Q2: '也许' },
      feasibilityNotes: { Q1: 'y'.repeat(101), Q9: '不该留' },
      transferScenario: 'T9',
      transferStatement: { target: '', data: '', success: '' },
      gradesAnswer: 'D',
      hintLevel: 0,
    })
    expect(filtered.explore).toEqual({ E1: '有效' })
    expect(filtered.chosenExample).toBeNull()
    expect(filtered.statement.target).toBe('x'.repeat(200))
    expect(filtered.statement.data).toBe('每日各窗口剩菜总重量')
    expect(filtered.statement.success).toBe('')
    expect(filtered.feasibility).toEqual({ Q1: '通过' })
    expect(filtered.feasibilityNotes).toEqual({ Q1: 'y'.repeat(100) })
    expect(filtered.transferScenario).toBeNull()
    expect(filtered.gradesAnswer).toBeNull()
  })

  it('coerceDraft rejects non-number, fractional and string hint levels', () => {
    const base = {
      version: 1,
      explore: {},
      chosenExample: null,
      statement: { target: '', data: '', success: '' },
      feasibility: {},
      feasibilityNotes: {},
      transferScenario: null,
      transferStatement: { target: '', data: '', success: '' },
      gradesAnswer: null,
    }
    expect(coerceDraft({ ...base, hintLevel: '2' })).toEqual({ ...base, hintLevel: 0 })
    expect(isValidDraftShape({ ...base, hintLevel: '2' })).toBe(false)
    expect(coerceDraft({ ...base, hintLevel: 1.5 })).toEqual({ ...base, hintLevel: 0 })
    expect(isValidDraftShape({ ...base, hintLevel: 1.5 })).toBe(false)
    expect(coerceDraft({ ...base, hintLevel: null })).toEqual({ ...base, hintLevel: 0 })
    expect(coerceDraft({ ...base, hintLevel: 9 })).toEqual({ ...base, hintLevel: 0 })
    expect(isValidDraftShape({ ...base, hintLevel: 9 })).toBe(false)
    expect(coerceDraft({ version: '1', explore: {} })).toEqual(emptyDraft())
    expect(isValidDraftShape({ version: '1', explore: {} })).toBe(false)
  })

  it('isValidDraftShape is strict about every field', () => {
    const valid = {
      version: 1,
      explore: { E1: '有效' },
      chosenExample: 'E1',
      statement: { target: 'a', data: 'b', success: 'c' },
      feasibility: { Q1: '通过' },
      feasibilityNotes: { Q1: '备注' },
      transferScenario: 'T1',
      transferStatement: { target: 'a', data: 'b', success: 'c' },
      gradesAnswer: 'A',
      hintLevel: 0,
    }
    expect(isValidDraftShape(valid)).toBe(true)
    expect(isValidDraftShape({ ...valid, explore: { E9: '有效' } })).toBe(false)
    expect(isValidDraftShape({ ...valid, explore: { E1: '也许' } })).toBe(false)
    expect(isValidDraftShape({ ...valid, chosenExample: 'E9' })).toBe(false)
    expect(
      isValidDraftShape({
        ...valid,
        statement: { target: 'x'.repeat(201), data: '', success: '' },
      }),
    ).toBe(false)
    expect(isValidDraftShape({ ...valid, feasibility: { Q9: '通过' } })).toBe(false)
    expect(isValidDraftShape({ ...valid, feasibility: { Q1: '也许' } })).toBe(false)
    expect(
      isValidDraftShape({ ...valid, feasibilityNotes: { Q1: 'y'.repeat(101) } }),
    ).toBe(false)
    expect(isValidDraftShape({ ...valid, transferScenario: 'T9' })).toBe(false)
    expect(isValidDraftShape({ ...valid, gradesAnswer: 'D' })).toBe(false)
  })
})

describe('A1-U4-L01 shell envelope round-trip (real workspace-draft helpers)', () => {
  const goodDraft = {
    version: 1 as const,
    explore: { E1: '有效' as const, V2: '模糊' as const },
    chosenExample: 'E1' as const,
    statement: { target: '哪类菜品剩得多', data: '每日各窗口剩菜总重量', success: '剩菜最多的两类菜品报对' },
    feasibility: { Q1: '通过' as const },
    feasibilityNotes: { Q1: '数据是聚合计数，拿得到' },
    transferScenario: 'T1' as const,
    transferStatement: { target: '哪种器材最常被借空', data: '各器材每日借出次数', success: '最常被借空的两种器材报对' },
    gradesAnswer: 'A' as const,
    hintLevel: 0 as const,
  }

  it('a valid draft survives save -> load -> coerce -> adapter check', () => {
    const storage = memoryStorage()
    expect(saveShellDraft(storage, 'A1-U4-L01', goodDraft).ok).toBe(true)
    const loaded = loadDraft(storage, 'A1-U4-L01')
    expect(loaded.reason).toBeNull()
    expect(loaded.data).toEqual(goodDraft)
    expect(isValidDraftShape(loaded.data)).toBe(true)
    expect(coerceDraft(loaded.data)).toEqual(goodDraft)
    const adapter = new L01Adapter(loaded.data)
    // 探索 2 条分类正确 + 迁移已完成（问题卡四问只答了 1 问，未过）：核对是 3 通过（不是 8）。
    expect(adapter.checkL01().passed).toBe(false)
    expect(adapter.getL01State().passedCount).toBe(3)
  })

  it('an envelope written for another lesson is never restored for this one', () => {
    const storage = memoryStorage()
    expect(saveShellDraft(storage, 'A1-U3-L06', goodDraft).ok).toBe(true)
    // 另一课的信封存在另一把键下：本课键下无内容，data 为 null 且无错课提示
    // （reason 为 null 表示“无草稿”，不是“草稿属于别的课”）。
    const loaded = loadDraft(storage, 'A1-U4-L01')
    expect(loaded.data).toBeNull()
    expect(loaded.reason).toBeNull()
    // 真正的错课：本课键下放着 lessonId 是别课的信封 → 拒绝恢复并给原因。
    storage.setItem(
      'kidscoding-draft:A1-U4-L01',
      JSON.stringify({ lessonId: 'A1-U3-L06', savedAt: '2026-11-06T00:00:00.000Z', script: goodDraft, version: 1 }),
    )
    const mismatched = loadDraft(storage, 'A1-U4-L01')
    expect(mismatched.data).toBeNull()
    expect(mismatched.reason).toContain('其他课节')
    // 不支持的信封版本同样拒绝恢复。
    storage.setItem(
      'kidscoding-draft:A1-U4-L01',
      JSON.stringify({ lessonId: 'A1-U4-L01', savedAt: '2026-11-06T00:00:00.000Z', script: goodDraft, version: 2 }),
    )
    const wrongVersion = loadDraft(storage, 'A1-U4-L01')
    expect(wrongVersion.data).toBeNull()
    expect(wrongVersion.reason).toContain('版本')
  })

  it('a corrupt script inside a valid envelope fails validateDraft and degrades to empty', () => {
    const storage = memoryStorage()
    expect(saveShellDraft(storage, 'A1-U4-L01', 'not an object').ok).toBe(true)
    const loaded = loadDraft(storage, 'A1-U4-L01')
    expect(loaded.reason).toBeNull()
    expect(loaded.data).toBe('not an object')
    expect(isValidDraftShape(loaded.data)).toBe(false)
    expect(coerceDraft(loaded.data)).toEqual(emptyDraft())
    // 外壳回落到初始脚本：适配器载入空草稿，核对是 0 通过（不是 8）。
    const adapter = new L01Adapter(loaded.data)
    adapter.checkL01()
    expect(adapter.getL01State().passedCount).toBe(0)
    expect(adapter.getL01State().checked).toBe(true)
    // 存储里的坏草稿原样不动（不覆盖、不删除）。
    expect(loadDraft(storage, 'A1-U4-L01').data).toBe('not an object')
  })

  it('an over-64KB draft is refused, never truncated', () => {
    const storage = memoryStorage()
    const big = {
      ...goodDraft,
      statement: { target: 'x'.repeat(70 * 1024), data: '', success: '' },
    }
    const saved = saveShellDraft(storage, 'A1-U4-L01', big)
    expect(saved.ok).toBe(false)
    expect(loadDraft(storage, 'A1-U4-L01').data).toBeNull()
  })
})
