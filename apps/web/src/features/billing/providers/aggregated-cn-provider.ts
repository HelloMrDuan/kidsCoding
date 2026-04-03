import { mapProviderStatus } from '../payment-status'
import type { PaymentProvider } from '../payment-provider'

export function createAggregatedCnProvider(): PaymentProvider {
  return {
    name: 'aggregated_cn',
    async createPayment(input) {
      return {
        provider: 'aggregated_cn',
        providerOrderId: `cn_${input.orderId}`,
        status: 'pending',
        qrCodeValue: `pay://aggregated_cn/${input.orderId}`,
        qrExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }
    },
    async parseWebhook(request) {
      const body = (await request.json()) as {
        providerOrderId?: string
        status?: string
      }

      return {
        providerOrderId: body.providerOrderId ?? '',
        providerStatus: body.status ?? 'failed',
        status: mapProviderStatus(body.status ?? 'failed'),
      }
    },
    async queryPayment(_input) {
      void _input
      return {
        providerStatus: 'pending',
        status: mapProviderStatus('pending'),
      }
    },
  }
}
