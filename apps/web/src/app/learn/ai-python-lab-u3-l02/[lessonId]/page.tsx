'use client'

/**
 * A1-U3-L02 正式课堂路由：只保留路由守卫与工作区组装，不再有独立课堂布局。
 *
 * 本页是 client 组件（与共享演示路由同模式）：适配器是类实例，不能跨
 * server→client 边界，因此在这里构造并传给外壳；外壳拥有标题、保存
 * chip、文件菜单、任务抽屉、三级提示、反馈容器与三端布局，摘要编辑
 * 面由 SummaryEditorSlot 提供，判定逻辑与草稿数据由 SummaryAdapter
 * 与课程契约提供。本页不改共享工作区核心，不碰 #470 的 Scratch 业务。
 * 路由地址保持不变（/learn/ai-python-lab-u3-l02/A1-U3-L02），旧独立
 * 课堂文件已删除；正式课仍是 Draft、未通过独立复核，插槽内保留
 * “课程开发中”提示，不谎称已发布。
 */

import { notFound } from 'next/navigation'
import { use, useMemo } from 'react'

import { SummaryAdapter } from '@/features/ai-python/a1-u3-l02-adapter'
import { L02_WORKSPACE_CONTRACT } from '@/features/ai-python/a1-u3-l02-contract'
import { emptyDraft } from '@/features/ai-python/a1-u3-l02-draft'
import { SummaryEditorSlot } from '@/features/ai-python/a1-u3-l02-slot'
import { LessonWorkspace } from '@/features/lessons/workspace/lesson-workspace'

export default function AiPythonU3L02Page({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params)
  if (lessonId !== 'A1-U3-L02') notFound()

  // 适配器实例按挂载稳定：外壳按引擎稳定挂载，重复渲染不得重建。
  const adapter = useMemo(() => new SummaryAdapter(), [])

  return (
    <main className="min-h-screen bg-[var(--kc-canvas)]">
      <section className="kc-page-main">
        <LessonWorkspace
          contract={L02_WORKSPACE_CONTRACT}
          adapter={adapter}
          editorSlot={SummaryEditorSlot}
          initialScript={emptyDraft()}
        />
      </section>
    </main>
  )
}
