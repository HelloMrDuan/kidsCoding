/**
 * A1-U3-L04 数据、契约与判定测试（正式验收，按详案 §7.2）。
 *
 * 覆盖：契约通过 validateLessonContract、草稿键按课分键、引擎值；
 * 试点复用（语料卡、教师关键词、scoreCards ground truth、可用筛选）；
 * validateRetrieval 五项检查的通过与失败用例、字段级报错；
 * §3.5 六个正反例的预期判定；三层判定文案；方法证据。
 */

import { describe, expect, it } from 'vitest'

import { validateLessonContract } from '../lessons/workspace/lesson-contract'
import {
  CORPUS_CARDS,
  HINTS,
  LESSON_STEPS,
  L04_FIELDS,
  RETRIEVAL_EXAMPLES,
  RETRIEVAL_KEYWORDS,
  TASK_SENTENCE,
  correctAnswers,
  methodEvidenceForRetrieval,
  scoreCards,
  usableCards,
  validateRetrieval,
  type RetrievalInput,
} from './a1-u3-l04'
import {
  A1U3L04Adapter,
  buildA1U3L04Judgment,
  passedCountOf,
} from './a1-u3-l04-adapter'
import {
  L04_CONTRACT,
  L04_DRAFT_KEY,
  L04_WORKSPACE_CONTRACT,
  L04_WORKSPACE_CONTRACT_FIELDS,
} from './a1-u3-l04-contract'
import { emptyDraft } from './a1-u3-l04-draft'

function goodDraft(): RetrievalInput {
  const example = RETRIEVAL_EXAMPLES.find((item) => item.id === 'good')
  if (!example) throw new Error('missing good example')
  return {
    keywords: [...example.draft.keywords],
    answers: JSON.parse(JSON.stringify(example.draft.answers)) as RetrievalInput['answers'],
    usable: [...example.draft.usable],
    ruleText: example.draft.ruleText,
  }
}

function exampleDraft(id: string): RetrievalInput {
  const example = RETRIEVAL_EXAMPLES.find((item) => item.id === id)
  if (!example) throw new Error(`missing example: ${id}`)
  return {
    keywords: [...example.draft.keywords],
    answers: JSON.parse(JSON.stringify(example.draft.answers)) as RetrievalInput['answers'],
    usable: [...example.draft.usable],
    ruleText: example.draft.ruleText,
  }
}

describe('A1-U3-L04 contract', () => {
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

  it('goal5 has exactly five non-empty first-screen elements', () => {
    expect(L04_CONTRACT.goal5).toHaveLength(5)
    for (const goal of L04_CONTRACT.goal5) {
      expect(typeof goal).toBe('string')
      expect(goal.length).toBeGreaterThan(0)
      expect(goal).not.toContain('TODO')
    }
    expect(L04_CONTRACT.goal5[0]).toContain('检索可信资料')
    expect(L04_CONTRACT.goal5[3]).toContain('A1-U3-L03')
  })

  it('HINTS has exactly three levels 1/2/3 and LESSON_STEPS is non-empty', () => {
    expect(HINTS).toHaveLength(3)
    expect(HINTS.map((hint) => hint.level)).toEqual([1, 2, 3])
    for (const hint of HINTS) {
      expect(hint.text).not.toContain('TODO')
    }
    expect(HINTS[0].text).toContain('命中数是线索，可信度是门禁')
    expect(LESSON_STEPS.length).toBeGreaterThanOrEqual(1)
    for (const step of LESSON_STEPS) {
      expect(step).not.toContain('TODO')
    }
  })

  it('judging rules and scopeGap are real text, never TODO', () => {
    const judging = L04_WORKSPACE_CONTRACT_FIELDS.judging
    expect(judging.stageRule).toContain('关键词有效')
    expect(judging.taskRule).toContain('五项全部通过为合格')
    expect(judging.knowledgeRule).toContain('不核验资料真假')
    expect(judging.scopeLabel).toBe('教学定向')
    expect(L04_CONTRACT.scopeGap).toContain('本次检索合格')
    expect(L04_CONTRACT.scopeGap).not.toContain('TODO')
    expect(L04_CONTRACT.brief).toContain('A、B')
    expect(L04_CONTRACT.step).not.toContain('TODO')
  })

  it('activities has exactly three levels 1/2/3', () => {
    const activities = L04_WORKSPACE_CONTRACT_FIELDS.activities
    expect(activities).toHaveLength(3)
    expect(activities!.map((activity) => activity.level)).toEqual([1, 2, 3])
    expect(activities![0].title).toContain('预测')
    expect(activities![1].title).toContain('独立解决')
    expect(activities![2].title).toContain('迁移创作')
  })

  it('field table documents the five draft fields', () => {
    expect(L04_FIELDS.map((field) => field.field)).toEqual([
      'keywords',
      'answers',
      'usable',
      'ruleText',
      'hintLevel',
    ])
    expect(L04_FIELDS.filter((field) => field.required).map((field) => field.field)).toEqual([
      'keywords',
      'answers',
      'usable',
      'ruleText',
    ])
  })
})

describe('A1-U3-L04 pilot reuse (ground truth)', () => {
  it('the pilot corpus has 6 cards A–F with the draft-given content', () => {
    expect(CORPUS_CARDS.map((card) => card.id)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    expect(CORPUS_CARDS[0].标题).toBe('水果分类规则卡')
    expect(CORPUS_CARDS[0].摘要句).toBe('颜色规则把黄色判成香蕉，金帅苹果因此被判错。')
    expect(CORPUS_CARDS[5].标题).toBe('恐龙灭绝之谜')
  })

  it('teacher keywords are exactly the draft-given three', () => {
    expect(RETRIEVAL_KEYWORDS).toEqual(['苹果', '颜色', '规则'])
    for (const keyword of RETRIEVAL_KEYWORDS) {
      expect(TASK_SENTENCE).toContain(keyword)
    }
  })

  it('scoreCards ground truth: hits 3/2/1/0/0/0, usable {A, B}, four veto reasons', () => {
    const scores = scoreCards(RETRIEVAL_KEYWORDS)
    expect(scores.map((score) => score.命中数)).toEqual([3, 2, 1, 0, 0, 0])
    expect(scores.map((score) => score.可用)).toEqual([true, true, false, false, false, false])
    expect(scores.map((score) => score.否决理由)).toEqual([
      null,
      null,
      '资料过期',
      '来源不可信',
      '来源不可信',
      '与任务无关',
    ])
    // Per-question ground truth behind the 24 answers.
    expect(scores.map((score) => [score.来源可信, score.时间新, score.有证据, score.相关])).toEqual([
      [true, true, true, true],
      [true, true, true, true],
      [true, false, true, true],
      [false, true, false, true],
      [false, true, false, true],
      [true, true, true, false],
    ])
    expect(usableCards(scores).map((score) => score.card.id)).toEqual(['A', 'B'])
  })
})

describe('A1-U3-L04 validateRetrieval', () => {
  it('a correct draft passes all five checks with no field errors', () => {
    const draft = goodDraft()
    const result = validateRetrieval(draft)
    expect(result.passed).toBe(true)
    expect(result.failedChecks).toEqual([])
    expect(result.fieldErrors).toEqual([])
    expect(result.cardResults.map((score) => score.命中数)).toEqual([3, 2, 1, 0, 0, 0])
    expect(result.usableExpected).toEqual(['A', 'B'])
    expect(result.usableGot).toEqual(['A', 'B'])
  })

  it('zero keywords fail only the keyword check', () => {
    const result = validateRetrieval({ ...goodDraft(), keywords: [] })
    expect(result.passed).toBe(false)
    expect(result.failedChecks).toEqual(['关键词有效'])
    expect(result.fieldErrors[0].field).toBe('关键词')
    expect(result.fieldErrors[0].why).toContain('当前 0 个')
    expect(result.fieldErrors[0].fix).toContain('从任务句里挑')
  })

  it('one keyword fails the keyword check (needs 2–3)', () => {
    const result = validateRetrieval({ ...goodDraft(), keywords: ['苹果'] })
    expect(result.failedChecks).toEqual(['关键词有效'])
    expect(result.fieldErrors[0].why).toContain('当前 1 个')
  })

  it('four keywords fail the keyword check (over 3)', () => {
    const result = validateRetrieval({
      ...goodDraft(),
      keywords: ['苹果', '颜色', '规则', '金帅'],
    })
    expect(result.failedChecks).toEqual(['关键词有效'])
    expect(result.fieldErrors[0].why).toContain('当前 4 个')
  })

  it('off-topic keywords fail the keyword check and name the word', () => {
    const result = validateRetrieval({ ...goodDraft(), keywords: ['恐龙', '灭绝'] })
    expect(result.failedChecks).toEqual(['关键词有效'])
    expect(result.fieldErrors[0].why).toContain('「恐龙」不在任务句中')
  })

  it('in-sentence keywords that hit nothing fail the keyword check', () => {
    const result = validateRetrieval({ ...goodDraft(), keywords: ['请', '找出'] })
    expect(result.failedChecks).toEqual(['关键词有效'])
    expect(result.fieldErrors[0].why).toContain('没有命中任何资料卡')
  })

  it('an over-long keyword fails the keyword check and names its length', () => {
    const result = validateRetrieval({
      ...goodDraft(),
      keywords: ['苹果', '颜色规则把黄色判成香蕉'],
    })
    expect(result.failedChecks).toEqual(['关键词有效'])
    expect(result.fieldErrors[0].why).toContain('超过 10 字')
  })

  it('unanswered questions fail only the completeness check, never correctness', () => {
    const result = validateRetrieval({ ...goodDraft(), answers: {} })
    expect(result.failedChecks).toEqual(['四问答完'])
    expect(result.fieldErrors).toHaveLength(24)
    expect(result.fieldErrors.map((error) => error.field)).toContain('卡 A·来源')
    expect(result.fieldErrors.map((error) => error.field)).toContain('卡 F·相关')
    expect(result.fieldErrors[0].why).toContain('还没回答')
    expect(result.fieldErrors[0].fix).toContain('再回答')
  })

  it('one wrong answer fails only the correctness check and names the card', () => {
    const draft = goodDraft()
    draft.answers.C = { ...correctAnswers().C, time: true }
    const result = validateRetrieval(draft)
    expect(result.failedChecks).toEqual(['四问答对'])
    expect(result.fieldErrors.map((error) => error.field)).toEqual(['卡 C·时间'])
    expect(result.fieldErrors[0].why).toContain('卡 C《旧版分类手册》')
    expect(result.fieldErrors[0].why).toContain('时间新')
    expect(result.fieldErrors[0].fix).toContain('时间是“旧”')
  })

  it('an extra usable card fails only the usable-list check and cites the veto reason', () => {
    const result = validateRetrieval({ ...goodDraft(), usable: ['A', 'B', 'C'] })
    expect(result.failedChecks).toEqual(['可用清单正确'])
    expect(result.fieldErrors[0].why).toContain('清单里多了卡 C')
    expect(result.fieldErrors[0].why).toContain('资料过期')
    expect(result.fieldErrors[0].fix).toContain('把卡 C 从可用清单里去掉')
  })

  it('a missing usable card names the missing card', () => {
    const result = validateRetrieval({ ...goodDraft(), usable: ['A'] })
    expect(result.failedChecks).toEqual(['可用清单正确'])
    expect(result.fieldErrors[0].why).toContain('清单里少了卡 B')
  })

  it('an empty usable list says the list is empty', () => {
    const result = validateRetrieval({ ...goodDraft(), usable: [] })
    expect(result.failedChecks).toEqual(['可用清单正确'])
    expect(result.fieldErrors[0].why).toContain('清单是空的')
  })

  it('a rule text missing one word names that word', () => {
    const result = validateRetrieval({
      ...goodDraft(),
      ruleText: '从任务句里挑关键词；来源、时间、证据三问全过才可用。',
    })
    expect(result.failedChecks).toEqual(['规则说明完整'])
    expect(result.fieldErrors.map((error) => error.field)).toEqual(['规则说明'])
    expect(result.fieldErrors[0].why).toContain('没提到“相关”')
    expect(result.fieldErrors[0].fix).toContain('加上“相关”一问')
  })

  it('an empty rule text fails the rule check', () => {
    const result = validateRetrieval({ ...goodDraft(), ruleText: '' })
    expect(result.failedChecks).toEqual(['规则说明完整'])
    expect(result.fieldErrors[0].why).toContain('规则说明是空的')
  })

  it('one root cause counts as one failed check (unanswered is not miscounted as wrong)', () => {
    const result = validateRetrieval({ ...goodDraft(), answers: {}, usable: [] })
    expect(result.failedChecks).toEqual(['四问答完', '可用清单正确'])
    expect(result.failedChecks).not.toContain('四问答对')
  })
})

describe('A1-U3-L04 worked examples (§3.5)', () => {
  it('the good example passes', () => {
    const result = validateRetrieval(exampleDraft('good'))
    expect(result.passed).toBe(true)
    expect(result.failedChecks).toEqual([])
  })

  it('bad-source fails correctness (card D source) and the usable list (extra D)', () => {
    const result = validateRetrieval(exampleDraft('bad-source'))
    expect(result.passed).toBe(false)
    expect(result.failedChecks).toEqual(['四问答对', '可用清单正确'])
    expect(result.fieldErrors.map((error) => error.field)).toContain('卡 D·来源')
    expect(result.fieldErrors.map((error) => error.why).join('')).toContain('来源不可信')
  })

  it('outdated fails correctness (card C time) and the usable list (extra C)', () => {
    const result = validateRetrieval(exampleDraft('outdated'))
    expect(result.failedChecks).toEqual(['四问答对', '可用清单正确'])
    expect(result.fieldErrors.map((error) => error.field)).toContain('卡 C·时间')
    expect(result.fieldErrors.map((error) => error.why).join('')).toContain('资料过期')
  })

  it('irrelevant fails correctness (card F relevance) and the usable list (extra F)', () => {
    const result = validateRetrieval(exampleDraft('irrelevant'))
    expect(result.failedChecks).toEqual(['四问答对', '可用清单正确'])
    expect(result.fieldErrors.map((error) => error.field)).toContain('卡 F·相关')
    expect(result.fieldErrors.map((error) => error.why).join('')).toContain('与任务无关')
  })

  it('bad-keywords fails only the keyword check and retrieves no usable card', () => {
    const draft = exampleDraft('bad-keywords')
    const result = validateRetrieval(draft)
    expect(result.failedChecks).toEqual(['关键词有效'])
    expect(methodEvidenceForRetrieval(draft, result)).toContain('检索到 1 张（F），可用 0 张')
  })

  it('missing-rule fails only the rule check and names the missing word', () => {
    const result = validateRetrieval(exampleDraft('missing-rule'))
    expect(result.failedChecks).toEqual(['规则说明完整'])
    expect(result.fieldErrors[0].why).toContain('没提到“相关”')
  })
})

describe('A1-U3-L04 judgment and method evidence', () => {
  it('a pass reports three layers, the pass conclusion, and the method evidence', () => {
    const draft = goodDraft()
    const validation = validateRetrieval(draft)
    const judgment = buildA1U3L04Judgment(validation, draft)
    expect(judgment.passed).toBe(true)
    expect(judgment.conclusion).toBe('本次检索合格。')
    expect(judgment.conclusion).not.toContain('已掌握')
    expect(judgment.layers.map((layer) => layer.id)).toEqual(['stage', 'task', 'knowledge'])
    expect(judgment.layers[0].detail).toContain('五项全部通过')
    expect(judgment.layers[1].detail).toBe('任务判定：合格：五项全部通过。')
    expect(judgment.layers[2].detail).toContain('方法证据：')
    expect(judgment.methodEvidence).toBe(judgment.layers[2].detail)
    expect(passedCountOf(validation)).toBe(5)
  })

  it('the method evidence for the good draft is fully computed, never hand-written', () => {
    const draft = goodDraft()
    const validation = validateRetrieval(draft)
    expect(methodEvidenceForRetrieval(draft, validation)).toBe(
      '方法证据：提示词 3 个（苹果、颜色、规则），检索到 3 张（A、B、C），可用 2 张（A、B）；规则说明提到了来源、时间、证据、相关四问。',
    )
  })

  it('no keywords yields the empty-keywords evidence', () => {
    const draft = { ...goodDraft(), keywords: [] as string[] }
    const validation = validateRetrieval(draft)
    expect(methodEvidenceForRetrieval(draft, validation)).toBe(
      '方法证据：尚未写关键词（先从任务句里挑 2–3 个关键词）。',
    )
  })

  it('a rule text missing a word names it in the evidence', () => {
    const draft = exampleDraft('missing-rule')
    const validation = validateRetrieval(draft)
    expect(methodEvidenceForRetrieval(draft, validation)).toContain('规则说明缺“相关”一问。')
  })

  it('invalid keywords report the keyword problem in the stage layer, never as a pass', () => {
    const draft = exampleDraft('bad-keywords')
    const validation = validateRetrieval(draft)
    const judgment = buildA1U3L04Judgment(validation, draft)
    expect(judgment.passed).toBe(false)
    expect(judgment.conclusion).toBe('未合格。')
    expect(judgment.layers[0].detail).toContain('关键词无效')
    expect(judgment.layers[0].detail).toContain('尚未检索出可用资料')
    expect(judgment.layers[1].detail).toContain('未合格：还有 1 项未通过（关键词有效）')
    expect(passedCountOf(validation)).toBe(4)
  })

  it('the adapter checks the draft and resets its judgment on load', () => {
    const adapter = new A1U3L04Adapter({ ...emptyDraft(), ...goodDraft() })
    expect(adapter.validateDraft({ ...emptyDraft(), ...goodDraft() })).toBe(true)
    expect(adapter.validateDraft({ text: '' })).toBe(false)
    const judgment = adapter.checkRetrieval()
    expect(judgment.passed).toBe(true)
    expect(judgment.conclusion).toBe('本次检索合格。')
    expect(adapter.getJudgmentResult()).toEqual(judgment)
    expect(adapter.getRetrievalState()).toEqual({
      checked: true,
      passedCount: 5,
      totalChecks: 5,
      verdict: '本次检索合格。',
    })
    adapter.loadScript(exampleDraft('outdated'))
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.checkRetrieval().passed).toBe(false)
    const events: unknown[] = []
    adapter.run((event) => events.push(event.kind))
    expect(events).toEqual(['finished'])
  })
})
