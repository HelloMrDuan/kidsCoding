import { describe, expect, it } from 'vitest'
import {
  loadDraft,
  saveDraft as saveShellDraft,
  type StorageLike,
} from '../lessons/workspace/workspace-draft'
import { L02Adapter } from './a1-u4-l02-adapter'
import {
  L02_DRAFT_KEY,
  coerceDraft,
  emptyChecklistRow,
  emptyDraft,
  isValidDraftShape,
} from './a1-u4-l02-draft'

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

describe('A1-U4-L02 draft save/restore', () => {
  it('the draft key follows the spec envelope format', () => {
    expect(L02_DRAFT_KEY).toBe('kidscoding-draft:A1-U4-L02')
  })

  it('coerceDraft keeps valid drafts and degrades damaged ones to defaults', () => {
    const valid = {
      version: 1 as const,
      explore: { A1: '聚合可用' as const, P1: '缺许可即停' as const },
      checklist: [
        {
          item: '每日各窗口剩菜总重量',
          containsPii: '否' as const,
          permissionNeeded: '聚合数据可用，仍须教师确认来源',
          status: '不适用' as const,
          disposition: '可用' as const,
        },
        emptyChecklistRow(),
        emptyChecklistRow(),
      ],
      veto: { W1: '可用' as const },
      scopeAnswer: 'A' as const,
      nonCoverage: ['N1'],
      hintLevel: 2 as const,
    }
    expect(coerceDraft(valid)).toEqual(valid)
    expect(isValidDraftShape(valid)).toBe(true)
    expect(
      coerceDraft({
        version: 1,
        explore: { A1: '聚合可用' },
        checklist: [emptyChecklistRow(), emptyChecklistRow(), emptyChecklistRow()],
        veto: {},
        scopeAnswer: null,
        nonCoverage: [],
      }),
    ).toEqual({
      version: 1,
      explore: { A1: '聚合可用' },
      checklist: [emptyChecklistRow(), emptyChecklistRow(), emptyChecklistRow()],
      veto: {},
      scopeAnswer: null,
      nonCoverage: [],
      hintLevel: 0,
    })
    expect(coerceDraft(null)).toEqual(emptyDraft())
    expect(coerceDraft('not an object')).toEqual(emptyDraft())
    expect(coerceDraft({ version: 2, explore: {} })).toEqual(emptyDraft())
    expect(coerceDraft({ version: 1, explore: 'not an object' })).toEqual({
      version: 1,
      explore: {},
      checklist: [emptyChecklistRow(), emptyChecklistRow(), emptyChecklistRow()],
      veto: {},
      scopeAnswer: null,
      nonCoverage: [],
      hintLevel: 0,
    })
  })

  it('coerceDraft filters unknown ids, bad values and truncates over-long text', () => {
    const filtered = coerceDraft({
      version: 1,
      explore: { A1: '聚合可用', A9: '聚合可用', P1: '也许' },
      checklist: [
        {
          item: 'x'.repeat(201),
          containsPii: '否',
          permissionNeeded: '聚合数据可用',
          status: '不适用',
          disposition: '可用',
        },
        {
          item: '各排每日借出册数',
          containsPii: '也许',
          permissionNeeded: '聚合数据可用',
          status: '也许',
          disposition: '也许',
        },
        'not an object',
        {
          item: '多余行',
          containsPii: '否',
          permissionNeeded: 'x',
          status: '不适用',
          disposition: '可用',
        },
      ],
      veto: { W1: '可用', W9: '停', W2: '也许' },
      scopeAnswer: 'D',
      nonCoverage: ['N1', 'N9', 'N1'],
      hintLevel: 0,
    })
    expect(filtered.explore).toEqual({ A1: '聚合可用' })
    expect(filtered.checklist).toHaveLength(3)
    expect(filtered.checklist[0].item).toBe('x'.repeat(200))
    expect(filtered.checklist[1]).toEqual({
      item: '各排每日借出册数',
      containsPii: null,
      permissionNeeded: '聚合数据可用',
      status: null,
      disposition: null,
    })
    expect(filtered.checklist[2]).toEqual(emptyChecklistRow())
    expect(filtered.veto).toEqual({ W1: '可用' })
    expect(filtered.scopeAnswer).toBeNull()
    expect(filtered.nonCoverage).toEqual(['N1'])
  })

  it('coerceDraft rejects non-number, fractional and string hint levels', () => {
    const base = {
      version: 1,
      explore: {},
      checklist: [emptyChecklistRow(), emptyChecklistRow(), emptyChecklistRow()],
      veto: {},
      scopeAnswer: null,
      nonCoverage: [],
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
      explore: { A1: '聚合可用' },
      checklist: [
        {
          item: '每日各窗口剩菜总重量',
          containsPii: '否',
          permissionNeeded: '聚合数据可用',
          status: '不适用',
          disposition: '可用',
        },
        emptyChecklistRow(),
        emptyChecklistRow(),
      ],
      veto: { W1: '可用' },
      scopeAnswer: 'A',
      nonCoverage: ['N1'],
      hintLevel: 0,
    }
    expect(isValidDraftShape(valid)).toBe(true)
    expect(isValidDraftShape({ ...valid, explore: { A9: '聚合可用' } })).toBe(false)
    expect(isValidDraftShape({ ...valid, explore: { A1: '也许' } })).toBe(false)
    expect(
      isValidDraftShape({ ...valid, checklist: valid.checklist.slice(0, 2) }),
    ).toBe(false)
    expect(
      isValidDraftShape({
        ...valid,
        checklist: [
          { ...valid.checklist[0], item: 'x'.repeat(201) },
          valid.checklist[1],
          valid.checklist[2],
        ],
      }),
    ).toBe(false)
    expect(
      isValidDraftShape({
        ...valid,
        checklist: [
          { ...valid.checklist[0], containsPii: '也许' },
          valid.checklist[1],
          valid.checklist[2],
        ],
      }),
    ).toBe(false)
    expect(
      isValidDraftShape({
        ...valid,
        checklist: [
          { ...valid.checklist[0], status: '也许' },
          valid.checklist[1],
          valid.checklist[2],
        ],
      }),
    ).toBe(false)
    expect(
      isValidDraftShape({
        ...valid,
        checklist: [
          { ...valid.checklist[0], disposition: '也许' },
          valid.checklist[1],
          valid.checklist[2],
        ],
      }),
    ).toBe(false)
    expect(isValidDraftShape({ ...valid, veto: { W9: '停' } })).toBe(false)
    expect(isValidDraftShape({ ...valid, veto: { W1: '也许' } })).toBe(false)
    expect(isValidDraftShape({ ...valid, scopeAnswer: 'D' })).toBe(false)
    expect(isValidDraftShape({ ...valid, nonCoverage: ['N9'] })).toBe(false)
  })
})

describe('A1-U4-L02 shell envelope round-trip (real workspace-draft helpers)', () => {
  const goodDraft = {
    version: 1 as const,
    explore: { A1: '聚合可用' as const, P1: '缺许可即停' as const },
    checklist: [
      {
        item: '每日各窗口剩菜总重量',
        containsPii: '否' as const,
        permissionNeeded: '聚合数据可用，仍须教师确认来源',
        status: '不适用' as const,
        disposition: '可用' as const,
      },
      emptyChecklistRow(),
      emptyChecklistRow(),
    ],
    veto: {
      W1: '可用' as const,
      W2: '可用' as const,
      W3: '停' as const,
      W4: '停' as const,
    },
    scopeAnswer: 'A' as const,
    nonCoverage: ['N1', 'N2', 'N3', 'N4', 'N5'],
    hintLevel: 0 as const,
  }

  it('a valid draft survives save -> load -> coerce -> adapter check', () => {
    const storage = memoryStorage()
    expect(saveShellDraft(storage, 'A1-U4-L02', goodDraft).ok).toBe(true)
    const loaded = loadDraft(storage, 'A1-U4-L02')
    expect(loaded.reason).toBeNull()
    expect(loaded.data).toEqual(goodDraft)
    expect(isValidDraftShape(loaded.data)).toBe(true)
    expect(coerceDraft(loaded.data)).toEqual(goodDraft)
    const adapter = new L02Adapter(loaded.data)
    // 探索 2 条分类正确 + 迁移已完成（清单 3 行只填了 1 行，未过）：核对是 3 通过（不是 8）。
    expect(adapter.checkL02().passed).toBe(false)
    expect(adapter.getL02State().passedCount).toBe(3)
  })

  it('an envelope written for another lesson is never restored for this one', () => {
    const storage = memoryStorage()
    expect(saveShellDraft(storage, 'A1-U4-L01', goodDraft).ok).toBe(true)
    // 另一课的信封存在另一把键下：本课键下无内容，data 为 null 且无错课提示
    // （reason 为 null 表示“无草稿”，不是“草稿属于别的课”）。
    const loaded = loadDraft(storage, 'A1-U4-L02')
    expect(loaded.data).toBeNull()
    expect(loaded.reason).toBeNull()
    // 真正的错课：本课键下放着 lessonId 是别课的信封 → 拒绝恢复并给原因。
    storage.setItem(
      'kidscoding-draft:A1-U4-L02',
      JSON.stringify({ lessonId: 'A1-U4-L01', savedAt: '2026-11-06T00:00:00.000Z', script: goodDraft, version: 1 }),
    )
    const mismatched = loadDraft(storage, 'A1-U4-L02')
    expect(mismatched.data).toBeNull()
    expect(mismatched.reason).toContain('其他课节')
    // 不支持的信封版本同样拒绝恢复。
    storage.setItem(
      'kidscoding-draft:A1-U4-L02',
      JSON.stringify({ lessonId: 'A1-U4-L02', savedAt: '2026-11-06T00:00:00.000Z', script: goodDraft, version: 2 }),
    )
    const wrongVersion = loadDraft(storage, 'A1-U4-L02')
    expect(wrongVersion.data).toBeNull()
    expect(wrongVersion.reason).toContain('版本')
  })

  it('a corrupt script inside a valid envelope fails validateDraft and degrades to empty', () => {
    const storage = memoryStorage()
    expect(saveShellDraft(storage, 'A1-U4-L02', 'not an object').ok).toBe(true)
    const loaded = loadDraft(storage, 'A1-U4-L02')
    expect(loaded.reason).toBeNull()
    expect(loaded.data).toBe('not an object')
    expect(isValidDraftShape(loaded.data)).toBe(false)
    expect(coerceDraft(loaded.data)).toEqual(emptyDraft())
    // 外壳回落到初始脚本：适配器载入空草稿，核对是 0 通过（不是 8）。
    const adapter = new L02Adapter(loaded.data)
    adapter.checkL02()
    expect(adapter.getL02State().passedCount).toBe(0)
    expect(adapter.getL02State().checked).toBe(true)
    // 存储里的坏草稿原样不动（不覆盖、不删除）。
    expect(loadDraft(storage, 'A1-U4-L02').data).toBe('not an object')
  })

  it('an over-64KB draft is refused, never truncated', () => {
    const storage = memoryStorage()
    const big = {
      ...goodDraft,
      checklist: [
        { ...goodDraft.checklist[0], item: 'x'.repeat(70 * 1024) },
        goodDraft.checklist[1],
        goodDraft.checklist[2],
      ],
    }
    const saved = saveShellDraft(storage, 'A1-U4-L02', big)
    expect(saved.ok).toBe(false)
    expect(loadDraft(storage, 'A1-U4-L02').data).toBeNull()
  })
})
