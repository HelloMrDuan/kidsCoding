import type {
  PaymentOrderStatus,
  PaymentProviderName,
} from './payment-provider'

export function createPaymentOrderService(deps: {
  updateOrder: (input: Record<string, unknown>) => Promise<void>
  upsertEntitlement: (input: {
    userId: string
    productCode: string
    status: 'active'
  }) => Promise<void>
}) {
  return {
    async applyCreatePaymentResult(input: {
      orderId: string
      provider: PaymentProviderName
      providerOrderId: string
      status: Extract<PaymentOrderStatus, 'created' | 'pending'>
      qrCodeValue: string
      qrExpiresAt: string | null
    }) {
      await deps.updateOrder({
        id: input.orderId,
        provider: input.provider,
        provider_session_id: input.providerOrderId,
        status: input.status,
        qr_expires_at: input.qrExpiresAt,
        provider_status: input.status,
      })

      return input
    },

    async markOrderPaid(input: {
      orderId: string
      userId: string
      productCode: string
      providerStatus: string
    }) {
      await deps.updateOrder({
        id: input.orderId,
        status: 'paid',
        provider_status: input.providerStatus,
        last_synced_at: new Date().toISOString(),
      })

      await deps.upsertEntitlement({
        userId: input.userId,
        productCode: input.productCode,
        status: 'active',
      })
    },
  }
}
