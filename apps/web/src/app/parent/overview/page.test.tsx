import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ParentOverviewPage from './page'

type Row = Record<string, unknown>

const fakeDb = vi.hoisted(() => ({
  userId: 'user-a' as string | null,
  profile: {
    display_name: '小宝',
    recommended_start_level: 'starter',
  } as Row | null,
  progress: [] as Array<Row>,
  cards: [] as Array<Row>,
  badges: [] as Array<Row>,
  snapshots: [] as Array<Row>,
  entitlement: null as Row | null,
  consent: null as Row | null,
}))

function createQuery(table: string) {
  const rows: Array<Row> = (() => {
    switch (table) {
      case 'child_profiles':
        return fakeDb.profile ? [fakeDb.profile] : []
      case 'progress_records':
        return fakeDb.progress
      case 'card_records':
        return fakeDb.cards
      case 'badge_records':
        return fakeDb.badges
      case 'project_snapshots':
        return fakeDb.snapshots
      case 'entitlements':
        return fakeDb.entitlement ? [fakeDb.entitlement] : []
      case 'guardian_consents':
        return fakeDb.consent ? [fakeDb.consent] : []
      default:
        return []
    }
  })()
  const chain = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({ data: rows[0] ?? null }),
    maybeSingle: async () => ({ data: rows[0] ?? null }),
    then: (resolve: (value: { data: Array<Row> }) => void) => resolve({ data: rows }),
  }
  return chain
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: fakeDb.userId ? { id: fakeDb.userId } : null },
      }),
    },
    from: (table: string) => createQuery(table),
  }),
}))

vi.mock('@/lib/env', () => ({
  hasSupabaseEnv: () => true,
  hasServiceRoleEnv: () => false,
}))

vi.mock('@/features/curriculum/load-launch-curriculum', () => ({
  loadLaunchCurriculum: async () => ({
    lessons: [
      { id: 'G0-U1-L01', title: '小狐狸认识按钮' },
      { id: 'G0-U1-L02', title: '小狐狸认识舞台' },
      { id: 'lesson-01-forest-hello', title: '小狐狸出场' },
    ],
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`)
  },
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

function setAccountA() {
  fakeDb.userId = 'user-a'
  fakeDb.profile = {
    display_name: '小宝',
    recommended_start_level: 'starter',
  }
  fakeDb.progress = [
    { lesson_id: 'G0-U1-L01', status: 'completed', stars: 3 },
    { lesson_id: 'G0-U1-L02', status: 'in_progress', stars: 1 },
    { lesson_id: 'no-such-lesson', status: 'completed' },
  ]
  fakeDb.cards = []
  fakeDb.badges = []
  fakeDb.snapshots = [{ lesson_id: 'G0-U1-L01', updated_at: '2026-10-29T08:00:00.000Z' }]
  fakeDb.entitlement = null
  fakeDb.consent = { granted_at: '2026-10-28T10:00:00.000Z' }
}

function setAccountB() {
  fakeDb.userId = 'user-b'
  fakeDb.profile = {
    display_name: '小贝',
    recommended_start_level: 'starter',
  }
  fakeDb.progress = [{ lesson_id: 'lesson-01-forest-hello', status: 'completed' }]
  fakeDb.cards = []
  fakeDb.badges = []
  fakeDb.snapshots = []
  fakeDb.entitlement = null
  fakeDb.consent = null
}

describe('parent overview growth report (UX-503)', () => {
  beforeEach(() => {
    setAccountA()
  })

  it('account A sees only its own completed lessons and their knowledge', async () => {
    render(await ParentOverviewPage())
    const section = screen.getByTestId('growth-knowledge-report')

    expect(within(section).getByText('指令')).toBeTruthy()
    expect(within(section).getByText('小狐狸认识按钮')).toBeTruthy()
    expect(
      within(section).queryByText('小狐狸认识按钮：课程知识点未登记'),
    ).toBeNull()
    expect(
      within(section).getByText('no-such-lesson：课程知识点未登记'),
    ).toBeTruthy()
    expect(within(section).queryByText('小狐狸认识舞台')).toBeNull()
    expect(
      screen.getByText('已确认监护人同意：孩子的云端作品按保留策略保存，可随时删除。'),
    ).toBeTruthy()
  })

  it('account B sees none of account A data, and its own knowledge only', async () => {
    setAccountB()
    render(await ParentOverviewPage())
    const section = screen.getByTestId('growth-knowledge-report')

    expect(within(section).getByText('顺序')).toBeTruthy()
    expect(within(section).getAllByText('小狐狸出场')).toHaveLength(3)
    expect(within(section).queryByText('指令')).toBeNull()
    expect(within(section).queryByText('小狐狸认识按钮')).toBeNull()
    expect(within(section).queryByText('查看作品回放')).toBeNull()
    expect(screen.getByText('尚未确认监护人同意，请监护人确认。')).toBeTruthy()
  })

  it('renders an empty knowledge state when nothing is completed', async () => {
    fakeDb.progress = []
    render(await ParentOverviewPage())

    expect(screen.getByTestId('growth-knowledge-empty')).toBeTruthy()
  })
})
