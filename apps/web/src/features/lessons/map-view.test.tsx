import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { defaultGuestProgress } from '@/features/progress/local-progress'

import { MapView } from './map-view'

const partialProgress = {
  ...defaultGuestProgress,
  completedLessonIds: ['lesson-01-forest-hello', 'lesson-02-forest-greeting'],
  currentLessonId: 'lesson-03-forest-story',
}

describe('MapView', () => {
  it('selects the recommended lesson unit by default and derives real states', () => {
    const { allLessons } = buildLaunchMap()
    render(
      <MapView lessons={allLessons} progress={partialProgress} />,
    )

    expect(screen.getByTestId('adventure-map')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '第一单元 · 森林见面会' })).toBeInTheDocument()

    const steps = screen.getByTestId('adventure-map-steps')
    const first = within(steps).getByTestId('lesson-card-lesson-01-forest-hello')
    expect(first).toHaveTextContent('✓')
    expect(first).toHaveTextContent('已完成')
    expect(first).toHaveAttribute('href', '/learn/lesson/lesson-01-forest-hello')
    const current = within(steps).getByTestId('lesson-card-lesson-03-forest-story')
    expect(current).toHaveTextContent('当前练习')
    expect(current).toHaveAttribute('href', '/learn/lesson/lesson-03-forest-story')
  })

  it('shows all 12 real lessons across the four units, none repeated, none invented', () => {
    const { allLessons } = buildLaunchMap()
    render(<MapView lessons={allLessons} progress={partialProgress} />)

    const seen = new Set<string>()
    const unitIds = [
      'unit-1-forest-meetup',
      'unit-2-meadow-journey',
      'unit-3-garden-interaction',
      'unit-4-graduation-show',
    ]
    for (const unitId of unitIds) {
      fireEvent.click(screen.getByTestId(`adventure-map-unit-${unitId}`))
      const steps = screen.getByTestId('adventure-map-steps')
      const cards = steps.querySelectorAll('[data-testid^="lesson-card-"]')
      expect(cards).toHaveLength(3)
      for (const card of cards) {
        const id = card.getAttribute('data-testid')?.replace('lesson-card-', '')
        expect(id).toBeTruthy()
        expect(seen.has(id!)).toBe(false)
        seen.add(id!)
      }
    }
    expect(seen.size).toBe(12)
    expect([...seen].sort()).toEqual(allLessons.map((lesson) => lesson.id).sort())
  })

  it('never locks lessons after the current one: they stay available and linked', () => {
    const { allLessons } = buildLaunchMap()
    render(<MapView lessons={allLessons} progress={partialProgress} />)

    fireEvent.click(screen.getByTestId('adventure-map-unit-unit-2-meadow-journey'))
    const steps = screen.getByTestId('adventure-map-steps')
    const next = within(steps).getByTestId('lesson-card-lesson-04-meadow-scene')
    expect(next).toHaveTextContent('可以开始')
    expect(next).toHaveAttribute('href', '/learn/lesson/lesson-04-meadow-scene')
    expect(within(steps).queryByText('已锁定')).not.toBeInTheDocument()
    expect(within(steps).queryByText('未开放')).not.toBeInTheDocument()
    expect(screen.getByTestId('adventure-map-next-lesson')).toHaveAttribute(
      'href',
      '/learn/lesson/lesson-04-meadow-scene',
    )
  })

  it('keeps the user-selected unit when progress changes, and re-derives on re-entry', () => {
    const { allLessons } = buildLaunchMap()
    const { rerender, unmount } = render(
      <MapView lessons={allLessons} progress={partialProgress} />,
    )

    fireEvent.click(screen.getByTestId('adventure-map-unit-unit-3-garden-interaction'))
    expect(screen.getByRole('heading', { name: '第三单元 · 花园互动秀' })).toBeInTheDocument()

    // Progress advances but the user stays on the unit they picked.
    rerender(
      <MapView
        lessons={allLessons}
        progress={{
          ...partialProgress,
          completedLessonIds: [
            'lesson-01-forest-hello',
            'lesson-02-forest-greeting',
            'lesson-03-forest-story',
          ],
          currentLessonId: 'lesson-04-meadow-scene',
        }}
      />,
    )
    expect(screen.getByRole('heading', { name: '第三单元 · 花园互动秀' })).toBeInTheDocument()

    // Re-entering the page re-derives the default unit from the new progress.
    unmount()
    render(
      <MapView
        lessons={allLessons}
        progress={{
          ...partialProgress,
          completedLessonIds: [
            'lesson-01-forest-hello',
            'lesson-02-forest-greeting',
            'lesson-03-forest-story',
          ],
          currentLessonId: 'lesson-04-meadow-scene',
        }}
      />,
    )
    expect(screen.getByRole('heading', { name: '第二单元 · 小动物去旅行' })).toBeInTheDocument()
  })

  it('follows the recommended unit when lessons arrive after the first render', () => {
    const { allLessons } = buildLaunchMap()
    const { rerender } = render(<MapView lessons={[]} progress={defaultGuestProgress} />)
    expect(screen.getByTestId('learning-map-empty')).toBeInTheDocument()

    rerender(
      <MapView
        lessons={allLessons}
        progress={{
          ...defaultGuestProgress,
          completedLessonIds: [
            'lesson-01-forest-hello',
            'lesson-02-forest-greeting',
            'lesson-03-forest-story',
            'lesson-04-meadow-scene',
            'lesson-05-meadow-order',
            'lesson-06-meadow-story',
            'lesson-07-garden-click',
            'lesson-08-garden-dialogue',
            'lesson-09-garden-story',
          ],
          currentLessonId: 'lesson-10-second-friend',
        }}
      />,
    )
    expect(screen.getByRole('heading', { name: '第四单元 · 动物朋友合作演出' })).toBeInTheDocument()
  })

  it('shows all lessons completed and points the bottom action back at re-learning', () => {
    const { allLessons } = buildLaunchMap()
    render(
      <MapView
        lessons={allLessons}
        progress={{
          ...defaultGuestProgress,
          completedLessonIds: allLessons.map((lesson) => lesson.id),
          currentLessonId: 'lesson-12-graduation-show',
        }}
      />,
    )

    fireEvent.click(screen.getByTestId('adventure-map-unit-unit-4-graduation-show'))
    const steps = screen.getByTestId('adventure-map-steps')
    expect(within(steps).getAllByText('已完成')).toHaveLength(3)
    expect(screen.getByTestId('adventure-map-next-lesson')).toHaveAttribute(
      'href',
      '/learn/lesson/lesson-10-second-friend',
    )
  })

  it('shows a real empty state when there is no lesson data at all', () => {
    render(<MapView lessons={[]} progress={defaultGuestProgress} />)
    expect(screen.getByTestId('learning-map-empty')).toHaveTextContent('暂无课程数据')
    expect(screen.queryByTestId('adventure-map')).not.toBeInTheDocument()
  })

  it('shows fewer real nodes and the real count when a lesson is missing', () => {
    const { allLessons } = buildLaunchMap()
    const withoutLesson6 = allLessons.filter((lesson) => lesson.id !== 'lesson-06-meadow-story')
    render(<MapView lessons={withoutLesson6} progress={partialProgress} />)

    fireEvent.click(screen.getByTestId('adventure-map-unit-unit-2-meadow-journey'))
    const steps = screen.getByTestId('adventure-map-steps')
    expect(steps.querySelectorAll('[data-testid^="lesson-card-"]')).toHaveLength(2)
    expect(screen.getByText('2 个学习任务')).toBeInTheDocument()
    expect(screen.getByText('第 04–05 课')).toBeInTheDocument()
  })
})
