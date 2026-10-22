import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hasSupabaseEnv: vi.fn(),
  createAdminClient: vi.fn(),
  cookieGet: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: mocks.cookieGet }),
}))
vi.mock('@/lib/env', () => ({ hasSupabaseEnv: mocks.hasSupabaseEnv }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }))

import { GUEST_PAYLOAD_MAX_BYTES } from '@/features/progress/guest-snapshot-payload'

import { POST } from './route'

const upsert = vi.fn()
const from = vi.fn()

function post(body: unknown, headers: Record<string, string> = {}) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  return POST(
    new Request('http://localhost/api/guest', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: raw,
    }),
  )
}

const VALID = {
  onboarding: {
    ageBand: 'age_6_8',
    recommendedLevel: 'starter',
    answers: [{ questionId: 'q1', optionId: 'a', score: 2 }],
    childName: '小明',
  },
  progress: {
    completedLessonIds: ['lesson-01-forest-hello', 'lesson-01-forest-hello'],
    currentLessonId: 'lesson-02-forest-greeting',
    stars: 3,
    badgeIds: ['lesson-lesson-01-forest-hello'],
    cardIds: ['theme-forest-fox'],
    streakDays: 1,
    completedProjectIds: [],
    note: 'free text',
    projectSnapshots: [
      {
        lessonId: 'lesson-03-forest-story',
        updatedAt: '2026-10-22T00:00:00.000Z',
        blocks: [
          { type: 'when_start', extra: 'x' },
          { type: 'say_line', line: 'hello' },
          { type: 'say_line', line: '我叫小明' },
        ],
        title: 'my story',
      },
    ],
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.hasSupabaseEnv.mockReturnValue(true)
  mocks.cookieGet.mockReturnValue(undefined)
  upsert.mockResolvedValue({ error: null })
  from.mockReturnValue({ upsert })
  mocks.createAdminClient.mockReturnValue({ from })
})

describe('POST /api/guest (TQ-013)', () => {
  it('stores only whitelisted fields: no answers, names, stars or free text; keeps preset line ids', async () => {
    const response = await post(VALID)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ synced: true })
    expect(from).toHaveBeenCalledWith('guest_snapshots')
    const row = upsert.mock.calls[0][0]
    expect(row.onboarding).toEqual({ ageBand: 'age_6_8', recommendedLevel: 'starter' })
    expect(row.progress).toEqual({
      completedLessonIds: ['lesson-01-forest-hello'],
      badgeIds: ['lesson-lesson-01-forest-hello'],
      cardIds: ['theme-forest-fox'],
      projectSnapshots: [
        {
          lessonId: 'lesson-03-forest-story',
          updatedAt: '2026-10-22T00:00:00.000Z',
          // say_line with a non-id line (typed text) is dropped entirely.
          blocks: [{ type: 'when_start' }, { type: 'say_line', line: 'hello' }],
        },
      ],
    })
    expect(JSON.stringify(row)).not.toMatch(/answers|小明|free text|stars|streak/)
    expect(typeof row.updated_at).toBe('string')
  })

  it('rejects an oversize body with 413 before touching the database', async () => {
    const big = { ...VALID, padding: 'x'.repeat(GUEST_PAYLOAD_MAX_BYTES) }
    expect((await post(big)).status).toBe(413)
    expect(
      (await post(VALID, { 'content-length': String(GUEST_PAYLOAD_MAX_BYTES + 1) })).status,
    ).toBe(413)
    expect(from).not.toHaveBeenCalled()
  })

  it.each([
    ['not json', '{oops'],
    ['missing progress', { onboarding: {} }],
    ['bad age band', { ...VALID, onboarding: { ageBand: 'adult' } }],
    ['ids not array', { ...VALID, progress: { completedLessonIds: 'lesson-01' } }],
    ['non-string id', { ...VALID, progress: { cardIds: [42] } }],
    ['free text as id', { ...VALID, progress: { badgeIds: ['我的名字是小明'] } }],
    ['bad snapshot time', { ...VALID, progress: { projectSnapshots: [{ lessonId: 'l1', updatedAt: 'yesterday', blocks: [] }] } }],
    ['blocks not array', { ...VALID, progress: { projectSnapshots: [{ lessonId: 'l1', updatedAt: '2026-10-22T00:00:00.000Z', blocks: {} }] } }],
  ])('rejects invalid types with 400: %s', async (_name, body) => {
    expect((await post(body)).status).toBe(400)
    expect(from).not.toHaveBeenCalled()
  })

  it('reports synced:false without a cloud backend and never claims success on a DB error', async () => {
    mocks.hasSupabaseEnv.mockReturnValue(false)
    const local = await post(VALID)
    expect(local.status).toBe(200)
    expect(await local.json()).toMatchObject({ synced: false })

    mocks.hasSupabaseEnv.mockReturnValue(true)
    upsert.mockResolvedValueOnce({ error: { message: 'rls' } })
    expect((await post(VALID)).status).toBe(502)
  })

  it('reuses the existing guest cookie and only sets it for new guests', async () => {
    mocks.cookieGet.mockReturnValue({ value: '11111111-1111-4111-8111-111111111111' })
    const response = await post(VALID)
    expect(upsert.mock.calls[0][0].guest_id).toBe('11111111-1111-4111-8111-111111111111')
    expect(response.headers.get('set-cookie')).toBeNull()
  })
})
