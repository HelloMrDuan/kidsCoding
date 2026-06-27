import { describe, expect, it } from 'vitest'

import { resolveCourseAccess } from './resolve-course-access'

describe('resolveCourseAccess', () => {
  it('allows trial lessons without entitlement', () => {
    expect(
      resolveCourseAccess({ lessonPhase: 'trial', hasLaunchPack: false }),
    ).toBe('allowed')
  })

  it('allows trial lessons even when entitlement exists', () => {
    expect(
      resolveCourseAccess({ lessonPhase: 'trial', hasLaunchPack: true }),
    ).toBe('allowed')
  })

  it('locks course lessons without entitlement', () => {
    expect(
      resolveCourseAccess({ lessonPhase: 'course', hasLaunchPack: false }),
    ).toBe('locked')
  })

  it('allows course lessons with entitlement', () => {
    expect(
      resolveCourseAccess({ lessonPhase: 'course', hasLaunchPack: true }),
    ).toBe('allowed')
  })

  it('locks unknown phases by default to protect paid content', () => {
    expect(
      resolveCourseAccess({
        lessonPhase: 'unknown' as 'trial' | 'course',
        hasLaunchPack: true,
      }),
    ).toBe('locked')
  })
})
