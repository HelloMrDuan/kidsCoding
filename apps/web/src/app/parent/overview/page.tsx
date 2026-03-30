import { redirect } from 'next/navigation'

import { buildParentOverview } from '@/features/parent/build-parent-overview'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function ParentOverviewPage() {
  const supabase = await createServerSupabaseClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  if (!user) {
    redirect('/auth/bind')
  }

  const [
    { data: profile },
    { data: progressRecords },
    { data: cardRecords },
    { data: badgeRecords },
  ] = await Promise.all([
    supabase.from('child_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('progress_records').select('*').eq('user_id', user.id),
    supabase.from('card_records').select('*').eq('user_id', user.id),
    supabase.from('badge_records').select('*').eq('user_id', user.id),
  ])

  if (!profile) {
    redirect('/auth/bind')
  }

  const summary = buildParentOverview({
    profile,
    progressRecords: progressRecords ?? [],
    cardRecords: cardRecords ?? [],
    badgeRecords: badgeRecords ?? [],
  })

  return (
    <main className="min-h-screen bg-[#f8fbff] px-6 py-10">
      <section className="mx-auto max-w-4xl space-y-6 rounded-[2rem] bg-white p-8 shadow-sm">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">
            家长查看页
          </p>
          <h1 className="text-4xl font-black text-slate-950">
            {summary.childName} 的学习进度
          </h1>
        </header>
        <div className="grid gap-4 md:grid-cols-4">
          <article className="rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm text-slate-500">推荐起点</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {summary.recommendedStartLevel}
            </p>
          </article>
          <article className="rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm text-slate-500">已完成关卡</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {summary.completedLessonCount}
            </p>
          </article>
          <article className="rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm text-slate-500">已收集卡片</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {summary.earnedCardCount}
            </p>
          </article>
          <article className="rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm text-slate-500">徽章和星星</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {summary.earnedBadgeCount} / {summary.earnedStarCount}
            </p>
          </article>
        </div>
        <p className="rounded-[1.5rem] bg-orange-50 p-5 text-base font-semibold text-orange-700">
          下一步建议：{summary.nextAction}
        </p>
      </section>
    </main>
  )
}
