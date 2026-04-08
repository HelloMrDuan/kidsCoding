import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StoryStage } from './story-stage'

describe('StoryStage', () => {
  it('renders a stage-first hero with a clear child-facing promise', () => {
    render(<StoryStage />)

    expect(screen.getByTestId('story-stage-hero')).toBeInTheDocument()
    expect(screen.getByTestId('story-stage-stage')).toBeInTheDocument()
    expect(screen.getByTestId('story-stage-promises')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '孩子可以自己做出动画故事' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '开始学第一节' }),
    ).toHaveAttribute('href', '/onboarding/age')
    expect(
      screen.getByRole('link', { name: '看看家长如何陪学' }),
    ).toHaveAttribute('href', '/parent/overview')

    const stage = screen.getByTestId('story-stage-stage')
    expect(within(stage).getByText('孩子作品舞台')).toBeInTheDocument()
    expect(
      within(stage).getByText('第 12 节完成启蒙毕业作品'),
    ).toBeInTheDocument()
  })
})
