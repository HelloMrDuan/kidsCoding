import Link from 'next/link'
import { redirect } from 'next/navigation'

import { launchCoursePack } from '@/features/billing/course-pack'
import { PurchaseCheckoutCard } from '@/features/billing/purchase-checkout-card'
import { hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function ParentPurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string }>
}) {
  if (!hasSupabaseEnv()) {
    const query = await searchParams
    const purchaseUnavailable = query.purchase === 'unavailable'

    return (
      <main className="min-h-screen bg-[#fff8ef] px-6 py-10">
        <section className="kc-surface-3d mx-auto max-w-4xl space-y-6 rounded-[2rem] p-8">
          <header className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
              家长升级
            </p>
            <h1 className="text-4xl font-black text-slate-950">高阶创作阶段</h1>
            <p className="text-base leading-7 text-slate-600">
              当前环境还没有配置完整的账号和支付参数，所以这里只展示升级说明，不执行真实购买。
            </p>
          </header>
          {purchaseUnavailable ? (
            <p className="rounded-[1.5rem] bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
              当前环境缺少后端配置，暂时不能发起升级。
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.5rem] bg-slate-50 p-5">
              <p className="text-sm text-slate-500">启蒙阶段</p>
              <p className="mt-2 text-3xl font-black text-slate-950">12 节</p>
            </article>
            <article className="rounded-[1.5rem] bg-slate-50 p-5">
              <p className="text-sm text-slate-500">高阶创作</p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {launchCoursePack.lessonCount} 节
              </p>
            </article>
            <article className="rounded-[1.5rem] bg-slate-50 p-5">
              <p className="text-sm text-slate-500">升级价格</p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                ￥{(launchCoursePack.priceCny / 100).toFixed(0)}
              </p>
            </article>
          </div>
          <div className="rounded-[1.5rem] bg-orange-50 p-5 text-base leading-7 text-orange-900">
            孩子完成 12 节启蒙主线后，可以继续进入更长的故事结构、更复杂的互动逻辑和更完整的动画表达。
          </div>
          <Link
            className="kc-button-3d inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-4 text-lg font-bold text-slate-800"
            href="/learn/map"
          >
            回到学习地图
          </Link>
        </section>
      </main>
    )
  }

  const supabase = await createServerSupabaseClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  if (!user) {
    redirect('/auth/bind')
  }

  const { data: entitlement } = await supabase
    .from('entitlements')
    .select('status')
    .eq('user_id', user.id)
    .eq('product_code', launchCoursePack.productCode)
    .maybeSingle()

  const hasLaunchPack = entitlement?.status === 'active'
  return (
    <main className="min-h-screen bg-[#fff8ef] px-6 py-10">
      <section className="kc-surface-3d mx-auto max-w-4xl space-y-6 rounded-[2rem] p-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
            家长升级
          </p>
          <h1 className="text-4xl font-black text-slate-950">高阶创作阶段</h1>
          <p className="text-base leading-7 text-slate-600">
            启蒙 12 节已经完成后，现在可以解锁高阶创作阶段，继续挑战更长的故事结构、更多角色配合和更完整的互动表达。
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm text-slate-500">启蒙阶段</p>
            <p className="mt-2 text-3xl font-black text-slate-950">12 节</p>
          </article>
          <article className="rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm text-slate-500">高阶创作</p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {launchCoursePack.lessonCount} 节
            </p>
          </article>
          <article className="rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm text-slate-500">升级价格</p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              ￥{(launchCoursePack.priceCny / 100).toFixed(0)}
            </p>
          </article>
        </div>
        <div className="rounded-[1.5rem] bg-orange-50 p-5 text-base leading-7 text-orange-900">
          升级后会立刻解锁高阶创作阶段，孩子可以继续从学习地图进入新的成长区域。
        </div>
        {hasLaunchPack ? (
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              className="kc-button-3d inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-4 text-lg font-bold text-white"
              href="/learn/map"
            >
              回到学习地图
            </Link>
            <Link
              className="kc-button-3d inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-4 text-lg font-bold text-slate-800"
              href="/parent/overview"
            >
              查看学习记录
            </Link>
          </div>
        ) : (
          <PurchaseCheckoutCard />
        )}
      </section>
    </main>
  )
}
