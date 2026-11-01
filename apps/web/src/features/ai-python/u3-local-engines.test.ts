import { describe, expect, it } from 'vitest'

import {
  ANSWERS_TO_CHECK,
  answerQuestion,
  checkCitationAnswer,
  checkSummary,
  CORPUS_CARDS,
  evaluateGateCall,
  GATE_CASES,
  GATE_GENERIC_REFUSAL,
  JSON_CASES,
  QA_PAIRS,
  RETRIEVAL_KEYWORDS,
  runQaDrill,
  scoreCards,
  summarizePassage,
  SUMMARY_PASSAGE,
  U3_PILOT_E2E_SPEC,
  U3_PILOT_LESSON_IDS,
  usableCards,
  u3PilotRoute,
  validateFruitRecord,
} from './u3-local-engines'

describe('A1-U3-L01 call gate (draft: five steps, fail closed)', () => {
  it('passes a request that clears all five steps', () => {
    const verdict = evaluateGateCall(GATE_CASES[0].request)
    expect(verdict.allowed).toBe(true)
    expect(verdict.failedStep).toBeNull()
    expect(verdict.refusal).toBeNull()
  })

  it('refuses the draft’s five examples at the right step', () => {
    const byId = new Map(GATE_CASES.map((gateCase) => [gateCase.id, gateCase]))
    expect(evaluateGateCall(byId.get('refuse-1')!.request)).toMatchObject({
      allowed: false,
      failedStep: 1,
      failedSubCheck: null,
    })
    expect(evaluateGateCall(byId.get('refuse-2')!.request)).toMatchObject({
      allowed: false,
      failedStep: 2,
      failedSubCheck: null,
    })
    expect(evaluateGateCall(byId.get('refuse-3')!.request)).toMatchObject({
      allowed: false,
      failedStep: 3,
      failedSubCheck: 'pii',
    })
    expect(evaluateGateCall(byId.get('refuse-4')!.request)).toMatchObject({
      allowed: false,
      failedStep: 3,
      failedSubCheck: 'scope',
    })
    expect(evaluateGateCall(byId.get('refuse-5')!.request)).toMatchObject({
      allowed: false,
      failedStep: 3,
      failedSubCheck: 'length',
    })
  })

  it('refuses at step 3 for sensitive content and injection, at 4 for allowlist, at 5 for quota', () => {
    const base = GATE_CASES[0].request
    expect(evaluateGateCall({ ...base, containsSensitive: true }).failedSubCheck).toBe('sensitive')
    expect(evaluateGateCall({ ...base, injectionSafe: false }).failedSubCheck).toBe('injection')
    expect(evaluateGateCall({ ...base, modelInAllowlist: false }).failedStep).toBe(4)
    expect(evaluateGateCall({ ...base, withinQuota: false }).failedStep).toBe(5)
  })

  it('every refusal uses the generic text and names a concrete local task', () => {
    for (const gateCase of GATE_CASES.slice(1)) {
      const verdict = evaluateGateCall(gateCase.request)
      expect(verdict.refusal).toBe(GATE_GENERIC_REFUSAL)
      expect(verdict.localTask.length).toBeGreaterThan(0)
    }
  })
})

describe('A1-U3-L02 extractive summary (synthetic passage, pilot-authored)', () => {
  it('has 5 paragraphs over points A/B/C', () => {
    expect(SUMMARY_PASSAGE).toHaveLength(5)
    expect(new Set(SUMMARY_PASSAGE.map((p) => p.point))).toEqual(new Set(['A', 'B', 'C']))
  })

  it('summarizes to 3 verbatim sentences covering A, B, and C', () => {
    const result = summarizePassage()
    expect(result.sentences).toHaveLength(3)
    expect(result.pointsCovered).toEqual(['A', 'B', 'C'])
    const passageSentences = SUMMARY_PASSAGE.flatMap((p) => p.sentences)
    for (const sentence of result.sentences) {
      expect(passageSentences).toContain(sentence)
    }
  })

  it('passes all three对照 checks on its own summary', () => {
    const checks = checkSummary(summarizePassage())
    expect(checks.map((check) => check.name)).toEqual(['漏要点', '添内容', '改原意'])
    expect(checks.every((check) => check.passed)).toBe(true)
  })

  it('fails coverage when a point is missing, added-content for a new sentence, meaning for a changed digit', () => {
    const full = summarizePassage()
    const missing = {
      sentences: full.sentences.slice(0, 2),
      pointsCovered: ['A', 'B'] as ('A' | 'B' | 'C')[],
    }
    expect(checkSummary(missing).find((c) => c.name === '漏要点')!.passed).toBe(false)
    const added = { sentences: [...full.sentences, '香蕉是蓝色的。'], pointsCovered: full.pointsCovered }
    expect(checkSummary(added).find((c) => c.name === '添内容')!.passed).toBe(false)
    const digitChanged = {
      sentences: full.sentences.map((s) => s.replace('后 2 条', '后 3 条')),
      pointsCovered: full.pointsCovered,
    }
    expect(checkSummary(digitChanged).find((c) => c.name === '改原意')!.passed).toBe(false)
  })
})

describe('A1-U3-L03 fruit-record JSON validator (draft: 4 fields, 5 checks, 5 judgments)', () => {
  it('passes ① and ② (optional diameter may be missing) and fails ②-variant, ③, ④', () => {
    const byId = new Map(JSON_CASES.map((c) => [c.id, c]))
    expect(validateFruitRecord(byId.get('ex1')!.record).passed).toBe(true)
    expect(validateFruitRecord(byId.get('ex2')!.record).passed).toBe(true)
    expect(validateFruitRecord(byId.get('ex2b')!.record)).toMatchObject({
      passed: false,
      failedChecks: ['字段齐全'],
    })
    expect(validateFruitRecord(byId.get('ex3')!.record)).toMatchObject({
      passed: false,
      failedChecks: ['类型正确'],
    })
    expect(validateFruitRecord(byId.get('ex4')!.record)).toMatchObject({
      passed: false,
      failedChecks: ['枚举内'],
    })
    expect(JSON_CASES).toHaveLength(5)
    for (const jsonCase of JSON_CASES) {
      expect(validateFruitRecord(jsonCase.record).passed).toBe(jsonCase.expected)
    }
  })

  it('fails range for a zero weight and non-empty for an empty required string', () => {
    expect(validateFruitRecord({ 名称: '苹果', 颜色: '红', 重量: 0 })).toMatchObject({
      passed: false,
      failedChecks: ['数值范围'],
    })
    expect(validateFruitRecord({ 名称: '', 颜色: '红', 重量: 182 })).toMatchObject({
      passed: false,
      failedChecks: ['必填非空'],
    })
  })
})

describe('A1-U3-L04 local corpus retrieval (draft: 6 cards, usable A and B)', () => {
  it('has 6 synthetic cards and scores usable A and B only', () => {
    expect(CORPUS_CARDS).toHaveLength(6)
    const scores = scoreCards(RETRIEVAL_KEYWORDS)
    expect(usableCards(scores).map((score) => score.card.id)).toEqual(['A', 'B'])
    const byId = new Map(scores.map((score) => [score.card.id, score]))
    expect(byId.get('C')!.否决理由).toBe('资料过期')
    expect(byId.get('D')!.否决理由).toBe('来源不可信')
    expect(byId.get('E')!.否决理由).toBe('来源不可信')
    expect(byId.get('F')!.否决理由).toBe('与任务无关')
  })

  it('counts keyword hits from the card text itself', () => {
    const byId = new Map(scoreCards(RETRIEVAL_KEYWORDS).map((s) => [s.card.id, s]))
    expect(byId.get('A')!.命中数).toBe(3)
    expect(byId.get('B')!.命中数).toBe(2)
  })
})

describe('A1-U3-L05 citation checking (draft: 3 answers, 3 hallucination types)', () => {
  it('passes ①, flags ② as invented number, ③ as invented source', () => {
    const byId = new Map(ANSWERS_TO_CHECK.map((a) => [a.id, a]))
    const first = checkCitationAnswer(byId.get('ans1')!)
    expect(first).toMatchObject({ passed: true, kind: '通过' })
    const second = checkCitationAnswer(byId.get('ans2')!)
    expect(second).toMatchObject({ passed: false, kind: '编造数字' })
    expect(second.fix).toContain('168')
    const third = checkCitationAnswer(byId.get('ans3')!)
    expect(third).toMatchObject({ passed: false, kind: '编造来源' })
    expect(third.fix).toContain('未核实')
  })
})

describe('A1-U3-L06 local Q&A assistant (draft: 8 pairs, answered 6, refused 2)', () => {
  it('has 4 fact, 2 method, 2 out-of-scope pairs', () => {
    expect(QA_PAIRS).toHaveLength(8)
    expect(QA_PAIRS.filter((p) => p.category === '事实类')).toHaveLength(4)
    expect(QA_PAIRS.filter((p) => p.category === '方法类')).toHaveLength(2)
    expect(QA_PAIRS.filter((p) => p.category === '超范围类')).toHaveLength(2)
  })

  it('runs the drill to answered 6 and refused 2, refusals counted separately', () => {
    const { log } = runQaDrill()
    expect(log).toEqual({
      byCategory: { 事实类: 4, 方法类: 2, 超范围类: 2 },
      answered: 6,
      refused: 2,
    })
  })

  it('answers each bank question through keyword matching, refuses out-of-scope and unknown questions', () => {
    for (const pair of QA_PAIRS) {
      const result = answerQuestion(pair.question)
      if (pair.category === '超范围类') {
        expect(result.answered).toBe(false)
        expect(result.category).toBe('超范围类')
      } else {
        expect(result.answered).toBe(true)
        expect(result.pair?.id).toBe(pair.id)
      }
    }
    const unknown = answerQuestion('今天天气怎么样？')
    expect(unknown.answered).toBe(false)
    expect(unknown.pair).toBeNull()
  })

  it('the drill log contains no question or answer text at all', () => {
    const { log } = runQaDrill()
    const serialized = JSON.stringify(log)
    for (const pair of QA_PAIRS) {
      expect(serialized).not.toContain(pair.question)
      if (pair.answer) expect(serialized).not.toContain(pair.answer)
    }
  })
})

describe('A1-U3 pilot routing (direct URL only, never a published lesson)', () => {
  it('routes six U3 lessons and nothing else', () => {
    expect(U3_PILOT_LESSON_IDS).toEqual([
      'A1-U3-L01',
      'A1-U3-L02',
      'A1-U3-L03',
      'A1-U3-L04',
      'A1-U3-L05',
      'A1-U3-L06',
    ])
    for (const id of U3_PILOT_LESSON_IDS) {
      expect(u3PilotRoute(id)).toBe(`/learn/ai-python-lab-u3/${id}`)
    }
    expect(u3PilotRoute('A1-U3-L07')).toBeNull()
    expect(u3PilotRoute('A1-U1-L01')).toBeNull()
    expect(U3_PILOT_E2E_SPEC).toBe('tests/e2e/ai-python-a1-u3.spec.ts')
  })
})
