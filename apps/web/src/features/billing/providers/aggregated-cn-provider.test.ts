import { describe, expect, it, vi } from 'vitest'

import { createAggregatedCnProvider } from './aggregated-cn-provider'

describe('createAggregatedCnProvider', () => {
  it('maps successful createPayment response to pending qr payment', async () => {
    const provider = createAggregatedCnProvider({
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: '0000',
            order_no: 'll-001',
            pay_url: 'https://pay.example.com/qr/ll-001',
            expire_at: '2026-04-02T10:00:00Z',
          }),
          { status: 200 },
        ),
      ),
    })

    const result = await provider.createPayment({
      orderId: 'order_1',
      userId: 'user_1',
      productCode: 'launch_pack',
      title: '启蒙课程包',
      amountCny: 19900,
      successUrl: 'https://kids.example.com/parent/purchase/success?order=order_1',
    })

    expect(result.provider).toBe('aggregated_cn')
    expect(result.status).toBe('pending')
    expect(result.providerOrderId).toBe('ll-001')
    expect(result.qrCodeValue).toBe('https://pay.example.com/qr/ll-001')
    expect(result.qrExpiresAt).toBe('2026-04-02T10:00:00Z')
  })

  it('rejects webhook when signature is invalid', async () => {
    const provider = createAggregatedCnProvider({
      verifySignature: vi.fn().mockReturnValue(false),
    })

    const request = new Request(
      'https://kids.example.com/api/payments/providers/aggregated_cn/webhook',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-cn-pay-signature': 'invalid',
        },
        body: JSON.stringify({
          order_no: 'll-001',
          trade_status: 'SUCCESS',
        }),
      },
    )

    await expect(provider.parseWebhook(request)).rejects.toThrow(
      'invalid-signature',
    )
  })

  it('throws when createPayment returns a provider error', async () => {
    const provider = createAggregatedCnProvider({
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: '1001',
            message: 'sign error',
          }),
          { status: 200 },
        ),
      ),
    })

    await expect(
      provider.createPayment({
        orderId: 'order_1',
        userId: 'user_1',
        productCode: 'launch_pack',
        title: '启蒙课程包',
        amountCny: 19900,
        successUrl:
          'https://kids.example.com/parent/purchase/success?order=order_1',
      }),
    ).rejects.toThrow('create-payment-failed')
  })
})
