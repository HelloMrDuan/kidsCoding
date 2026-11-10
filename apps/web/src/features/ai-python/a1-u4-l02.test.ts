import { describe, expect, it } from 'vitest'
import { validateLessonContract } from '../lessons/workspace/lesson-contract'
import {
  CHECKLIST_ROWS,
  EXPLORE_ITEMS,
  HINTS,
  LESSON_STEPS,
  MAX_TEXT_LENGTH,
  NON_COVERAGE_IDS,
  NON_COVERAGE_ITEMS,
  PERMISSION_RULES,
  SCOPE_QUESTION,
  VETO_ITEMS,
  checkChecklist,
  checkExplore,
  checkL02,
  checkTransfer,
  type L02Draft,
} from './a1-u4-l02'
import { L02Adapter, buildL02Judgment, passedCountOf } from './a1-u4-l02-adapter'
import {
  L02_CONTRACT,
  L02_DRAFT_KEY,
  L02_WORKSPACE_CONTRACT,
  L02_WORKSPACE_CONTRACT_FIELDS,
} from './a1-u4-l02-contract'
import { emptyDraft } from './a1-u4-l02-draft'

/** 全部正确的草稿：探索 6/6、清单 3 行、否决题 4/4、scope 答对、不覆盖 5/5。 */
function allCorrectDraft(): L02Draft {
  return {
    version: 1 as const,
    explore: {
      A1: '聚合可用' as const,
      A2: '聚合可用' as const,
      A3: '聚合可用' as const,
      P1: '缺许可即停' as const,
      P2: '缺许可即停' as const,
      P3: '缺许可即停' as const,
    },
    checklist: [
      {
        item: '每日各窗口剩菜总重量',
        containsPii: '否' as const,
        permissionNeeded: '聚合数据可用，仍须教师确认来源',
        status: '不适用' as const,
        disposition: '可用' as const,
      },
      {
        item: '各排每日借出册数',
        containsPii: '否' as const,
        permissionNeeded: '聚合数据可用，仍须教师确认来源',
        status: '不适用' as const,
        disposition: '可用' as const,
      },
      {
        item: '全班同学姓名与班级名单',
        containsPii: '是' as const,
        permissionNeeded: '监护人同意',
        status: '未授予' as const,
        disposition: '停' as const,
      },
    ],
    veto: {
      W1: '可用' as const,
      W2: '可用' as const,
      W3: '停' as const,
      W4: '停' as const,
    },
    scopeAnswer: 'A' as const,
    nonCoverage: ['N1', 'N2', 'N3', 'N4', 'N5'],
    hintLevel: 0 as const,
  }
}

describe('A1-U4-L02 lesson data (permission checklist, default deny, scope separation)', () => {
  it('the permission rules are the four section-5 rules, verbatim', () => {
    expect(PERMISSION_RULES.map((rule) => rule.id)).toEqual(['R1', 'R2', 'R3', 'R4'])
    expect(PERMISSION_RULES[0].text).toContain('默认拒绝')
    expect(PERMISSION_RULES[0].text).toContain('无许可记录 = 不可用')
    expect(PERMISSION_RULES[1].text).toContain('scope 分离')
    expect(PERMISSION_RULES[1].text).toContain('cloud-drafts')
    expect(PERMISSION_RULES[1].text).toContain('不得互相挪用')
    expect(PERMISSION_RULES[2].text).toContain('scope 由服务端写死')
    expect(PERMISSION_RULES[2].text).toContain('永不由调用方传入')
    expect(PERMISSION_RULES[3].text).toContain('儿童输入用于模型训练')
    expect(PERMISSION_RULES[3].text).toContain('永不覆盖，否决项')
    expect(PERMISSION_RULES[3].text).toContain('真实人物照片上传')
    expect(PERMISSION_RULES[3].text).toContain('跨课程持久化对话记忆')
  })

  it('the explore list is 6 items: 3 aggregate-usable, 3 stop-if-no-permission', () => {
    expect(EXPLORE_ITEMS).toHaveLength(6)
    expect(EXPLORE_ITEMS.filter((item) => item.kind === '聚合可用')).toHaveLength(3)
    expect(EXPLORE_ITEMS.filter((item) => item.kind === '缺许可即停')).toHaveLength(3)
    expect(EXPLORE_ITEMS.map((item) => item.id)).toEqual(['A1', 'A2', 'A3', 'P1', 'P2', 'P3'])
    const personal = EXPLORE_ITEMS.find((item) => item.id === 'P1')
    expect(personal?.text).toContain('姓名与班级')
    expect(personal?.reason).toContain('匿名化')
    expect(personal?.reason).toContain('无法验证匿名化是否彻底')
    const grades = EXPLORE_ITEMS.find((item) => item.id === 'P2')
    expect(grades?.text).toContain('考试成绩')
    expect(grades?.reason).toContain('后果还敏感')
  })

  it('the veto table is 4 rows: 2 aggregate usable, 2 personal stop, synthetic data', () => {
    expect(VETO_ITEMS.map((item) => item.id)).toEqual(['W1', 'W2', 'W3', 'W4'])
    expect(VETO_ITEMS.filter((item) => item.expected === '可用')).toHaveLength(2)
    expect(VETO_ITEMS.filter((item) => item.expected === '停')).toHaveLength(2)
    expect(VETO_ITEMS.find((item) => item.id === 'W3')?.text).toContain('姓名与成绩')
    expect(VETO_ITEMS.find((item) => item.id === 'W4')?.text).toContain('消费金额')
    expect(VETO_ITEMS.find((item) => item.id === 'W3')?.reason).toContain('默认处置“停”')
  })

  it('the scope question is A: two consents are not interchangeable', () => {
    expect(SCOPE_QUESTION.answer).toBe('A')
    expect(SCOPE_QUESTION.question).toContain('cloud-drafts')
    expect(SCOPE_QUESTION.options.find((option) => option.id === 'A')?.text).toContain(
      'scope 分离',
    )
    expect(SCOPE_QUESTION.options.find((option) => option.id === 'B')?.text).toContain('过期')
    expect(SCOPE_QUESTION.options.find((option) => option.id === 'C')?.text).toContain('格式')
    expect(SCOPE_QUESTION.correctFeedback).toContain('互不通用')
    expect(SCOPE_QUESTION.wrongFeedback).toContain('不是过期、也不是格式问题')
  })

  it('the non-coverage list is 5 true items plus 2 distractors', () => {
    expect(NON_COVERAGE_ITEMS).toHaveLength(7)
    expect(NON_COVERAGE_ITEMS.filter((item) => item.notCovered)).toHaveLength(5)
    expect(NON_COVERAGE_ITEMS.filter((item) => !item.notCovered)).toHaveLength(2)
    expect([...NON_COVERAGE_IDS]).toEqual(['N1', 'N2', 'N3', 'N4', 'N5'])
    expect(NON_COVERAGE_ITEMS.find((item) => item.id === 'N1')?.text).toContain('模型训练')
    expect(NON_COVERAGE_ITEMS.find((item) => item.id === 'N6')?.text).toContain('云端草稿保存')
    expect(NON_COVERAGE_ITEMS.find((item) => item.id === 'N7')?.text).toContain('本地规则计算')
  })

  it('checklist text fields are 1-200 chars and the checklist has 3 rows', () => {
    expect(MAX_TEXT_LENGTH).toBe(200)
    expect(CHECKLIST_ROWS).toBe(3)
    expect(allCorrectDraft().checklist).toHaveLength(3)
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
    draft.explore.P1 = '聚合可用'
    delete draft.explore.P3
    const result = checkExplore(draft)
    expect(result.passed).toBe(false)
    expect(result.passedCount).toBe(4)
    expect(result.checks.filter((check) => !check.passed).map((check) => check.id)).toEqual([
      'P1',
      'P3',
    ])
    expect(result.checks.find((check) => check.id === 'P1')?.detail).toContain('分类错了')
    expect(result.checks.find((check) => check.id === 'P3')?.detail).toContain('尚未分类')
  })

  it('checkExplore fails everything on an empty draft', () => {
    const result = checkExplore(emptyDraft())
    expect(result.passed).toBe(false)
    expect(result.passedCount).toBe(0)
    expect(result.checks.every((check) => check.detail.includes('尚未分类'))).toBe(true)
  })

  it('checkChecklist passes when all 3 rows are complete and consistent', () => {
    const result = checkChecklist(allCorrectDraft())
    expect(result.passed).toBe(true)
    expect(result.completedRows).toBe(3)
    expect(result.totalRows).toBe(3)
    expect(result.detail).toContain('许可清单完成')
  })

  it('checkChecklist fails on a missing field, an inconsistent disposition, or a personal record marked 不适用', () => {
    const noItem = allCorrectDraft()
    noItem.checklist[0].item = ''
    expect(checkChecklist(noItem).passed).toBe(false)
    expect(checkChecklist(noItem).detail).toContain('五列未齐')

    const wrongDisposition = allCorrectDraft()
    wrongDisposition.checklist[2].disposition = '可用'
    const checked = checkChecklist(wrongDisposition)
    expect(checked.passed).toBe(false)
    expect(checked.detail).toContain('许可未授予，默认处置必须是“停”')

    const grantedButStopped = allCorrectDraft()
    grantedButStopped.checklist[0].status = '已授予'
    grantedButStopped.checklist[0].disposition = '停'
    expect(checkChecklist(grantedButStopped).passed).toBe(false)
    expect(checkChecklist(grantedButStopped).detail).toContain('默认处置才是“可用”')

    const personalAsNa = allCorrectDraft()
    personalAsNa.checklist[2].status = '不适用'
    expect(checkChecklist(personalAsNa).passed).toBe(false)
    expect(checkChecklist(personalAsNa).detail).toContain('个人记录必须有许可')
  })

  it('checkChecklist accepts 未授予 + 停 and 已授予 + 可用', () => {
    const draft = allCorrectDraft()
    draft.checklist[0].status = '已授予'
    draft.checklist[0].disposition = '可用'
    const result = checkChecklist(draft)
    expect(result.passed).toBe(true)
    expect(result.completedRows).toBe(3)
  })

  it('checkTransfer passes on veto 4/4, scope A, and exactly the 5 non-coverage items', () => {
    const result = checkTransfer(allCorrectDraft())
    expect(result.passed).toBe(true)
    expect(result.vetoPassedCount).toBe(4)
    expect(result.vetoTotal).toBe(4)
    expect(result.scopeCorrect).toBe(true)
    expect(result.nonCoverageCorrect).toBe(true)
    expect(result.detail).toContain('迁移完成')
  })

  it('checkTransfer fails on a wrong veto row, a wrong scope answer, or a wrong non-coverage pick', () => {
    const wrongVeto = allCorrectDraft()
    wrongVeto.veto.W3 = '可用'
    expect(checkTransfer(wrongVeto).passed).toBe(false)
    expect(checkTransfer(wrongVeto).detail).toContain('否决题只对了 3/4 项')

    const wrongScope = allCorrectDraft()
    wrongScope.scopeAnswer = 'B'
    expect(checkTransfer(wrongScope).passed).toBe(false)
    expect(checkTransfer(wrongScope).detail).toContain('scope 题未答对')

    const missingOne = allCorrectDraft()
    missingOne.nonCoverage = ['N1', 'N2', 'N3', 'N4']
    expect(checkTransfer(missingOne).passed).toBe(false)
    expect(checkTransfer(missingOne).detail).toContain('不覆盖事项选对了 4/5 项')

    const extraOne = allCorrectDraft()
    extraOne.nonCoverage = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6']
    expect(checkTransfer(extraOne).passed).toBe(false)
    expect(checkTransfer(extraOne).detail).toContain('共选了 6 项')
  })

  it('checkL02 passes only when explore, checklist and transfer all pass', () => {
    expect(checkL02(allCorrectDraft()).passed).toBe(true)
    const onePartFails = allCorrectDraft()
    onePartFails.explore.A1 = '缺许可即停'
    const result = checkL02(onePartFails)
    expect(result.passed).toBe(false)
    expect(result.explore.passed).toBe(false)
    expect(result.checklist.passed).toBe(true)
    expect(result.transfer.passed).toBe(true)
  })

  it('hints have three levels and the lesson has three steps', () => {
    expect(HINTS.map((h) => h.level)).toEqual([1, 2, 3])
    expect(LESSON_STEPS).toHaveLength(3)
  })
})

describe('A1-U4-L02 workspace integration (contract fields + L02Adapter)', () => {
  it('the lesson contract names the lesson honestly and uses the spec draft key', () => {
    expect(L02_CONTRACT.lessonId).toBe('A1-U4-L02')
    expect(L02_CONTRACT.title).toBe('建立数据使用许可')
    expect(L02_CONTRACT.goal5).toHaveLength(5)
    expect(L02_CONTRACT.goal5[3]).toContain('A1-U4-L01')
    expect(L02_CONTRACT.goal5[3]).toContain('缺许可即停')
    expect(L02_CONTRACT.scopeLabel).toBe('教学定向')
    expect(L02_CONTRACT.scopeGap).toContain('未核实')
    expect(L02_CONTRACT.scopeGap).toContain('待填 stub')
    expect(L02_CONTRACT.scopeGap).toContain('不改变任何系统许可状态')
    expect(L02_DRAFT_KEY).toBe('kidscoding-draft:A1-U4-L02')
    expect(L02_CONTRACT.draftKey).toBe(L02_DRAFT_KEY)
  })

  it('workspace fields translate the contract without an engine value', () => {
    expect(L02_WORKSPACE_CONTRACT_FIELDS.lessonId).toBe('A1-U4-L02')
    expect(L02_WORKSPACE_CONTRACT_FIELDS.goal5).toHaveLength(5)
    expect(L02_WORKSPACE_CONTRACT_FIELDS.hints).toHaveLength(3)
    expect(L02_WORKSPACE_CONTRACT_FIELDS.structuredHints).toHaveLength(3)
    expect(L02_WORKSPACE_CONTRACT_FIELDS.methodSteps).toHaveLength(3)
    expect(L02_WORKSPACE_CONTRACT_FIELDS.activities).toHaveLength(3)
    expect(L02_WORKSPACE_CONTRACT_FIELDS.hasStage).toBe(false)
    expect(L02_WORKSPACE_CONTRACT_FIELDS.fileCapabilities).toEqual({
      canNew: true,
      canSave: true,
      canExport: true,
      canImport: true,
      canReset: true,
    })
    expect(L02_WORKSPACE_CONTRACT_FIELDS.judging.knowledgeRule).toContain('不记学生原文')
    expect('engine' in L02_WORKSPACE_CONTRACT_FIELDS).toBe(false)
  })

  it('the full workspace contract uses the generic slot engine and validates', () => {
    expect(L02_WORKSPACE_CONTRACT.engine).toBe('slot')
    expect(validateLessonContract(L02_WORKSPACE_CONTRACT)).toEqual([])
    expect(L02_WORKSPACE_CONTRACT.judging.target).toBeUndefined()
    expect(L02_WORKSPACE_CONTRACT.demo).toBeUndefined()
  })

  it('a fully correct lesson builds a three-layer pass judgment', () => {
    const draft = allCorrectDraft()
    const judgment = buildL02Judgment(checkL02(draft), draft)
    expect(judgment.passed).toBe(true)
    expect(judgment.layers.map((l) => l.id)).toEqual(['stage', 'task', 'knowledge'])
    expect(judgment.conclusion).toBe('结论：本次课堂练习合格。')
    expect(judgment.layers[0].detail).toContain('六项数据分类全部正确')
    expect(judgment.layers[1].detail).toContain('任务判定：合格：许可清单与迁移均已完成。')
    expect(judgment.methodEvidence).toContain('已分类 6/6')
    expect(judgment.methodEvidence).toContain('许可清单 3/3 行')
    expect(judgment.methodEvidence).toContain('否决题 4/4 项')
    expect(judgment.methodEvidence).toContain('scope 题已答对')
    expect(judgment.methodEvidence).toContain('不覆盖事项选对 5/5 项')
    expect(judgment.conclusion).not.toContain('已掌握')
  })

  it('one wrong classification builds a fail judgment naming that item', () => {
    const draft = allCorrectDraft()
    draft.explore.P1 = '聚合可用'
    const judgment = buildL02Judgment(checkL02(draft), draft)
    expect(judgment.passed).toBe(false)
    expect(judgment.conclusion).toBe('结论：未合格。')
    expect(judgment.layers[0].detail).toContain('探索分类通过 5 项')
    expect(judgment.layers[0].detail).toContain('P1')
    expect(judgment.layers[1].detail).toContain('未合格')
  })

  it('an empty lesson builds a fail judgment listing zero classified items', () => {
    const draft = emptyDraft()
    const judgment = buildL02Judgment(checkL02(draft), draft)
    expect(judgment.passed).toBe(false)
    expect(judgment.layers[0].detail).toContain('尚未分类六项数据')
    expect(judgment.layers[1].detail).toContain('许可清单未完成')
    expect(judgment.layers[1].detail).toContain('迁移未完成')
    expect(judgment.methodEvidence).toContain('已分类 0/6')
    expect(judgment.methodEvidence).toContain('scope 题未答对')
  })

  it('the method evidence counts but never quotes student text', () => {
    const draft = allCorrectDraft()
    draft.checklist[0].item = '独特数据项一二三'
    draft.checklist[0].permissionNeeded = '独特许可句四五六'
    const judgment = buildL02Judgment(checkL02(draft), draft)
    const evidence = judgment.methodEvidence ?? ''
    expect(evidence).not.toContain('独特数据项一二三')
    expect(evidence).not.toContain('独特许可句四五六')
    expect(evidence).toContain('已分类 6/6')
  })

  it('L02Adapter: checkL02 stores the judgment and loadScript clears it', () => {
    const adapter = new L02Adapter(allCorrectDraft())
    expect(adapter.getJudgmentResult()).toBeNull()
    const judgment = adapter.checkL02()
    expect(judgment.passed).toBe(true)
    expect(adapter.getJudgmentResult()).toBe(judgment)
    expect(adapter.getL02State()).toEqual({
      checked: true,
      passedCount: 8,
      totalChecks: 8,
      verdict: '结论：本次课堂练习合格。',
    })
    adapter.loadScript(emptyDraft())
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.getL02State().checked).toBe(false)
    expect(adapter.getL02State().passedCount).toBe(0)
    expect(adapter.checkL02().passed).toBe(false)
    expect(adapter.getL02State().passedCount).toBeLessThan(8)
  })

  it('L02Adapter: run fires finished immediately, stop is a no-op, validateDraft is strict shape', () => {
    const adapter = new L02Adapter()
    const events: string[] = []
    adapter.run((event) => events.push(event.kind))
    expect(events).toEqual(['finished'])
    expect(() => adapter.stop()).not.toThrow()
    expect(adapter.getState()).toEqual({ x: 0, score: 0, running: false, frames: 0 })
    expect(adapter.validateDraft(allCorrectDraft())).toBe(true)
    expect(adapter.validateDraft({ version: 1, explore: {} })).toBe(false)
    expect(adapter.validateDraft(null)).toBe(false)
  })
})

describe('A1-U4-L02 fail-closed wording', () => {
  it('passedCountOf is 8 on a pass, 7 on one failed classification, 0 on an empty lesson', () => {
    expect(passedCountOf(checkL02(allCorrectDraft()))).toBe(8)
    const oneWrong = allCorrectDraft()
    oneWrong.explore.P1 = '聚合可用'
    expect(passedCountOf(checkL02(oneWrong))).toBe(7)
    expect(passedCountOf(checkL02(emptyDraft()))).toBe(0)
  })

  it('a judgment never claims mastery and never passes on a wrong scope answer', () => {
    const draft = allCorrectDraft()
    const judgment = buildL02Judgment(checkL02(draft), draft)
    expect(judgment.conclusion).not.toContain('已掌握')
    expect(judgment.layers.every((layer) => !layer.detail.includes('已掌握'))).toBe(true)
    const failed = allCorrectDraft()
    failed.scopeAnswer = 'C'
    const failedJudgment = buildL02Judgment(checkL02(failed), failed)
    expect(failedJudgment.conclusion).toBe('结论：未合格。')
    expect(failedJudgment.layers[1].detail).toContain('迁移未完成')
  })
})
