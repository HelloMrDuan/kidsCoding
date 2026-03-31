import { describe, expect, it } from 'vitest'

import type { LaunchLessonDefinition } from '@/features/domain/types'
import type { GuestProgress } from '@/features/progress/local-progress'

import { completeLaunchLesson } from './complete-launch-lesson'

const lessons: LaunchLessonDefinition[] = [
  {
    id: 'trial-01-move-character',
    title: '让角色动起来',
    goal: '主角从左边走到右边',
    recommendedLevel: 'starter',
    steps: [],
    rewardCardId: 'theme-scout-cat',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 1,
    hintLayers: [],
  },
  {
    id: 'trial-02-dialogue-action',
    title: '让角色说话和做动作',
    goal: '角色边走边说一句话',
    recommendedLevel: 'starter',
    steps: [],
    rewardCardId: 'theme-dialogue-bird',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 2,
    hintLayers: [],
  },
]

const progress: GuestProgress = {
  completedLessonIds: [],
  currentLessonId: 'trial-01-move-character',
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
        badgeIds: ['lesson-trial-01-move-character'],
        cardIds: ['theme-scout-cat'],
      },
      updatedAt: '2026-03-31T10:00:00.000Z',
    })

    expect(result.currentLessonId).toBe('trial-02-dialogue-action')
    expect(result.completedLessonIds).toEqual(['trial-01-move-character'])
    expect(result.completedProjectIds).toEqual(['trial-01-move-character'])
    expect(result.projectSnapshots).toEqual([
      {
        lessonId: 'trial-01-move-character',
        updatedAt: '2026-03-31T10:00:00.000Z',
        blocks: [{ type: 'when_start' }, { type: 'move_right' }],
      },
    ])
  })
})
