import { describe, expect, it } from 'vitest'

import { assertAdminUser } from './admin-auth'

describe('assertAdminUser', () => {
  it('accepts users whose app_metadata.role is admin', () => {
    expect(() =>
      assertAdminUser({
        id: 'user-1',
        app_metadata: { role: 'admin' },
      } as never),
    ).not.toThrow()
  })

  it('rejects missing users', () => {
    expect(() => assertAdminUser(null)).toThrow('admin-auth-required')
  })

  it('rejects non-admin users', () => {
    expect(() =>
      assertAdminUser({
        id: 'user-2',
        app_metadata: { role: 'parent' },
      } as never),
    ).toThrow('admin-role-required')
  })
})
