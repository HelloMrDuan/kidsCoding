'use client'

import { useState } from 'react'

import { reconcilePaymentOrder } from './admin-api'

type PaymentReconcileCardProps = {
  reconcileRequest?: typeof reconcilePaymentOrder
}

export function PaymentReconcileCard({
  reconcileRequest = reconcilePaymentOrder,
}: PaymentReconcileCardProps) {
  const [orderId, setOrderId] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit() {
    if (!orderId.trim()) {
      setMessage('请输入订单号')
      return
    }

    const result = await reconcileRequest(orderId.trim())
    setMessage(
      result.ok
        ? `同步完成，当前状态：${result.status ?? 'unknown'}`
        : result.error ?? '同步失败',
    )
  }

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
          支付补偿
        </p>
        <h2 className="text-2xl font-black text-slate-950">按订单号重试同步</h2>
      </header>
      <label className="mt-4 grid gap-2 text-sm font-bold text-slate-700">
        <span>订单号</span>
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
          onChange={(event) => setOrderId(event.target.value)}
          value={orderId}
        />
      </label>
      <button
        className="mt-4 rounded-full bg-slate-900 px-5 py-3 font-bold text-white"
        onClick={() => void handleSubmit()}
        type="button"
      >
        重试同步
      </button>
      {message ? <p className="mt-3 text-sm font-semibold text-slate-700">{message}</p> : null}
    </section>
  )
}
