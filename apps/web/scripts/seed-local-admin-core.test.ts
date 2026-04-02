import { describe, expect, it, vi } from 'vitest'

import { ensureLocalAdmin } from './seed-local-admin-core.mjs'

describe('ensureLocalAdmin', () => {
  it('creates the user when it does not exist', async () => {
    const admin = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
          createUser: vi
            .fn()
            .mockResolvedValue({ data: { user: { id: '1' } }, error: null }),
          updateUserById: vi.fn(),
        },
      },
    }

    await ensureLocalAdmin(admin, {
      email: 'admin-local@kidscoding.test',
      password: 'KidsCodingLocalAdmin123!',
    })

    expect(admin.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'admin-local@kidscoding.test',
      password: 'KidsCodingLocalAdmin123!',
      email_confirm: true,
      app_metadata: { role: 'admin' },
    })
  })

  it('repairs the role when the user exists without admin metadata', async () => {
    const admin = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                {
                  id: '1',
                  email: 'admin-local@kidscoding.test',
                  app_metadata: { plan: 'launch' },
                },
              ],
            },
            error: null,
          }),
          createUser: vi.fn(),
          updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
    }

    await ensureLocalAdmin(admin, {
      email: 'admin-local@kidscoding.test',
      password: 'KidsCodingLocalAdmin123!',
    })

    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith('1', {
      password: 'KidsCodingLocalAdmin123!',
      email_confirm: true,
      app_metadata: {
        plan: 'launch',
        role: 'admin',
      },
    })
  })
})
