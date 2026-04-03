export type PaymentProviderName = 'stripe' | 'aggregated_cn'

export type PaymentOrderStatus =
  | 'created'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired'

export type CreatePaymentResult = {
  provider: PaymentProviderName
  providerOrderId: string
  status: PaymentOrderStatus
  qrCodeValue: string
  qrExpiresAt: string | null
}

export interface PaymentProvider {
  readonly name: PaymentProviderName
  createPayment(input: {
    orderId: string
    userId: string
    productCode: string
    title: string
    amountCny: number
    successUrl: string
  }): Promise<CreatePaymentResult>
  parseWebhook(request: Request): Promise<{
    providerOrderId: string
    providerStatus: string
    status: PaymentOrderStatus
  }>
  queryPayment(input: {
    orderId: string
    providerOrderId: string
  }): Promise<{
    providerStatus: string
    status: PaymentOrderStatus
  }>
}
