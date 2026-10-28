import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { ParentGrowthReport } from './build-parent-growth-report'
import { GrowthKnowledgeSection } from './growth-knowledge-section'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

const report: ParentGrowthReport = {
  completedCourseCount: 2,
  knowledgeGroups: [
    {
      concept: '指令',
      courses: [
        {
          lessonId: 'G0-U1-L01',
          lessonTitle: '小狐狸认识按钮',
          stars: 3,
          hasWork: true,
        },
      ],
    },
  ],
  unregisteredLessons: [
    {
      lessonId: 'no-such-lesson',
      lessonTitle: '未知课程',
      hasWork: false,
    },
  ],
}

describe('GrowthKnowledgeSection', () => {
  it('renders concepts, completion records, and work links only for owned works', () => {
    render(<GrowthKnowledgeSection report={report} />)
    const section = screen.getByTestId('growth-knowledge-report')

    expect(
      within(section).getByText('下面只列出孩子已经完成的课程涉及的知识点，不代表孩子已经掌握这些知识点。'),
    ).toBeTruthy()
    expect(within(section).getByText('指令')).toBeTruthy()
    expect(within(section).getByText('小狐狸认识按钮')).toBeTruthy()
    expect(within(section).getByText('已完成课程 2 节')).toBeTruthy()
    expect(within(section).getAllByText('已完成')).toHaveLength(1)
    expect(within(section).getByText(/3 颗星/)).toBeTruthy()
    const workLink = within(section).getByText('查看作品回放')
    expect(workLink.getAttribute('href')).toBe('/parent/projects/G0-U1-L01')
  })

  it('marks unregistered lessons without inventing tags', () => {
    render(<GrowthKnowledgeSection report={report} />)
    const section = screen.getByTestId('growth-knowledge-report')

    expect(
      within(section).getByTestId('growth-knowledge-unregistered'),
    ).toBeTruthy()
    expect(
      within(section).getByText('未知课程：课程知识点未登记'),
    ).toBeTruthy()
  })

  it('renders an empty state with no sample data when nothing is completed', () => {
    render(
      <GrowthKnowledgeSection
        report={{
          completedCourseCount: 0,
          knowledgeGroups: [],
          unregisteredLessons: [],
        }}
      />,
    )

    expect(screen.getByTestId('growth-knowledge-empty')).toBeTruthy()
    expect(screen.queryByTestId('growth-knowledge-group')).toBeNull()
  })
})
