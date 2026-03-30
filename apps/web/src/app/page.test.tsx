import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import HomePage from './page'

describe('HomePage', () => {
  it('renders the child and parent entry points', () => {
    render(<HomePage />)

    expect(
      screen.getByRole('heading', { name: '做动画学编程' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '马上开始' })).toHaveAttribute(
      'href',
      '/onboarding/age',
    )
    expect(screen.getByRole('link', { name: '家长查看' })).toHaveAttribute(
      'href',
      '/parent/overview',
    )
  })
})
