import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { LaunchLessonDefinition } from '@/features/domain/types'
import type { GuestProgress } from '@/features/progress/local-progress'

import { MapView } from './map-view'

const lessons: LaunchLessonDefinition[] = [
  {
    id: 'trial-01-move-character',
    title: '让角色动起来',
    goal: '让主角从舞台左边走到右边，完成第一次动作表演。',
    recommendedLevel: 'starter',
    steps: [],
    rewardCardId: 'theme-scout-cat',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 1,
    hintLayers: [],
  },
  {
    id: 'trial-02-say-hello',
    title: '让角色开口说话',
    goal: '给主角加上一句对白，让故事开始真正像小剧场。',
    recommendedLevel: 'starter',
    steps: [],
    rewardCardId: 'theme-stage-hello',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 2,
    hintLayers: [],
  },
  {
    id: 'course-04-two-characters',
    title: '让两个角色一起表演',
    goal: '安排两个角色先后出场，做成完整一点的互动片段。',
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
  completedLessonIds: ['trial-01-move-character'],
  currentLessonId: 'trial-02-say-hello',
  stars: 6,
  badgeIds: ['starter-story'],
  cardIds: ['theme-scout-cat'],
  streakDays: 3,
  completedProjectIds: [],
  projectSnapshots: [],
}

describe('MapView', () => {
  it('renders the route as a growth journey with current and locked states', () => {
    render(
      <MapView
        hasCourseEntitlement={false}
        lessons={lessons}
        progress={progress}
      />,
    )

    expect(screen.getByRole('heading', { name: '沿着成长路线继续创作' })).toBeInTheDocument()
    expect(screen.getByText('当前推荐')).toBeInTheDocument()
    expect(screen.getAllByText('启蒙体验').length).toBeGreaterThan(0)
    expect(screen.getAllByText('高阶预备').length).toBeGreaterThan(0)
    expect(screen.getByTestId('lesson-link-trial-02-say-hello')).toHaveTextContent(
      '继续创作',
    )

    const paidLessonLink = screen.getByTestId(
      'lesson-link-course-04-two-characters',
    )

    expect(paidLessonLink).toHaveTextContent('解锁高阶创作')
    expect(paidLessonLink).toHaveAttribute('href', '/parent/purchase')
  })
})
