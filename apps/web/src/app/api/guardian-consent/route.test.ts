import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hasSupabaseEnv: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/env', () => ({ hasSupabaseEnv: mocks.hasSupabaseEnv }))
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: mocks.createServerSupabaseClient }))

import { GET, POST } from './route'

describe('guardian consent API', () => {
  const getUser = vi.fn()
  const eq = vi.fn()
  const maybeSingle = vi.fn()
  const upsert = vi.fn()
  const select = vi.fn()
  const from = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hasSupabaseEnv.mockReturnValue(true)
    getUser.mockResolvedValue({ data: { user: { id: 'account-123' } }, error: null })
    maybeSingle.mockResolvedValue({ data: null, error: null })
    eq.mockReturnValue({ eq, maybeSingle })
    select.mockReturnValue({ eq })
    upsert.mockResolvedValue({ error: null })
    from.mockReturnValue({ select, upsert })
    mocks.createServerSupabaseClient.mockResolvedValue({ auth: { getUser }, from })
  })

  it('fails closed when Supabase is unavailable', async () => {
    mocks.hasSupabaseEnv.mockReturnValue(false)
    expect((await GET()).status).toBe(503)
    expect((await POST(new Request('http://localhost/api/guardian-consent', { method: 'POST', body: '{}' }))).status).toBe(503)
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated status reads and grants', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect((await GET()).status).toBe(401)
    expect((await POST(new Request('http://localhost/api/guardian-consent', { method: 'POST', body: '{}' }))).status).toBe(401)
    expect(from).not.toHaveBeenCalled()
  })

  it('reports ungranted when no consent row exists', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(from).toHaveBeenCalledWith('guardian_consents')
    expect(select).toHaveBeenCalledWith('scope,granted_at')
    expect(eq).toHaveBeenCalledWith('user_id', 'account-123')
    expect(eq).toHaveBeenCalledWith('scope', 'cloud-drafts')
    await expect(response.json()).resolves.toEqual({ granted: false, grantedAt: null })
  })

  it('reports granted with the stored timestamp when a row exists', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { scope: 'cloud-drafts', granted_at: '2026-10-28T00:00:00Z' }, error: null })
    const response = await GET()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ granted: true, grantedAt: '2026-10-28T00:00:00Z' })
  })

  it('reports storage failure on status read instead of ungranted', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'db-down' } })
    const response = await GET()
    expect(response.status).toBe(503)
    expect((await response.json()).error).toBe('cloud-draft-storage-unavailable')
  })

  it('grants only the server-fixed scope for the session account', async () => {
    const response = await POST(new Request('http://localhost/api/guardian-consent', {
      method: 'POST', body: JSON.stringify({ userId: 'other-user', scope: 'everything' }),
    }))
    expect(response.status).toBe(200)
    expect(upsert).toHaveBeenCalledWith(
      { user_id: 'account-123', scope: 'cloud-drafts', granted_at: expect.any(String) },
      { onConflict: 'user_id,scope' },
    )
    const saved = upsert.mock.calls[0][0]
    expect(saved).not.toHaveProperty('userId')
    expect(saved.scope).toBe('cloud-drafts')
    await expect(response.json()).resolves.toEqual({ granted: true, grantedAt: expect.any(String) })
  })

  it('rejects cross-origin grants and reports storage failure', async () => {
    expect((await POST(new Request('http://localhost/api/guardian-consent', {
      method: 'POST', headers: { Origin: 'https://evil.invalid' }, body: '{}',
    }))).status).toBe(403)
    expect(upsert).not.toHaveBeenCalled()
    upsert.mockResolvedValueOnce({ error: { message: 'db-down' } })
    expect((await POST(new Request('http://localhost/api/guardian-consent', { method: 'POST', body: '{}' }))).status).toBe(503)
  })
})
