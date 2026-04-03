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
        <section className="mx-auto max-w-4xl space-y-6 rounded-[2rem] bg-white p-8 shadow-sm">
          <header className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
              家长购买
            </p>
            <h1 className="text-4xl font-black text-slate-950">
              动画故事启蒙课程包
            </h1>
            <p className="text-base leading-7 text-slate-600">
              当前环境未配置 Supabase 和支付参数，所以这里只展示课程包信息，不执行真实购买。
            </p>
          </header>
          {purchaseUnavailable ? (
            <p className="rounded-[1.5rem] bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
              当前环境缺少后端配置，暂时不能发起购买。
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.5rem] bg-slate-50 p-5">
              <p className="text-sm text-slate-500">正式课程</p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {launchCoursePack.lessonCount} 节
              </p>
            </article>
            <article className="rounded-[1.5rem] bg-slate-50 p-5">
              <p className="text-sm text-slate-500">试听课程</p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {launchCoursePack.trialLessonCount} 节
              </p>
            </article>
            <article className="rounded-[1.5rem] bg-slate-50 p-5">
              <p className="text-sm text-slate-500">课程价格</p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                ¥{(launchCoursePack.priceCny / 100).toFixed(0)}
              </p>
            </article>
          </div>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-4 text-lg font-bold text-slate-800"
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
      <section className="mx-auto max-w-4xl space-y-6 rounded-[2rem] bg-white p-8 shadow-sm">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
            家长购买
          </p>
          <h1 className="text-4xl font-black text-slate-950">
            动画故事启蒙课程包
          </h1>
          <p className="text-base leading-7 text-slate-600">
            已完成 3 节试听后，解锁后续 12 节正式课程，继续完成双角色故事、节奏控制和模板创作。
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm text-slate-500">正式课程</p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {launchCoursePack.lessonCount} 节
            </p>
          </article>
          <article className="rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm text-slate-500">试听课程</p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {launchCoursePack.trialLessonCount} 节
            </p>
          </article>
          <article className="rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm text-slate-500">课程价格</p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              ¥{(launchCoursePack.priceCny / 100).toFixed(0)}
            </p>
          </article>
        </div>
        <div className="rounded-[1.5rem] bg-orange-50 p-5 text-base leading-7 text-orange-900">
          购买后会立即解锁第 4 到第 15 节课，孩子可以继续从学习地图进入正式课程。
        </div>
        {hasLaunchPack ? (
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-4 text-lg font-bold text-white"
              href="/learn/map"
            >
              回到学习地图
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-4 text-lg font-bold text-slate-800"
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
