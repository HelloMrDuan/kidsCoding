/**
 * A1-U3-L04 路由（脚手架 OPS-030 生成）。
 *
 * 薄接线：只把本课契约、适配器、插槽交给统一 LessonWorkspace，
 * 不写课程逻辑、不复制外壳。
 */

'use client'

import { useMemo } from 'react'

import { A1U3L04Adapter } from '@/features/ai-python/a1-u3-l04-adapter'
import { L04_WORKSPACE_CONTRACT } from '@/features/ai-python/a1-u3-l04-contract'
import { A1U3L04EditorSlot } from '@/features/ai-python/a1-u3-l04-slot'
import { LessonWorkspace } from '@/features/lessons/workspace/lesson-workspace'

export default function A1U3L04Page() {
  const adapter = useMemo(() => new A1U3L04Adapter(), [])
  return (
    <LessonWorkspace
      contract={L04_WORKSPACE_CONTRACT}
      adapter={adapter}
      editorSlot={A1U3L04EditorSlot}
    />
  )
}
