import { createAggregatedCnProvider } from './providers/aggregated-cn-provider'
import { createStripeProvider } from './providers/stripe-provider'
import type { PaymentProvider, PaymentProviderName } from './payment-provider'

export function resolveDefaultPaymentProvider(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): PaymentProviderName {
  return env.PAYMENT_PROVIDER_DEFAULT === 'stripe' ? 'stripe' : 'aggregated_cn'
}

export function resolvePaymentProvider(
  provider: PaymentProviderName,
): PaymentProvider {
  switch (provider) {
    case 'stripe':
      return createStripeProvider()
    case 'aggregated_cn':
      return createAggregatedCnProvider()
  }
}
