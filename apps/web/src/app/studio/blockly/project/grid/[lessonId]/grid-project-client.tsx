'use client'

/**
 * OPS-057：网格作品模式客户端。
 *
 * 与课程网格工作台同一个组件（GridStudioWorkspace），只换两处：
 * - 草稿读写口：`gridProjectDraftStore`（独立作品信封，绝不写课程草稿键）；
 * - studio 合同标题/返回链接：显示“我的作品”，返回作品中心。
 *
 * 没有真实作品或作品损坏时如实提示，不用默认积木冒充历史作品。
 */
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { buildGridWorkStudioLesson } from '@/features/lessons/grid-v3/grid-v3-contract'
import {
  getGridPortfolioProject,
  gridProjectDraftStore,
  loadGridProjectDraft,
} from '@/features/lessons/grid-v3/grid-project'
import { GridStudioWorkspace } from '@/features/lessons/grid-v3/grid-studio-workspace'
import type { StudioLesson } from '@/features/lessons/studio/studio-lesson'

export default function GridProjectClient({
  projectId,
  owner,
}: {
  projectId: string
  owner: string | null
}) {
  const project = useMemo(() => getGridPortfolioProject(projectId), [projectId])
  const [saved, setSaved] = useState<ReturnType<typeof loadGridProjectDraft> | null>(null)

  useEffect(() => {
    setSaved(loadGridProjectDraft(projectId, owner))
  }, [projectId, owner])

  const studioLesson: StudioLesson | null = useMemo(() => {
    if (!project) return null
    return buildGridWorkStudioLesson(project.lesson, project.title, project.stepId)
  }, [project])

  if (!project || !studioLesson) return null
  if (!saved) {
    return (
      <main className="p-6 text-base text-slate-600" data-testid="grid-project-loading" role="status">
        正在读取作品…
      </main>
    )
  }
  if (!saved.data) {
    const broken = saved.reason !== null
    return (
      <main className="min-h-screen bg-[var(--kc-canvas)] p-6" data-testid={broken ? 'grid-project-broken' : 'grid-project-missing'}>
        <section className="kc-panel mx-auto max-w-xl p-6">
          <h1 className="text-2xl font-bold">
            {broken ? '这件作品暂时打不开' : '还没有保存过这件作品'}
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            {broken
              ? `${saved.reason}。作品数据没有被改动，也不会用默认积木冒充。`
              : '作品中心只显示真实保存过的作品；这里还没有这件作品。先回课程完成并保存，再回来编辑。'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="kc-action-surface min-h-11" href="/learn/portfolio">回作品中心</Link>
            <Link className="kc-action-surface kc-btn-outline min-h-11" href="/learn/map">回学习地图</Link>
          </div>
        </section>
      </main>
    )
  }
  return (
    <GridStudioWorkspace
      draftStore={gridProjectDraftStore}
      lesson={project.lesson}
      studioLesson={studioLesson}
      workStepId={project.stepId}
    />
  )
}
