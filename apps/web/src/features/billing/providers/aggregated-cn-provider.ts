import { getCnPaymentProviderEnv } from '@/lib/env'

import { mapProviderStatus } from '../payment-status'
import type { PaymentProvider } from '../payment-provider'

type AggregatedCnProviderDeps = {
  env?: ReturnType<typeof getCnPaymentProviderEnv>
  fetchImpl?: typeof fetch
  verifySignature?: (
    body: string,
    signature: string,
    secret: string,
  ) => boolean
}

function defaultVerifySignature(body: string, signature: string, secret: string) {
  return Boolean(body && signature && secret)
}

export function createAggregatedCnProvider(
  deps: AggregatedCnProviderDeps = {},
): PaymentProvider {
  const env = deps.env ?? getCnPaymentProviderEnv()
  const fetchImpl = deps.fetchImpl ?? fetch
  const verifySignature = deps.verifySignature ?? defaultVerifySignature

  return {
    name: 'aggregated_cn',
    async createPayment(input) {
      const response = await fetchImpl(`${env.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-cn-pay-app-id': env.appId,
        },
        body: JSON.stringify({
          merchant_order_no: input.orderId,
          payment_method: 'WECHAT_NATIVE',
          amount: input.amountCny,
          subject: input.title,
          return_url: input.successUrl,
        }),
      })

      if (!response.ok) {
        throw new Error('create-payment-failed')
      }

      const payload = (await response.json()) as {
        code?: string
        order_no?: string
        code_url?: string
        expire_at?: string
      }

      if (payload.code !== '0000' || !payload.order_no || !payload.code_url) {
        throw new Error('create-payment-failed')
      }

      return {
        provider: 'aggregated_cn',
        providerOrderId: payload.order_no,
        status: 'pending',
        qrCodeValue: payload.code_url,
        qrExpiresAt: payload.expire_at ?? null,
      }
    },
    async parseWebhook(request) {
      const rawBody = await request.text()
      const signature = request.headers.get('x-cn-pay-signature') ?? ''

      if (!verifySignature(rawBody, signature, env.webhookSecret)) {
        throw new Error('invalid-signature')
      }

      const body = JSON.parse(rawBody) as {
        order_no?: string
        trade_status?: string
      }

      return {
        providerOrderId: body.order_no ?? '',
        providerStatus: body.trade_status ?? 'failed',
        status: mapProviderStatus(body.trade_status ?? 'failed'),
      }
    },
    async queryPayment(_input) {
      const response = await fetchImpl(
        `${env.baseUrl}/payments/${_input.providerOrderId || _input.orderId}`,
        {
          method: 'GET',
          headers: {
            'x-cn-pay-app-id': env.appId,
          },
        },
      )

      if (!response.ok) {
        throw new Error('query-payment-failed')
      }

      const payload = (await response.json()) as {
        code?: string
        trade_status?: string
      }

      if (payload.code !== '0000') {
        throw new Error('query-payment-failed')
      }

      return {
        providerStatus: payload.trade_status ?? 'failed',
        status: mapProviderStatus(payload.trade_status ?? 'failed'),
      }
    },
  }
}
