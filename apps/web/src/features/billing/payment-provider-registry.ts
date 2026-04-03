import type { PaymentProviderName } from './payment-provider'

export function resolveDefaultPaymentProvider(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): PaymentProviderName {
  return env.PAYMENT_PROVIDER_DEFAULT === 'stripe' ? 'stripe' : 'aggregated_cn'
}
