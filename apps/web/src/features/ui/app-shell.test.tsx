import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let mockPath = '/learn/map'
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }))

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))

import { AppShell } from './app-shell'

describe('AppShell (frozen V2 global shell)', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ owner: 'guest' }) })
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('has no top-level 编程课堂 item in the sidebar, the icon rail or the bottom bar (OPS-052)', async () => {
    mockPath = '/'
    render(<AppShell><div /></AppShell>)
    expect(screen.queryByTestId('kc-nav-lesson')).toBeNull()
    expect(screen.queryByText('编程课堂')).toBeNull()
    const bottom = screen.getByRole('navigation', { name: '底部导航' })
    expect(bottom.textContent).not.toContain('课堂')
    // The menu-only identity request is gone: the shell never asks for the owner.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('keeps exactly four bottom-bar entries: 首页 / 地图 / 作品 / 家长', () => {
    mockPath = '/'
    render(<AppShell><div /></AppShell>)
    const bottom = screen.getByRole('navigation', { name: '底部导航' })
    const links = Array.from(bottom.querySelectorAll('a'))
    expect(links.map((a) => a.textContent)).toEqual(['首页', '地图', '作品', '家长'])
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/', '/learn/map', '/learn/portfolio', '/parent/overview'])
  })

  it('renders sidebar navigation with the current section active and in the breadcrumb', () => {
    mockPath = '/learn/map'
    render(<AppShell><main>内容</main></AppShell>)
    const active = screen.getByTestId('kc-nav-map')
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active).toHaveAttribute('href', '/learn/map')
    expect(screen.getByText('内容')).toBeInTheDocument()
    expect(document.querySelector('.kc-breadcrumb b')?.textContent).toBe('学习地图')
  })

  it.each([
    '/learn/remedial/r1',
    '/learn/lesson/lesson-02-forest-greeting',
    '/studio/blockly/grid/G0-U1-L01',
    '/learn/scratch-lab/G2-U1-L03/golden',
  ])('classroom route %s activates no top-level item and keeps the breadcrumb on 学习中心', (path) => {
    mockPath = path
    render(<AppShell><div /></AppShell>)
    expect(document.querySelectorAll('.kc-sidebar [aria-current="page"]')).toHaveLength(0)
    expect(document.querySelector('.kc-breadcrumb b')?.textContent).toBe('学习中心')
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
    expect(document.querySelectorAll('.kc-sidebar .kc-nav-item')).toHaveLength(7)
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
