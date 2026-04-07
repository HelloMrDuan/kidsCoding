import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { buildProjectCompletionCopy } from './build-project-completion-copy'
import { ProjectCompleteCard } from './project-complete-card'

describe('ProjectCompleteCard', () => {
  it('renders a stage-first completion layout for milestone lessons', () => {
    render(
      <ProjectCompleteCard
        completionCopy={buildProjectCompletionCopy('lesson-03-forest-story')}
        isFoundationGraduate={false}
        lessonId="lesson-03-forest-story"
        lessonTitle="森林里的第一次见面"
        onReplay={vi.fn()}
        primaryHref="/learn/map"
        primaryLabel="继续下一单元"
        rewardCards={[{ id: 'growth-first-project', name: '第一张作品卡' }]}
        stars={9}
        totalCards={2}
        blocks={[{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line' }]}
      />,
    )

    expect(screen.getByTestId('project-complete-stage')).toBeInTheDocument()
    expect(screen.getByText('你做出了一个完整作品')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '回看我的作品' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '继续下一单元' })).toBeInTheDocument()
    expect(screen.getByTestId('project-complete-rewards')).toBeInTheDocument()
  })

  it('renders a lighter completion card for non-milestone lessons', () => {
    render(
      <ProjectCompleteCard
        completionCopy={buildProjectCompletionCopy('lesson-01-forest-hello')}
        isFoundationGraduate={false}
        lessonId="lesson-01-forest-hello"
        lessonTitle="小狐狸出场"
        onReplay={vi.fn()}
        primaryHref="/learn/map"
        primaryLabel="继续下一课"
        rewardCards={[]}
        stars={3}
        totalCards={0}
        blocks={[{ type: 'when_start' }, { type: 'move_right' }]}
      />,
    )

    expect(screen.queryByTestId('project-complete-stage')).toBeNull()
    expect(screen.getByTestId('project-complete-lite-card')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '回看我的作品' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '继续下一课' })).toBeInTheDocument()
  })
})
