import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

import { GET } from './route'

describe('GET /api/payments/orders/[orderId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns order status and unlock state for the current user', async () => {
    const orderMaybeSingle = vi
      .fn()
      .mockResolvedValue({
        data: {
          id: 'order-1',
          user_id: 'user-1',
          status: 'paid',
          product_code: 'launch-story-pack',
        },
      })
    const entitlementMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        status: 'active',
      },
    })
    const orderChain = {
      eq: vi.fn(),
      maybeSingle: orderMaybeSingle,
    }
    orderChain.eq.mockReturnValue(orderChain)
    const entitlementChain = {
      eq: vi.fn(),
      maybeSingle: entitlementMaybeSingle,
    }
    entitlementChain.eq.mockReturnValue(entitlementChain)
    const from = vi
      .fn()
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue(orderChain),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue(entitlementChain),
      })

    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
      from,
    })

    const response = await GET(
      new Request('http://localhost/api/payments/orders/order-1'),
      { params: Promise.resolve({ orderId: 'order-1' }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      orderId: 'order-1',
      status: 'paid',
      unlocked: true,
    })
  })

  it('keeps the response pending when order is paid but entitlement is not active yet', async () => {
    const orderMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'order-1',
        user_id: 'user-1',
        status: 'paid',
        product_code: 'launch-story-pack',
      },
    })
    const entitlementMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
    })
    const orderChain = {
      eq: vi.fn(),
      maybeSingle: orderMaybeSingle,
    }
    orderChain.eq.mockReturnValue(orderChain)
    const entitlementChain = {
      eq: vi.fn(),
      maybeSingle: entitlementMaybeSingle,
    }
    entitlementChain.eq.mockReturnValue(entitlementChain)
    const from = vi
      .fn()
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue(orderChain),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue(entitlementChain),
      })

    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
      from,
    })

    const response = await GET(
      new Request('http://localhost/api/payments/orders/order-1'),
      { params: Promise.resolve({ orderId: 'order-1' }) },
    )

    await expect(response.json()).resolves.toEqual({
      orderId: 'order-1',
      status: 'pending',
      unlocked: false,
    })
  })
})
