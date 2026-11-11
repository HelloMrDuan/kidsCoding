'use client'

/**
 * A1-U4-L02 正式课堂路由：只保留路由守卫与工作区组装，不再有独立课堂布局。
 *
 * 本页是 client 组件（与 L01 路由同模式）：适配器是类实例，不能跨
 * server→client 边界，因此在这里构造并传给外壳；外壳拥有标题、保存
 * chip、文件菜单、任务抽屉、三级提示、反馈容器与三端布局，许可清单编辑
 * 面由 L02EditorSlot 提供，判定逻辑与草稿数据由 L02Adapter 与课程
 * 契约提供。通用引擎 'slot' 已并入主线 WorkspaceEngine（#491 OPS-026）。
 * 本页不改共享工作区核心，不碰 U3 的问答业务。路由地址保持不
 * 变（/learn/ai-python-lab-u4-l02/A1-U4-L02）；正式课仍是 in_review、
 * 未通过独立复核与儿童试学，不谎称已发布。
 */

import { use, useMemo } from 'react'

import { L02Adapter } from '@/features/ai-python/a1-u4-l02-adapter'
import { L02_WORKSPACE_CONTRACT } from '@/features/ai-python/a1-u4-l02-contract'
import { emptyDraft } from '@/features/ai-python/a1-u4-l02-draft'
import { L02EditorSlot } from '@/features/ai-python/a1-u4-l02-slot'
import { LessonWorkspace } from '@/features/lessons/workspace/lesson-workspace'

export default function AiPythonU4L02Page({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params)

  // 适配器实例按挂载稳定：外壳按引擎稳定挂载，重复渲染不得重建。
  // 注意：Hook 必须在守卫返回之前调用（rules-of-hooks），守卫路径不渲染它。
  const adapter = useMemo(() => new L02Adapter(), [])

  if (lessonId !== 'A1-U4-L02') {
    return (
      <main>
        <p>本课暂未开放。</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--kc-canvas)]">
      <section className="kc-page-main">
        <LessonWorkspace
          contract={L02_WORKSPACE_CONTRACT}
          adapter={adapter}
          editorSlot={L02EditorSlot}
          initialScript={emptyDraft()}
        />
      </section>
    </main>
  )
}
