import { describe, expect, it } from 'vitest'

import { buildLaunchMap } from './build-launch-map'

describe('buildLaunchMap', () => {
  it('returns twelve foundation lessons and no mid-path paid split', () => {
    const map = buildLaunchMap()

    expect(map.allLessons).toHaveLength(12)
    expect(map.trialLessons).toHaveLength(12)
    expect(map.paidLessons).toHaveLength(0)
    expect(map.allLessons.at(-1)?.id).toBe('lesson-12-graduation-show')
    expect(map.foundationUnits).toHaveLength(4)
    expect(map.remedials.map((item) => item.id)).toContain(
      'remedial-click-trigger',
    )
  })
})
