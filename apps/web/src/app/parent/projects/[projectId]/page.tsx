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
    <main className="min-h-screen bg-[#f8fbff] px-6 py-10">
      <section className="mx-auto max-w-5xl space-y-6 rounded-[2rem] bg-white p-8 shadow-sm">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">
            作品回放
          </p>
          <h1 className="text-4xl font-black text-slate-950">
            {playback.lessonTitle}
          </h1>
          <p className="max-w-3xl text-base leading-8 text-slate-600">
            {playback.lessonGoal}
          </p>
          <p className="text-sm font-semibold text-slate-500">
            最近更新时间：
            {new Intl.DateTimeFormat('zh-CN', {
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date(playback.updatedAt))}
          </p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <PreviewStage blocks={playback.blocks} />
          <aside className="rounded-[1.5rem] bg-slate-50 p-5">
            <h2 className="text-lg font-black text-slate-950">积木结构</h2>
            {playback.blocks.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {playback.blocks.map((block, index) => (
                  <span
                    key={`${block.type}-${index}`}
                    className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                  >
                    {block.type}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                这个作品还没有保存积木结构，先显示动作预览。
              </p>
            )}
          </aside>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-4 text-lg font-bold text-white"
            href="/parent/overview"
          >
            返回家长查看页
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-4 text-lg font-bold text-slate-800"
            href="/learn/map"
          >
            继续学习
          </Link>
        </div>
      </section>
    </main>
  )
}
