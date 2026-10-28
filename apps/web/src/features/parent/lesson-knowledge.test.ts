import { describe, expect, it } from 'vitest'

import { getLessonKnowledge, resolveLessonConcepts } from './lesson-knowledge'

describe('getLessonKnowledge', () => {
  it('reads concepts and focusConcept from the 432-lesson catalog', () => {
    const knowledge = getLessonKnowledge('G0-U1-L01')

    expect(knowledge).not.toBeNull()
    expect(knowledge?.source).toBe('catalog')
    expect(knowledge?.lessonTitle).toBe('小狐狸认识按钮')
    expect(knowledge?.concepts).toContain('指令')
    expect(knowledge?.focusConcept).toBe('指令')
  })

  it('reads concepts from the 12 foundation guides', () => {
    const knowledge = getLessonKnowledge('lesson-01-forest-hello')

    expect(knowledge).not.toBeNull()
    expect(knowledge?.source).toBe('foundation')
    expect(knowledge?.lessonTitle).toBe('小狐狸出场')
    expect(knowledge?.concepts).toContain('顺序')
    expect(knowledge?.concepts).toContain('开始事件')
    expect(knowledge?.focusConcept).toBeNull()
  })

  it('returns null for an unknown lesson id instead of inventing tags', () => {
    expect(getLessonKnowledge('no-such-lesson')).toBeNull()
    expect(getLessonKnowledge('G9-U9-L99')).toBeNull()
  })
})

describe('resolveLessonConcepts', () => {
  it('dedupes and trims concepts in order', () => {
    expect(resolveLessonConcepts([' 顺序 ', '顺序', '', '开始事件'], null)).toEqual([
      '顺序',
      '开始事件',
    ])
  })

  it('falls back to focusConcept only when no concepts are registered', () => {
    expect(resolveLessonConcepts([], '指令')).toEqual(['指令'])
    expect(resolveLessonConcepts(undefined, '指令')).toEqual(['指令'])
  })

  it('returns an empty list when neither concepts nor focusConcept exist', () => {
    expect(resolveLessonConcepts([], null)).toEqual([])
    expect(resolveLessonConcepts(undefined, undefined)).toEqual([])
  })
})
