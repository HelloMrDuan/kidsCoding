import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GrowthPath } from './growth-path'

describe('GrowthPath', () => {
  it('renders four foundation units as a clear growth route', () => {
    render(<GrowthPath />)

    expect(screen.getByTestId('growth-path')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '沿着 4 个启蒙单元慢慢做出自己的故事' }),
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
