import Link from 'next/link'
import { redirect } from 'next/navigation'

import { launchCoursePack } from '@/features/billing/course-pack'
import { loadLaunchCurriculum } from '@/features/curriculum/load-launch-curriculum'
import { buildParentOverview } from '@/features/parent/build-parent-overview'
import { hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const startLevelLabels: Record<string, string> = {
  starter: '启蒙起点',
  foundation: '基础起点',
  advanced: '进阶起点',
}

export default async function ParentOverviewPage() {
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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#fff8ef_100%)] px-4 py-6 md:px-6 md:py-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="grid gap-6 rounded-[2.25rem] bg-white px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:px-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-4">
            <p className="inline-flex rounded-full bg-[#eef8ff] px-4 py-2 text-sm font-semibold text-sky-700">
              家长成长页
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                {summary.childName} 的学习成长
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600 md:text-lg md:leading-8">
                不用全程陪着学，也能看懂孩子学到哪里、做出了什么，以及下一步怎么继续往前走。
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.75rem] bg-[linear-gradient(180deg,#fff8eb_0%,#ffffff_100%)] p-5 shadow-[0_12px_30px_rgba(255,162,84,0.12)]">
            <p className="text-sm font-semibold text-slate-500">推荐起点</p>
            <p className="text-3xl font-black text-slate-950">
              {startLevelLabels[summary.recommendedStartLevel] ?? summary.recommendedStartLevel}
            </p>
            <Link
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              href="/learn/map"
            >
              回到学习地图
            </Link>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-[1.75rem] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-slate-500">已完成课程</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{summary.completedLessonCount}</p>
          </article>
          <article className="rounded-[1.75rem] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-slate-500">累计星星</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{summary.earnedStarCount}</p>
          </article>
          <article className="rounded-[1.75rem] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-slate-500">已收集卡片</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{summary.earnedCardCount}</p>
          </article>
          <article className="rounded-[1.75rem] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-slate-500">已获徽章</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{summary.earnedBadgeCount}</p>
          </article>
          <article className="rounded-[1.75rem] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-slate-500">最近作品</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{summary.recentProjectCount}</p>
          </article>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[2rem] bg-[linear-gradient(180deg,#fff8ea_0%,#ffffff_100%)] p-6 shadow-[0_16px_36px_rgba(255,162,84,0.12)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
              Next action
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-950">下一步陪学建议</h2>
            <p className="mt-4 text-base leading-8 text-slate-700">{summary.nextAction}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-[#ff8b4e] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#ff7b38]"
                href="/learn/map"
              >
                继续学习
              </Link>
              {!summary.hasLaunchPack ? (
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-[#ffd9b3] bg-white px-5 py-3 text-sm font-bold text-amber-700 transition hover:border-[#ffc58f] hover:bg-[#fff7ea]"
                  href="/parent/purchase"
                >
                  查看高阶升级说明
                </Link>
              ) : null}
            </div>
          </article>

          <section className="rounded-[2rem] bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-950">最近作品回看</h2>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  直接回看孩子最近完成的动画故事，作品比数字更能说明学习正在发生。
                </p>
              </div>
            </div>

            {summary.recentProjects.length > 0 ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {summary.recentProjects.map((project) => (
                  <article
                    key={project.lessonId}
                    className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                      最近完成
                    </p>
                    <h3 className="mt-2 text-lg font-black text-slate-950">
                      {project.lessonTitle}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      更新时间：
                      {new Intl.DateTimeFormat('zh-CN', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(project.updatedAt))}
                    </p>
                    <Link
                      className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                      href={project.href}
                    >
                      查看作品回放
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-[1.5rem] bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-600">
                孩子完成第一个完整小故事后，这里就会出现最近作品回放入口。
              </p>
            )}
          </section>
        </section>
      </section>
    </main>
  )
}
