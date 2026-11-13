import { describe, expect, it } from 'vitest'

import detailed from '@/content/curriculum/track-g1-detailed-lessons-v1.json'
import { validateLessonContract } from '@/features/lessons/workspace/lesson-contract'
import {
  G1_CONTRACT,
  G1_METHOD_STEPS,
  G1_WORKSPACE_CONTRACT,
} from './g1-u1-l01-contract'

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
    if (record.id === 'G1-U1-L01') return record
    for (const value of Object.values(record)) {
      const found = findLesson(value)
      if (found) return found
    }
  }
  return null
}

describe('G1-U1-L01 workspace contract', () => {
  it('passes shell contract validation with engine slot', () => {
    expect(validateLessonContract(G1_WORKSPACE_CONTRACT)).toEqual([])
    expect(G1_WORKSPACE_CONTRACT.engine).toBe('slot')
    expect(G1_WORKSPACE_CONTRACT.draftKey).toBe('kidscoding-draft:G1-U1-L01')
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
    expect(G1_CONTRACT.title).toBe('给狐狸一个开场')
    expect(G1_CONTRACT.goal5[0]).toContain('理解并能解释对白')
    expect(G1_CONTRACT.goal5[2]).toContain('把开场对白设为“欢迎来到森林剧场”')
  })
})
