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

const foundationMilestones = [
  { label: '单元 1', title: '森林见面会', lessonGoal: 3 },
  { label: '单元 2', title: '小动物去旅行', lessonGoal: 6 },
  { label: '单元 3', title: '花园互动秀', lessonGoal: 9 },
  { label: '单元 4', title: '动物朋友合作演出', lessonGoal: 12 },
] as const

function getStageSummary(completedLessonCount: number) {
  if (completedLessonCount >= 12) {
    return {
      eyebrow: '启蒙已毕业',
      title: '已经完成启蒙毕业作品',
      summary:
        '孩子已经能做出两个角色一起完成的完整故事，现在适合往更复杂的互动创作升级。',
    }
  }

  if (completedLessonCount >= 9) {
    return {
      eyebrow: '正在冲刺毕业单元',
      title: '准备进入双角色完整故事',
      summary:
        '孩子已经会做会回应点击的互动故事，下一步就是把两个角色放进同一个完整作品里。',
    }
  }

  if (completedLessonCount >= 6) {
    return {
      eyebrow: '正在进入互动阶段',
      title: '故事开始会回应孩子的操作',
      summary:
        '前面已经会做完整小故事，现在正在让故事从“会动”升级成“会回应点击”。',
    }
  }

  if (completedLessonCount >= 3) {
    return {
      eyebrow: '已经做出第一个作品',
      title: '开始把故事从一个画面推到另一个画面',
      summary:
        '孩子已经完成第一个完整小故事，接下来会继续学会场景切换和故事顺序。',
    }
  }

  return {
    eyebrow: '正在启蒙起步',
    title: '先把第一个完整小故事做出来',
    summary:
      '现在最重要的是让孩子先体验“我真的做出来了”，不要急着学太多概念。',
  }
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
  const stageSummary = getStageSummary(summary.completedLessonCount)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5fbff_0%,#fff8ef_100%)] px-4 py-6 md:px-6 md:py-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="grid gap-6 rounded-[2.4rem] bg-white px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:px-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <p className="inline-flex rounded-full bg-[#eef8ff] px-4 py-2 text-sm font-semibold text-sky-700">
              家长成长页
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                {summary.childName} 的学习成长
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600 md:text-lg md:leading-8">
                不用全程陪着学，也能一眼看懂孩子现在走到哪一段、最近做出了什么作品、下一步怎么继续往前走。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-[1.4rem] bg-[linear-gradient(180deg,#fff9ef_0%,#ffffff_100%)] p-4">
                <p className="text-sm font-semibold text-slate-500">已完成课程</p>
                <p className="mt-2 text-3xl font-black text-slate-950">
                  {summary.completedLessonCount}
                </p>
              </article>
              <article className="rounded-[1.4rem] bg-[linear-gradient(180deg,#f3fbff_0%,#ffffff_100%)] p-4">
                <p className="text-sm font-semibold text-slate-500">累计星星</p>
                <p className="mt-2 text-3xl font-black text-slate-950">
                  {summary.earnedStarCount}
                </p>
              </article>
              <article className="rounded-[1.4rem] bg-[linear-gradient(180deg,#fffaf2_0%,#ffffff_100%)] p-4">
                <p className="text-sm font-semibold text-slate-500">已收集卡片</p>
                <p className="mt-2 text-3xl font-black text-slate-950">
                  {summary.earnedCardCount}
                </p>
              </article>
              <article className="rounded-[1.4rem] bg-[linear-gradient(180deg,#f9f7ff_0%,#ffffff_100%)] p-4">
                <p className="text-sm font-semibold text-slate-500">最近作品</p>
                <p className="mt-2 text-3xl font-black text-slate-950">
                  {summary.recentProjectCount}
                </p>
              </article>
            </div>
          </div>

          <aside className="grid gap-4 rounded-[1.9rem] bg-[linear-gradient(180deg,#fff8ea_0%,#f7fbff_100%)] p-5 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
            <div className="rounded-[1.4rem] bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">
                {stageSummary.eyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-black text-slate-950">
                {stageSummary.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {stageSummary.summary}
              </p>
            </div>

            <div className="rounded-[1.4rem] bg-white p-4">
              <p className="text-sm font-semibold text-slate-500">推荐起点</p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {startLevelLabels[summary.recommendedStartLevel] ??
                  summary.recommendedStartLevel}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                href="/learn/map"
              >
                回到学习地图
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
                href="/cards"
              >
                打开我的卡册
              </Link>
            </div>
          </aside>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">
                Recent work
              </p>
              <h2 className="text-2xl font-black text-slate-950">最近作品回看</h2>
              <p className="text-sm leading-7 text-slate-500">
                先看孩子最近做出来了什么，再决定下一步怎么陪。作品比数字更能说明学习真的在发生。
              </p>
            </div>

            {summary.recentProjects.length > 0 ? (
              <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <article className="rounded-[1.8rem] bg-[linear-gradient(180deg,#fff8ef_0%,#ffffff_100%)] p-5 shadow-[0_14px_32px_rgba(255,162,84,0.12)]">
                  <p className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-700 shadow-sm">
                    最新完成
                  </p>
                  <h3 className="mt-4 text-2xl font-black text-slate-950">
                    {summary.recentProjects[0].lessonTitle}
                  </h3>
                  <p className="mt-3 text-base leading-8 text-slate-700">
                    {summary.recentProjects[0].lessonSummary}
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    更新于{' '}
                    {new Intl.DateTimeFormat('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(summary.recentProjects[0].updatedAt))}
                  </p>
                  <Link
                    className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                    href={summary.recentProjects[0].href}
                  >
                    查看作品回放
                  </Link>
                </article>

                <div className="grid gap-3">
                  {summary.recentProjects.slice(1).map((project) => (
                    <article
                      key={project.lessonId}
                      className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="text-sm font-black text-slate-950">
                        {project.lessonTitle}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {project.lessonSummary}
                      </p>
                      <Link
                        className="mt-3 inline-flex items-center text-sm font-bold text-sky-700 transition hover:text-sky-800"
                        href={project.href}
                      >
                        查看回放
                      </Link>
                    </article>
                  ))}

                  {summary.recentProjects.length === 1 ? (
                    <article className="rounded-[1.4rem] border border-dashed border-slate-200 bg-white p-4 text-sm leading-7 text-slate-500">
                      后面每做出一个新作品，这里都会继续累积，让家长更容易看见孩子的成长轨迹。
                    </article>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-5 rounded-[1.6rem] bg-slate-50 p-5 text-sm font-semibold leading-7 text-slate-600">
                孩子完成第一个完整小故事后，这里就会出现最近作品回放入口。
              </p>
            )}
          </section>

          <div className="grid gap-6">
            <article className="rounded-[2rem] bg-[linear-gradient(180deg,#fff8ea_0%,#ffffff_100%)] p-6 shadow-[0_16px_36px_rgba(255,162,84,0.12)]">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">
                Next action
              </p>
              <h2 className="mt-3 text-2xl font-black text-slate-950">
                下一步陪学建议
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-700">
                {summary.nextAction}
              </p>
              <div className="mt-5 flex flex-col gap-3">
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
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">
                Growth track
              </p>
              <h2 className="mt-3 text-2xl font-black text-slate-950">
                启蒙成长轨迹
              </h2>
              <div className="mt-5 space-y-3">
                {foundationMilestones.map((milestone) => {
                  const reached = summary.completedLessonCount >= milestone.lessonGoal

                  return (
                    <article
                      key={milestone.label}
                      className={`rounded-[1.4rem] border p-4 ${
                        reached
                          ? 'border-[#dff3ff] bg-[linear-gradient(180deg,#f6fbff_0%,#ffffff_100%)]'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                            {milestone.label}
                          </p>
                          <h3 className="mt-2 text-lg font-black text-slate-950">
                            {milestone.title}
                          </h3>
                        </div>
                        <span
                          className={`rounded-full px-3 py-2 text-xs font-bold ${
                            reached
                              ? 'bg-[#dff3ff] text-sky-700'
                              : 'bg-white text-slate-500'
                          }`}
                        >
                          {reached ? '已到达' : `目标 ${milestone.lessonGoal} 节`}
                        </span>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  )
}
