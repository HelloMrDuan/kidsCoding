import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

import HomePage from './page'

describe('HomePage (UX-601 学习中心)', () => {
  it('renders the kid-cartoon learning center inside the V2 shell with real entry points', () => {
    render(<HomePage />)

    expect(screen.getByRole('heading', { level: 1, name: /小小创作家/ })).toBeInTheDocument()
    expect(screen.getByText(/孩子可以自己做出动画故事/)).toBeInTheDocument()

    for (const id of ['story-stage-hero', 'growth-path', 'home-worlds', 'parent-confidence', 'trial-cta', 'home-progress']) {
      expect(screen.getByTestId(id)).toBeInTheDocument()
    }

    // Fresh guest: first-screen CTA goes straight into the playable onboarding path.
    expect(screen.getByRole('link', { name: '开始学第一节' })).toHaveAttribute('href', '/onboarding/age')
    expect(screen.getByTestId('home-start')).toHaveAttribute('href', '/onboarding/age')
    expect(screen.getByRole('link', { name: '看看家长如何陪学' })).toHaveAttribute('href', '/parent/overview')

    // Real illustrated characters, never placeholder shapes.
    expect(document.querySelectorAll('[data-character-art]').length).toBeGreaterThan(5)
    // Real progress numbers (fresh guest).
    expect(screen.getByRole('img', { name: '已完成 0 / 12 课' })).toBeInTheDocument()
  })
})
