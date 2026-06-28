'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { PaymentOrderStatus } from './payment-provider'
import { PurchaseStatusCard } from './purchase-status-card'

type OrderStatusPayload = {
  orderId: string
  status: PaymentOrderStatus
  unlocked: boolean
}

export function PurchaseSuccessView({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<PaymentOrderStatus>('pending')
  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stopPollingRef = useRef(false)

  const refreshStatus = useCallback(async () => {
    if (!orderId) {
      return
    }

    setError(null)

    try {
      const response = await fetch(`/api/payments/orders/${orderId}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('load_failed')
      }

      const payload = (await response.json()) as OrderStatusPayload
      // The API normalizes paid-but-not-unlocked to pending, but defend against
      // any upstream inconsistency: only surface the unlocked state once the
      // entitlement is actually active, and keep polling otherwise.
      let nextStatus: PaymentOrderStatus = payload.status
      if (payload.unlocked) {
        nextStatus = 'paid'
      } else if (payload.status === 'paid') {
        nextStatus = 'pending'
      }

      setStatus(nextStatus)
      if (
        nextStatus === 'paid' ||
        nextStatus === 'failed' ||
        nextStatus === 'expired'
      ) {
        stopPollingRef.current = true
      }
    } catch {
      setError('暂时无法确认支付状态，请稍后手动刷新。')
    }
  }, [orderId])

  useEffect(() => {
    if (!orderId) {
      return
    }

    stopPollingRef.current = false
    void refreshStatus()
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      if (stopPollingRef.current) {
        window.clearInterval(timer)
        return
      }

      if (Date.now() - startedAt >= 60_000) {
        setTimedOut(true)
        window.clearInterval(timer)
        return
      }

      void refreshStatus()
    }, 3_000)

    return () => {
      stopPollingRef.current = true
      window.clearInterval(timer)
    }
  }, [orderId, refreshStatus])

  return (
    <>
      <PurchaseStatusCard
        onRefresh={refreshStatus}
        orderId={orderId}
        status={status}
        timedOut={timedOut && status === 'pending'}
      />
      {error ? (
        <p className="rounded-[1.25rem] bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
    </>
  )
}
