import { describe, expect, it, vi } from 'vitest'

import { createAggregatedCnProvider } from './aggregated-cn-provider'

describe('createAggregatedCnProvider', () => {
  it('sends a WECHAT_NATIVE create order request to LianLian', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: '0000',
          order_no: 'll-001',
          code_url: 'weixin://wxpay/mock-qrcode',
          expire_at: '2026-04-03T10:00:00Z',
        }),
        { status: 200 },
      ),
    )

    const provider = createAggregatedCnProvider({
      env: {
        baseUrl: 'https://openapi.lianlianpay.example.com',
        appId: 'll-app-id',
        appSecret: 'll-app-secret',
        webhookSecret: 'll-webhook-secret',
      },
      fetchImpl,
    })

    await provider.createPayment({
      orderId: 'order_1',
      userId: 'user_1',
      productCode: 'launch_pack',
      title: 'Launch Pack',
      amountCny: 19900,
      successUrl: 'https://kids.example.com/parent/purchase/success?order=order_1',
    })

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://openapi.lianlianpay.example.com/payments',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('WECHAT_NATIVE'),
      }),
    )
  })

  it('maps successful createPayment response to pending qr payment', async () => {
    const provider = createAggregatedCnProvider({
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: '0000',
            order_no: 'll-001',
            code_url: 'weixin://wxpay/mock-qrcode',
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
      title: 'Launch Pack',
      amountCny: 19900,
      successUrl: 'https://kids.example.com/parent/purchase/success?order=order_1',
    })

    expect(result.provider).toBe('aggregated_cn')
    expect(result.status).toBe('pending')
    expect(result.providerOrderId).toBe('ll-001')
    expect(result.qrCodeValue).toBe('weixin://wxpay/mock-qrcode')
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

  it('maps SUCCESS webhook to paid after signature verification', async () => {
    const provider = createAggregatedCnProvider({
      verifySignature: vi.fn().mockReturnValue(true),
    })

    const request = new Request(
      'https://kids.example.com/api/payments/providers/aggregated_cn/webhook',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-cn-pay-signature': 'valid',
        },
        body: JSON.stringify({
          order_no: 'll-001',
          trade_status: 'SUCCESS',
        }),
      },
    )

    const result = await provider.parseWebhook(request)

    expect(result.providerOrderId).toBe('ll-001')
    expect(result.providerStatus).toBe('SUCCESS')
    expect(result.status).toBe('paid')
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
        title: 'Launch Pack',
        amountCny: 19900,
        successUrl:
          'https://kids.example.com/parent/purchase/success?order=order_1',
      }),
    ).rejects.toThrow('create-payment-failed')
  })

  it('maps queryPayment success to paid', async () => {
    const provider = createAggregatedCnProvider({
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: '0000',
            trade_status: 'SUCCESS',
          }),
          { status: 200 },
        ),
      ),
    })

    const result = await provider.queryPayment({
      orderId: 'order_1',
      providerOrderId: 'll-001',
    })

    expect(result.providerStatus).toBe('SUCCESS')
    expect(result.status).toBe('paid')
  })
})
