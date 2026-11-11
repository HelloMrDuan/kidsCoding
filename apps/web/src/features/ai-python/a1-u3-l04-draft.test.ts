/**
 * A1-U3-L04 草稿测试（正式验收，按详案 §4.1/§7.2）。
 *
 * 只测 fail-closed 草稿形状：损坏草稿回空草稿、不抛错；缺失字段补默认；
 * 超长截断；草稿键按课分键。校验结果与可用结论不进草稿。
 */

import { describe, expect, it } from 'vitest'

import {
  L04_DRAFT_KEY,
  coerceDraft,
  emptyDraft,
  isValidDraftShape,
  parseDraft,
} from './a1-u3-l04-draft'
import { correctAnswers } from './a1-u3-l04'

describe('A1-U3-L04 draft (structured)', () => {
  it('empty draft is the safe default', () => {
    expect(emptyDraft()).toEqual({
      version: 1,
      keywords: [],
      answers: {},
      usable: [],
      ruleText: '',
      hintLevel: 0,
    })
  })

  it('corrupt drafts fall back to empty (fail-closed, never throws)', () => {
    expect(parseDraft(null)).toEqual(emptyDraft())
    expect(parseDraft('not json')).toEqual(emptyDraft())
    expect(parseDraft(42)).toEqual(emptyDraft())
    expect(parseDraft(JSON.stringify({ version: 2, keywords: [] }))).toEqual(emptyDraft())
    expect(parseDraft(JSON.stringify({ version: 1, keywords: '苹果' }))).toEqual(emptyDraft())
    expect(parseDraft(JSON.stringify({ version: 1, keywords: [42] }))).toEqual(emptyDraft())
    expect(
      parseDraft(
        JSON.stringify({
          version: 1,
          keywords: [],
          answers: { G: { source: true } },
          usable: [],
          ruleText: '',
        }),
      ),
    ).toEqual(emptyDraft())
    expect(
      parseDraft(
        JSON.stringify({
          version: 1,
          keywords: [],
          answers: { A: { source: 'yes' } },
          usable: [],
          ruleText: '',
        }),
      ),
    ).toEqual(emptyDraft())
    expect(
      parseDraft(
        JSON.stringify({
          version: 1,
          keywords: [],
          answers: {},
          usable: ['Z'],
          ruleText: '',
        }),
      ),
    ).toEqual(emptyDraft())
    expect(
      parseDraft(
        JSON.stringify({
          version: 1,
          keywords: [],
          answers: {},
          usable: [],
          ruleText: 42,
        }),
      ),
    ).toEqual(emptyDraft())
    expect(
      parseDraft(
        JSON.stringify({
          version: 1,
          keywords: [],
          answers: {},
          usable: [],
          ruleText: '',
          hintLevel: 9,
        }),
      ),
    ).toEqual(emptyDraft())
  })

  it('coerceDraft fills missing fields with defaults', () => {
    expect(coerceDraft({ version: 1 })).toEqual(emptyDraft())
    expect(coerceDraft({ version: 1, keywords: ['苹果'] })).toEqual({
      version: 1,
      keywords: ['苹果'],
      answers: {},
      usable: [],
      ruleText: '',
      hintLevel: 0,
    })
  })

  it('coerceDraft keeps a valid structured draft intact', () => {
    const draft = {
      version: 1,
      keywords: ['苹果', '颜色', '规则'],
      answers: correctAnswers(),
      usable: ['A', 'B'],
      ruleText: '从任务句里挑关键词；来源、时间、证据、相关四问全过才可用。',
      hintLevel: 2,
    }
    expect(coerceDraft(draft)).toEqual(draft)
    expect(isValidDraftShape(draft)).toBe(true)
  })

  it('coerceDraft truncates over-long keywords and rule text (input protection)', () => {
    const draft = {
      version: 1,
      keywords: ['苹果', '颜色规则把黄色判成香蕉'],
      answers: {},
      usable: [],
      ruleText: '规'.repeat(2001),
      hintLevel: 0,
    }
    const coerced = coerceDraft(draft)
    expect(coerced.keywords).toEqual(['苹果', '颜色规则把黄色判成香'])
    expect(coerced.keywords[1].length).toBe(10)
    expect(coerced.ruleText.length).toBe(2000)
  })

  it('coerceDraft dedupes the usable list', () => {
    expect(
      coerceDraft({ version: 1, keywords: [], answers: {}, usable: ['A', 'A', 'B'], ruleText: '' }),
    ).toEqual({
      version: 1,
      keywords: [],
      answers: {},
      usable: ['A', 'B'],
      ruleText: '',
      hintLevel: 0,
    })
  })

  it('partial per-card answers are a valid shape (missing questions read as unanswered)', () => {
    expect(isValidDraftShape({ version: 1, answers: { A: { source: true } } })).toBe(true)
    expect(isValidDraftShape({ version: 1, answers: { A: { source: null } } })).toBe(true)
    expect(isValidDraftShape({ version: 1, answers: { A: { nope: true } } })).toBe(false)
    expect(isValidDraftShape({ version: 1, answers: [] })).toBe(false)
    expect(isValidDraftShape({ version: 1, keywords: [], answers: {}, usable: [], ruleText: '' })).toBe(
      true,
    )
  })

  it('draft key is per-lesson', () => {
    expect(L04_DRAFT_KEY).toBe('kidscoding-draft:A1-U3-L04')
  })
})
