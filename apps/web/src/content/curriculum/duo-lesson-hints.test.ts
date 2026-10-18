import { describe, expect, it } from 'vitest'

import { duoLessonHints, launchLessons } from './launch-lessons'

describe('TQ-003 duo lessons hint layers', () => {
  it('classroom feedback hints and the duo stage hints are the same three layers', () => {
    for (const [lessonId, hints] of Object.entries(duoLessonHints)) {
      const lesson = launchLessons.find((item) => item.id === lessonId)
      expect(lesson?.hintLayers.map((layer) => layer.copy), lessonId).toEqual([...hints])
    }
  })

  it('lesson 11 hints teach dialogue ownership on one start line (no wrong concept)', () => {
    const copy = duoLessonHints['lesson-11-duo-rehearsal'].join('')
    expect(copy).not.toContain('不能共用一条开始线')
    expect(copy).toContain('只作用于当前操作的朋友')
    expect(copy).toContain('接在切换之后')
  })
})
