import { describe, expect, it } from 'vitest'

import { resolveCourseAccess } from './resolve-course-access'

describe('resolveCourseAccess', () => {
  it('allows all trial lessons but locks paid lessons without entitlement', () => {
    expect(
      resolveCourseAccess({ lessonPhase: 'trial', hasLaunchPack: false }),
    ).toBe('allowed')
    expect(
      resolveCourseAccess({ lessonPhase: 'course', hasLaunchPack: false }),
    ).toBe('locked')
    expect(
      resolveCourseAccess({ lessonPhase: 'course', hasLaunchPack: true }),
    ).toBe('allowed')
  })
})
