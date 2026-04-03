import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import HomePage from './page'

describe('HomePage', () => {
  it('renders the learning-first homepage narrative', () => {
    render(<HomePage />)

    expect(
      screen.getByRole('heading', { name: '孩子可以自己做出动画故事' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('适合 6-8 岁孩子，从零开始也能自己学'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '三步走进自己的故事舞台' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '成长记录家长看得见' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '先免费学会，再决定要不要升级' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '免费试听 3 节' })).toHaveAttribute(
      'href',
      '/onboarding/age',
    )
    expect(screen.getByRole('link', { name: '查看家长成长页' })).toHaveAttribute(
      'href',
      '/parent/overview',
    )
  })
})
