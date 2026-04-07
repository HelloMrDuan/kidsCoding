import { PurchaseSuccessView } from '@/features/billing/purchase-success-view'

export default async function ParentPurchaseSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const query = await searchParams
  const orderId = query.order ?? ''

  return (
    <main className="min-h-screen bg-[#fff8ef] px-6 py-10">
      <section className="mx-auto max-w-4xl space-y-6 rounded-[2rem] bg-white p-8 shadow-sm">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
            支付确认
          </p>
          <h1 className="text-4xl font-black text-slate-950">确认高阶创作解锁状态</h1>
          <p className="text-base leading-7 text-slate-600">
            家长完成支付后，系统会自动确认订单并解锁高阶创作阶段。
          </p>
        </header>
        {!orderId ? (
          <p className="rounded-[1.25rem] bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            当前页面缺少订单号，请返回购买页重新发起。
          </p>
        ) : (
          <PurchaseSuccessView orderId={orderId} />
        )}
      </section>
    </main>
  )
}
