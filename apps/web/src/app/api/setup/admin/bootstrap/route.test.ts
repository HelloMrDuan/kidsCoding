import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  createAdminClient: vi.fn(),
  createFirstAdminBootstrapRepository: vi.fn(),
  resolveFirstAdminBootstrapState: vi.fn(),
  bootstrapFirstAdmin: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  getAdminSetupToken: () => 'setup-demo-token',
  hasServiceRoleEnv: () => true,
  hasSupabaseEnv: () => true,
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}))

vi.mock('@/features/setup/first-admin-bootstrap-repository', () => ({
  createFirstAdminBootstrapRepository:
    mocks.createFirstAdminBootstrapRepository,
}))

vi.mock('@/features/setup/first-admin-bootstrap', () => ({
  resolveFirstAdminBootstrapState: mocks.resolveFirstAdminBootstrapState,
  bootstrapFirstAdmin: mocks.bootstrapFirstAdmin,
}))

import { GET, POST } from './route'

describe('GET /api/setup/admin/bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'owner@example.com',
              app_metadata: {},
            },
          },
        }),
      },
    })
    mocks.createAdminClient.mockReturnValue({ admin: true })
    mocks.createFirstAdminBootstrapRepository.mockReturnValue({
      hasAnyAdmin: vi.fn().mockResolvedValue(false),
    })
    mocks.resolveFirstAdminBootstrapState.mockReturnValue({
      status: 'ready',
      identityLabel: 'owner@example.com',
    })
  })

  it('returns the resolved bootstrap state', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/setup/admin/bootstrap?token=setup-demo-token',
      ),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: 'ready',
      identityLabel: 'owner@example.com',
    })
  })
})

describe('POST /api/setup/admin/bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'owner@example.com',
              app_metadata: { plan: 'launch' },
            },
          },
        }),
      },
    })
    mocks.createAdminClient.mockReturnValue({ admin: true })
    mocks.createFirstAdminBootstrapRepository.mockReturnValue({})
    mocks.bootstrapFirstAdmin.mockResolvedValue({ ok: true })
  })

  it('runs the bootstrap write and returns ok', async () => {
    const response = await POST(
      new Request('http://localhost/api/setup/admin/bootstrap', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'setup-demo-token' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(mocks.bootstrapFirstAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedToken: 'setup-demo-token',
        providedToken: 'setup-demo-token',
      }),
    )
    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})
