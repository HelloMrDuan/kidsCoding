'use client'

// G2-U3-L02《接住掉落水果》正式页面：共享 LessonWorkspace + 本课的 EngineAdapter 与三个槽位。
// 壳负责布局、顶栏、任务抽屉、文件菜单、保存与运行按钮、判定展示；
// 课程只提供契约、适配器（真实 Scratch VM）、编辑 / 舞台 / 角色三个槽位。

import { useMemo, useState } from 'react'
import { LessonWorkspace } from '../../workspace/lesson-workspace'
import { L02_CONTRACT } from '../contract'
import { LessonL02Adapter } from '../lesson-adapter'
import { createL02Slots } from './slots'

export function LessonPage() {
  const [adapter] = useState(() => new LessonL02Adapter())
  const slots = useMemo(
    () => createL02Slots(adapter, { embedLevelNav: true, embedTaskPanel: true, embedEngineStatus: true }),
    [adapter],
  )
  return (
    <LessonWorkspace
      contract={L02_CONTRACT}
      adapter={adapter}
      editorSlot={slots.EditorSlot}
      stageSlot={slots.StageSlot}
      rolesSlot={slots.RolesSlot}
    />
  )
}
