import { describe, expect, it } from 'vitest'

import { buildParentOverview } from './build-parent-overview'

describe('buildParentOverview', () => {
  it('uses the highest recorded star snapshot instead of summing duplicates', () => {
    const result = buildParentOverview({
      profile: {
        display_name: '小小创作者',
        recommended_start_level: 'foundation',
      },
      progressRecords: [
        { lesson_id: 'move-character', status: 'completed', stars: 3 },
        { lesson_id: 'story-talk', status: 'completed', stars: 6 },
      ],
      cardRecords: [{ card_definition_id: 'theme-scout-cat' }],
      badgeRecords: [{ badge_type: 'lesson-move-character' }],
    })

    expect(result.earnedStarCount).toBe(6)
    expect(result.completedLessonCount).toBe(2)
  })
})
