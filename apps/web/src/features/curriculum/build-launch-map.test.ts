import { describe, expect, it } from 'vitest'

import { buildLaunchMap } from './build-launch-map'

describe('buildLaunchMap', () => {
  it('returns 3 trial lessons and 12 paid lessons', () => {
    const map = buildLaunchMap()

    expect(map.trialLessons).toHaveLength(3)
    expect(map.paidLessons).toHaveLength(12)
    expect(map.allLessons.at(-1)?.id).toBe('course-15-finish-story')
    expect(map.remedials.map((item) => item.id)).toContain(
      'remedial-click-trigger',
    )
  })
})
