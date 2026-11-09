/**
 * A1-U3-L04 草稿测试骨架（脚手架 OPS-030 生成）。
 *
 * 只测 fail-closed 骨架：损坏草稿回空草稿、不抛错；草稿键按课分键。
 * 课程独有的数据形状校验由课程作者另补真实用例。
 */

import { describe, expect, it } from 'vitest'

import { coerceDraft, emptyDraft, parseDraft, L04_DRAFT_KEY } from './a1-u3-l04-draft'

describe('A1-U3-L04 draft (scaffold)', () => {
  it('empty draft is the safe default', () => {
    expect(emptyDraft()).toEqual({ text: '', hintLevel: 0 })
  })

  it('corrupt draft falls back to empty (fail-closed, never throws)', () => {
    expect(parseDraft(null)).toEqual(emptyDraft())
    expect(parseDraft('not json')).toEqual(emptyDraft())
    expect(parseDraft(JSON.stringify({ text: 42 }))).toEqual(emptyDraft())
    expect(parseDraft(JSON.stringify({ text: 'x', hintLevel: 'bad' }))).toEqual(emptyDraft())
  })

  it('coerceDraft clamps hintLevel and keeps valid text', () => {
    expect(coerceDraft({ text: 'hello', hintLevel: 9 })).toEqual({
      text: 'hello',
      hintLevel: 3,
    })
    expect(coerceDraft('garbage-string')).toEqual(emptyDraft())
  })

  it('draft key is per-lesson', () => {
    expect(L04_DRAFT_KEY).toBe('kidscoding-draft:A1-U3-L04')
  })
})
