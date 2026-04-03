import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  resolvePaymentProvider: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}))

vi.mock('@/features/billing/payment-provider-registry', () => ({
  resolvePaymentProvider: mocks.resolvePaymentProvider,
}))

import { POST } from './route'

describe('POST /api/payments/providers/[provider]/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks order as paid when aggregated_cn webhook is valid and successful', async () => {
    const orderUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const entitlementUpsert = vi.fn().mockResolvedValue({ error: null })
    const ordersTable = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'order-1',
              user_id: 'user-1',
              product_code: 'launch-story-pack',
            },
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: orderUpdateEq,
      }),
    }

    mocks.createAdminClient.mockReturnValue({
      from: vi
        .fn()
        .mockImplementation((table: string) =>
          table === 'orders'
            ? ordersTable
            : {
                upsert: entitlementUpsert,
              },
        ),
    })

    mocks.resolvePaymentProvider.mockReturnValue({
      createPayment: vi.fn(),
      parseWebhook: vi.fn().mockResolvedValue({
        providerOrderId: 'll-001',
        providerStatus: 'SUCCESS',
        status: 'paid',
      }),
      queryPayment: vi.fn(),
    })

    const response = await POST(
      new Request('https://kids.example.com/api/payments/providers/aggregated_cn/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
      {
        params: Promise.resolve({ provider: 'aggregated_cn' }),
      },
    )

    expect(response.status).toBe(200)
    expect(orderUpdateEq).toHaveBeenCalled()
    expect(entitlementUpsert).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        product_code: 'launch-story-pack',
        status: 'active',
      },
      {
        onConflict: 'user_id,product_code',
      },
    )
  })
})
