import { describe, expect, it } from 'vitest'

import detailed from './track-g1-detailed-lessons-v1.json'
import {
  G1_U1_L01_STORY_LESSON,
  G1_U1_L02_STORY_LESSON,
  L02_REQUIRED_LINES,
  L02_SAY_CHOICES,
  STORY_SAY_CHOICES,
  getStoryLesson,
} from './g1-u1-story-lessons'

function findLessonById(node: unknown, id: string): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findLessonById(item, id)
      if (found) return found
    }
    return null
  }
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>
    if (record.id === id) return record
    for (const value of Object.values(record)) {
      const found = findLessonById(value, id)
      if (found) return found
    }
  }
  return null
}

function findLesson(node: unknown): Record<string, unknown> | null {
  return findLessonById(node, 'G1-U1-L01')
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
    expect(getStoryLesson('G1-U1-L02')).toBe(G1_U1_L02_STORY_LESSON)
  })
})

describe('G1-U1-L02 story lesson data', () => {
  it('copies the detailed lesson values verbatim, never invents detailed values', () => {
    const source = findLessonById(detailed, 'G1-U1-L02')
    expect(source).not.toBeNull()
    expect(G1_U1_L02_STORY_LESSON.title).toBe(source!.title)
    expect(G1_U1_L02_STORY_LESSON.story).toBe(source!.story)
    expect(G1_U1_L02_STORY_LESSON.objectives).toEqual(source!.objectives)
    expect(G1_U1_L02_STORY_LESSON.parentQuestion).toBe(source!.parentsPrompt)
    expect(G1_U1_L02_STORY_LESSON.extension).toBe(source!.extension)
    const feedback = source!.feedback as { tieredHints: string[] }
    for (const step of G1_U1_L02_STORY_LESSON.steps) {
      expect(step.hints).toEqual(feedback.tieredHints)
    }
    const assessment = source!.assessment as { scoring: Array<{ criterion: string; weight: number; evidence: string }> }
    expect(G1_U1_L02_STORY_LESSON.scoring).toEqual(assessment.scoring)
    expect(G1_U1_L02_STORY_LESSON.scoring.reduce((sum, item) => sum + item.weight, 0)).toBe(100)
  })

  it('maps the five detailed steps onto seven classroom stages', () => {
    expect(G1_U1_L02_STORY_LESSON.steps.map((s) => s.kind)).toEqual([
      'guided',
      'design',
      'build',
      'run',
      'error-lab',
      'creative',
      'review',
    ])
    const errorLab = G1_U1_L02_STORY_LESSON.steps.find((s) => s.kind === 'error-lab')!
    expect(errorLab.starterBlocks).toEqual([
      { type: 'when_start' },
      { type: 'switch_character' },
      { type: 'say_line', line: 'glad' },
      { type: 'switch_character' },
      { type: 'say_line', line: 'hello' },
    ])
    expect(errorLab.errorLab?.expect).toBe('reversed_order')
    const creative = G1_U1_L02_STORY_LESSON.steps.find((s) => s.kind === 'creative')!
    expect(creative.creative?.prompt).toBe('加入第三句角色告别台词。')
    expect(creative.starterBlocks).toEqual([
      { type: 'when_start' },
      { type: 'say_line', line: 'hello' },
      { type: 'switch_character' },
      { type: 'say_line', line: 'glad' },
    ])
  })

  it('offers exactly the two required lines as say choices, no fixed farewell line', () => {
    expect(L02_SAY_CHOICES.map((c) => c.text)).toEqual(['你好', '很高兴见到你'])
    expect(L02_REQUIRED_LINES).toEqual([
      { actor: 'fox', text: '你好' },
      { actor: 'rabbit', text: '很高兴见到你' },
    ])
    expect(getStoryLesson('G1-U1-L02')).toBe(G1_U1_L02_STORY_LESSON)
    expect(getStoryLesson('G1-U1-L99')).toBeNull()
  })
})
