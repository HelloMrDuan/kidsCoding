import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { defaultGuestProgress } from '@/features/progress/local-progress'

import { MapView } from './map-view'

describe('MapView', () => {
  it('renders the growth track, current focus card, and primary continue action', () => {
    const { allLessons } = buildLaunchMap()

    render(
      <MapView
        hasCourseEntitlement={false}
        lessons={allLessons}
        progress={{
          ...defaultGuestProgress,
          completedLessonIds: [
            'lesson-01-forest-hello',
            'lesson-02-forest-greeting',
          ],
          currentLessonId: 'lesson-03-forest-story',
        }}
      />,
    )

    expect(screen.getByTestId('learning-map-current-focus')).toBeInTheDocument()
    expect(screen.getByTestId('learning-map-focus-preview')).toBeInTheDocument()
    expect(screen.getByTestId('learning-map-track')).toBeInTheDocument()
    expect(screen.getByTestId('learning-map-high-tier')).toBeInTheDocument()

    expect(
      screen.getByRole('link', { name: '继续第 3 节' }),
    ).toHaveAttribute('href', '/learn/lesson/lesson-03-forest-story')

    expect(screen.getByTestId('map-unit-unit-1-forest-meetup')).toBeInTheDocument()
    expect(
      screen.getByTestId('map-unit-unit-2-meadow-journey'),
    ).toBeInTheDocument()
    expect(
      screen.getByTestId('map-unit-unit-3-garden-interaction'),
    ).toBeInTheDocument()
    expect(
      screen.getByTestId('map-unit-unit-4-graduation-show'),
    ).toBeInTheDocument()

    const currentNode = screen.getByTestId('map-node-lesson-03-forest-story')
    expect(within(currentNode).getByText('现在就做')).toBeInTheDocument()

    const nextNode = screen.getByTestId('map-node-lesson-04-meadow-scene')
    expect(within(nextNode).getByText('下一站')).toBeInTheDocument()
  })

  it('shows the paid upgrade action after the child finishes the foundation route', () => {
    const { allLessons } = buildLaunchMap()

    render(
      <MapView
        hasCourseEntitlement={false}
        lessons={allLessons}
        progress={{
          ...defaultGuestProgress,
          completedLessonIds: allLessons.map((lesson) => lesson.id),
          currentLessonId: 'lesson-12-graduation-show',
        }}
      />,
    )

    expect(
      screen.getByRole('link', { name: '解锁高阶创作' }),
    ).toHaveAttribute('href', '/parent/purchase')
  })
})
