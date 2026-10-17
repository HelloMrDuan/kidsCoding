import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

import HomePage from './page'

describe('HomePage (UX-601 学习中心)', () => {
  it('renders the frozen V2 learning center inside the V2 shell with real entry points', () => {
    render(<HomePage />)

    expect(screen.getByRole('heading', { level: 1, name: /今天继续创造点新东西/ })).toBeInTheDocument()
    expect(screen.getByText(/孩子可以自己做出动画故事/)).toBeInTheDocument()

    for (const id of ['home-title-row', 'story-stage-hero', 'home-progress', 'growth-path', 'home-works']) {
      expect(screen.getByTestId(id)).toBeInTheDocument()
    }

    // Fresh guest: first-screen CTA goes straight into the playable onboarding path.
    expect(screen.getByRole('link', { name: '开始学第一节' })).toHaveAttribute('href', '/onboarding/age')
    expect(screen.getByTestId('home-start')).toHaveAttribute('href', '/onboarding/age')
    expect(screen.getByRole('link', { name: /看看家长如何陪学/ })).toHaveAttribute('href', '/parent/overview')

    // Frozen V2 illustrations (hero, tracks, example works), never placeholder shapes.
    expect(screen.getAllByRole('img', { name: /示例作品/ })).toHaveLength(5)
    // Real progress numbers (fresh guest).
    expect(screen.getByRole('img', { name: '已完成 0 / 12 课' })).toBeInTheDocument()
  })
})
