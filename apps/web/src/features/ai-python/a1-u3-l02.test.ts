import { describe, expect, it } from 'vitest'
import {
  BAD_SUMMARIES,
  FACT_STATEMENTS,
  GOOD_SUMMARY,
  HINTS,
  SUMMARY_METHOD_STEPS,
  buildStudentSummary,
  judgeFact,
} from './a1-u3-l02'
import {
  SUMMARY_PASSAGE,
  checkSummary,
  summarizePassage,
} from './u3-local-engines'

describe('A1-U3-L02 lesson content (reuses the U3 pilot engine)', () => {
  it('the pilot passage has 5 paragraphs and 3 points', () => {
    expect(SUMMARY_PASSAGE).toHaveLength(5)
    expect(SUMMARY_PASSAGE.map((p) => p.point)).toEqual(['A', 'A', 'B', 'C', 'C'])
  })

  it('the three-step method outputs 3 sentences in A-B-C order', () => {
    const result = summarizePassage()
    expect(result.sentences).toHaveLength(3)
    expect(result.pointsCovered).toEqual(['A', 'B', 'C'])
    expect(result.sentences[0]).toBe('颜色是本数据集的主特征。')
    expect(result.sentences[1]).toBe(
      '划分方法定死为分层固定划分：按水果分层，每类前 8 条进训练集、后 2 条进测试集，共 24 条训练、6 条测试。',
    )
    expect(result.sentences[2]).toBe('测试集是没有见过的考题，定规则时不许看测试集。')
  })

  it('the good summary passes all three checks', () => {
    expect(GOOD_SUMMARY.checks.every((c) => c.passed)).toBe(true)
    expect(checkSummary(GOOD_SUMMARY.result).map((c) => c.name)).toEqual(['漏要点', '添内容', '改原意'])
  })

  it('each bad example fails its headline check', () => {
    const byId = new Map(BAD_SUMMARIES.map((e) => [e.id, e]))
    const missing = byId.get('missing')!
    expect(missing.checks.find((c) => c.name === '漏要点')?.passed).toBe(false)
    expect(missing.checks.find((c) => c.name === '添内容')?.passed).toBe(true)
    const added = byId.get('added')!
    expect(added.checks.find((c) => c.name === '添内容')?.passed).toBe(false)
    const digit = byId.get('digit')!
    expect(digit.checks.find((c) => c.name === '改原意')?.passed).toBe(false)
  })

  it('the student builder maps selections to sentences and points in passage order', () => {
    const result = buildStudentSummary(['P3-1', 'P1-1', 'P4-1'])
    expect(result.sentences).toEqual([
      '颜色是本数据集的主特征。',
      '划分方法定死为分层固定划分：按水果分层，每类前 8 条进训练集、后 2 条进测试集，共 24 条训练、6 条测试。',
      '测试集是没有见过的考题，定规则时不许看测试集。',
    ])
    expect(result.pointsCovered).toEqual(['A', 'B', 'C'])
    expect(buildStudentSummary(['P2-1']).pointsCovered).toEqual(['A'])
    expect(buildStudentSummary(['P9-9']).sentences).toEqual([])
  })

  it('fact statements cover all three kinds and judge correctly', () => {
    expect(FACT_STATEMENTS.map((s) => s.kind)).toEqual([
      '原文事实',
      '原文事实',
      '合理概括',
      '合理概括',
      '无依据推断',
      '无依据推断',
    ])
    for (const statement of FACT_STATEMENTS) {
      expect(judgeFact(statement.id, statement.kind).correct).toBe(true)
      const wrong = statement.kind === '原文事实' ? '合理概括' : '原文事实'
      const judged = judgeFact(statement.id, wrong)
      expect(judged.correct).toBe(false)
      expect(judged.expected).toBe(statement.kind)
    }
    expect(judgeFact('NOPE', '原文事实').correct).toBe(false)
  })

  it('hints have three progressive levels and the method has three steps', () => {
    expect(HINTS.map((h) => h.level)).toEqual([1, 2, 3])
    expect(SUMMARY_METHOD_STEPS).toHaveLength(3)
  })
})
