import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GrowthPath } from './growth-path'

describe('GrowthPath', () => {
  it('renders four foundation units as a clear growth route', () => {
    render(<GrowthPath />)

    expect(screen.getByTestId('growth-path')).toBeInTheDocument()

    // 徽章文案为 <p>，使用 getByText 验证
    expect(
      screen.getByText('沿着 4 个启蒙单元，一步一步做出真正的动画故事'),
    ).toBeInTheDocument()

    // 章节主标题为 <h2>，使用 getByRole 验证标题层级
    expect(
      screen.getByRole('heading', {
        name: '每 2 节学会能力，第 3 节就做出一个完整作品',
      }),
    ).toBeInTheDocument()

    expect(screen.getByTestId('growth-path-unit-1')).toBeInTheDocument()
    expect(screen.getByTestId('growth-path-unit-2')).toBeInTheDocument()
    expect(screen.getByTestId('growth-path-unit-3')).toBeInTheDocument()
    expect(screen.getByTestId('growth-path-unit-4')).toBeInTheDocument()
    expect(screen.getByText('森林见面会')).toBeInTheDocument()
    expect(screen.getByText('小动物去旅行')).toBeInTheDocument()
    expect(screen.getByText('花园互动秀')).toBeInTheDocument()
    expect(screen.getByText('动物朋友合作演出')).toBeInTheDocument()
  })
})
