import { describe, expect, it } from 'vitest'
import { validateLessonContract } from '../lessons/workspace/lesson-contract'
import {
  EXPLORE_ITEMS,
  FEASIBILITY_QUESTIONS,
  GRADES_QUESTION,
  HINTS,
  LESSON_STEPS,
  MAX_NOTE_LENGTH,
  MAX_STATEMENT_LENGTH,
  PROBLEM_EXAMPLES,
  TRANSFER_SCENARIOS,
  checkExplore,
  checkL01,
  checkProblemCard,
  checkTransfer,
  findPrivacyIssues,
  type L01Draft,
} from './a1-u4-l01'
import { L01Adapter, buildL01Judgment, passedCountOf } from './a1-u4-l01-adapter'
import {
  L01_CONTRACT,
  L01_DRAFT_KEY,
  L01_WORKSPACE_CONTRACT,
  L01_WORKSPACE_CONTRACT_FIELDS,
} from './a1-u4-l01-contract'

/** 全部正确的草稿：探索 6/6、问题卡齐全、迁移齐全且成绩题答对。 */
function allCorrectDraft(): L01Draft {
  return {
    version: 1 as const,
    explore: {
      E1: '有效' as const,
      E2: '有效' as const,
      E3: '有效' as const,
      V1: '模糊' as const,
      V2: '模糊' as const,
      V3: '模糊' as const,
    },
    chosenExample: 'E1' as const,
    statement: {
      target: '哪类菜品剩得多',
      data: '每日各窗口剩菜总重量',
      success: '剩菜最多的两类菜品报对',
    },
    feasibility: {
      Q1: '通过' as const,
      Q2: '通过' as const,
      Q3: '通过' as const,
      Q4: '通过' as const,
    },
    feasibilityNotes: { Q1: '数据是聚合计数，拿得到' },
    transferScenario: 'T1' as const,
    transferStatement: {
      target: '哪种器材最常被借空',
      data: '各器材每日借出次数',
      success: '最常被借空的两种器材报对',
    },
    gradesAnswer: 'A' as const,
    hintLevel: 0 as const,
  }
}

describe('A1-U4-L01 lesson data (three discussion examples, all aggregate counts)', () => {
  it('the problem examples are 3 aggregate-count discussions, no real data', () => {
    expect(PROBLEM_EXAMPLES.map((example) => example.id)).toEqual(['E1', 'E2', 'E3'])
    expect(PROBLEM_EXAMPLES[0].title).toBe('食堂剩菜称重统计')
    expect(PROBLEM_EXAMPLES[1].title).toBe('图书馆热门书架补书提醒')
    expect(PROBLEM_EXAMPLES[2].title).toBe('校园垃圾分类投放点满溢提醒')
    for (const example of PROBLEM_EXAMPLES) {
      expect(example.data).toContain('聚合计数')
    }
  })

  it('the explore list is 6 items: 3 valid, 3 vague, including the banned grades topic', () => {
    expect(EXPLORE_ITEMS).toHaveLength(6)
    expect(EXPLORE_ITEMS.filter((item) => item.kind === '有效')).toHaveLength(3)
    expect(EXPLORE_ITEMS.filter((item) => item.kind === '模糊')).toHaveLength(3)
    expect(EXPLORE_ITEMS.map((item) => item.id)).toEqual(['E1', 'E2', 'E3', 'V1', 'V2', 'V3'])
    const banned = EXPLORE_ITEMS.find((item) => item.id === 'V2')
    expect(banned?.text).toContain('全班真实成绩')
    expect(banned?.reason).toContain('禁题')
    expect(banned?.reason).toContain('许可过不了')
  })

  it('the feasibility check has 4 questions (data, labels, local plane, permission)', () => {
    expect(FEASIBILITY_QUESTIONS.map((question) => question.id)).toEqual([
      'Q1',
      'Q2',
      'Q3',
      'Q4',
    ])
    expect(FEASIBILITY_QUESTIONS[0].text).toContain('数据能不能拿到')
    expect(FEASIBILITY_QUESTIONS[3].text).toContain('许可过不过')
  })

  it('the transfer scenarios are 2 aggregate-count campus scenes', () => {
    expect(TRANSFER_SCENARIOS.map((scenario) => scenario.id)).toEqual(['T1', 'T2'])
    expect(TRANSFER_SCENARIOS[0].title).toBe('操场器材借用提醒')
    expect(TRANSFER_SCENARIOS[1].title).toBe('校园失物招领分类')
    for (const scenario of TRANSFER_SCENARIOS) {
      expect(scenario.data).toContain('聚合计数')
    }
  })

  it('the grades question is A: personal records, permission fails, consequences sensitive', () => {
    expect(GRADES_QUESTION.answer).toBe('A')
    expect(GRADES_QUESTION.options.find((option) => option.id === 'A')?.text).toContain(
      '个人记录',
    )
    expect(GRADES_QUESTION.options.find((option) => option.id === 'B')?.text).toContain(
      '太难拿到',
    )
    expect(GRADES_QUESTION.options.find((option) => option.id === 'C')?.text).toContain(
      '算不出成绩',
    )
    expect(GRADES_QUESTION.correctFeedback).toContain('许可过不了')
  })

  it('statement sentences are 1-200 chars and feasibility notes are at most 100 chars', () => {
    expect(MAX_STATEMENT_LENGTH).toBe(200)
    expect(MAX_NOTE_LENGTH).toBe(100)
  })

  it('checkExplore passes all six when every classification is correct', () => {
    const result = checkExplore(allCorrectDraft())
    expect(result.passed).toBe(true)
    expect(result.passedCount).toBe(6)
    expect(result.totalChecks).toBe(6)
    expect(result.checks.every((check) => check.passed)).toBe(true)
  })

  it('checkExplore fails the misclassified and the unclassified items only', () => {
    const draft = allCorrectDraft()
    draft.explore.V2 = '有效'
    delete draft.explore.V3
    const result = checkExplore(draft)
    expect(result.passed).toBe(false)
    expect(result.passedCount).toBe(4)
    expect(result.checks.filter((check) => !check.passed).map((check) => check.id)).toEqual([
      'V2',
      'V3',
    ])
    expect(result.checks.find((check) => check.id === 'V2')?.detail).toContain('分类错了')
    expect(result.checks.find((check) => check.id === 'V3')?.detail).toContain('尚未分类')
  })

  it('checkExplore fails everything on an empty draft', () => {
    const result = checkExplore({
      version: 1,
      explore: {},
      chosenExample: null,
      statement: { target: '', data: '', success: '' },
      feasibility: {},
      feasibilityNotes: {},
      transferScenario: null,
      transferStatement: { target: '', data: '', success: '' },
      gradesAnswer: null,
      hintLevel: 0,
    })
    expect(result.passed).toBe(false)
    expect(result.passedCount).toBe(0)
    expect(result.checks.every((check) => check.detail.includes('尚未分类'))).toBe(true)
  })

  it('checkProblemCard passes when the example, three sentences and four answers are all present', () => {
    const result = checkProblemCard(allCorrectDraft())
    expect(result.passed).toBe(true)
    expect(result.chosenExample).toBe('E1')
    expect(result.statementComplete).toBe(true)
    expect(result.feasibilityAnsweredCount).toBe(4)
    expect(result.detail).toContain('问题卡完成')
  })

  it('checkProblemCard fails on a missing sentence, a missing answer, or no example', () => {
    const noSentence = allCorrectDraft()
    noSentence.statement.success = ''
    expect(checkProblemCard(noSentence).passed).toBe(false)
    expect(checkProblemCard(noSentence).detail).toContain('问题陈述三句未齐')

    const noAnswer = allCorrectDraft()
    delete noAnswer.feasibility.Q4
    const checked = checkProblemCard(noAnswer)
    expect(checked.passed).toBe(false)
    expect(checked.feasibilityAnsweredCount).toBe(3)
    expect(checked.detail).toContain('只答了 3/4 问')

    const noExample = allCorrectDraft()
    noExample.chosenExample = null
    expect(checkProblemCard(noExample).passed).toBe(false)
    expect(checkProblemCard(noExample).detail).toContain('未选讨论例')
  })

  it('checkProblemCard accepts "不可行" as an answered feasibility question', () => {
    const draft = allCorrectDraft()
    draft.feasibility.Q3 = '不可行'
    draft.feasibilityNotes.Q3 = '本地平面做不了，须换题'
    const result = checkProblemCard(draft)
    expect(result.passed).toBe(true)
    expect(result.feasibilityAnsweredCount).toBe(4)
  })

  it('free text with real grades or student records is rejected, with a child-readable reason and without echoing the original text', () => {
    // 普通校园问题描述通过（聚合计数，不碰个人记录）。
    expect(findPrivacyIssues(allCorrectDraft().statement)).toEqual([])
    expect(checkProblemCard(allCorrectDraft()).passed).toBe(true)

    // 明确包含真实个人成绩的文本被拒绝。
    const grades = allCorrectDraft()
    grades.statement.target = '用全班真实成绩预测谁会考砸'
    const gradesChecked = checkProblemCard(grades)
    expect(gradesChecked.passed).toBe(false)
    expect(gradesChecked.statementComplete).toBe(false)
    expect(gradesChecked.detail).toContain('个人记录')
    expect(gradesChecked.detail).toContain('请换成聚合计数')
    expect(gradesChecked.detail).not.toContain('用全班真实成绩预测谁会考砸')

    // 含具体分数的文本被拒绝。
    const score = allCorrectDraft()
    score.statement.data = '小明数学考了 98 分'
    expect(checkProblemCard(score).passed).toBe(false)
    expect(checkProblemCard(score).detail).not.toContain('小明数学考了 98 分')

    // 三个自由文本字段都受校验：逐个字段放隐私文本，逐个被拒绝。
    const sensitive = [
      '用全班真实成绩做预测',
      '数据是每位同学的学号',
      '把小明的姓名列出来',
    ] as const
    const fields = ['target', 'data', 'success'] as const
    for (let i = 0; i < fields.length; i++) {
      const draft = allCorrectDraft()
      draft.statement[fields[i]] = sensitive[i]
      const checked = checkProblemCard(draft)
      expect(checked.passed).toBe(false)
      expect(checked.privacyIssues.map((issue) => issue.field)).toContain(fields[i])
      expect(checked.detail).not.toContain(sensitive[i])
    }

    // 迁移的三句话同样受校验，且被拒绝的原文不进方法证据。
    const transfer = allCorrectDraft()
    transfer.transferStatement.data = '每位学生的成绩单'
    const transferChecked = checkTransfer(transfer)
    expect(transferChecked.passed).toBe(false)
    expect(transferChecked.detail).toContain('个人记录')
    expect(transferChecked.detail).not.toContain('每位学生的成绩单')
    const judgment = buildL01Judgment(checkL01(transfer), transfer)
    expect(judgment.methodEvidence ?? '').not.toContain('每位学生的成绩单')
  })

  it('checkTransfer passes on a scenario, three sentences and the correct grades answer', () => {
    const result = checkTransfer(allCorrectDraft())
    expect(result.passed).toBe(true)
    expect(result.scenario).toBe('T1')
    expect(result.statementComplete).toBe(true)
    expect(result.gradesCorrect).toBe(true)
    expect(result.detail).toContain('迁移完成')
  })

  it('checkTransfer fails on a wrong grades answer, a missing scenario, or a missing sentence', () => {
    const wrongGrades = allCorrectDraft()
    wrongGrades.gradesAnswer = 'B'
    expect(checkTransfer(wrongGrades).passed).toBe(false)
    expect(checkTransfer(wrongGrades).detail).toContain('成绩题未答对')

    const noScenario = allCorrectDraft()
    noScenario.transferScenario = null
    expect(checkTransfer(noScenario).passed).toBe(false)
    expect(checkTransfer(noScenario).detail).toContain('未选迁移场景')

    const noSentence = allCorrectDraft()
    noSentence.transferStatement.data = ''
    expect(checkTransfer(noSentence).passed).toBe(false)
    expect(checkTransfer(noSentence).detail).toContain('迁移三句未齐')
  })

  it('checkL01 passes only when explore, problem card and transfer all pass', () => {
    expect(checkL01(allCorrectDraft()).passed).toBe(true)
    const onePartFails = allCorrectDraft()
    onePartFails.explore.E1 = '模糊'
    const result = checkL01(onePartFails)
    expect(result.passed).toBe(false)
    expect(result.explore.passed).toBe(false)
    expect(result.problemCard.passed).toBe(true)
    expect(result.transfer.passed).toBe(true)
  })

  it('hints have three levels and the lesson has three steps', () => {
    expect(HINTS.map((h) => h.level)).toEqual([1, 2, 3])
    expect(LESSON_STEPS).toHaveLength(3)
  })
})

describe('A1-U4-L01 workspace integration (contract fields + L01Adapter)', () => {
  it('the lesson contract names the lesson honestly and uses the spec draft key', () => {
    expect(L01_CONTRACT.lessonId).toBe('A1-U4-L01')
    expect(L01_CONTRACT.title).toBe('提出校园真实问题')
    expect(L01_CONTRACT.goal5).toHaveLength(5)
    expect(L01_CONTRACT.goal5[3]).toContain('A1-U3-L06')
    expect(L01_CONTRACT.goal5[3]).toContain('个人记录类题目一律拒答')
    expect(L01_CONTRACT.scopeLabel).toBe('教学定向')
    expect(L01_CONTRACT.scopeGap).toContain('不等于能直接做真实校园项目')
    expect(L01_CONTRACT.scopeGap).toContain('不收集、不上传任何真实校园数据')
    expect(L01_DRAFT_KEY).toBe('kidscoding-draft:A1-U4-L01')
    expect(L01_CONTRACT.draftKey).toBe(L01_DRAFT_KEY)
  })

  it('workspace fields translate the contract without an engine value', () => {
    expect(L01_WORKSPACE_CONTRACT_FIELDS.lessonId).toBe('A1-U4-L01')
    expect(L01_WORKSPACE_CONTRACT_FIELDS.goal5).toHaveLength(5)
    expect(L01_WORKSPACE_CONTRACT_FIELDS.hints).toHaveLength(3)
    expect(L01_WORKSPACE_CONTRACT_FIELDS.structuredHints).toHaveLength(3)
    expect(L01_WORKSPACE_CONTRACT_FIELDS.methodSteps).toHaveLength(3)
    expect(L01_WORKSPACE_CONTRACT_FIELDS.activities).toHaveLength(3)
    expect(L01_WORKSPACE_CONTRACT_FIELDS.hasStage).toBe(false)
    expect(L01_WORKSPACE_CONTRACT_FIELDS.fileCapabilities).toEqual({
      canNew: true,
      canSave: true,
      canExport: true,
      canImport: true,
      canReset: true,
    })
    expect(L01_WORKSPACE_CONTRACT_FIELDS.judging.knowledgeRule).toContain('不记学生原文')
    expect('engine' in L01_WORKSPACE_CONTRACT_FIELDS).toBe(false)
  })

  it('the full workspace contract uses the generic slot engine and validates', () => {
    expect(L01_WORKSPACE_CONTRACT.engine).toBe('slot')
    expect(validateLessonContract(L01_WORKSPACE_CONTRACT)).toEqual([])
    expect(L01_WORKSPACE_CONTRACT.judging.target).toBeUndefined()
    expect(L01_WORKSPACE_CONTRACT.demo).toBeUndefined()
  })

  it('a fully correct lesson builds a three-layer pass judgment', () => {
    const draft = allCorrectDraft()
    const judgment = buildL01Judgment(checkL01(draft), draft)
    expect(judgment.passed).toBe(true)
    expect(judgment.layers.map((l) => l.id)).toEqual(['stage', 'task', 'knowledge'])
    expect(judgment.conclusion).toBe('结论：本次课堂练习合格。')
    expect(judgment.layers[0].detail).toContain('六条问题描述分类全部正确')
    expect(judgment.layers[1].detail).toContain('任务判定：合格：问题卡与迁移均已完成。')
    expect(judgment.methodEvidence).toContain('已分类 6/6')
    expect(judgment.methodEvidence).toContain('问题卡三句齐全')
    expect(judgment.methodEvidence).toContain('可行性检查 4/4')
    expect(judgment.methodEvidence).toContain('迁移场景 1 个')
    expect(judgment.methodEvidence).toContain('已识别个人记录类禁题 1 个（成绩预测）')
    expect(judgment.conclusion).not.toContain('已掌握')
  })

  it('one wrong classification builds a fail judgment naming that item', () => {
    const draft = allCorrectDraft()
    draft.explore.V2 = '有效'
    const judgment = buildL01Judgment(checkL01(draft), draft)
    expect(judgment.passed).toBe(false)
    expect(judgment.conclusion).toBe('结论：未合格。')
    expect(judgment.layers[0].detail).toContain('探索分类通过 5 项')
    expect(judgment.layers[0].detail).toContain('V2')
    expect(judgment.layers[1].detail).toContain('未合格')
  })

  it('only the explore step fails, the task judgment names the explore failure instead of an empty reason', () => {
    const draft = allCorrectDraft()
    draft.explore.V2 = '有效'
    const judgment = buildL01Judgment(checkL01(draft), draft)
    expect(judgment.passed).toBe(false)
    expect(judgment.layers[1].detail).toBe('任务判定：未合格：探索分类未通过。')
    expect(judgment.layers[1].detail).not.toContain('未合格：。')
  })

  it('an empty lesson builds a fail judgment listing zero classified items', () => {
    const draft: L01Draft = {
      version: 1,
      explore: {},
      chosenExample: null,
      statement: { target: '', data: '', success: '' },
      feasibility: {},
      feasibilityNotes: {},
      transferScenario: null,
      transferStatement: { target: '', data: '', success: '' },
      gradesAnswer: null,
      hintLevel: 0,
    }
    const judgment = buildL01Judgment(checkL01(draft), draft)
    expect(judgment.passed).toBe(false)
    expect(judgment.layers[0].detail).toContain('尚未分类六条问题描述')
    expect(judgment.layers[1].detail).toContain('问题卡未完成')
    expect(judgment.layers[1].detail).toContain('迁移未完成')
    expect(judgment.methodEvidence).toContain('已分类 0/6')
    expect(judgment.methodEvidence).toContain('个人记录类禁题尚未识别')
  })

  it('the method evidence counts but never quotes student text', () => {
    const draft = allCorrectDraft()
    draft.statement.target = '独特目标句一二三'
    draft.feasibilityNotes.Q1 = '独特备注句四五六'
    draft.transferStatement.target = '独特迁移句七八九'
    const judgment = buildL01Judgment(checkL01(draft), draft)
    const evidence = judgment.methodEvidence ?? ''
    expect(evidence).not.toContain('独特目标句一二三')
    expect(evidence).not.toContain('独特备注句四五六')
    expect(evidence).not.toContain('独特迁移句七八九')
    expect(evidence).toContain('已分类 6/6')
  })

  it('L01Adapter: checkL01 stores the judgment and loadScript clears it', () => {
    const adapter = new L01Adapter(allCorrectDraft())
    expect(adapter.getJudgmentResult()).toBeNull()
    const judgment = adapter.checkL01()
    expect(judgment.passed).toBe(true)
    expect(adapter.getJudgmentResult()).toBe(judgment)
    expect(adapter.getL01State()).toEqual({
      checked: true,
      passedCount: 8,
      totalChecks: 8,
      verdict: '结论：本次课堂练习合格。',
    })
    adapter.loadScript({
      version: 1,
      explore: {},
      chosenExample: null,
      statement: { target: '', data: '', success: '' },
      feasibility: {},
      feasibilityNotes: {},
      transferScenario: null,
      transferStatement: { target: '', data: '', success: '' },
      gradesAnswer: null,
      hintLevel: 0,
    })
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.getL01State().checked).toBe(false)
    expect(adapter.getL01State().passedCount).toBe(0)
    expect(adapter.checkL01().passed).toBe(false)
    expect(adapter.getL01State().passedCount).toBeLessThan(8)
  })

  it('L01Adapter: run fires finished immediately, stop is a no-op, validateDraft is strict shape', () => {
    const adapter = new L01Adapter()
    const events: string[] = []
    adapter.run((event) => events.push(event.kind))
    expect(events).toEqual(['finished'])
    expect(() => adapter.stop()).not.toThrow()
    expect(adapter.getState()).toEqual({ x: 0, score: 0, running: false, frames: 0 })
    expect(
      adapter.validateDraft({
        version: 1,
        explore: {},
        chosenExample: null,
        statement: { target: '', data: '', success: '' },
        feasibility: {},
        feasibilityNotes: {},
        transferScenario: null,
        transferStatement: { target: '', data: '', success: '' },
        gradesAnswer: null,
        hintLevel: 0,
      }),
    ).toBe(true)
    expect(adapter.validateDraft({ version: 1, explore: {} })).toBe(false)
    expect(adapter.validateDraft(null)).toBe(false)
  })
})

describe('A1-U4-L01 fail-closed wording', () => {
  it('passedCountOf is 8 on a pass, 7 on one failed classification, 0 on an empty lesson', () => {
    expect(passedCountOf(checkL01(allCorrectDraft()))).toBe(8)
    const oneWrong = allCorrectDraft()
    oneWrong.explore.V2 = '有效'
    expect(passedCountOf(checkL01(oneWrong))).toBe(7)
    expect(
      passedCountOf(
        checkL01({
          version: 1,
          explore: {},
          chosenExample: null,
          statement: { target: '', data: '', success: '' },
          feasibility: {},
          feasibilityNotes: {},
          transferScenario: null,
          transferStatement: { target: '', data: '', success: '' },
          gradesAnswer: null,
          hintLevel: 0,
        }),
      ),
    ).toBe(0)
  })

  it('a judgment never claims mastery and never passes on a wrong grades answer', () => {
    const draft = allCorrectDraft()
    const judgment = buildL01Judgment(checkL01(draft), draft)
    expect(judgment.conclusion).not.toContain('已掌握')
    expect(judgment.layers.every((layer) => !layer.detail.includes('已掌握'))).toBe(true)
    const failed = allCorrectDraft()
    failed.gradesAnswer = 'C'
    const failedJudgment = buildL01Judgment(checkL01(failed), failed)
    expect(failedJudgment.conclusion).toBe('结论：未合格。')
    expect(failedJudgment.layers[1].detail).toContain('迁移未完成')
  })
})
