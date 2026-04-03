import Link from 'next/link'
import { redirect } from 'next/navigation'

import { launchCoursePack } from '@/features/billing/course-pack'
import { loadLaunchCurriculum } from '@/features/curriculum/load-launch-curriculum'
import { buildParentOverview } from '@/features/parent/build-parent-overview'
import { hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function ParentOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string }>
}) {
  if (!hasSupabaseEnv()) {
    redirect('/auth/bind')
  }

  const supabase = await createServerSupabaseClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  if (!user) {
    redirect('/auth/bind')
  }

  const [
    curriculum,
    { data: profile },
    { data: progressRecords },
    { data: cardRecords },
    { data: badgeRecords },
    { data: projectSnapshots },
    { data: entitlement },
  ] = await Promise.all([
    loadLaunchCurriculum(),
    supabase.from('child_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('progress_records').select('*').eq('user_id', user.id),
    supabase.from('card_records').select('*').eq('user_id', user.id),
    supabase.from('badge_records').select('*').eq('user_id', user.id),
    supabase
      .from('project_snapshots')
      .select('lesson_id,updated_at')
      .eq('owner_user_id', user.id),
    supabase
      .from('entitlements')
      .select('status')
      .eq('user_id', user.id)
      .eq('product_code', launchCoursePack.productCode)
      .maybeSingle(),
  ])

  if (!profile) {
    redirect('/auth/bind')
  }

  const summary = buildParentOverview({
    profile,
    progressRecords: progressRecords ?? [],
    cardRecords: cardRecords ?? [],
    badgeRecords: badgeRecords ?? [],
    projectSnapshots: projectSnapshots ?? [],
    lessonCatalog: curriculum.lessons,
    hasLaunchPack: entitlement?.status === 'active',
  })
  const query = await searchParams
  const purchaseSucceeded = query.purchase === 'success'

  return (
    <main className="min-h-screen bg-[#f8fbff] px-6 py-10">
      <section className="mx-auto max-w-5xl space-y-6 rounded-[2rem] bg-white p-8 shadow-sm">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">
            家长查看页
          </p>
          <h1 className="text-4xl font-black text-slate-950">
            {summary.childName} 的学习进度
          </h1>
          {purchaseSucceeded ? (
            <p className="rounded-[1.5rem] bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
              购买成功，正式课程已经解锁。
            </p>
          ) : null}
        </header>
        <div className="grid gap-4 md:grid-cols-5">
          <article className="rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm text-slate-500">推荐起点</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {summary.recommendedStartLevel}
            </p>
          </article>
          <article className="rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm text-slate-500">已完成课程</p>
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
          <article className="rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm text-slate-500">最近作品</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {summary.recentProjectCount}
            </p>
          </article>
        </div>
        <p className="rounded-[1.5rem] bg-orange-50 p-5 text-base font-semibold text-orange-700">
          下一步建议：{summary.nextAction}
        </p>
        <section className="space-y-4 rounded-[1.5rem] bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">最近作品</h2>
              <p className="mt-1 text-sm text-slate-500">
                可以直接回看孩子最近完成的动画故事。
              </p>
            </div>
          </div>
          {summary.recentProjects.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {summary.recentProjects.map((project) => (
                <article
                  key={project.lessonId}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                    最近完成
                  </p>
                  <h3 className="mt-2 text-lg font-black text-slate-950">
                    {project.lessonTitle}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    更新时间：{new Intl.DateTimeFormat('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(project.updatedAt))}
                  </p>
                  <Link
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white"
                    href={project.href}
                  >
                    查看作品回放
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-[1.25rem] bg-white p-4 text-sm font-semibold text-slate-600">
              孩子完成第一个作品后，这里会出现最近作品回放入口。
            </p>
          )}
        </section>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-4 text-lg font-bold text-white"
            href="/learn/map"
          >
            继续学习
          </Link>
          {!summary.hasLaunchPack ? (
            <Link
              className="inline-flex items-center justify-center rounded-full border border-orange-200 bg-orange-50 px-6 py-4 text-lg font-bold text-orange-700"
              href="/parent/purchase"
            >
              购买整套课程
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  )
}
