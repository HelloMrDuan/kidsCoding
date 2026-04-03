import { describe, expect, it } from 'vitest'

import {
  resolveDefaultPaymentProvider,
  resolvePaymentProvider,
} from './payment-provider-registry'

describe('resolveDefaultPaymentProvider', () => {
  it('defaults to aggregated_cn when env is missing', () => {
    expect(resolveDefaultPaymentProvider({})).toBe('aggregated_cn')
  })

  it('returns stripe only when explicitly configured', () => {
    expect(
      resolveDefaultPaymentProvider({
        PAYMENT_PROVIDER_DEFAULT: 'stripe',
      }),
    ).toBe('stripe')
  })
})

describe('resolvePaymentProvider', () => {
  it('resolves aggregated_cn provider', () => {
    const provider = resolvePaymentProvider('aggregated_cn')

    expect(provider.name).toBe('aggregated_cn')
    expect(typeof provider.createPayment).toBe('function')
    expect(typeof provider.parseWebhook).toBe('function')
    expect(typeof provider.queryPayment).toBe('function')
  })
})
