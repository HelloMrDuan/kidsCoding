import { describe, expect, it } from 'vitest'
import { validateLessonContract } from '../lessons/workspace/lesson-contract'
import {
  ERROR_EXAMPLES,
  HINTS,
  LESSON_STEPS,
  QA_PAIRS,
  answerQuestion,
  checkCustomQuestion,
  checkErrorExample,
  checkQaDrill,
  runQaDrill,
  type L06Draft,
} from './a1-u3-l06'
import { QaAdapter, buildQaJudgment, passedCountOf } from './a1-u3-l06-adapter'
import {
  L06_CONTRACT,
  L06_DRAFT_KEY,
  L06_WORKSPACE_CONTRACT,
  L06_WORKSPACE_CONTRACT_FIELDS,
} from './a1-u3-l06-contract'
import { ANSWERS_TO_CHECK } from './u3-local-engines'

/** 八问全部预测正确且全部问过的草稿（事实类/方法类猜能答，超范围类猜拒答）。 */
function allCorrectDraft(): L06Draft {
  return {
    version: 1 as const,
    predictions: {
      Q1: '能答' as const,
      Q2: '能答' as const,
      Q3: '能答' as const,
      Q4: '能答' as const,
      Q5: '能答' as const,
      Q6: '能答' as const,
      Q7: '拒答' as const,
      Q8: '拒答' as const,
    },
    asked: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'],
    custom: [],
    errorChecks: {},
    hintLevel: 0 as const,
  }
}

describe('A1-U3-L06 lesson layer (reuses the U3 pilot Q&A library)', () => {
  it('the pilot bank has 8 pairs: 4 fact, 2 method, 2 out-of-scope', () => {
    expect(QA_PAIRS).toHaveLength(8)
    expect(QA_PAIRS.filter((p) => p.category === '事实类')).toHaveLength(4)
    expect(QA_PAIRS.filter((p) => p.category === '方法类')).toHaveLength(2)
    expect(QA_PAIRS.filter((p) => p.category === '超范围类')).toHaveLength(2)
    expect(QA_PAIRS.map((p) => p.id)).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'])
  })

  it('a fact question is answered with the bank answer', () => {
    const result = answerQuestion('金帅苹果为什么被颜色规则判成香蕉？')
    expect(result.answered).toBe(true)
    expect(result.pair?.id).toBe('Q1')
    expect(result.category).toBe('事实类')
    expect(result.text).toContain('黄色的')
  })

  it('an out-of-scope question is refused with the fixed refusal', () => {
    const result = answerQuestion('随便聊点什么吧。')
    expect(result.answered).toBe(false)
    expect(result.pair?.id).toBe('Q7')
    expect(result.category).toBe('超范围类')
    expect(result.text).toBe('这个问题超出课节限定任务，我不能回答；请回到课节内的任务来。')
  })

  it('an unknown question is refused with the no-match text', () => {
    const result = answerQuestion('今天天气怎么样？')
    expect(result.answered).toBe(false)
    expect(result.pair).toBeNull()
    expect(result.text).toContain('没有匹配条目')
  })

  it('the best keyword hit wins when several pairs match', () => {
    const result = answerQuestion('金帅苹果是什么颜色？')
    expect(result.pair?.id).toBe('Q1')
    expect(result.answered).toBe(true)
  })

  it('the drill answers 6 and refuses 2, refusals counted separately', () => {
    const { log } = runQaDrill()
    expect(log).toEqual({
      byCategory: { 事实类: 4, 方法类: 2, 超范围类: 2 },
      answered: 6,
      refused: 2,
    })
  })

  it('the drill log contains no question or answer text at all', () => {
    const { log } = runQaDrill()
    const serialized = JSON.stringify(log)
    for (const pair of QA_PAIRS) {
      expect(serialized).not.toContain(pair.question)
      if (pair.answer) expect(serialized).not.toContain(pair.answer)
    }
  })

  it('checkQaDrill passes all eight when every prediction is correct and asked', () => {
    const result = checkQaDrill(allCorrectDraft())
    expect(result.passed).toBe(true)
    expect(result.passedCount).toBe(8)
    expect(result.totalChecks).toBe(8)
    expect(result.checks.every((check) => check.passed)).toBe(true)
  })

  it('checkQaDrill fails the unasked and the mispredicted questions only', () => {
    const draft = allCorrectDraft()
    draft.predictions.Q7 = '能答'
    draft.asked = draft.asked.filter((id) => id !== 'Q8')
    const result = checkQaDrill(draft)
    expect(result.passed).toBe(false)
    expect(result.passedCount).toBe(6)
    expect(result.checks.filter((check) => !check.passed).map((check) => check.id)).toEqual([
      'Q7',
      'Q8',
    ])
    expect(result.checks.find((check) => check.id === 'Q7')?.detail).toContain('预测错了')
    expect(result.checks.find((check) => check.id === 'Q8')?.detail).toContain('尚未提问')
  })

  it('checkQaDrill fails everything on an empty draft', () => {
    const result = checkQaDrill({
      version: 1,
      predictions: {},
      asked: [],
      custom: [],
      errorChecks: {},
      hintLevel: 0,
    })
    expect(result.passed).toBe(false)
    expect(result.passedCount).toBe(0)
    expect(result.checks.every((check) => check.detail.includes('尚未提问'))).toBe(true)
  })

  it('a prediction without asking never passes that question', () => {
    const draft = allCorrectDraft()
    draft.asked = []
    const result = checkQaDrill(draft)
    expect(result.passedCount).toBe(0)
    expect(result.checks.find((check) => check.id === 'Q1')?.detail).toContain('尚未提问')
  })

  it('a custom in-scope question is checked against its prediction', () => {
    expect(
      checkCustomQuestion({ text: '金帅苹果有多重？', predicted: '能答' }),
    ).toEqual({ answered: true, correct: true })
    expect(
      checkCustomQuestion({ text: '金帅苹果有多重？', predicted: '拒答' }),
    ).toEqual({ answered: true, correct: false })
  })

  it('a custom out-of-scope question is refused and the prediction decides correctness', () => {
    expect(checkCustomQuestion({ text: '恐龙吃什么？', predicted: '拒答' })).toEqual({
      answered: false,
      correct: true,
    })
    expect(checkCustomQuestion({ text: '今天天气怎么样？', predicted: '能答' })).toEqual({
      answered: false,
      correct: false,
    })
  })

  it('the two error examples are an invented digit and an invented source', () => {
    expect(ERROR_EXAMPLES.map((example) => example.id)).toEqual(['ans2', 'ans3'])
    const second = checkErrorExample(ANSWERS_TO_CHECK.find((a) => a.id === 'ans2')!)
    expect(second).toMatchObject({ passed: false, kind: '编造数字' })
    expect(second.fix).toContain('168')
    const third = checkErrorExample(ANSWERS_TO_CHECK.find((a) => a.id === 'ans3')!)
    expect(third).toMatchObject({ passed: false, kind: '编造来源' })
    expect(third.fix).toContain('未核实')
  })

  it('hints have three levels and the lesson has three steps', () => {
    expect(HINTS.map((h) => h.level)).toEqual([1, 2, 3])
    expect(LESSON_STEPS).toHaveLength(3)
  })
})

describe('A1-U3-L06 workspace integration (contract fields + QaAdapter)', () => {
  it('the lesson contract names the lesson honestly and uses the spec draft key', () => {
    expect(L06_CONTRACT.lessonId).toBe('A1-U3-L06')
    expect(L06_CONTRACT.title).toBe('制作学习问答助手')
    expect(L06_CONTRACT.goal5).toHaveLength(5)
    expect(L06_CONTRACT.goal5.join('')).not.toContain('API')
    expect(L06_CONTRACT.scopeLabel).toBe('教学定向')
    expect(L06_CONTRACT.scopeGap).toContain('不等于完全掌握')
    expect(L06_CONTRACT.scopeGap).toContain('练习记录')
    expect(L06_DRAFT_KEY).toBe('kidscoding-draft:A1-U3-L06')
    expect(L06_CONTRACT.draftKey).toBe(L06_DRAFT_KEY)
  })

  it('workspace fields translate the contract without an engine value', () => {
    expect(L06_WORKSPACE_CONTRACT_FIELDS.lessonId).toBe('A1-U3-L06')
    expect(L06_WORKSPACE_CONTRACT_FIELDS.goal5).toHaveLength(5)
    expect(L06_WORKSPACE_CONTRACT_FIELDS.hints).toHaveLength(3)
    expect(L06_WORKSPACE_CONTRACT_FIELDS.structuredHints).toHaveLength(3)
    expect(L06_WORKSPACE_CONTRACT_FIELDS.methodSteps).toHaveLength(3)
    expect(L06_WORKSPACE_CONTRACT_FIELDS.activities).toHaveLength(3)
    expect(L06_WORKSPACE_CONTRACT_FIELDS.hasStage).toBe(false)
    expect(L06_WORKSPACE_CONTRACT_FIELDS.fileCapabilities).toEqual({
      canNew: true,
      canSave: true,
      canExport: true,
      canImport: true,
      canReset: true,
    })
    expect(L06_WORKSPACE_CONTRACT_FIELDS.judging.knowledgeRule).toContain('不记问题原文')
    expect('engine' in L06_WORKSPACE_CONTRACT_FIELDS).toBe(false)
  })

  it('the full workspace contract uses the generic slot engine and validates', () => {
    expect(L06_WORKSPACE_CONTRACT.engine).toBe('slot')
    expect(validateLessonContract(L06_WORKSPACE_CONTRACT)).toEqual([])
    expect(L06_WORKSPACE_CONTRACT.judging.target).toBeUndefined()
    expect(L06_WORKSPACE_CONTRACT.demo).toBeUndefined()
  })

  it('a fully correct drill builds a three-layer pass judgment', () => {
    const draft = allCorrectDraft()
    const judgment = buildQaJudgment(checkQaDrill(draft), draft)
    expect(judgment.passed).toBe(true)
    expect(judgment.layers.map((l) => l.id)).toEqual(['stage', 'task', 'knowledge'])
    expect(judgment.conclusion).toBe('结论：本次问答合格。')
    expect(judgment.layers[0].detail).toContain('八问全部通过')
    expect(judgment.layers[1].detail).toContain('任务判定：合格：八问全部通过。')
    expect(judgment.methodEvidence).toContain('已问 8/8')
    expect(judgment.methodEvidence).toContain('预测正确 8/8')
    expect(judgment.conclusion).not.toContain('已掌握')
  })

  it('one wrong prediction builds a fail judgment naming that question', () => {
    const draft = allCorrectDraft()
    draft.predictions.Q7 = '能答'
    const judgment = buildQaJudgment(checkQaDrill(draft), draft)
    expect(judgment.passed).toBe(false)
    expect(judgment.conclusion).toBe('结论：未合格。')
    expect(judgment.layers[0].detail).toContain('八问中通过 7 项')
    expect(judgment.layers[0].detail).toContain('Q7')
    expect(judgment.layers[1].detail).toContain('未合格')
    expect(judgment.layers[1].detail).toContain('Q7')
  })

  it('an empty drill builds a fail judgment listing all eight questions', () => {
    const draft: L06Draft = {
      version: 1,
      predictions: {},
      asked: [],
      custom: [],
      errorChecks: {},
      hintLevel: 0,
    }
    const judgment = buildQaJudgment(checkQaDrill(draft), draft)
    expect(judgment.passed).toBe(false)
    expect(judgment.layers[0].detail).toContain('八问中通过 0 项')
    expect(judgment.methodEvidence).toContain('已问 0/8')
  })

  it('the method evidence counts but never quotes question or answer text', () => {
    const draft = allCorrectDraft()
    draft.custom = [{ text: '金帅苹果有多重？', predicted: '能答' }]
    const judgment = buildQaJudgment(checkQaDrill(draft), draft)
    const evidence = judgment.methodEvidence ?? ''
    for (const pair of QA_PAIRS) {
      expect(evidence).not.toContain(pair.question)
      if (pair.answer) expect(evidence).not.toContain(pair.answer)
    }
    expect(evidence).not.toContain('金帅苹果有多重？')
    expect(evidence).toContain('迁移提问 1 个')
  })

  it('QaAdapter: checkQa stores the judgment and loadScript clears it', () => {
    const adapter = new QaAdapter(allCorrectDraft())
    expect(adapter.getJudgmentResult()).toBeNull()
    const judgment = adapter.checkQa()
    expect(judgment.passed).toBe(true)
    expect(adapter.getJudgmentResult()).toBe(judgment)
    expect(adapter.getQaState()).toEqual({
      checked: true,
      passedCount: 8,
      totalChecks: 8,
      verdict: '结论：本次问答合格。',
    })
    adapter.loadScript({ version: 1, predictions: {}, asked: [], custom: [], errorChecks: {}, hintLevel: 0 })
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.getQaState().checked).toBe(false)
    expect(adapter.getQaState().passedCount).toBe(0)
    expect(adapter.checkQa().passed).toBe(false)
    expect(adapter.getQaState().passedCount).toBeLessThan(8)
  })

  it('QaAdapter: run fires finished immediately, stop is a no-op, validateDraft is strict shape', () => {
    const adapter = new QaAdapter()
    const events: string[] = []
    adapter.run((event) => events.push(event.kind))
    expect(events).toEqual(['finished'])
    expect(() => adapter.stop()).not.toThrow()
    expect(adapter.getState()).toEqual({ x: 0, score: 0, running: false, frames: 0 })
    expect(
      adapter.validateDraft({
        version: 1,
        predictions: {},
        asked: [],
        custom: [],
        errorChecks: {},
        hintLevel: 0,
      }),
    ).toBe(true)
    expect(adapter.validateDraft({ version: 1, predictions: {}, asked: [] })).toBe(false)
    expect(adapter.validateDraft(null)).toBe(false)
  })
})

describe('A1-U3-L06 fail-closed wording', () => {
  it('passedCountOf is 8 on a pass, 7 on one failed question, 0 on an empty drill', () => {
    expect(passedCountOf(checkQaDrill(allCorrectDraft()))).toBe(8)
    const oneWrong = allCorrectDraft()
    oneWrong.predictions.Q7 = '能答'
    expect(passedCountOf(checkQaDrill(oneWrong))).toBe(7)
    expect(
      passedCountOf(
        checkQaDrill({
          version: 1,
          predictions: {},
          asked: [],
          custom: [],
          errorChecks: {},
          hintLevel: 0,
        }),
      ),
    ).toBe(0)
  })

  it('a judgment never claims mastery and never quotes the refusal as a pass', () => {
    const draft = allCorrectDraft()
    const judgment = buildQaJudgment(checkQaDrill(draft), draft)
    expect(judgment.conclusion).not.toContain('已掌握')
    expect(judgment.layers.every((layer) => !layer.detail.includes('已掌握'))).toBe(true)
    const failed = allCorrectDraft()
    failed.predictions.Q1 = '拒答'
    const failedJudgment = buildQaJudgment(checkQaDrill(failed), failed)
    expect(failedJudgment.conclusion).toBe('结论：未合格。')
    expect(failedJudgment.layers[1].detail).toContain('Q1')
  })
})
