// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ hasSupabaseEnv: vi.fn(), getUser: vi.fn() }))
vi.mock('@/lib/env', () => ({ hasSupabaseEnv: mocks.hasSupabaseEnv }))
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: async () => ({ auth: { getUser: mocks.getUser } }) }))
import { currentCreateOwner } from './create-owner'

describe('Workspace identity', () => {
  it('uses the verified user ID and permits explicit guest sessions', async () => {
    mocks.hasSupabaseEnv.mockReturnValue(true)
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'abcd' } }, error: null })
    await expect(currentCreateOwner()).resolves.toBe('user:abcd')
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: { name: 'AuthSessionMissingError' } })
    await expect(currentCreateOwner()).resolves.toBe('guest')
  })

  it('does not open a fallback library on a failed account verification', async () => {
    mocks.hasSupabaseEnv.mockReturnValue(true)
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: { name: 'AuthRetryableFetchError' } })
    await expect(currentCreateOwner()).resolves.toBeNull()
    mocks.getUser.mockRejectedValueOnce(new Error('offline'))
    await expect(currentCreateOwner()).resolves.toBeNull()
    mocks.hasSupabaseEnv.mockReturnValue(false)
    await expect(currentCreateOwner()).resolves.toBe('guest')
  })
})
