import { describe, expect, it } from 'vitest'

import { mergeGuestSnapshot } from './merge-guest-snapshot'
import { parseGuestSnapshotPayload, toGuestSyncPayload } from './guest-snapshot-payload'
import { defaultGuestProgress } from './local-progress'

describe('guest sync payload (TQ-013)', () => {
  const progress = {
    ...defaultGuestProgress,
    completedLessonIds: ['lesson-01-forest-hello'],
    stars: 3,
    badgeIds: ['first-project'],
    cardIds: ['theme-forest-fox'],
    projectSnapshots: [
      { lessonId: 'lesson-03-forest-story', updatedAt: '2026-10-22T01:02:03.004Z', blocks: [{ type: 'say_line', line: 'hello' }] },
    ],
  }
  const onboarding = {
    ageBand: 'age_6_8' as const,
    recommendedLevel: 'starter' as const,
    answers: [{ questionId: 'q1', optionId: 'a', score: 1 }],
  }

  it('client payload drops answers and local-only fields', () => {
    const body = toGuestSyncPayload({ onboarding, progress })
    expect(body.onboarding).toEqual({ ageBand: 'age_6_8', recommendedLevel: 'starter' })
    expect(Object.keys(body.progress).sort()).toEqual(['badgeIds', 'cardIds', 'completedLessonIds', 'projectSnapshots'])
  })

  it('client payload passes server validation and still merges on bind-account', () => {
    const parsed = parseGuestSnapshotPayload(JSON.parse(JSON.stringify(toGuestSyncPayload({ onboarding, progress }))))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const merged = mergeGuestSnapshot({
      snapshot: {
        onboarding: { ageBand: 'age_6_8', recommendedLevel: 'starter' },
        progress: parsed.payload.progress,
      },
    })
    expect(merged.childProfile).toEqual({ ageBand: 'age_6_8', recommendedStartLevel: 'starter' })
    expect(merged.progressRecords.map((r) => r.lessonId)).toEqual(['lesson-01-forest-hello'])
    expect(merged.projectSnapshots[0].blocks).toEqual([{ type: 'say_line', line: 'hello' }])
  })

  it('accepts an empty first-visit session', () => {
    const parsed = parseGuestSnapshotPayload(
      toGuestSyncPayload({ onboarding: { ageBand: null, recommendedLevel: null }, progress: defaultGuestProgress }),
    )
    expect(parsed.ok).toBe(true)
  })
})
