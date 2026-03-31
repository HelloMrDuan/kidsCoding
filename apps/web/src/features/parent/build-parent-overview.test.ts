import { describe, expect, it } from 'vitest'

import { buildParentOverview } from './build-parent-overview'

describe('buildParentOverview', () => {
  it('surfaces recent project count and a purchase suggestion before unlock', () => {
    const summary = buildParentOverview({
      profile: {
        display_name: '小小创作者',
        recommended_start_level: 'starter',
      },
      progressRecords: [
        { lesson_id: 'trial-03-scene-story', status: 'completed', stars: 6 },
      ],
      cardRecords: [{ card_definition_id: 'growth-first-project' }],
      badgeRecords: [{ badge_type: 'first-project' }],
      projectSnapshots: [
        {
          lesson_id: 'trial-03-scene-story',
          updated_at: '2026-03-31T10:00:00.000Z',
        },
      ],
      hasLaunchPack: false,
    })

    expect(summary.recentProjectCount).toBe(1)
    expect(summary.nextAction).toContain('购买整套课程')
  })
})
