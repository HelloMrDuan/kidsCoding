import { describe, expect, it } from 'vitest'

import { resolveDefaultPaymentProvider } from './payment-provider-registry'

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
