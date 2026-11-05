import { describe, expect, it } from 'vitest'
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
