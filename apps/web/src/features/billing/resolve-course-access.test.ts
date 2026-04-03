import { describe, expect, it } from 'vitest'

import { resolveCourseAccess } from './resolve-course-access'

describe('resolveCourseAccess', () => {
  it('keeps all foundation lessons open without entitlement', () => {
    expect(
      resolveCourseAccess({ lessonPhase: 'trial', hasLaunchPack: false }),
    ).toBe('allowed')
    expect(
      resolveCourseAccess({ lessonPhase: 'course', hasLaunchPack: false }),
    ).toBe('allowed')
    expect(
      resolveCourseAccess({ lessonPhase: 'course', hasLaunchPack: true }),
    ).toBe('allowed')
  })
})
