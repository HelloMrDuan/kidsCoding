import { describe, expect, it } from 'vitest'

import { validateLessonContract } from './lesson-contract'
import { DEMO_A } from './demo-contracts'
import { judgmentAppliesTo, shouldAutosavePreservePrompt, stableFingerprint } from './workspace-slots'
import { buildJudgment, toJudgmentResult } from './workspace-judging'

describe('slot helpers', () => {
  it('fingerprints the same program identically regardless of key order', () => {
    const a = stableFingerprint([{ type: 'ws_move_right', steps: 50 }])
    const b = stableFingerprint([{ steps: 50, type: 'ws_move_right' }])
    const c = stableFingerprint([{ type: 'ws_move_right', steps: 30 }])
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(judgmentAppliesTo(a, b)).toBe(true)
    expect(judgmentAppliesTo(a, c)).toBe(false)
  })

  it('preserves only the restore prompt across an autosave success', () => {
    expect(shouldAutosavePreservePrompt('已恢复草稿')).toBe(true)
    expect(shouldAutosavePreservePrompt('已保存到本机')).toBe(false)
    expect(shouldAutosavePreservePrompt(null)).toBe(false)
  })

  it('converts the demo judgment to the generic display shape unchanged', () => {
    const judgment = buildJudgment(DEMO_A.contract, { x: 200, score: 1, running: false }, {
      didMove: true,
      usedRepeat: true,
      finalX: 200,
    })
    expect(judgment.passed).toBe(true)
    const result = toJudgmentResult(judgment)
    expect(result.passed).toBe(true)
    expect(result.conclusion).toBe('结论：已完成，已掌握')
    expect(result.layers.map((l) => l.id)).toEqual(['stage', 'task', 'knowledge'])
    expect(result.layers[0].detail).toBe(judgment.stage.line)
    expect(result.layers[1].detail).toBe(judgment.task.line)
    expect(result.layers[2].detail).toBe(judgment.knowledge.line)
  })
})

describe('contract extension validation (additive)', () => {
  it('accepts the existing demo contracts unchanged', () => {
    expect(validateLessonContract(DEMO_A.contract)).toEqual([])
  })

  it('accepts well-formed structured hints, method steps, scope gap, progress, activities', () => {
    const extended = {
      ...DEMO_A.contract,
      structuredHints: [
        { level: 1, title: '方向', text: '先看水果位置' },
        { level: 2, title: '积木', text: '用移动积木' },
        { level: 3, title: '示范', text: '先走一步看看' },
      ],
      methodSteps: ['观察', '预测', '验证'],
      scopeGap: '仅适用于本演示舞台',
      progress: { label: '本单元进度', current: 1, total: 6 },
      activities: [{ level: 1, title: '活动一', text: '做一做' }],
      fileCapabilities: { canNew: true, canSave: false },
      hasStage: false,
    }
    expect(validateLessonContract(extended)).toEqual([])
  })

  it('rejects malformed extension fields without breaking the base contract', () => {
    expect(validateLessonContract({ ...DEMO_A.contract, structuredHints: [{ level: 4, title: 'x', text: 'y' }] })).toContain(
      'structuredHints 每项必须是 level 1|2|3 且 title/text 非空',
    )
    expect(validateLessonContract({ ...DEMO_A.contract, progress: { label: 'p', current: 1, total: 0 } })).toContain(
      'progress 必须是 label 字符串与有限 current/total，且 total > 0',
    )
    expect(validateLessonContract({ ...DEMO_A.contract, hasStage: 'yes' })).toContain('hasStage 必须是布尔值')
  })
})
