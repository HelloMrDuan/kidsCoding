import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { LaunchLessonDefinition } from '@/features/domain/types'
import type { GuestProgress } from '@/features/progress/local-progress'

import { MapView } from './map-view'

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
    id: 'course-04-two-characters',
    title: '让两个角色一起表演',
    goal: '安排两个角色先后出场',
    recommendedLevel: 'starter',
    steps: [],
    rewardCardId: 'theme-stage-duo',
    phase: 'course',
    mode: 'guided',
    sortOrder: 4,
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

describe('MapView', () => {
  it('routes paid lessons to purchase when entitlement is missing', () => {
    render(
      <MapView
        hasCourseEntitlement={false}
        lessons={lessons}
        progress={progress}
      />,
    )

    const paidLessonLink = screen.getByTestId(
      'lesson-link-course-04-two-characters',
    )

    expect(paidLessonLink).toHaveTextContent('购买解锁')
    expect(paidLessonLink).toHaveAttribute('href', '/parent/purchase')
  })
})
