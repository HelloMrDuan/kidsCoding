import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { loadLaunchCurriculum } from '@/features/curriculum/load-launch-curriculum'
import { PreviewStage } from '@/features/lessons/blockly/preview-stage'
import { buildParentProjectPlayback } from '@/features/parent/build-parent-project-playback'
import { hasSupabaseEnv } from '@/lib/env'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function normalizeSnapshotBlocks(input: unknown): Array<{ type: string }> {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .filter(
      (item): item is { type: string } =>
        typeof item === 'object' &&
        item !== null &&
        'type' in item &&
        typeof item.type === 'string',
    )
    .map((item) => ({ type: item.type }))
}

export default async function ParentProjectPlaybackPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  if (!hasSupabaseEnv()) {
    redirect('/auth/bind')
  }

  const [{ projectId }, curriculum] = await Promise.all([
    params,
    loadLaunchCurriculum(),
  ])
  const supabase = await createServerSupabaseClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  if (!user) {
    redirect('/auth/bind')
  }

  const { data: snapshotRow } = await supabase
    .from('project_snapshots')
    .select('lesson_id,updated_at,snapshot')
    .eq('owner_user_id', user.id)
    .eq('lesson_id', projectId)
    .maybeSingle()

  if (!snapshotRow) {
    notFound()
  }

  const playback = buildParentProjectPlayback({
    lessonId: snapshotRow.lesson_id,
    updatedAt: snapshotRow.updated_at,
    blocks: normalizeSnapshotBlocks(snapshotRow.snapshot?.blocks),
    lessonCatalog: curriculum.lessons,
  })

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5fbff_0%,#fff8ef_100%)] px-4 py-6 md:px-6 md:py-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="grid gap-6 rounded-[2.3rem] bg-white px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:px-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="inline-flex rounded-full bg-[#eef8ff] px-4 py-2 text-sm font-semibold text-sky-700">
              作品回看
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                {playback.lessonTitle}
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600 md:text-lg md:leading-8">
                {playback.lessonGoal}
              </p>
            </div>
          </div>

          <aside className="grid gap-4 rounded-[1.8rem] bg-[linear-gradient(180deg,#fff8ea_0%,#f7fbff_100%)] p-5 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
            <div className="rounded-[1.35rem] bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">
                最近完成
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                这次孩子已经把这一节课真正做成了作品，可以直接回看结果，不用只看进度数字。
              </p>
            </div>

            <div className="rounded-[1.35rem] bg-white p-4">
              <p className="text-sm font-semibold text-slate-500">最近更新时间</p>
              <p className="mt-2 text-xl font-black text-slate-950">
                {new Intl.DateTimeFormat('zh-CN', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(playback.updatedAt))}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                href="/parent/overview"
              >
                返回家长页
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
                href="/learn/map"
              >
                继续学习
              </Link>
            </div>
          </aside>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="overflow-hidden rounded-[2rem] bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">
                Story stage
              </p>
              <h2 className="text-2xl font-black text-slate-950">作品舞台回看</h2>
              <p className="text-sm leading-7 text-slate-500">
                先看作品本身，再看这次用到了哪些积木。家长更容易从结果理解孩子到底做成了什么。
              </p>
            </div>

            <div className="mt-5 rounded-[1.9rem] bg-[linear-gradient(180deg,#fff8ef_0%,#f8fbff_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
              <PreviewStage blocks={playback.blocks} />
            </div>
          </article>

          <div className="grid gap-6">
            <section className="rounded-[2rem] bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">
                Block story
              </p>
              <h2 className="mt-3 text-2xl font-black text-slate-950">
                这次作品用到了什么
              </h2>

              {playback.blocks.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {playback.blocks.map((block, index) => (
                    <span
                      key={`${block.type}-${index}`}
                      className="rounded-full bg-[linear-gradient(180deg,#fff9ef_0%,#ffffff_100%)] px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
                    >
                      {block.type}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-[1.4rem] bg-slate-50 p-4 text-sm leading-7 text-slate-500">
                  这个作品还没有保存积木结构，当前先展示作品舞台回看。
                </p>
              )}
            </section>

            <article className="rounded-[2rem] bg-[linear-gradient(180deg,#fff8ea_0%,#ffffff_100%)] p-6 shadow-[0_16px_36px_rgba(255,162,84,0.12)]">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">
                Parent tip
              </p>
              <h2 className="mt-3 text-2xl font-black text-slate-950">
                怎么和孩子聊这次作品
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                <li>请孩子先给你完整演示一遍，再让他自己讲讲先发生了什么。</li>
                <li>问一句“这次最像故事的地方是什么”，比直接问学会了什么更容易得到回应。</li>
                <li>如果孩子愿意，再让他试着改一小处动作或顺序，感受作品还能继续长大。</li>
              </ul>
            </article>
          </div>
        </section>
      </section>
    </main>
  )
}
