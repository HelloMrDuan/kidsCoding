import { createHmac, timingSafeEqual } from 'node:crypto'

import { getCnPaymentProviderEnv } from '@/lib/env'

import { mapProviderStatus } from '../payment-status'
import type { PaymentProvider } from '../payment-provider'

type VerifySignatureInput = {
  body: string
  signatureData: string
  signatureType: string
  secret: string
}

type AggregatedCnProviderDeps = {
  env?: ReturnType<typeof getCnPaymentProviderEnv>
  fetchImpl?: typeof fetch
  verifySignature?: (input: VerifySignatureInput) => boolean
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function defaultVerifySignature(input: VerifySignatureInput) {
  if (!input.body || !input.signatureData || !input.secret) {
    return false
  }

  const signature = input.signatureData.trim()
  const normalizedSignature = signature.replace(/[\r\n]/g, '')
  const base64Digest = createHmac('sha256', input.secret)
    .update(input.body)
    .digest('base64')
  const hexDigest = createHmac('sha256', input.secret)
    .update(input.body)
    .digest('hex')

  return (
    safeCompare(normalizedSignature, base64Digest) ||
    safeCompare(normalizedSignature, hexDigest)
  )
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
          'x-ll-app-id': env.appId,
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
      const signatureType = request.headers.get('Signature-Type') ?? ''
      const signatureData =
        request.headers.get('Signature-Data') ??
        request.headers.get('x-ll-sign') ??
        ''

      if (
        !verifySignature({
          body: rawBody,
          signatureData,
          signatureType,
          secret: env.webhookSecret,
        })
      ) {
        throw new Error('invalid-signature')
      }

      const body = JSON.parse(rawBody) as {
        txn_seqno?: string
        platform_txno?: string
        txn_status?: string
        order_no?: string
        trade_status?: string
      }
      const providerStatus = body.txn_status ?? body.trade_status ?? 'failed'
      const providerOrderId = body.platform_txno ?? body.order_no ?? ''

      return {
        providerOrderId,
        providerStatus,
        status: mapProviderStatus(providerStatus),
      }
    },
    async queryPayment(_input) {
      const response = await fetchImpl(
        `${env.baseUrl}/payments/${_input.providerOrderId || _input.orderId}`,
        {
          method: 'GET',
          headers: {
            'x-ll-app-id': env.appId,
          },
        },
      )

      if (!response.ok) {
        throw new Error('query-payment-failed')
      }

      const payload = (await response.json()) as {
        code?: string
        txn_status?: string
        trade_status?: string
      }

      if (payload.code !== '0000') {
        throw new Error('query-payment-failed')
      }
      const providerStatus = payload.txn_status ?? payload.trade_status ?? 'failed'

      return {
        providerStatus,
        status: mapProviderStatus(providerStatus),
      }
    },
  }
}
