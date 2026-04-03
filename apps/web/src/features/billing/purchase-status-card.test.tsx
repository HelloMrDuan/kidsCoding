import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PurchaseStatusCard } from './purchase-status-card'

describe('PurchaseStatusCard', () => {
  it('shows timeout copy and a manual refresh action', () => {
    render(
      <PurchaseStatusCard
        orderId="order-1"
        status="pending"
        timedOut
        onRefresh={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByText('仍在确认中')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '手动刷新' }),
    ).toBeInTheDocument()
  })
})
