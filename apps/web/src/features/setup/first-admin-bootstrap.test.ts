import { describe, expect, it, vi } from 'vitest'

import {
  bootstrapFirstAdmin,
  resolveFirstAdminBootstrapState,
} from './first-admin-bootstrap'

describe('resolveFirstAdminBootstrapState', () => {
  it('returns not_logged_in when the token is valid but there is no session', () => {
    expect(
      resolveFirstAdminBootstrapState({
        expectedToken: 'setup-demo-token',
        providedToken: 'setup-demo-token',
        user: null,
        hasAnyAdmin: false,
      }),
    ).toEqual({ status: 'not_logged_in' })
  })

  it('returns invalid_token when the token does not match', () => {
    expect(
      resolveFirstAdminBootstrapState({
        expectedToken: 'setup-demo-token',
        providedToken: 'wrong-token',
        user: null,
        hasAnyAdmin: false,
      }),
    ).toEqual({ status: 'invalid_token' })
  })

  it('returns closed before invalid_token when an admin already exists', () => {
    expect(
      resolveFirstAdminBootstrapState({
        expectedToken: 'setup-demo-token',
        providedToken: 'wrong-token',
        user: null,
        hasAnyAdmin: true,
      }),
    ).toEqual({ status: 'closed' })
  })

  it('returns closed when any admin already exists', () => {
    expect(
      resolveFirstAdminBootstrapState({
        expectedToken: 'setup-demo-token',
        providedToken: 'setup-demo-token',
        user: { id: 'user-1', email: 'owner@example.com' } as never,
        hasAnyAdmin: true,
      }),
    ).toEqual({ status: 'closed' })
  })

  it('returns ready with an identity label when the user can continue', () => {
    expect(
      resolveFirstAdminBootstrapState({
        expectedToken: 'setup-demo-token',
        providedToken: 'setup-demo-token',
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          phone: null,
        } as never,
        hasAnyAdmin: false,
      }),
    ).toEqual({
      status: 'ready',
      identityLabel: 'owner@example.com',
    })
  })
})

describe('bootstrapFirstAdmin', () => {
  it('promotes the current user and records the bootstrap event', async () => {
    const repository = {
      hasAnyAdmin: vi.fn().mockResolvedValue(false),
      grantAdminRole: vi.fn().mockResolvedValue(undefined),
      insertBootstrapEvent: vi.fn().mockResolvedValue(undefined),
    }

    await bootstrapFirstAdmin({
      expectedToken: 'setup-demo-token',
      providedToken: 'setup-demo-token',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        app_metadata: { plan: 'launch' },
      } as never,
      repository,
      now: () => '2026-04-02T10:30:00.000Z',
    })

    expect(repository.grantAdminRole).toHaveBeenCalledWith({
      userId: 'user-1',
      appMetadata: { plan: 'launch', role: 'admin' },
    })
    expect(repository.insertBootstrapEvent).toHaveBeenCalledWith({
      user_id: 'user-1',
      email: 'owner@example.com',
      event_type: 'first_admin_granted',
      created_at: '2026-04-02T10:30:00.000Z',
    })
  })

  it('rejects the write when an admin already exists', async () => {
    const repository = {
      hasAnyAdmin: vi.fn().mockResolvedValue(true),
      grantAdminRole: vi.fn(),
      insertBootstrapEvent: vi.fn(),
    }

    await expect(
      bootstrapFirstAdmin({
        expectedToken: 'setup-demo-token',
        providedToken: 'setup-demo-token',
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          app_metadata: {},
        } as never,
        repository,
      }),
    ).rejects.toThrowError('admin-bootstrap-closed')
  })

  it('rolls the role back when event logging fails', async () => {
    const repository = {
      hasAnyAdmin: vi.fn().mockResolvedValue(false),
      grantAdminRole: vi.fn().mockResolvedValue(undefined),
      insertBootstrapEvent: vi.fn().mockRejectedValue(new Error('insert-failed')),
    }

    await expect(
      bootstrapFirstAdmin({
        expectedToken: 'setup-demo-token',
        providedToken: 'setup-demo-token',
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          app_metadata: { plan: 'launch' },
        } as never,
        repository,
      }),
    ).rejects.toThrowError('insert-failed')

    expect(repository.grantAdminRole).toHaveBeenNthCalledWith(1, {
      userId: 'user-1',
      appMetadata: { plan: 'launch', role: 'admin' },
    })
    expect(repository.grantAdminRole).toHaveBeenNthCalledWith(2, {
      userId: 'user-1',
      appMetadata: { plan: 'launch' },
    })
  })
})
