'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type CheckoutResponse = {
  orderId: string
  provider: 'stripe' | 'aggregated_cn'
  status: 'created' | 'pending' | 'paid' | 'failed' | 'expired'
  qrCodeValue: string
  successUrl: string
  checkoutUrl?: string
}

export function PurchaseCheckoutCard() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null)

  async function handleCreateOrder() {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('checkout_failed')
      }

      const payload = (await response.json()) as CheckoutResponse

      if (payload.checkoutUrl) {
        router.push(payload.checkoutUrl)
        return
      }

      setCheckout(payload)
    } catch {
      setError('暂时无法创建支付订单，请稍后再试。')
    } finally {
      setSubmitting(false)
    }
  }

  if (checkout) {
    const qrLooksLikeUrl =
      checkout.qrCodeValue.startsWith('http://') ||
      checkout.qrCodeValue.startsWith('https://')

    return (
      <section className="space-y-4 rounded-[1.5rem] bg-orange-50 p-5 text-orange-950">
        <h2 className="text-2xl font-black">扫码支付</h2>
        <p className="text-sm leading-7">
          请家长使用微信、支付宝或银行卡支持的扫码方式完成支付。
        </p>
        <div className="rounded-[1.5rem] border border-dashed border-orange-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-600">
            {qrLooksLikeUrl ? '支付二维码地址' : '支付二维码内容'}
          </p>
          <code className="mt-3 block break-all text-xs text-slate-900">
            {checkout.qrCodeValue}
          </code>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white"
            href={checkout.successUrl}
          >
            我已扫码，查看支付结果
          </Link>
          {qrLooksLikeUrl ? (
            <Link
              className="inline-flex items-center justify-center rounded-full border border-orange-200 px-5 py-3 text-sm font-bold text-orange-900"
              href={checkout.qrCodeValue}
              target="_blank"
            >
              打开二维码地址
            </Link>
          ) : null}
          <button
            className="inline-flex items-center justify-center rounded-full border border-orange-200 px-5 py-3 text-sm font-bold text-orange-900"
            onClick={() => setCheckout(null)}
            type="button"
          >
            重新生成
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      {error ? (
        <p className="rounded-[1.25rem] bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
      <button
        className="rounded-full bg-orange-500 px-6 py-4 text-lg font-bold text-white disabled:opacity-60"
        disabled={submitting}
        onClick={() => void handleCreateOrder()}
        type="button"
      >
        {submitting ? '正在创建订单…' : '立即购买整套课程'}
      </button>
    </section>
  )
}
