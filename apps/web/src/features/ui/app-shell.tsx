'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { COURSE_PICKER_HREF, resolveClassroomHref } from '@/features/lessons/classroom-entry'

/**
 * Frozen V2 global shell: 222px navy sidebar + 76px white top bar.
 * <=1180px the sidebar collapses to a 74px icon rail, <=860px the top bar
 * shrinks, <=600px the sidebar becomes a drawer (hamburger) and a bottom
 * navigation bar appears. Spec: docs/design/kidscoding-v2/DESIGN-SPEC.md.
 */

type IconName = 'home' | 'map' | 'lesson' | 'catalog' | 'scratch' | 'portfolio' | 'parent' | 'cards'

type NavItem = {
  id: string
  label: string
  short: string
  href: string
  icon: IconName
  match: (path: string) => boolean
}

function isGoldenScratchClassroom(path: string) {
  return path.startsWith('/learn/scratch-lab/') && path.endsWith('/golden')
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'LEARNING',
    items: [
      { id: 'home', label: '学习中心', short: '首页', href: '/', icon: 'home', match: (p) => p === '/' },
      { id: 'map', label: '学习地图', short: '地图', href: '/learn/map', icon: 'map', match: (p) => p.startsWith('/learn/map') },
      { id: 'lesson', label: '编程课堂', short: '课堂', href: COURSE_PICKER_HREF, icon: 'lesson', match: (p) => p.startsWith('/studio/blockly') || p.startsWith('/learn/lesson') || p.startsWith('/learn/remedial') || isGoldenScratchClassroom(p) },
      // OPS-051 (#565): the Python lab has no top-level menu; its teaching
      // lessons stay under 课程体系 so the breadcrumb keeps its meaning.
      { id: 'catalog', label: '课程体系', short: '课程', href: '/learn/catalog', icon: 'catalog', match: (p) => p.startsWith('/learn/catalog') || p.startsWith('/learn/python-lab') },
    ],
  },
  {
    title: 'CREATE',
    items: [
      { id: 'scratch', label: '创作中心', short: '创作', href: '/create', icon: 'scratch', match: (p) => p === '/create' || p.startsWith('/create/') || (p.startsWith('/learn/scratch-lab') && !isGoldenScratchClassroom(p)) },
      { id: 'portfolio', label: '作品中心', short: '作品', href: '/learn/portfolio', icon: 'portfolio', match: (p) => p.startsWith('/learn/portfolio') || p.startsWith('/project') },
      { id: 'cards', label: '奖励收藏', short: '收藏', href: '/cards', icon: 'cards', match: (p) => p.startsWith('/cards') },
    ],
  },
  {
    title: 'FAMILY',
    items: [
      { id: 'parent', label: '家长中心', short: '家长', href: '/parent/overview', icon: 'parent', match: (p) => p.startsWith('/parent') },
    ],
  },
]

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items)
const MOBILE_ITEMS = ['home', 'map', 'lesson', 'portfolio', 'parent'].map((id) => ALL_ITEMS.find((i) => i.id === id)!)

function NavIcon({ name }: { name: IconName }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      {name === 'home' && <><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" {...common} /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" {...common} /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" {...common} /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" {...common} /></>}
      {name === 'map' && <><path d="M3.5 6.5l5.5-2.5 6 2.5 5.5-2.5v13.5l-5.5 2.5-6-2.5-5.5 2.5z" {...common} /><path d="M9 4v13.5M15 6.5V20" {...common} /></>}
      {name === 'lesson' && <><path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12" {...common} /></>}
      {name === 'catalog' && <><path d="M5 4.5h11.5a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2z" {...common} /><path d="M5 18a2 2 0 0 1 2-2h11.5M9 8.5h6M9 11.5h4" {...common} /></>}
      {name === 'scratch' && <><path d="M4 7.5a2 2 0 0 1 2-2h3l1.5 1.5h3L15 5.5h3a2 2 0 0 1 2 2v3H4z" {...common} /><path d="M4 13.5h16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" {...common} /></>}
      {name === 'portfolio' && <><rect x="3.5" y="4.5" width="17" height="15" rx="2.4" {...common} /><path d="M3.5 15.5l4.5-4.5 4 4 2.5-2.5 6 5" {...common} /><circle cx="15.5" cy="9" r="1.6" {...common} /></>}
      {name === 'cards' && <><path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.4l-5.1 2.7 1-5.6-4.1-4 5.7-.8z" {...common} /></>}
      {name === 'parent' && <><circle cx="9" cy="8" r="3" {...common} /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" {...common} /><circle cx="17" cy="10" r="2.2" {...common} /><path d="M15 19a4 4 0 0 1 6-3.4" {...common} /></>}
    </svg>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/'
  const [drawerOpen, setDrawerOpen] = useState(false)
  // 「编程课堂」 continues the lesson in the child's own record (the same
  // route the course system opens); with no record it is a course picker.
  // The owner is resolved from the same identity source the classroom uses
  // (`/api/lesson-draft-owner` → user:<id> or guest:<id>), and reads are
  // scoped to it: switching accounts in one browser must never inherit the
  // previous account's lesson or drafts. Unknown identity fails closed to
  // the picker.
  const [lessonHref, setLessonHref] = useState(COURSE_PICKER_HREF)
  const current = ALL_ITEMS.find((i) => i.match(pathname))
  // Golden lessons use document history so the editor's beforeunload protection also covers navigation.
  const ShellLink = isGoldenScratchClassroom(pathname) ? 'a' : Link

  useEffect(() => {
    let active = true
    let request = 0
    const sync = async () => {
      const token = ++request
      // Do not keep the previous account's route while identity is checked.
      if (active) setLessonHref(COURSE_PICKER_HREF)
      let owner: string | null = null
      try {
        const response = await fetch('/api/lesson-draft-owner', { cache: 'no-store' })
        if (response.ok) {
          const body = (await response.json()) as { owner?: unknown }
          owner = typeof body.owner === 'string' ? body.owner : null
        }
      } catch {
        // The account cannot be confirmed: stay on the course picker.
      }
      if (!active || token !== request) return
      // No confirmed identity: the picker is already set, so do not guess.
      if (owner === null) return
      try {
        const href = await resolveClassroomHref(owner)
        if (active && token === request) setLessonHref(href)
      } catch {
        /* fail closed to the course picker */
      }
    }
    void sync()
    const resync = () => { void sync() }
    const visible = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    window.addEventListener('kc-progress-change', resync)
    window.addEventListener('storage', resync)
    window.addEventListener('focus', resync)
    window.addEventListener('pageshow', resync)
    document.addEventListener('visibilitychange', visible)
    return () => {
      active = false
      request += 1
      window.removeEventListener('kc-progress-change', resync)
      window.removeEventListener('storage', resync)
      window.removeEventListener('focus', resync)
      window.removeEventListener('pageshow', resync)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [pathname])

  const hrefFor = (item: NavItem) => (item.id === 'lesson' ? lessonHref : item.href)

  return (
    <div className="kc-app" data-testid="kc-app-shell">
      <aside className={`kc-sidebar${drawerOpen ? ' is-open' : ''}`} aria-label="主导航" id="kc-sidebar">
        <ShellLink href="/" className="kc-logo" aria-label="KidsCoding 首页">
          <span className="kc-logo-mark" aria-hidden="true" />
          <span className="kc-logo-text">KidsCoding</span>
        </ShellLink>
        <nav className="kc-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="kc-nav-group">{group.title}</div>
              {group.items.map((item) => {
                const active = item.match(pathname)
                return (
                  <ShellLink
                    key={item.id}
                    href={hrefFor(item)}
                    className={`kc-nav-item${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    title={item.label}
                    data-testid={`kc-nav-${item.id}`}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <span className="kc-nav-ico"><NavIcon name={item.icon} /></span>
                    <span className="kc-nav-name">{item.label}</span>
                  </ShellLink>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="kc-side-note">
          <b>孩子编程星球</b>
          一步一步，做出会动的小故事。
        </div>
      </aside>
      <button type="button" className={`kc-drawer-mask${drawerOpen ? ' is-open' : ''}`} aria-label="关闭导航" onClick={() => setDrawerOpen(false)} />
      <div className="kc-content-area">
        <header className="kc-topbar">
          <div className="kc-top-left">
            <button
              type="button"
              className="kc-hamburger"
              aria-label="展开导航"
              aria-controls="kc-sidebar"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
            <span className="kc-breadcrumb">KidsCoding / <b>{current?.label ?? '学习中心'}</b></span>
          </div>
          <div className="kc-top-actions">
            <ShellLink href="/learn/catalog" className="kc-top-search">
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <span>查找课程和知识点</span>
            </ShellLink>
            <ShellLink href="/parent/overview" className="kc-avatar" aria-label="家长中心">
              <NavIcon name="parent" />
            </ShellLink>
          </div>
        </header>
        <div className="kc-shell-main">{children}</div>
      </div>
      <nav className="kc-mobile-bottom" aria-label="底部导航">
        {MOBILE_ITEMS.map((item) => {
          const active = item.match(pathname)
          return (
            <ShellLink key={item.id} href={hrefFor(item)} className={active ? 'is-active' : undefined} aria-current={active ? 'page' : undefined}>
              <NavIcon name={item.icon} />
              <span>{item.short}</span>
            </ShellLink>
          )
        })}
      </nav>
    </div>
  )
}
