import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'

import { buildParentOverview } from './build-parent-overview'

describe('buildParentOverview', () => {
  it('surfaces recent project count and an upgrade suggestion after foundation graduation', () => {
    const summary = buildParentOverview({
      profile: {
        display_name: '小小创作者',
        recommended_start_level: 'starter',
      },
      progressRecords: Array.from({ length: 12 }, (_, index) => ({
        lesson_id: `lesson-${String(index + 1).padStart(2, '0')}`,
        status: 'completed',
        stars: 36,
      })),
      cardRecords: [
        { card_definition_id: 'growth-first-project' },
        { card_definition_id: 'commemorative-foundation-graduate' },
      ],
      badgeRecords: [{ badge_type: 'foundation-graduate' }],
      projectSnapshots: [
        {
          lesson_id: 'lesson-12-graduation-show',
          updated_at: '2026-03-31T10:00:00.000Z',
        },
      ],
      lessonCatalog: launchLessons,
      hasLaunchPack: false,
    })

    expect(summary.recentProjectCount).toBe(1)
    expect(summary.nextAction).toContain('启蒙毕业')
    expect(summary.nextAction).toContain('高阶创作')
  })

  it('builds recent projects with lesson titles, descending order, and parent playback links', () => {
    const summary = buildParentOverview({
      profile: {
        display_name: '小小创作者',
        recommended_start_level: 'starter',
      },
      progressRecords: [
        { lesson_id: 'lesson-03-forest-story', status: 'completed', stars: 6 },
        { lesson_id: 'lesson-02-forest-greeting', status: 'completed', stars: 3 },
      ],
      cardRecords: [],
      badgeRecords: [],
      projectSnapshots: [
        {
          lesson_id: 'lesson-02-forest-greeting',
          updated_at: '2026-03-31T09:00:00.000Z',
        },
        {
          lesson_id: 'lesson-03-forest-story',
          updated_at: '2026-03-31T10:00:00.000Z',
        },
      ],
      lessonCatalog: launchLessons,
      hasLaunchPack: true,
    })

    expect(summary.recentProjects).toEqual([
      {
        lessonId: 'lesson-03-forest-story',
        lessonTitle: '森林里的第一次见面',
        href: '/parent/projects/lesson-03-forest-story',
        updatedAt: '2026-03-31T10:00:00.000Z',
      },
      {
        lessonId: 'lesson-02-forest-greeting',
        lessonTitle: '小狐狸打招呼',
        href: '/parent/projects/lesson-02-forest-greeting',
        updatedAt: '2026-03-31T09:00:00.000Z',
      },
    ])
  })
})
