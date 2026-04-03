import { describe, expect, it } from 'vitest'

import { foundationUnits } from './foundation-units'
import { launchLessons } from './launch-lessons'

describe('foundation curriculum seed', () => {
  it('defines four units and twelve ordered lessons', () => {
    expect(foundationUnits).toHaveLength(4)
    expect(launchLessons).toHaveLength(12)
    expect(launchLessons[0]?.id).toBe('lesson-01-forest-hello')
    expect(launchLessons[11]?.id).toBe('lesson-12-graduation-show')
  })

  it('expands the first three lessons into polished five-step scripts', () => {
    const lessons = launchLessons.slice(0, 3)

    expect(lessons[0]?.steps).toHaveLength(5)
    expect(lessons[1]?.steps).toHaveLength(5)
    expect(lessons[2]?.steps).toHaveLength(5)
    expect(lessons[2]?.goal).toContain('完整小故事')
  })

  it('expands lessons 4 to 6 into the second unit five-step scripts', () => {
    const lessons = launchLessons.slice(3, 6)

    expect(lessons[0]?.steps).toHaveLength(5)
    expect(lessons[1]?.steps).toHaveLength(5)
    expect(lessons[2]?.steps).toHaveLength(5)
    expect(lessons[0]?.goal).toContain('场景')
    expect(lessons[1]?.goal).toContain('顺序')
    expect(lessons[2]?.goal).toContain('完整小故事')
  })
})
