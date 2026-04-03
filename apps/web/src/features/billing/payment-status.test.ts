import { describe, expect, it } from 'vitest'

import { isTerminalPaymentStatus, mapProviderStatus } from './payment-status'

describe('payment status helpers', () => {
  it('maps provider statuses into unified platform statuses', () => {
    expect(mapProviderStatus('created')).toBe('created')
    expect(mapProviderStatus('waiting_payment')).toBe('pending')
    expect(mapProviderStatus('paid')).toBe('paid')
    expect(mapProviderStatus('closed')).toBe('expired')
    expect(mapProviderStatus('failed')).toBe('failed')
  })

  it('marks only paid failed and expired as terminal', () => {
    expect(isTerminalPaymentStatus('created')).toBe(false)
    expect(isTerminalPaymentStatus('pending')).toBe(false)
    expect(isTerminalPaymentStatus('paid')).toBe(true)
    expect(isTerminalPaymentStatus('failed')).toBe(true)
    expect(isTerminalPaymentStatus('expired')).toBe(true)
  })
})
