import { describe, expect, it } from 'vitest'
import { validateLessonContract } from '../lessons/workspace/lesson-contract'
import {
  CHECK_ITEMS,
  HINTS,
  LESSON_STEPS,
  SOURCE_CARDS,
  checkVerdicts,
  type L05Draft,
} from './a1-u3-l05'
import { CitationAdapter, buildCitationJudgment, passedCountOf } from './a1-u3-l05-adapter'
import {
  L05_CONTRACT,
  L05_DRAFT_KEY,
  L05_WORKSPACE_CONTRACT,
  L05_WORKSPACE_CONTRACT_FIELDS,
} from './a1-u3-l05-contract'

/** 八项全部选对的草稿（E1 可信、E2 编造数字、P1 编造来源、P2/P4/T1 证据不足、P3 编造数字、T2 可信）。 */
function allCorrectDraft(): L05Draft {
  return {
    version: 1 as const,
    lessonId: 'A1-U3-L05' as const,
    verdicts: {
      E1: '可信' as const,
      E2: '编造数字' as const,
      P1: '编造来源' as const,
      P2: '证据不足' as const,
      P3: '编造数字' as const,
      P4: '证据不足' as const,
      T1: '证据不足' as const,
      T2: '可信' as const,
    },
  }
}

describe('A1-U3-L05 lesson layer (source book + eight AI answers)', () => {
  it('the source book has 5 cards, each with a source and two checkable sentences', () => {
    expect(SOURCE_CARDS.map((card) => card.id)).toEqual(['A', 'B', 'C', 'D', 'E'])
    for (const card of SOURCE_CARDS) {
      expect(card.title).toContain('（示例）')
      expect(card.source.length).toBeGreaterThan(0)
      expect(card.text.split('。').filter((s) => s.trim().length > 0)).toHaveLength(2)
    }
    expect(SOURCE_CARDS.find((card) => card.id === 'B')?.text).toContain('2 小时')
    expect(SOURCE_CARDS.find((card) => card.id === 'C')?.text).toContain('40 分钟')
  })

  it('the eight items split 2 explore / 4 practice / 2 transfer, in order', () => {
    expect(CHECK_ITEMS.map((item) => item.id)).toEqual([
      'E1',
      'E2',
      'P1',
      'P2',
      'P3',
      'P4',
      'T1',
      'T2',
    ])
    expect(CHECK_ITEMS.filter((item) => item.level === 1)).toHaveLength(2)
    expect(CHECK_ITEMS.filter((item) => item.level === 2)).toHaveLength(4)
    expect(CHECK_ITEMS.filter((item) => item.level === 3)).toHaveLength(2)
  })

  it('each item has exactly one correct verdict: 2 trusted, 2 digit, 1 source, 3 insufficient', () => {
    const correct = CHECK_ITEMS.map((item) => item.correct)
    expect(correct.filter((v) => v === '可信')).toHaveLength(2)
    expect(correct.filter((v) => v === '编造数字')).toHaveLength(2)
    expect(correct.filter((v) => v === '编造来源')).toHaveLength(1)
    expect(correct.filter((v) => v === '证据不足')).toHaveLength(3)
    expect(new Set(CHECK_ITEMS.map((item) => item.id)).size).toBe(8)
  })

  it('E2 invents a digit: card B says 2 hours, the answer says 5', () => {
    const cardB = SOURCE_CARDS.find((card) => card.id === 'B')
    const e2 = CHECK_ITEMS.find((item) => item.id === 'E2')
    expect(cardB?.text).toContain('2 小时')
    expect(e2?.quote).toContain('5 小时')
    expect(e2?.correct).toBe('编造数字')
  })

  it('P3 invents a digit: card C says 40 minutes, the answer says 90', () => {
    const cardC = SOURCE_CARDS.find((card) => card.id === 'C')
    const p3 = CHECK_ITEMS.find((item) => item.id === 'P3')
    expect(cardC?.text).toContain('40 分钟')
    expect(p3?.quote).toContain('90 分钟')
    expect(p3?.correct).toBe('编造数字')
  })

  it('P1 invents a source: the newspaper is not in the source book', () => {
    const p1 = CHECK_ITEMS.find((item) => item.id === 'P1')
    expect(p1?.sourceLabel).toBe('《森林日报》')
    expect(p1?.sourceCardId).toBeNull()
    expect(p1?.correct).toBe('编造来源')
    expect(SOURCE_CARDS.map((card) => card.title).join('')).not.toContain('森林日报')
  })

  it('P4 has no citation at all, so it cannot be checked', () => {
    const p4 = CHECK_ITEMS.find((item) => item.id === 'P4')
    expect(p4?.sourceLabel).toBe('（无引用）')
    expect(p4?.sourceCardId).toBeNull()
    expect(p4?.correct).toBe('证据不足')
  })

  it('T1 overreaches: 20 pupils + 5 trees does not give a total', () => {
    const t1 = CHECK_ITEMS.find((item) => item.id === 'T1')
    expect(t1?.quote).toContain('25 棵树')
    expect(t1?.correct).toBe('证据不足')
    const t2 = CHECK_ITEMS.find((item) => item.id === 'T2')
    expect(t2?.correct).toBe('可信')
  })

  it('checkVerdicts passes all eight when every verdict is correct', () => {
    const result = checkVerdicts(allCorrectDraft())
    expect(result.passed).toBe(true)
    expect(result.passedCount).toBe(8)
    expect(result.totalChecks).toBe(8)
    expect(result.pickedCount).toBe(8)
    expect(result.unpickedIds).toEqual([])
    expect(result.checks.every((check) => check.passed)).toBe(true)
  })

  it('checkVerdicts fails only the mispicked item and names it', () => {
    const draft = allCorrectDraft()
    draft.verdicts.E2 = '可信'
    draft.verdicts.T1 = null
    const result = checkVerdicts(draft)
    expect(result.passed).toBe(false)
    expect(result.passedCount).toBe(6)
    expect(result.checks.filter((check) => !check.passed).map((check) => check.id)).toEqual([
      'E2',
      'T1',
    ])
    expect(result.checks.find((check) => check.id === 'E2')?.detail).toContain('2 小时')
    expect(result.checks.find((check) => check.id === 'T1')?.detail).toContain('尚未选择')
    expect(result.unpickedIds).toEqual(['T1'])
  })

  it('checkVerdicts fails everything on an empty draft', () => {
    const result = checkVerdicts({
      version: 1,
      lessonId: 'A1-U3-L05',
      verdicts: { E1: null, E2: null, P1: null, P2: null, P3: null, P4: null, T1: null, T2: null },
    })
    expect(result.passed).toBe(false)
    expect(result.passedCount).toBe(0)
    expect(result.pickedCount).toBe(0)
    expect(result.unpickedIds).toHaveLength(8)
    expect(result.checks.every((check) => check.detail.includes('尚未选择'))).toBe(true)
  })

  it('hints have three levels and the rule card has four steps', () => {
    expect(HINTS.map((h) => h.level)).toEqual([1, 2, 3])
    expect(LESSON_STEPS).toHaveLength(4)
    expect(LESSON_STEPS[0]).toContain('找到引用')
    expect(LESSON_STEPS[3]).toContain('编造来源')
  })
})

describe('A1-U3-L05 workspace integration (contract fields + CitationAdapter)', () => {
  it('the lesson contract names the lesson honestly and uses the spec draft key', () => {
    expect(L05_CONTRACT.lessonId).toBe('A1-U3-L05')
    expect(L05_CONTRACT.title).toBe('引用与幻觉核对')
    expect(L05_CONTRACT.goal5).toHaveLength(5)
    expect(L05_CONTRACT.goal5[3]).toContain('A1-U3-L04')
    expect(L05_CONTRACT.scopeLabel).toBe('教学定向')
    expect(L05_CONTRACT.scopeGap).toContain('不等于完全掌握')
    expect(L05_CONTRACT.scopeGap).toContain('练习记录')
    expect(L05_CONTRACT.scopeGap).toContain('不是真实联网搜索结果')
    expect(L05_DRAFT_KEY).toBe('kidscoding-draft:A1-U3-L05')
    expect(L05_CONTRACT.draftKey).toBe(L05_DRAFT_KEY)
  })

  it('workspace fields translate the contract without an engine value', () => {
    expect(L05_WORKSPACE_CONTRACT_FIELDS.lessonId).toBe('A1-U3-L05')
    expect(L05_WORKSPACE_CONTRACT_FIELDS.goal5).toHaveLength(5)
    expect(L05_WORKSPACE_CONTRACT_FIELDS.hints).toHaveLength(3)
    expect(L05_WORKSPACE_CONTRACT_FIELDS.structuredHints).toHaveLength(3)
    expect(L05_WORKSPACE_CONTRACT_FIELDS.methodSteps).toHaveLength(4)
    expect(L05_WORKSPACE_CONTRACT_FIELDS.activities).toHaveLength(3)
    expect(L05_WORKSPACE_CONTRACT_FIELDS.hasStage).toBe(false)
    expect(L05_WORKSPACE_CONTRACT_FIELDS.fileCapabilities).toEqual({
      canNew: true,
      canSave: true,
      canExport: true,
      canImport: true,
      canReset: true,
    })
    expect(L05_WORKSPACE_CONTRACT_FIELDS.judging.stageRule).toContain('八项逐项判定')
    expect(L05_WORKSPACE_CONTRACT_FIELDS.judging.taskRule).toContain('八项全部通过为合格')
    expect(L05_WORKSPACE_CONTRACT_FIELDS.judging.knowledgeRule).toContain('只记计数，不记原文')
    expect('engine' in L05_WORKSPACE_CONTRACT_FIELDS).toBe(false)
  })

  it('the full workspace contract uses the generic slot engine and validates', () => {
    expect(L05_WORKSPACE_CONTRACT.engine).toBe('slot')
    expect(validateLessonContract(L05_WORKSPACE_CONTRACT)).toEqual([])
    expect(L05_WORKSPACE_CONTRACT.judging.target).toBeUndefined()
    expect(L05_WORKSPACE_CONTRACT.demo).toBeUndefined()
  })

  it('a fully correct check builds a three-layer pass judgment', () => {
    const draft = allCorrectDraft()
    const judgment = buildCitationJudgment(checkVerdicts(draft), draft)
    expect(judgment.passed).toBe(true)
    expect(judgment.layers.map((l) => l.id)).toEqual(['stage', 'task', 'knowledge'])
    expect(judgment.conclusion).toBe('结论：本次核对合格。')
    expect(judgment.layers[0].detail).toContain('八项全部通过')
    expect(judgment.layers[1].detail).toContain('任务判定：合格：八项全部通过。')
    expect(judgment.methodEvidence).toContain('已选 8/8')
    expect(judgment.methodEvidence).toContain('选对 8/8')
    expect(judgment.methodEvidence).toContain('迁移项已选 2/2')
    expect(judgment.conclusion).not.toContain('已掌握')
  })

  it('one wrong pick builds a fail judgment naming that item', () => {
    const draft = allCorrectDraft()
    draft.verdicts.P1 = '证据不足'
    const judgment = buildCitationJudgment(checkVerdicts(draft), draft)
    expect(judgment.passed).toBe(false)
    expect(judgment.conclusion).toBe('结论：未合格。')
    expect(judgment.layers[0].detail).toContain('八项中通过 7 项')
    expect(judgment.layers[0].detail).toContain('P1')
    expect(judgment.layers[1].detail).toContain('未合格')
    expect(judgment.layers[1].detail).toContain('P1')
  })

  it('an empty check builds a fail judgment listing all eight items', () => {
    const draft: L05Draft = {
      version: 1,
      lessonId: 'A1-U3-L05',
      verdicts: { E1: null, E2: null, P1: null, P2: null, P3: null, P4: null, T1: null, T2: null },
    }
    const judgment = buildCitationJudgment(checkVerdicts(draft), draft)
    expect(judgment.passed).toBe(false)
    expect(judgment.layers[0].detail).toContain('八项中通过 0 项')
    expect(judgment.methodEvidence).toContain('已选 0/8')
  })

  it('the method evidence counts but never quotes AI answers or card text', () => {
    const draft = allCorrectDraft()
    const judgment = buildCitationJudgment(checkVerdicts(draft), draft)
    const evidence = judgment.methodEvidence ?? ''
    for (const item of CHECK_ITEMS) {
      expect(evidence).not.toContain(item.quote)
    }
    for (const card of SOURCE_CARDS) {
      expect(evidence).not.toContain(card.text)
    }
    expect(evidence).toContain('可信选对 2/2')
    expect(evidence).toContain('编造来源选对 1/1')
    expect(evidence).toContain('证据不足选对 3/3')
  })

  it('CitationAdapter: checkItems stores the judgment and loadScript clears it', () => {
    const adapter = new CitationAdapter(allCorrectDraft())
    expect(adapter.getJudgmentResult()).toBeNull()
    const judgment = adapter.checkItems()
    expect(judgment.passed).toBe(true)
    expect(adapter.getJudgmentResult()).toBe(judgment)
    expect(adapter.getCitationState()).toEqual({
      checked: true,
      passedCount: 8,
      totalChecks: 8,
      verdict: '结论：本次核对合格。',
    })
    adapter.loadScript({
      version: 1,
      lessonId: 'A1-U3-L05',
      verdicts: { E1: null, E2: null, P1: null, P2: null, P3: null, P4: null, T1: null, T2: null },
    })
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.getCitationState().checked).toBe(false)
    expect(adapter.getCitationState().passedCount).toBe(0)
    expect(adapter.checkItems().passed).toBe(false)
    expect(adapter.getCitationState().passedCount).toBeLessThan(8)
  })

  it('CitationAdapter: run fires finished immediately, stop is a no-op, validateDraft is strict shape', () => {
    const adapter = new CitationAdapter()
    const events: string[] = []
    adapter.run((event) => events.push(event.kind))
    expect(events).toEqual(['finished'])
    expect(() => adapter.stop()).not.toThrow()
    expect(adapter.getState()).toEqual({ x: 0, score: 0, running: false, frames: 0 })
    expect(
      adapter.validateDraft({
        version: 1,
        lessonId: 'A1-U3-L05',
        verdicts: {},
      }),
    ).toBe(true)
    expect(adapter.validateDraft({ version: 1, lessonId: 'A1-U3-L05' })).toBe(false)
    expect(adapter.validateDraft({ version: 1, lessonId: 'A1-U3-L06', verdicts: {} })).toBe(false)
    expect(adapter.validateDraft(null)).toBe(false)
  })
})

describe('A1-U3-L05 fail-closed wording', () => {
  it('passedCountOf is 8 on a pass, 7 on one failed item, 0 on an empty check', () => {
    expect(passedCountOf(checkVerdicts(allCorrectDraft()))).toBe(8)
    const oneWrong = allCorrectDraft()
    oneWrong.verdicts.P1 = '证据不足'
    expect(passedCountOf(checkVerdicts(oneWrong))).toBe(7)
    expect(
      passedCountOf(
        checkVerdicts({
          version: 1,
          lessonId: 'A1-U3-L05',
          verdicts: {
            E1: null,
            E2: null,
            P1: null,
            P2: null,
            P3: null,
            P4: null,
            T1: null,
            T2: null,
          },
        }),
      ),
    ).toBe(0)
  })

  it('a judgment never claims mastery and never claims completion', () => {
    const draft = allCorrectDraft()
    const judgment = buildCitationJudgment(checkVerdicts(draft), draft)
    expect(judgment.conclusion).not.toContain('已掌握')
    expect(judgment.conclusion).not.toContain('已完成')
    expect(judgment.layers.every((layer) => !layer.detail.includes('已掌握'))).toBe(true)
    expect(judgment.layers.every((layer) => !layer.detail.includes('已完成'))).toBe(true)
    const failed = allCorrectDraft()
    failed.verdicts.E1 = '编造数字'
    const failedJudgment = buildCitationJudgment(checkVerdicts(failed), failed)
    expect(failedJudgment.conclusion).toBe('结论：未合格。')
    expect(failedJudgment.layers[1].detail).toContain('E1')
  })
})
