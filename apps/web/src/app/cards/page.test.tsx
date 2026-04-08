import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import CardsPage from './page'

const { progressFixture } = vi.hoisted(() => ({
  progressFixture: {
    completedLessonIds: [],
    currentLessonId: 'lesson-01-forest-hello',
    stars: 9,
    badgeIds: ['lesson-lesson-03-forest-story'],
    cardIds: ['growth-first-project'],
    streakDays: 1,
    completedProjectIds: [],
    projectSnapshots: [],
  },
}))

vi.mock('@/features/progress/local-progress', () => ({
  defaultGuestProgress: progressFixture,
  readGuestProgress: () => progressFixture,
  subscribeGuestProgress: () => () => {},
}))

describe('CardsPage', () => {
  it('renders the growth gallery summary, badges, and card collection', () => {
    render(<CardsPage />)

    expect(screen.getByText('成长收藏馆')).toBeInTheDocument()
    expect(screen.getByText('已获得星星')).toBeInTheDocument()
    expect(screen.getByText('勋章墙')).toBeInTheDocument()
    expect(screen.getByText('高质感收藏卡')).toBeInTheDocument()
  })
})
