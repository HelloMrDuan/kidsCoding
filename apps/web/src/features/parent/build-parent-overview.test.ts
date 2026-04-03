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

  it('suggests moving into unit 2 after the first complete story is finished', () => {
    const summary = buildParentOverview({
      profile: {
        display_name: '小小创作者',
        recommended_start_level: 'starter',
      },
      progressRecords: [
        { lesson_id: 'lesson-01-forest-hello', status: 'completed', stars: 3 },
        { lesson_id: 'lesson-02-forest-greeting', status: 'completed', stars: 6 },
        { lesson_id: 'lesson-03-forest-story', status: 'completed', stars: 9 },
      ],
      cardRecords: [{ card_definition_id: 'growth-first-project' }],
      badgeRecords: [{ badge_type: 'lesson-lesson-03-forest-story' }],
      projectSnapshots: [
        {
          lesson_id: 'lesson-03-forest-story',
          updated_at: '2026-03-31T10:00:00.000Z',
        },
      ],
      lessonCatalog: launchLessons,
      hasLaunchPack: false,
    })

    expect(summary.nextAction).toContain('第一个完整小故事')
    expect(summary.nextAction).toContain('第二单元')
  })

  it('suggests moving into unit 3 after the second complete story is finished', () => {
    const summary = buildParentOverview({
      profile: {
        display_name: '小小创作者',
        recommended_start_level: 'starter',
      },
      progressRecords: [
        { lesson_id: 'lesson-01-forest-hello', status: 'completed', stars: 3 },
        { lesson_id: 'lesson-02-forest-greeting', status: 'completed', stars: 6 },
        { lesson_id: 'lesson-03-forest-story', status: 'completed', stars: 9 },
        { lesson_id: 'lesson-04-meadow-scene', status: 'completed', stars: 12 },
        { lesson_id: 'lesson-05-meadow-order', status: 'completed', stars: 15 },
        { lesson_id: 'lesson-06-meadow-story', status: 'completed', stars: 18 },
      ],
      cardRecords: [{ card_definition_id: 'theme-meadow-story' }],
      badgeRecords: [{ badge_type: 'lesson-lesson-06-meadow-story' }],
      projectSnapshots: [
        {
          lesson_id: 'lesson-06-meadow-story',
          updated_at: '2026-03-31T12:00:00.000Z',
        },
      ],
      lessonCatalog: launchLessons,
      hasLaunchPack: false,
    })

    expect(summary.nextAction).toContain('第二个完整小故事')
    expect(summary.nextAction).toContain('第三单元')
  })

  it('suggests moving into unit 4 after the interactive story is finished', () => {
    const summary = buildParentOverview({
      profile: {
        display_name: '小小创作者',
        recommended_start_level: 'starter',
      },
      progressRecords: [
        { lesson_id: 'lesson-01-forest-hello', status: 'completed', stars: 3 },
        { lesson_id: 'lesson-02-forest-greeting', status: 'completed', stars: 6 },
        { lesson_id: 'lesson-03-forest-story', status: 'completed', stars: 9 },
        { lesson_id: 'lesson-04-meadow-scene', status: 'completed', stars: 12 },
        { lesson_id: 'lesson-05-meadow-order', status: 'completed', stars: 15 },
        { lesson_id: 'lesson-06-meadow-story', status: 'completed', stars: 18 },
        { lesson_id: 'lesson-07-garden-click', status: 'completed', stars: 21 },
        { lesson_id: 'lesson-08-garden-dialogue', status: 'completed', stars: 24 },
        { lesson_id: 'lesson-09-garden-story', status: 'completed', stars: 27 },
      ],
      cardRecords: [{ card_definition_id: 'theme-garden-story' }],
      badgeRecords: [{ badge_type: 'lesson-lesson-09-garden-story' }],
      projectSnapshots: [
        {
          lesson_id: 'lesson-09-garden-story',
          updated_at: '2026-03-31T14:00:00.000Z',
        },
      ],
      lessonCatalog: launchLessons,
      hasLaunchPack: false,
    })

    expect(summary.nextAction).toContain('互动故事')
    expect(summary.nextAction).toContain('第四单元')
  })
})
