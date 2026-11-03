import { describe, expect, it } from 'vitest'
import {
  BAD_SUMMARIES,
  FACT_STATEMENTS,
  GOOD_SUMMARY,
  HINTS,
  PREDICTION_RESULTS,
  SUMMARY_METHOD_STEPS,
  buildDraftSummary,
  buildDraftSummaryForPassage,
  buildStudentSummary,
  buildTransferSummary,
  checkDraftSummary,
  checkDraftSummaryForPassage,
  checkTransferSummary,
  judgeFact,
  judgePrediction,
} from './a1-u3-l02'
import { L02_CONTRACT, TRANSFER_PASSAGE, TRANSFER_POINTS } from './a1-u3-l02-contract'
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
    expect(GOOD_SUMMARY.result.sentences).toEqual(result.sentences)
  })

  it('the good summary passes all five checks', () => {
    expect(GOOD_SUMMARY.checks).toHaveLength(5)
    expect(GOOD_SUMMARY.checks.every((c) => c.passed)).toBe(true)
    expect(checkSummary(GOOD_SUMMARY.result).map((c) => c.name)).toEqual(['漏要点', '添内容', '改原意'])
  })

  it('each bad example fails its headline checks', () => {
    const byId = new Map(BAD_SUMMARIES.map((e) => [e.id, e]))
    const missing = byId.get('missing')!
    expect(missing.checks.find((c) => c.name === '漏要点')?.passed).toBe(false)
    expect(missing.checks.find((c) => c.name === '抽取规范')?.passed).toBe(false)
    const added = byId.get('added')!
    expect(added.checks.find((c) => c.name === '添内容')?.passed).toBe(false)
    expect(added.checks.find((c) => c.name === '来源核验')?.passed).toBe(false)
    const digit = byId.get('digit')!
    expect(digit.checks.find((c) => c.name === '改原意')?.passed).toBe(false)
    expect(digit.checks.find((c) => c.name === '来源核验')?.passed).toBe(false)
  })

  it('reverse: selecting all 10 sentences passes the old three checks but fails extractive rules', () => {
    const all = buildDraftSummary(
      ['P1-1', 'P1-2', 'P2-1', 'P2-2', 'P3-1', 'P3-2', 'P4-1', 'P4-2', 'P5-1', 'P5-2'],
      [],
    )
    const checks = checkDraftSummary(all)
    expect(checks.find((c) => c.name === '漏要点')?.passed).toBe(true)
    expect(checks.find((c) => c.name === '添内容')?.passed).toBe(true)
    expect(checks.find((c) => c.name === '改原意')?.passed).toBe(true)
    expect(checks.find((c) => c.name === '抽取规范')?.passed).toBe(false)
  })

  it('reverse: repeating one point fails extractive rules even when all points are covered', () => {
    const dup = buildDraftSummary(['P1-1', 'P2-1', 'P3-1', 'P4-1'], [])
    const checks = checkDraftSummary(dup)
    expect(checks.find((c) => c.name === '漏要点')?.passed).toBe(true)
    const extract = checks.find((c) => c.name === '抽取规范')
    expect(extract?.passed).toBe(false)
    expect(extract?.detail).toContain('要点 A 重复')
  })

  it('reverse: an unsourced custom sentence cannot claim point coverage', () => {
    const custom = buildDraftSummary(['P1-1', 'P3-1'], ['测试集是裁判。'])
    const checks = checkDraftSummary(custom)
    expect(checks.find((c) => c.name === '漏要点')?.passed).toBe(false)
    expect(checks.find((c) => c.name === '添内容')?.passed).toBe(false)
    expect(checks.find((c) => c.name === '来源核验')?.passed).toBe(false)
  })

  it('reverse: a custom sentence with an invented digit fails meaning', () => {
    const custom = buildDraftSummary(['P1-1', 'P3-1', 'P4-1'], ['训练集共 30 条。'])
    const checks = checkDraftSummary(custom)
    expect(checks.find((c) => c.name === '改原意')?.passed).toBe(false)
    expect(checks.find((c) => c.name === '来源核验')?.passed).toBe(false)
  })

  it('extractive length band: 2 fails, 3 passes', () => {
    expect(checkDraftSummary(buildDraftSummary(['P1-1', 'P3-1'], [])).find((c) => c.name === '抽取规范')?.passed).toBe(false)
    expect(checkDraftSummary(buildDraftSummary(['P1-1', 'P3-1', 'P4-1'], [])).find((c) => c.name === '抽取规范')?.passed).toBe(true)
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

describe('A1-U3-L02 P0 content contract', () => {
  it('goal5 has exactly five items and names no API call', () => {
    expect(L02_CONTRACT.goal5).toHaveLength(5)
    expect(L02_CONTRACT.lessonId).toBe('A1-U3-L02')
    expect(L02_CONTRACT.title).toBe('实现文本摘要')
    expect(L02_CONTRACT.engine).toBe('summary')
    expect(L02_CONTRACT.goal5.join('')).not.toContain('API')
    expect(L02_CONTRACT.goal5[3]).toContain('尚未建成')
    expect(L02_CONTRACT.goal5[3]).toContain('不调用外部模型')
  })

  it('draft key follows the spec format and scope is honestly labelled', () => {
    expect(L02_CONTRACT.draftKey).toBe('kidscoding-draft:A1-U3-L02')
    expect(L02_CONTRACT.scopeLabel).toBe('教学定向')
    expect(L02_CONTRACT.scopeGap).toContain('不等于完全掌握')
    expect(L02_CONTRACT.hints.map((h) => h.level)).toEqual([1, 2, 3])
  })

  it('the transfer passage is a new passage with the same 3-point structure', () => {
    expect(TRANSFER_PASSAGE).toHaveLength(3)
    expect(TRANSFER_PASSAGE.map((p) => p.point)).toEqual(['A', 'B', 'C'])
    expect(TRANSFER_POINTS).toEqual({ A: '先分类', B: '按顺序装', C: '出门前检查' })
    const mainText = SUMMARY_PASSAGE.flatMap((p) => p.sentences).join('')
    for (const sentence of TRANSFER_PASSAGE.flatMap((p) => p.sentences)) {
      expect(mainText).not.toContain(sentence)
    }
  })

  it('the transfer theme triple passes all five checks under the same rules', () => {
    const summary = buildTransferSummary(['T1-1', 'T2-1', 'T3-1'])
    expect(summary.pointsCovered).toEqual(['A', 'B', 'C'])
    const checks = checkTransferSummary(summary)
    expect(checks).toHaveLength(5)
    expect(checks.every((c) => c.passed)).toBe(true)
  })

  it('transfer failures use the same five checks (missing point, repeated point)', () => {
    const missing = checkTransferSummary(buildTransferSummary(['T1-1', 'T2-1']))
    expect(missing.find((c) => c.name === '漏要点')?.passed).toBe(false)
    const repeated = checkTransferSummary(buildTransferSummary(['T1-1', 'T1-2', 'T2-1', 'T3-1']))
    expect(repeated.find((c) => c.name === '抽取规范')?.passed).toBe(false)
  })

  it('the passage-parameterized checker matches the main-passage checker', () => {
    const summary = buildDraftSummary(['P1-1', 'P3-1', 'P4-1'], [])
    expect(checkDraftSummaryForPassage(SUMMARY_PASSAGE, summary)).toEqual(checkDraftSummary(summary))
    expect(buildDraftSummaryForPassage(SUMMARY_PASSAGE, ['P1-1'], [])).toEqual(
      buildDraftSummary(['P1-1'], []),
    )
  })

  it('prediction candidates are computed, not hand-filled, and none is the theme triple', () => {
    const byId = new Map(PREDICTION_RESULTS.map((r) => [r.candidate.id, r]))
    const a = byId.get('pred-a')!
    expect(a.passed).toBe(true)
    expect(a.failedNames).toEqual([])
    const b = byId.get('pred-b')!
    expect(b.passed).toBe(false)
    expect(b.failedNames).toEqual(['漏要点', '抽取规范'])
    const c = byId.get('pred-c')!
    expect(c.passed).toBe(false)
    expect(c.failedNames).toEqual(['添内容', '来源核验'])
    const theme = new Set(['P1-1', 'P3-1', 'P4-1'])
    for (const result of PREDICTION_RESULTS) {
      const ids = new Set(result.candidate.selectedIds)
      expect(ids).not.toEqual(theme)
    }
  })

  it('prediction judging requires the verdict and, when failing, a real failed check', () => {
    const byId = new Map(PREDICTION_RESULTS.map((r) => [r.candidate.id, r]))
    const a = byId.get('pred-a')!
    expect(judgePrediction(a, '合格', '')).toBe(true)
    expect(judgePrediction(a, '未合格', '漏要点')).toBe(false)
    const b = byId.get('pred-b')!
    expect(judgePrediction(b, '未合格', '漏要点')).toBe(true)
    expect(judgePrediction(b, '未合格', '抽取规范')).toBe(true)
    expect(judgePrediction(b, '未合格', '添内容')).toBe(false)
    expect(judgePrediction(b, '合格', '')).toBe(false)
  })
})
