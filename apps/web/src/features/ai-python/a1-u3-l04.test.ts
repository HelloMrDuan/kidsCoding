/**
 * A1-U3-L04 数据与契约测试骨架（脚手架 OPS-030 生成）。
 *
 * 只测骨架结构：契约通过 validateLessonContract、草稿键按课分键、
 * 引擎值合法。课程独有的判定规则由课程作者另补真实用例。
 */

import { describe, expect, it } from 'vitest'

import { validateLessonContract } from '../lessons/workspace/lesson-contract'
import { L04_CONTRACT, L04_DRAFT_KEY, L04_WORKSPACE_CONTRACT } from './a1-u3-l04-contract'

describe('A1-U3-L04 contract (scaffold)', () => {
  it('contract validates against the shared LessonContract', () => {
    expect(validateLessonContract(L04_WORKSPACE_CONTRACT)).toEqual([])
  })

  it('draft key is per-lesson (kidscoding-draft:{lessonId})', () => {
    expect(L04_DRAFT_KEY).toBe('kidscoding-draft:A1-U3-L04')
    expect(L04_CONTRACT.draftKey).toBe(L04_DRAFT_KEY)
  })

  it('engine is the generic slot engine (never summary, never json)', () => {
    expect(L04_WORKSPACE_CONTRACT.engine).toBe('slot')
  })

  it('goal5 has exactly five first-screen elements', () => {
    expect(L04_CONTRACT.goal5).toHaveLength(5)
    for (const goal of L04_CONTRACT.goal5) {
      expect(typeof goal).toBe('string')
      expect(goal.length).toBeGreaterThan(0)
    }
  })
})
