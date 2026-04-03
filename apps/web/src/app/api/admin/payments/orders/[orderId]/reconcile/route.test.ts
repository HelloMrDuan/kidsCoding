import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  createAdminClient: vi.fn(),
  resolvePaymentProvider: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}))

vi.mock('@/features/billing/payment-provider-registry', () => ({
  resolvePaymentProvider: mocks.resolvePaymentProvider,
}))

import { POST } from './route'

describe('POST /api/admin/payments/orders/[orderId]/reconcile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks order as paid when reconcile query confirms payment', async () => {
    const orderUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const entitlementUpsert = vi.fn().mockResolvedValue({ error: null })

    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'admin-1',
              app_metadata: { role: 'admin' },
            },
          },
        }),
      },
    })

    mocks.createAdminClient.mockReturnValue({
      from: vi
        .fn()
        .mockImplementation((table: string) => {
          if (table === 'orders') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'order-1',
                      user_id: 'user-1',
                      product_code: 'launch-story-pack',
                      provider: 'aggregated_cn',
                      provider_session_id: 'll-001',
                    },
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: orderUpdateEq,
              }),
            }
          }

          return {
            upsert: entitlementUpsert,
          }
        }),
    })

    mocks.resolvePaymentProvider.mockReturnValue({
      createPayment: vi.fn(),
      parseWebhook: vi.fn(),
      queryPayment: vi.fn().mockResolvedValue({
        providerStatus: 'SUCCESS',
        status: 'paid',
      }),
    })

    const response = await POST(
      new Request(
        'https://kids.example.com/api/admin/payments/orders/order-1/reconcile',
        {
          method: 'POST',
        },
      ),
      { params: Promise.resolve({ orderId: 'order-1' }) },
    )

    expect(response.status).toBe(200)
    expect(orderUpdateEq).toHaveBeenCalled()
    expect(entitlementUpsert).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        product_code: 'launch-story-pack',
        status: 'active',
      },
      { onConflict: 'user_id,product_code' },
    )
  })
})
