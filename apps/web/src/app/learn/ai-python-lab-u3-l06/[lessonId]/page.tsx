'use client'

/**
 * A1-U3-L06 正式课堂路由：只保留路由守卫与工作区组装，不再有独立课堂布局。
 *
 * 本页是 client 组件（与 L03 路由同模式）：适配器是类实例，不能跨
 * server→client 边界，因此在这里构造并传给外壳；外壳拥有标题、保存
 * chip、文件菜单、任务抽屉、三级提示、反馈容器与三端布局，问答编辑
 * 面由 QaEditorSlot 提供，判定逻辑与草稿数据由 QaAdapter 与课程
 * 契约提供。通用引擎 'slot' 已并入主线 WorkspaceEngine（#491 OPS-026）。
 * 本页不改共享工作区核心，不碰 #470 的 Scratch 业务。路由地址保持不
 * 变（/learn/ai-python-lab-u3-l06/A1-U3-L06），试点演示页不受影响；
 * 正式课仍是 Draft、未通过独立复核，插槽内保留“课程开发中”提示，
 * 不谎称已发布。
 */

import { use, useMemo } from 'react'

import { QaAdapter } from '@/features/ai-python/a1-u3-l06-adapter'
import { L06_WORKSPACE_CONTRACT } from '@/features/ai-python/a1-u3-l06-contract'
import { emptyDraft } from '@/features/ai-python/a1-u3-l06-draft'
import { QaEditorSlot } from '@/features/ai-python/a1-u3-l06-slot'
import { LessonWorkspace } from '@/features/lessons/workspace/lesson-workspace'

export default function AiPythonU3L06Page({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params)

  // 适配器实例按挂载稳定：外壳按引擎稳定挂载，重复渲染不得重建。
  // 注意：Hook 必须在守卫返回之前调用（rules-of-hooks），守卫路径不渲染它。
  const adapter = useMemo(() => new QaAdapter(), [])

  if (lessonId !== 'A1-U3-L06') {
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
          contract={L06_WORKSPACE_CONTRACT}
          adapter={adapter}
          editorSlot={QaEditorSlot}
          initialScript={emptyDraft()}
        />
      </section>
    </main>
  )
}
