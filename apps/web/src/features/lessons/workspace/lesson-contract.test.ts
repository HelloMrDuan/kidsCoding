import { describe, expect, it } from 'vitest'

import { DEMO_A } from './demo-contracts'
import { draftKeyFor, validateLessonContract } from './lesson-contract'

describe('lesson-contract validation', () => {
  it('accepts a well-formed demo contract', () => {
    expect(validateLessonContract(DEMO_A.contract)).toEqual([])
  })

  it('rejects goal5 with fewer than 5 items', () => {
    const bad = { ...DEMO_A.contract, goal5: ['a', 'b', 'c', 'd'] }
    expect(validateLessonContract(bad)).toContain('goal5 必须恰好是 5 条非空字符串')
  })

  it('rejects goal5 with more than 5 items', () => {
    const bad = { ...DEMO_A.contract, goal5: ['a', 'b', 'c', 'd', 'e', 'f'] }
    expect(validateLessonContract(bad)).toContain('goal5 必须恰好是 5 条非空字符串')
  })

  it('rejects hints with fewer than 3 tiers', () => {
    const bad = { ...DEMO_A.contract, hints: ['1 级', '2 级'] }
    expect(validateLessonContract(bad)).toContain('hints 必须恰好是 3 条非空字符串')
  })

  it('rejects a draftKey that does not match the lessonId', () => {
    const bad = { ...DEMO_A.contract, draftKey: draftKeyFor('demo-b') }
    expect(validateLessonContract(bad)).toContain('draftKey 与 lessonId 不一致')
  })

  it('rejects an unknown engine', () => {
    const bad = { ...DEMO_A.contract, engine: 'turtle' }
    expect(validateLessonContract(bad)).toContain('engine 必须是 blockly、scratch-vm、summary 或 slot')
  })

  it("accepts the generic slot engine (OPS-026, Issue #482 option ②)", () => {
    const slot = { ...DEMO_A.contract, engine: 'slot' as const }
    expect(validateLessonContract(slot)).toEqual([])
  })

  it("rejects 'json' as an engine value: JSON courses must use 'slot', never a new engine", () => {
    const bad = { ...DEMO_A.contract, engine: 'json' }
    expect(validateLessonContract(bad)).toContain('engine 必须是 blockly、scratch-vm、summary 或 slot')
  })

  it('rejects a missing judging scope label', () => {
    const bad = { ...DEMO_A.contract, judging: { ...DEMO_A.contract.judging, scopeLabel: '自由' } }
    expect(validateLessonContract(bad)).toContain('judging.scopeLabel 必须是教学定向或开放创作')
  })
})
