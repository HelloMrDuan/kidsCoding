'use client'

/**
 * G1-U1-L01 / G1-U1-L02 正式课堂路由：只保留路由守卫与工作区组装，不再有独立课堂布局。
 *
 * 本页是 client 组件（与 L05 路由同模式）：适配器是类实例，不能跨
 * server→client 边界，因此在这里构造并传给外壳；外壳拥有标题、保存
 * chip、文件菜单、任务抽屉、三级提示、反馈容器与三端布局，编辑面由
 * 各课自有的 EditorSlot（内嵌真实 BlocklyWorkspace）提供，舞台由
 * 各课自有的 StageSlot 提供，判定与运行由各课自有的 RunAdapter 提供，
 * 草稿数据由各课契约提供。通用引擎 'slot' 已并入主线 WorkspaceEngine
 * （#491 OPS-026）。两课按 lessonId 分支，各用一套组装；页头
 * story-lab-title-row 两课共用，不改。
 * 守卫保持 getStoryLesson(lessonId) === null → notFound() 的 404 语义
 * （L05 的“本课暂未开放”不适用）；路由地址保持
 * /learn/story-lab/[lessonId]；页头保留回课程介绍链接的一行瘦包装
 * （外壳顶栏不提供回目录链接，该链接不可丢）。
 * 草稿键已改为规范格式 kidscoding-draft:{lessonId}；旧键
 * kids-story-lesson-v1:{lessonId} 已废弃、不迁移（Q9 方案 A：课未发布、
 * 无真实用户数据，无物可迁），路由层不做一次性迁移。
 * 本页不改共享工作区核心。正式课仍是实验课、未通过独立复核，插槽内
 * 保留实验课说明，不谎称已发布、不冒充正式课程成绩。
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { use, useMemo } from 'react'

import { getStoryLesson } from '@/content/curriculum/g1-u1-story-lessons'
import { emptyStoryDraft as emptyL01StoryDraft } from '@/features/lessons/story/g1-u1-l01-draft'
import { G1_WORKSPACE_CONTRACT as L01_WORKSPACE_CONTRACT } from '@/features/lessons/story/g1-u1-l01-contract'
import { StoryAdapter, StoryRunAdapter } from '@/features/lessons/story/g1-u1-l01-run-adapter'
import { StoryEditorSlot } from '@/features/lessons/story/g1-u1-l01-slot'
import { StoryStageSlot } from '@/features/lessons/story/g1-u1-l01-stage'
import { emptyStoryDraft as emptyL02StoryDraft } from '@/features/lessons/story/g1-u1-l02-draft'
import { G1_WORKSPACE_CONTRACT as L02_WORKSPACE_CONTRACT } from '@/features/lessons/story/g1-u1-l02-contract'
import { TurnTakingAdapter, TurnTakingRunAdapter } from '@/features/lessons/story/g1-u1-l02-run-adapter'
import { TurnTakingEditorSlot } from '@/features/lessons/story/g1-u1-l02-slot'
import { TurnTakingStageSlot } from '@/features/lessons/story/g1-u1-l02-stage'
import { LessonWorkspace } from '@/features/lessons/workspace/lesson-workspace'

export default function StoryLabPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params)

  // 适配器实例按挂载稳定：外壳按引擎稳定挂载，重复渲染不得重建。
  // 注意：Hook 必须在守卫返回之前调用（rules-of-hooks），守卫路径不渲染它。
  // 两课各建一套实例，分支时只选用其中一套；未选用的实例不挂载。
  const l01Adapter = useMemo(() => new StoryAdapter(), [])
  const l01RunAdapter = useMemo(() => new StoryRunAdapter(), [])
  const l02Adapter = useMemo(() => new TurnTakingAdapter(), [])
  const l02RunAdapter = useMemo(() => new TurnTakingRunAdapter(), [])

  const lesson = getStoryLesson(lessonId)
  if (!lesson) notFound()

  const isL02 = lessonId === 'G1-U1-L02'

  return (
    <main className="min-h-screen bg-[var(--kc-canvas)]">
      <section className="kc-page-main">
        <header className="kc-title-row" data-testid="story-lab-title-row">
          <div className="min-w-0">
            <div className="kc-eyebrow hidden md:block">G1 会说话的故事 · 实验课</div>
            <h1>编程课堂 · {lesson.title}</h1>
            {/* 画布 Gate 1：768×1024 与 375×812 首屏画布须 ≥300/≥220px。
                故事简介只在桌面断点显示，窄屏隐藏（故事正文仍在课程数据
                与任务抽屉内，不丢教学内容），给画布让出首屏高度。 */}
            <p className="kc-subtitle hidden md:block">{lesson.story}</p>
          </div>
          {/* E7 移动端预算：窄屏下回课程介绍链接只留 ↖ 图标（aria-label
              保留完整文案），让 h1 一行放下；教学内容（标题/简介）一字未动。 */}
          <Link className="kc-action-surface kc-btn-outline kc-btn-sm shrink-0" href={`/learn/catalog/${lesson.id}`} aria-label="回到课程介绍">
            <span aria-hidden="true">↖</span>
            <span className="hidden md:inline">回到课程介绍</span>
          </Link>
        </header>
        <LessonWorkspace
          contract={isL02 ? L02_WORKSPACE_CONTRACT : L01_WORKSPACE_CONTRACT}
          adapter={isL02 ? l02Adapter : l01Adapter}
          editorSlot={isL02 ? TurnTakingEditorSlot : StoryEditorSlot}
          stageSlot={isL02 ? TurnTakingStageSlot : StoryStageSlot}
          runAdapter={isL02 ? l02RunAdapter : l01RunAdapter}
          initialScript={isL02 ? emptyL02StoryDraft() : emptyL01StoryDraft()}
        />
      </section>
    </main>
  )
}
