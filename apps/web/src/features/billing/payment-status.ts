import type { PaymentOrderStatus } from './payment-provider'

export function mapProviderStatus(value: string): PaymentOrderStatus {
  switch (value) {
    case 'created':
      return 'created'
    case 'waiting_payment':
    case 'pending':
      return 'pending'
    case 'paid':
    case 'succeeded':
      return 'paid'
    case 'closed':
    case 'expired':
      return 'expired'
    default:
      return 'failed'
  }
}

export function isTerminalPaymentStatus(status: PaymentOrderStatus) {
  return status === 'paid' || status === 'failed' || status === 'expired'
}
