import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AdventureMap } from './adventure-map'
import type { AdventureMapUnit } from './adventure-map'

const units: AdventureMapUnit[] = [
  {
    id: 'unit-1',
    title: '第一单元标题',
    summary: '第一单元简介。',
    lessons: [
      { id: 'lesson-01', title: '第一课', sortOrder: 1, state: 'completed', href: '/learn/lesson/lesson-01' },
      { id: 'lesson-02', title: '第二课', sortOrder: 2, state: 'completed', href: '/learn/lesson/lesson-02' },
      { id: 'lesson-03', title: '第三课', sortOrder: 3, state: 'current', href: '/learn/lesson/lesson-03' },
    ],
  },
  {
    id: 'unit-2',
    title: '第二单元标题',
    summary: '第二单元简介。',
    lessons: [
      { id: 'lesson-04', title: '第四课', sortOrder: 4, state: 'available', href: '/learn/lesson/lesson-04' },
      { id: 'lesson-05', title: '第五课', sortOrder: 5, state: 'available', href: '/learn/lesson/lesson-05' },
      { id: 'lesson-06', title: '第六课', sortOrder: 6, state: 'available', href: '/learn/lesson/lesson-06' },
    ],
  },
]

describe('AdventureMap', () => {
  it('renders the four-unit aside, selected head, cover, and the selected unit steps', () => {
    render(
      <AdventureMap units={units} selectedUnitId="unit-1" onSelectUnit={() => {}} />,
    )

    expect(screen.getByTestId('adventure-map')).toBeInTheDocument()
    expect(screen.getByText('图形化启蒙 · 四个学习单元')).toBeInTheDocument()
    const asideUnit1 = screen.getByTestId('adventure-map-unit-unit-1')
    expect(within(asideUnit1).getByText('第一单元标题')).toBeInTheDocument()
    expect(within(asideUnit1).getByText('第 01–03 课')).toBeInTheDocument()
    expect(asideUnit1).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('adventure-map-unit-unit-2')).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    expect(screen.getByRole('heading', { name: '第一单元 · 第一单元标题' })).toBeInTheDocument()
    expect(screen.getByText('第一单元简介。')).toBeInTheDocument()
    expect(screen.getByText('3 个学习任务')).toBeInTheDocument()
    expect(screen.getByText('CHAPTER 01')).toBeInTheDocument()

    // UX-106: kid-friendly cartoon world with real illustrated characters.
    const cover = screen.getByTestId('map-world-scene')
    expect(cover).toHaveAttribute('role', 'img')
    expect(cover).toHaveAttribute('aria-label', '第一单元标题 卡通冒险地图')
    expect(cover.querySelectorAll('[data-character-art]').length).toBeGreaterThan(0)

    const steps = screen.getByTestId('adventure-map-steps')
    expect(within(steps).getByTestId('lesson-card-lesson-01')).toBeInTheDocument()
    expect(within(steps).getByTestId('lesson-card-lesson-03')).toBeInTheDocument()
    expect(within(steps).queryByTestId('lesson-card-lesson-04')).not.toBeInTheDocument()
  })

  it('reports unit selection and renders the newly selected unit after the parent updates', () => {
    const onSelectUnit = vi.fn()
    const { rerender } = render(
      <AdventureMap units={units} selectedUnitId="unit-1" onSelectUnit={onSelectUnit} />,
    )

    fireEvent.click(screen.getByTestId('adventure-map-unit-unit-2'))
    expect(onSelectUnit).toHaveBeenCalledWith('unit-2')

    rerender(
      <AdventureMap units={units} selectedUnitId="unit-2" onSelectUnit={onSelectUnit} />,
    )
    expect(screen.getByRole('heading', { name: '第二单元 · 第二单元标题' })).toBeInTheDocument()
    expect(screen.getByText('CHAPTER 02')).toBeInTheDocument()
    expect(screen.getByText('第二单元简介。')).toBeInTheDocument()
    const steps = screen.getByTestId('adventure-map-steps')
    expect(within(steps).getByTestId('lesson-card-lesson-04')).toBeInTheDocument()
    expect(within(steps).queryByTestId('lesson-card-lesson-01')).not.toBeInTheDocument()
  })

  it('falls back to the first unit for an unknown selected id', () => {
    render(
      <AdventureMap units={units} selectedUnitId="unit-missing" onSelectUnit={() => {}} />,
    )
    expect(screen.getByRole('heading', { name: '第一单元 · 第一单元标题' })).toBeInTheDocument()
  })

  it('points the bottom action at the current lesson, then the first available one', () => {
    const { rerender } = render(
      <AdventureMap units={units} selectedUnitId="unit-1" onSelectUnit={() => {}} />,
    )
    expect(screen.getByTestId('adventure-map-next-lesson')).toHaveAttribute(
      'href',
      '/learn/lesson/lesson-03',
    )

    rerender(
      <AdventureMap units={units} selectedUnitId="unit-2" onSelectUnit={() => {}} />,
    )
    expect(screen.getByTestId('adventure-map-next-lesson')).toHaveAttribute(
      'href',
      '/learn/lesson/lesson-04',
    )
  })

  it('shows a real empty state for an empty unit and hides the bottom action', () => {
    const emptyUnits: AdventureMapUnit[] = [
      { id: 'unit-empty', title: '空单元', summary: '暂无课程。', lessons: [] },
    ]
    render(
      <AdventureMap units={emptyUnits} selectedUnitId="unit-empty" onSelectUnit={() => {}} />,
    )
    expect(screen.getByTestId('adventure-map-empty')).toHaveTextContent('这个单元暂无课程数据')
    expect(screen.queryByTestId('adventure-map-next-lesson')).not.toBeInTheDocument()
    expect(screen.getByText('0 个学习任务')).toBeInTheDocument()
    expect(screen.getByText('暂无课程')).toBeInTheDocument()
  })

  it('shows a real empty state when there are no units at all', () => {
    render(<AdventureMap units={[]} selectedUnitId="" onSelectUnit={() => {}} />)
    expect(screen.getByTestId('adventure-map-empty')).toHaveTextContent('暂无课程数据')
  })

  it('never renders locked or unreleased nodes from the data it is given', () => {
    render(
      <AdventureMap units={units} selectedUnitId="unit-2" onSelectUnit={() => {}} />,
    )
    const steps = screen.getByTestId('adventure-map-steps')
    expect(within(steps).queryByText('已锁定')).not.toBeInTheDocument()
    expect(within(steps).queryByText('未开放')).not.toBeInTheDocument()
  })
})
