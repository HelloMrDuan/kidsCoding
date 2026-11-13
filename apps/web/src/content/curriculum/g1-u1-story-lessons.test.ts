import { describe, expect, it } from 'vitest'

import detailed from './track-g1-detailed-lessons-v1.json'
import { G1_U1_L01_STORY_LESSON, STORY_SAY_CHOICES, getStoryLesson } from './g1-u1-story-lessons'

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

describe('G1-U1-L01 story lesson data', () => {
  it('copies the detailed lesson values verbatim, never invents detailed values', () => {
    const source = findLesson(detailed)
    expect(source).not.toBeNull()
    expect(G1_U1_L01_STORY_LESSON.title).toBe(source!.title)
    expect(G1_U1_L01_STORY_LESSON.story).toBe(source!.story)
    expect(G1_U1_L01_STORY_LESSON.objectives).toEqual(source!.objectives)
    expect(G1_U1_L01_STORY_LESSON.parentQuestion).toBe(source!.parentsPrompt)
    expect(G1_U1_L01_STORY_LESSON.extension).toBe(source!.extension)
    const feedback = source!.feedback as { tieredHints: string[] }
    for (const step of G1_U1_L01_STORY_LESSON.steps) {
      expect(step.hints).toEqual(feedback.tieredHints)
    }
    const assessment = source!.assessment as { scoring: Array<{ criterion: string; weight: number; evidence: string }> }
    expect(G1_U1_L01_STORY_LESSON.scoring).toEqual(assessment.scoring)
    expect(G1_U1_L01_STORY_LESSON.scoring.reduce((sum, item) => sum + item.weight, 0)).toBe(100)
  })

  it('maps the five detailed steps onto seven classroom stages', () => {
    expect(G1_U1_L01_STORY_LESSON.steps.map((s) => s.kind)).toEqual([
      'guided',
      'design',
      'build',
      'run',
      'error-lab',
      'creative',
      'review',
    ])
    const errorLab = G1_U1_L01_STORY_LESSON.steps.find((s) => s.kind === 'error-lab')!
    expect(errorLab.starterBlocks).toEqual([{ type: 'when_start' }, { type: 'move_right' }])
    expect(errorLab.errorLab?.expect).toBe('move_only')
    const creative = G1_U1_L01_STORY_LESSON.steps.find((s) => s.kind === 'creative')!
    expect(creative.creative?.prompt).toBe('增加一段向观众提问的对白。')
  })

  it('offers exactly the opening line and the extension question as say choices', () => {
    expect(STORY_SAY_CHOICES.map((c) => c.text)).toEqual(['欢迎来到森林剧场', '你们准备好了吗？'])
    expect(getStoryLesson('G1-U1-L01')).toBe(G1_U1_L01_STORY_LESSON)
    expect(getStoryLesson('G1-U1-L02')).toBeNull()
  })
})
