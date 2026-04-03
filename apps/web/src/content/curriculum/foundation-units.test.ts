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
})
