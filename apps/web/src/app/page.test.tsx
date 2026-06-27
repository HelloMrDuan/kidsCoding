import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import HomePage from './page'

describe('HomePage', () => {
  it('renders the learning-first homepage narrative', () => {
    render(<HomePage />)

    // 核心价值主张
    expect(
      screen.getByRole('heading', { name: '孩子可以自己做出动画故事' }),
    ).toBeInTheDocument()

    // 入口层四大 3D 场景模块均存在
    expect(screen.getByTestId('story-stage-hero')).toBeInTheDocument()
    expect(screen.getByTestId('growth-path')).toBeInTheDocument()
    expect(screen.getByTestId('parent-confidence')).toBeInTheDocument()
    expect(screen.getByTestId('trial-cta')).toBeInTheDocument()

    // 主操作：开始学第一节 → 启蒙入口
    expect(
      screen.getByRole('link', { name: '开始学第一节' }),
    ).toHaveAttribute('href', '/onboarding/age')

    // 家长入口
    expect(
      screen.getByRole('link', { name: '看看家长如何陪学' }),
    ).toHaveAttribute('href', '/parent/overview')
  })
})
