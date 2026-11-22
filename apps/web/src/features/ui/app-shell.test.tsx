import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

let mockPath = '/learn/map'
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }))

import { AppShell } from './app-shell'

describe('AppShell (frozen V2 global shell)', () => {
  it('renders sidebar navigation with the current section active and in the breadcrumb', () => {
    mockPath = '/learn/map'
    render(<AppShell><main>内容</main></AppShell>)
    const active = screen.getByTestId('kc-nav-map')
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active).toHaveAttribute('href', '/learn/map')
    expect(screen.getByTestId('kc-nav-lesson')).not.toHaveAttribute('aria-current')
    expect(screen.getByText('内容')).toBeInTheDocument()
    expect(document.querySelector('.kc-breadcrumb b')?.textContent).toBe('学习地图')
  })

  it('marks the lesson section active on lesson and remedial routes', () => {
    mockPath = '/learn/remedial/r1'
    render(<AppShell><div /></AppShell>)
    expect(screen.getByTestId('kc-nav-lesson')).toHaveAttribute('aria-current', 'page')
  })

  it('keeps Golden Scratch lessons in the learning section', () => {
    mockPath = '/learn/scratch-lab/G2-U1-L03/golden'
    render(<AppShell><div /></AppShell>)
    expect(screen.getByTestId('kc-nav-lesson')).toHaveAttribute('aria-current', 'page')
  })

  it('points the Scratch entry at the unified creation centre', () => {
    mockPath = '/learn/catalog'
    render(<AppShell><div /></AppShell>)
    expect(screen.getByTestId('kc-nav-scratch')).toHaveAttribute('href', '/create')
    expect(screen.getByTestId('kc-nav-scratch')).not.toHaveAttribute('aria-current')
  })

  it('toggles the mobile drawer from the hamburger button', () => {
    mockPath = '/learn/catalog'
    render(<AppShell><div /></AppShell>)
    const button = screen.getByRole('button', { name: '展开导航' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('kc-sidebar')).toHaveClass('is-open')
    fireEvent.click(screen.getByRole('button', { name: '关闭导航' }))
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps the drawer mask mounted and toggles its is-open class with the drawer', () => {
    mockPath = '/learn/catalog'
    render(<AppShell><div /></AppShell>)
    const mask = screen.getByRole('button', { name: '关闭导航' })
    expect(mask).not.toHaveClass('is-open')
    fireEvent.click(screen.getByRole('button', { name: '展开导航' }))
    expect(mask).toHaveClass('is-open')
    expect(document.getElementById('kc-sidebar')).toHaveClass('is-open')
    fireEvent.click(mask)
    expect(mask).not.toHaveClass('is-open')
    expect(document.getElementById('kc-sidebar')).not.toHaveClass('is-open')
  })

  it('has no top-level Python 实验室 item; free coding is entered through 创作中心', () => {
    mockPath = '/create'
    render(<AppShell><div /></AppShell>)
    expect(screen.queryByTestId('kc-nav-python')).toBeNull()
    expect(screen.queryByText('Python 实验室')).toBeNull()
    expect(document.querySelectorAll('.kc-sidebar .kc-nav-item')).toHaveLength(8)
    const create = screen.getByTestId('kc-nav-scratch')
    expect(create).toHaveAttribute('href', '/create')
    expect(create).toHaveAttribute('aria-current', 'page')
  })

  it('keeps Python teaching lessons under 课程体系 so the breadcrumb stays meaningful', () => {
    mockPath = '/learn/python-lab/P0-U1-L01'
    render(<AppShell><div /></AppShell>)
    expect(screen.getByTestId('kc-nav-catalog')).toHaveAttribute('aria-current', 'page')
    expect(document.querySelector('.kc-breadcrumb b')?.textContent).toBe('课程体系')
  })
})
