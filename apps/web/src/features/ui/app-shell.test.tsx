import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let mockPath = '/learn/map'
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }))

const { mockResolveClassroomHref, mockFetch } = vi.hoisted(() => ({
  mockResolveClassroomHref: vi.fn(),
  mockFetch: vi.fn(),
}))
vi.mock('@/features/lessons/classroom-entry', () => ({
  COURSE_PICKER_HREF: '/learn/catalog',
  resolveClassroomHref: (owner: string | null) => mockResolveClassroomHref(owner),
}))

import { AppShell } from './app-shell'

describe('AppShell (frozen V2 global shell)', () => {
  beforeEach(() => {
    mockResolveClassroomHref.mockReset()
    mockResolveClassroomHref.mockResolvedValue('/learn/catalog')
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ owner: 'guest' }) })
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('continues the recorded lesson from 编程课堂, else offers the course picker', async () => {
    mockPath = '/'
    mockResolveClassroomHref.mockResolvedValueOnce('/learn/lesson/lesson-02-forest-greeting')
    render(<AppShell><div /></AppShell>)
    const nav = screen.getByTestId('kc-nav-lesson')
    // Server render stays on the picker; the guest record resolves after mount.
    expect(nav).toHaveAttribute('href', '/learn/catalog')
    await waitFor(() => {
      expect(nav).toHaveAttribute('href', '/learn/lesson/lesson-02-forest-greeting')
    })
    expect(mockResolveClassroomHref).toHaveBeenCalledWith('guest')
  })

  it('re-resolves 编程课堂 from each account\'s own record when the browser switches account', async () => {
    mockPath = '/'
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ owner: 'user:a' }) })
    mockResolveClassroomHref.mockImplementation(async (owner: string | null) =>
      owner === 'user:a'
        ? '/learn/story-lab/G1-U1-L01/golden'
        : owner === 'user:b'
          ? '/learn/story-lab/G1-U1-L02/golden'
          : '/learn/catalog')
    render(<AppShell><div /></AppShell>)
    const nav = screen.getByTestId('kc-nav-lesson')
    await waitFor(() => {
      expect(nav).toHaveAttribute('href', '/learn/story-lab/G1-U1-L01/golden')
    })
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ owner: 'user:b' }) })
    fireEvent(window, new Event('focus'))
    await waitFor(() => {
      expect(nav).toHaveAttribute('href', '/learn/story-lab/G1-U1-L02/golden')
    })
  })

  it('fails closed to the course picker when the account cannot be confirmed', async () => {
    mockPath = '/'
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ owner: null }) })
    mockResolveClassroomHref.mockResolvedValue('/learn/lesson/lesson-02-forest-greeting')
    render(<AppShell><div /></AppShell>)
    const nav = screen.getByTestId('kc-nav-lesson')
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(nav).toHaveAttribute('href', '/learn/catalog')
    expect(mockResolveClassroomHref).not.toHaveBeenCalled()
  })

  it('points 编程课堂 at the one official V3 entry when lesson-01 is the recorded lesson', async () => {
    mockPath = '/'
    mockResolveClassroomHref.mockResolvedValueOnce('/studio/blockly/lesson-01-forest-hello')
    render(<AppShell><div /></AppShell>)
    const nav = screen.getByTestId('kc-nav-lesson')
    // Before the owner resolves the nav stays on the picker; then it must take
    // the resolver's lesson-01 answer (the V3 workspace), not the old URL.
    expect(nav).toHaveAttribute('href', '/learn/catalog')
    await waitFor(() => {
      expect(nav).toHaveAttribute('href', '/studio/blockly/lesson-01-forest-hello')
    })
    expect(nav).not.toHaveAttribute('href', '/learn/lesson/lesson-01-forest-hello')
  })

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

  it('toggles the mobile drawer from the hamburger button', async () => {
    mockPath = '/learn/catalog'
    render(<AppShell><div /></AppShell>)
    const button = screen.getByRole('button', { name: '展开导航' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('kc-sidebar')).toHaveClass('is-open')
    fireEvent.click(screen.getByRole('button', { name: '关闭导航' }))
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(screen.getByTestId('kc-nav-lesson')).toHaveAttribute('href', '/learn/catalog'))
  })

  it('keeps the drawer mask mounted and toggles its is-open class with the drawer', async () => {
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
    await waitFor(() => expect(screen.getByTestId('kc-nav-lesson')).toHaveAttribute('href', '/learn/catalog'))
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
