import { describe, expect, it } from 'vitest'
import {
  L02_DRAFT_KEY,
  emptyDraft,
  parseDraft,
  restoreDefaultDraft,
  saveDraft,
  serializeDraft,
} from './a1-u3-l02-draft'

describe('A1-U3-L02 draft save/restore', () => {
  it('round-trips selections, custom sentences, fact choices and hint level', () => {
    const draft = {
      version: 1 as const,
      selected: ['P1-1', 'P3-1'],
      custom: ['黄苹果最甜。'],
      facts: { F1: '原文事实' as const, U1: '无依据推断' as const },
      hintLevel: 2 as const,
    }
    const restored = parseDraft(serializeDraft(draft))
    expect(restored).toEqual(draft)
  })

  it('degrades damaged drafts to defaults', () => {
    expect(parseDraft('not json')).toEqual(emptyDraft())
    expect(parseDraft(null)).toEqual(emptyDraft())
    expect(parseDraft(JSON.stringify({ version: 2, selected: ['P1-1'] }))).toEqual(emptyDraft())
    const restored = parseDraft(
      JSON.stringify({
        version: 1,
        selected: ['P1-1', 'P9-9', 42],
        custom: ['黄苹果最甜。', 7, '', 'a', 'b', 'c', 'd', 'e'],
        facts: { F1: '原文事实', U1: '西瓜', G1: '合理概括' },
        hintLevel: 9,
      }),
    )
    expect(restored.selected).toEqual(['P1-1'])
    expect(restored.custom).toEqual(['黄苹果最甜。', 'a', 'b', 'c', 'd'])
    expect(restored.facts).toEqual({ F1: '原文事实', G1: '合理概括' })
    expect(restored.hintLevel).toBe(0)
  })

  it('an old draft without custom defaults custom to empty', () => {
    const restored = parseDraft(
      JSON.stringify({ version: 1, selected: ['P1-1'], facts: {}, hintLevel: 0 }),
    )
    expect(restored.custom).toEqual([])
  })

  it('restore-default empties everything', () => {
    expect(restoreDefaultDraft()).toEqual(emptyDraft())
  })

  it('saveDraft persists when a window exists and never throws', () => {
    const draft = { ...emptyDraft(), selected: ['P1-1'], custom: ['黄苹果最甜。'] }
    expect(() => saveDraft(draft)).not.toThrow()
    if (typeof window !== 'undefined' && window.localStorage) {
      expect(saveDraft(draft)).toBe(true)
      expect(window.localStorage.getItem(L02_DRAFT_KEY)).toBe(serializeDraft(draft))
      window.localStorage.removeItem(L02_DRAFT_KEY)
    }
  })
})
