import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PaymentReconcileCard } from './payment-reconcile-card'

describe('PaymentReconcileCard', () => {
  it('submits the entered order id to the reconcile handler', async () => {
    const reconcileRequest = vi.fn().mockResolvedValue({
      ok: true,
      status: 'paid',
    })

    render(<PaymentReconcileCard reconcileRequest={reconcileRequest} />)

    fireEvent.change(screen.getByLabelText('订单号'), {
      target: { value: 'order-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: '重试同步' }))

    await waitFor(() => expect(reconcileRequest).toHaveBeenCalledWith('order-1'))
  })
})
