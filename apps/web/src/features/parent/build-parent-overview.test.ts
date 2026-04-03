import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'
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
      lessonCatalog: launchLessons,
      hasLaunchPack: false,
    })

    expect(summary.recentProjectCount).toBe(1)
    expect(summary.nextAction).toContain('购买整套课程')
  })

  it('builds recent projects with lesson titles, descending order, and parent playback links', () => {
    const summary = buildParentOverview({
      profile: {
        display_name: '小小创作者',
        recommended_start_level: 'starter',
      },
      progressRecords: [
        { lesson_id: 'trial-03-scene-story', status: 'completed', stars: 6 },
        { lesson_id: 'trial-02-dialogue-action', status: 'completed', stars: 3 },
      ],
      cardRecords: [],
      badgeRecords: [],
      projectSnapshots: [
        {
          lesson_id: 'trial-02-dialogue-action',
          updated_at: '2026-03-31T09:00:00.000Z',
        },
        {
          lesson_id: 'trial-03-scene-story',
          updated_at: '2026-03-31T10:00:00.000Z',
        },
      ],
      lessonCatalog: launchLessons,
      hasLaunchPack: true,
    })

    expect(summary.recentProjects).toEqual([
      {
        lessonId: 'trial-03-scene-story',
        lessonTitle: '做出第一个完整小故事',
        href: '/parent/projects/trial-03-scene-story',
        updatedAt: '2026-03-31T10:00:00.000Z',
      },
      {
        lessonId: 'trial-02-dialogue-action',
        lessonTitle: '让角色说话和做动作',
        href: '/parent/projects/trial-02-dialogue-action',
        updatedAt: '2026-03-31T09:00:00.000Z',
      },
    ])
  })
})
