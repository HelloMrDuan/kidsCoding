import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ParentConfidence } from './parent-confidence'

describe('ParentConfidence', () => {
  it('renders a parent trust section around visible growth records', () => {
    render(<ParentConfidence />)

    expect(screen.getByTestId('parent-confidence')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '家长能一眼看懂孩子已经走到哪里' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('最近作品、成长轨迹和下一步建议都会回到家长眼前。'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('parent-confidence-preview')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '进入家长成长页' }),
    ).toHaveAttribute('href', '/parent/overview')
  })
})
