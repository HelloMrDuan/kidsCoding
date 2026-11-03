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
  it('the draft key follows the P0 contract format', () => {
    expect(L02_DRAFT_KEY).toBe('kidscoding-draft:A1-U3-L02')
  })

  it('round-trips selections, custom sentences, fact choices and hint level', () => {
    const draft = {
      version: 1 as const,
      selected: ['P1-1', 'P3-1'],
      custom: ['黄苹果最甜。'],
      facts: { F1: '原文事实' as const, U1: '无依据推断' as const },
      hintLevel: 2 as const,
      predictions: { 'pred-a': { verdict: '合格' as const, firstFailed: '' } },
      revealed: ['pred-a'],
      transferSelected: ['T1-1', 'T2-1'],
      transferChecked: true,
      hasChecked: true,
      errorExplanations: { '漏要点': '少了 C 要点。' },
      methodSummary: '先找主题句，再删重复，再排序。',
    }
    const restored = parseDraft(serializeDraft(draft))
    expect(restored).toEqual(draft)
  })

  it('validates the new P0 fields and drops unknown or illegal values', () => {
    const restored = parseDraft(
      JSON.stringify({
        version: 1,
        selected: [],
        custom: [],
        facts: {},
        hintLevel: 0,
        predictions: {
          'pred-a': { verdict: '合格', firstFailed: '' },
          'pred-z': { verdict: '合格', firstFailed: '' },
          'pred-b': { verdict: '也许', firstFailed: '漏要点' },
          'pred-c': { verdict: '未合格', firstFailed: '不存在的检查' },
        },
        revealed: ['pred-a', 'pred-z'],
        transferSelected: ['T1-1', 'T9-9', 42],
        transferChecked: 'yes',
        hasChecked: true,
        errorExplanations: { '漏要点': '少了要点。', '不存在的检查': 'x' },
        methodSummary: 42,
      }),
    )
    expect(restored.predictions).toEqual({ 'pred-a': { verdict: '合格', firstFailed: '' } })
    expect(restored.revealed).toEqual(['pred-a'])
    expect(restored.transferSelected).toEqual(['T1-1'])
    expect(restored.transferChecked).toBe(false)
    expect(restored.hasChecked).toBe(true)
    expect(restored.errorExplanations).toEqual({ '漏要点': '少了要点。' })
    expect(restored.methodSummary).toBe('')
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

  it('drops over-long custom sentences on read (safe degradation)', () => {
    const restored = parseDraft(
      JSON.stringify({
        version: 1,
        selected: [],
        custom: ['短句。', 'x'.repeat(201)],
        facts: {},
        hintLevel: 0,
      }),
    )
    expect(restored.custom).toEqual(['短句。'])
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
