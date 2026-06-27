import { describe, expect, it } from 'vitest'

import type { LaunchLessonDefinition } from '@/features/domain/types'
import type { GuestProgress } from '@/features/progress/local-progress'

import { completeLaunchLesson } from './complete-launch-lesson'

const lessons: LaunchLessonDefinition[] = [
  {
    id: 'lesson-01-forest-hello',
    title: '小狐狸出场',
    goal: '让小狐狸自己走上舞台，完成第一次出场。',
    recommendedLevel: 'starter',
    steps: [],
    rewardCardId: 'theme-forest-fox',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 1,
    hintLayers: [],
  },
  {
    id: 'lesson-02-forest-greeting',
    title: '小狐狸打招呼',
    goal: '让小狐狸开口说一句欢迎的话。',
    recommendedLevel: 'starter',
    steps: [],
    rewardCardId: 'theme-forest-rabbit',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 2,
    hintLayers: [],
  },
]

const progress: GuestProgress = {
  completedLessonIds: [],
  currentLessonId: 'lesson-01-forest-hello',
  stars: 0,
  badgeIds: [],
  cardIds: [],
  streakDays: 1,
  completedProjectIds: [],
  projectSnapshots: [],
}

describe('completeLaunchLesson', () => {
  it('moves progress to the next lesson and records the latest project snapshot', () => {
    const result = completeLaunchLesson({
      blocks: [{ type: 'when_start' }, { type: 'move_right' }],
      lesson: lessons[0],
      lessons,
      progress,
      reward: {
        stars: 3,
        badgeIds: ['lesson-lesson-01-forest-hello'],
        cardIds: ['theme-forest-fox'],
      },
      updatedAt: '2026-03-31T10:00:00.000Z',
    })

    expect(result.currentLessonId).toBe('lesson-02-forest-greeting')
    expect(result.completedLessonIds).toEqual(['lesson-01-forest-hello'])
    expect(result.completedProjectIds).toEqual(['lesson-01-forest-hello'])
    expect(result.projectSnapshots).toEqual([
      {
        lessonId: 'lesson-01-forest-hello',
        updatedAt: '2026-03-31T10:00:00.000Z',
        blocks: [{ type: 'when_start' }, { type: 'move_right' }],
      },
    ])
  })

  it('adds stars when a lesson is completed for the first time', () => {
    const result = completeLaunchLesson({
      blocks: [{ type: 'when_start' }, { type: 'move_right' }],
      lesson: lessons[0],
      lessons,
      progress: { ...progress, stars: 0 },
      reward: {
        stars: 3,
        badgeIds: ['lesson-lesson-01-forest-hello'],
        cardIds: ['theme-forest-fox'],
      },
      updatedAt: '2026-03-31T10:00:00.000Z',
    })

    expect(result.stars).toBe(3)
    expect(result.badgeIds).toEqual(['lesson-lesson-01-forest-hello'])
    expect(result.cardIds).toEqual(['theme-forest-fox'])
  })

  it('does not add stars when the same lesson is completed again', () => {
    const result = completeLaunchLesson({
      blocks: [{ type: 'when_start' }, { type: 'move_right' }],
      lesson: lessons[0],
      lessons,
      progress: {
        ...progress,
        completedLessonIds: ['lesson-01-forest-hello'],
        stars: 3,
        badgeIds: ['lesson-lesson-01-forest-hello'],
        cardIds: ['theme-forest-fox'],
        completedProjectIds: ['lesson-01-forest-hello'],
        projectSnapshots: [
          {
            lessonId: 'lesson-01-forest-hello',
            updatedAt: '2026-03-31T09:00:00.000Z',
            blocks: [{ type: 'when_start' }],
          },
        ],
      },
      reward: {
        stars: 3,
        badgeIds: ['lesson-lesson-01-forest-hello'],
        cardIds: ['theme-forest-fox'],
      },
      updatedAt: '2026-03-31T10:00:00.000Z',
    })

    expect(result.stars).toBe(3)
    expect(result.badgeIds).toEqual(['lesson-lesson-01-forest-hello'])
    expect(result.cardIds).toEqual(['theme-forest-fox'])
    expect(result.completedLessonIds).toEqual(['lesson-01-forest-hello'])
  })

  it('updates the project snapshot with newer content when the same lesson is redone', () => {
    const result = completeLaunchLesson({
      blocks: [
        { type: 'when_start' },
        { type: 'move_right' },
        { type: 'say_line' },
      ],
      lesson: lessons[0],
      lessons,
      progress: {
        ...progress,
        completedLessonIds: ['lesson-01-forest-hello'],
        stars: 3,
        completedProjectIds: ['lesson-01-forest-hello'],
        projectSnapshots: [
          {
            lessonId: 'lesson-01-forest-hello',
            updatedAt: '2026-03-31T09:00:00.000Z',
            blocks: [{ type: 'when_start' }],
          },
        ],
      },
      reward: {
        stars: 3,
        badgeIds: ['lesson-lesson-01-forest-hello'],
        cardIds: ['theme-forest-fox'],
      },
      updatedAt: '2026-03-31T10:00:00.000Z',
    })

    expect(result.projectSnapshots).toEqual([
      {
        lessonId: 'lesson-01-forest-hello',
        updatedAt: '2026-03-31T10:00:00.000Z',
        blocks: [
          { type: 'when_start' },
          { type: 'move_right' },
          { type: 'say_line' },
        ],
      },
    ])
  })

  it('keeps adding stars when different lessons are completed', () => {
    const afterFirst = completeLaunchLesson({
      blocks: [{ type: 'when_start' }, { type: 'move_right' }],
      lesson: lessons[0],
      lessons,
      progress,
      reward: {
        stars: 3,
        badgeIds: ['lesson-lesson-01-forest-hello'],
        cardIds: ['theme-forest-fox'],
      },
      updatedAt: '2026-03-31T10:00:00.000Z',
    })

    const afterSecond = completeLaunchLesson({
      blocks: [{ type: 'when_start' }, { type: 'say_line' }],
      lesson: lessons[1],
      lessons,
      progress: afterFirst,
      reward: {
        stars: 3,
        badgeIds: ['lesson-lesson-02-forest-greeting'],
        cardIds: ['theme-forest-rabbit'],
      },
      updatedAt: '2026-03-31T11:00:00.000Z',
    })

    expect(afterSecond.stars).toBe(6)
    expect(afterSecond.completedLessonIds).toEqual([
      'lesson-01-forest-hello',
      'lesson-02-forest-greeting',
    ])
    expect(afterSecond.badgeIds).toEqual([
      'lesson-lesson-01-forest-hello',
      'lesson-lesson-02-forest-greeting',
    ])
    expect(afterSecond.cardIds).toEqual([
      'theme-forest-fox',
      'theme-forest-rabbit',
    ])
  })
})
