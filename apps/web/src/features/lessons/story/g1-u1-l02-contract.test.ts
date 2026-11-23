import { describe, expect, it } from 'vitest'

import detailed from '@/content/curriculum/track-g1-detailed-lessons-v1.json'
import { validateLessonContract } from '@/features/lessons/workspace/lesson-contract'
import {
  G1_CONTRACT,
  G1_EXPECTED_LINES,
  G1_METHOD_STEPS,
  G1_WORKSPACE_CONTRACT,
} from './g1-u1-l02-contract'

function findLesson(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findLesson(item)
      if (found) return found
    }
    return null
  }
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>
    if (record.id === 'G1-U1-L02') return record
    for (const value of Object.values(record)) {
      const found = findLesson(value)
      if (found) return found
    }
  }
  return null
}

describe('G1-U1-L02 workspace contract', () => {
  it('passes shell contract validation with engine slot', () => {
    expect(validateLessonContract(G1_WORKSPACE_CONTRACT)).toEqual([])
    expect(G1_WORKSPACE_CONTRACT.engine).toBe('slot')
    expect(G1_WORKSPACE_CONTRACT.draftKey).toBe('kidscoding-draft:G1-U1-L02')
    expect(G1_WORKSPACE_CONTRACT.goal5).toHaveLength(5)
    expect(G1_WORKSPACE_CONTRACT.hints).toHaveLength(3)
    expect(G1_WORKSPACE_CONTRACT.fileCapabilities).toEqual({
      canNew: true,
      canSave: true,
      canExport: true,
      canImport: true,
      canReset: true,
    })
    expect(G1_WORKSPACE_CONTRACT.judging.scopeLabel).toBe('教学定向')
    expect(G1_WORKSPACE_CONTRACT.hasStage).toBeUndefined()
    expect(G1_WORKSPACE_CONTRACT.progress).toBeUndefined()
  })

  it('copies the detailed five steps verbatim (learnerAction), never invents them', () => {
    const source = findLesson(detailed)
    expect(source).not.toBeNull()
    const steps = source!.learningSteps as Array<{ learnerAction: string }>
    expect(steps).toHaveLength(5)
    expect(G1_METHOD_STEPS).toEqual(steps.map((step) => step.learnerAction))
    expect(G1_CONTRACT.methodSteps).toEqual(G1_METHOD_STEPS)
  })

  it('copies the tiered hints verbatim from the detailed feedback', () => {
    const source = findLesson(detailed)
    expect(source).not.toBeNull()
    const feedback = source!.feedback as { tieredHints: string[] }
    expect(G1_CONTRACT.hints.map((hint) => hint.text)).toEqual(feedback.tieredHints)
  })

  it('reads title and objectives from the lesson data, never hardcodes them', () => {
    expect(G1_CONTRACT.title).toBe('与兔子轮流说话')
    expect(G1_CONTRACT.goal5[0]).toContain('理解并能解释对白')
    expect(G1_CONTRACT.goal5[2]).toContain('安排狐狸说“你好”')
  })

  it('links goal5 to the prerequisite lesson L01, never claims no prerequisite', () => {
    expect(G1_CONTRACT.goal5[3]).toContain('G1-U1-L01')
    expect(G1_CONTRACT.goal5[3]).not.toContain('无前置课节')
    expect(G1_CONTRACT.brief).toContain('两句对白按狐狸→兔子的顺序出现')
  })

  it('exposes the expected dialogue for the run adapter to inject into judging', () => {
    expect(G1_EXPECTED_LINES).toEqual([
      { actor: 'fox', text: '你好' },
      { actor: 'rabbit', text: '很高兴见到你' },
    ])
    expect(G1_WORKSPACE_CONTRACT.judging.taskRule).toContain('顺序颠倒')
    expect(G1_WORKSPACE_CONTRACT.judging.knowledgeRule).toContain('分开说')
  })
})
