import { describe, expect, it, vi } from 'vitest'

import { createPaymentOrderService } from './payment-orders'

describe('payment order service', () => {
  it('applies provider payment result to the order record', async () => {
    const updateOrder = vi.fn().mockResolvedValue(undefined)
    const service = createPaymentOrderService({
      updateOrder,
      upsertEntitlement: vi.fn(),
    })

    const result = await service.applyCreatePaymentResult({
      orderId: 'order-1',
      provider: 'aggregated_cn',
      providerOrderId: 'cn-123',
      status: 'pending',
      qrCodeValue: 'weixin://qrcode',
      qrExpiresAt: '2026-04-02T10:00:00.000Z',
    })

    expect(updateOrder).toHaveBeenCalledWith({
      id: 'order-1',
      provider: 'aggregated_cn',
      provider_session_id: 'cn-123',
      status: 'pending',
      qr_expires_at: '2026-04-02T10:00:00.000Z',
      provider_status: 'pending',
    })
    expect(result.status).toBe('pending')
  })

  it('grants entitlement when order transitions to paid', async () => {
    const upsertEntitlement = vi.fn().mockResolvedValue(undefined)
    const service = createPaymentOrderService({
      updateOrder: vi.fn().mockResolvedValue(undefined),
      upsertEntitlement,
    })

    await service.markOrderPaid({
      orderId: 'order-1',
      userId: 'user-1',
      productCode: 'launch-story-pack',
      providerStatus: 'paid',
    })

    expect(upsertEntitlement).toHaveBeenCalledWith({
      userId: 'user-1',
      productCode: 'launch-story-pack',
      status: 'active',
    })
  })
})
