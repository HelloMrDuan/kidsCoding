'use client'

import Link from 'next/link'

import type { PaymentOrderStatus } from './payment-provider'

export function PurchaseStatusCard({
  orderId,
  status,
  timedOut = false,
  onRefresh,
}: {
  orderId: string
  status: PaymentOrderStatus
  timedOut?: boolean
  onRefresh: () => Promise<void>
}) {
  if (status === 'paid') {
    return (
      <section className="kc-panel-3d space-y-4 rounded-[1.5rem] p-5 text-emerald-900">
        <h2 className="text-2xl font-black">高阶创作已解锁</h2>
        <p className="text-sm leading-7">
          订单 {orderId} 已确认支付成功，孩子现在可以继续进入高阶创作阶段。
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="kc-button-3d inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white"
            href="/learn/map"
          >
            去学习地图
          </Link>
          <Link
            className="kc-button-3d inline-flex items-center justify-center rounded-full border border-emerald-200 px-5 py-3 text-sm font-bold text-emerald-900"
            href="/parent/overview"
          >
            去家长查看页
          </Link>
        </div>
      </section>
    )
  }

  if (status === 'failed') {
    return (
      <section className="kc-panel-3d space-y-4 rounded-[1.5rem] p-5 text-rose-900">
        <h2 className="text-2xl font-black">这次支付没有完成</h2>
        <p className="text-sm leading-7">请返回购买页重新发起升级。</p>
        <Link
          className="kc-button-3d inline-flex items-center justify-center rounded-full border border-rose-200 px-5 py-3 text-sm font-bold text-rose-900"
          href="/parent/purchase"
        >
          返回购买页
        </Link>
      </section>
    )
  }

  if (status === 'expired') {
    return (
      <section className="kc-panel-3d space-y-4 rounded-[1.5rem] p-5 text-amber-900">
        <h2 className="text-2xl font-black">支付二维码已失效</h2>
        <p className="text-sm leading-7">支付窗口已经过期，请返回购买页重新发起。</p>
        <Link
          className="kc-button-3d inline-flex items-center justify-center rounded-full border border-amber-200 px-5 py-3 text-sm font-bold text-amber-900"
          href="/parent/purchase"
        >
          返回购买页
        </Link>
      </section>
    )
  }

  if (timedOut) {
    return (
      <section className="kc-panel-3d space-y-4 rounded-[1.5rem] p-5 text-sky-950">
        <h2 className="text-2xl font-black">还在确认支付结果</h2>
        <p className="text-sm leading-7">
          如果家长已经完成支付，系统稍后会自动完成解锁。你也可以现在手动刷新状态。
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="kc-button-3d inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-sm font-bold text-white"
            onClick={() => void onRefresh()}
            type="button"
          >
            手动刷新
          </button>
          <Link
            className="kc-button-3d inline-flex items-center justify-center rounded-full border border-sky-200 px-5 py-3 text-sm font-bold text-sky-900"
            href="/parent/overview"
          >
            返回家长页
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="kc-panel-3d space-y-4 rounded-[1.5rem] p-5 text-slate-900">
      <h2 className="text-2xl font-black">正在确认支付</h2>
      <p className="text-sm leading-7">订单 {orderId} 正在等待支付结果确认，请稍候。</p>
      <button
        className="kc-button-3d inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-900"
        onClick={() => void onRefresh()}
        type="button"
      >
        手动刷新
      </button>
    </section>
  )
}
