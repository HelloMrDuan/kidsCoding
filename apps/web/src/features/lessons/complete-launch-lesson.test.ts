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
})
