/**
 * OPS-053 第二批：G0-U2 六节事件课的 V3 studio 路由客户端装配
 * （/studio/blockly/event/<lessonId>）。
 *
 * 外壳与 OPS-052 grid 路由完全同一套（StudioShell + LessonWorkspace，
 * chrome="studio"，studioLayout="blockly-v3"），六节课共用 event-v3 唯一
 * 一套编辑插槽 + 舞台插槽，禁止每课复制外壳。
 *
 * 数据流：
 * - 路由级会话 store（编辑插槽与舞台插槽共享草稿镜像 / 预测回答 / 正在编辑
 *   的角色 / 自由试玩序列 / 画布重挂载计数）与 EventRunAdapter（唯一运行与
 *   判定来源）在每次挂载新建，不做模块级单例。
 * - 草稿信封由外壳管理：键 kidscoding-draft:<lessonId>，归属人来自服务端
 *   边界（页面已解析）；保存/恢复/导出/导入/恢复初始全部走外壳真实实现。
 * - 本课 phase=trial，与旧 /learn/event-lab 路由一致不做课程准入守卫；
 *   旧路由对新入口做 308 兼容跳转，旧草稿由编辑插槽按严格归属策略提示导入。
 */
'use client'

import { useCallback, useMemo, useState } from 'react'

import type { EventLesson } from '@/content/curriculum/g0-u2-event-lessons'
import { buildEventStudioLesson } from '@/features/lessons/event-v3/event-v3-contract'
import { emptyEventDraft } from '@/features/lessons/event-v3/event-v3-draft'
import { getEventV3Lesson } from '@/features/lessons/event-v3/event-v3-lessons'
import { EventAdapter, EventRunAdapter } from '@/features/lessons/event-v3/event-v3-run-adapter'
import {
  createEventSessionStore,
  EventSessionContext,
} from '@/features/lessons/event-v3/event-v3-session'
import { EventEditorSlot } from '@/features/lessons/event-v3/event-v3-slot'
import { EventStageSlot } from '@/features/lessons/event-v3/event-v3-stage'
import { StudioShell } from '@/features/lessons/studio/studio-shell'
import { toLessonContract, type StudioLesson } from '@/features/lessons/studio/studio-lesson'
import { LessonWorkspace } from '@/features/lessons/workspace/lesson-workspace'
import type { SaveState, ShellControl } from '@/features/lessons/workspace/workspace-slots'

export default function StudioEventClient({ lessonId }: { lessonId: string }) {
  const lesson = useMemo(() => getEventV3Lesson(lessonId), [lessonId])

  // 页面已在服务端 notFound 本批之外的 id；这里兜底不渲染空白外壳。
  if (!lesson) return null

  return <EventStudioWorkspace lesson={lesson} />
}

/**
 * 拆成子组件，保证每个课节的 store / 适配器都以 lesson 为依赖构造：
 * 同一路由参数下不会重建，切课节时整体重建（不存在跨课泄漏）。
 */
function EventStudioWorkspace({ lesson }: { lesson: EventLesson }) {
  const store = useMemo(() => createEventSessionStore(lesson), [lesson])
  const runAdapter = useMemo(() => new EventRunAdapter(lesson), [lesson])
  const adapter = useMemo(() => new EventAdapter(lesson), [lesson])
  const sessionValue = useMemo(
    () => ({ lesson, store, runAdapter }),
    [lesson, store, runAdapter],
  )
  const initialScript = useMemo(() => emptyEventDraft(lesson), [lesson])
  const studioLesson: StudioLesson = useMemo(() => buildEventStudioLesson(lesson), [lesson])

  const [saveState, setSaveState] = useState<SaveState | undefined>(undefined)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [shellControl, setShellControl] = useState<ShellControl | null>(null)
  const handleSaveStateChange = useCallback((state: SaveState, message: string | null) => {
    setSaveState(state)
    setSaveMessage(message)
  }, [])
  const handleShellControl = useCallback((control: ShellControl) => {
    setShellControl(control)
  }, [])
  // 桌面端“收起任务”：复用 BlocklyStudioLayout 已有的 missionCollapsed /
  // onMissionToggle（与 story-golden-classroom 同一能力）。只切换网格列宽，
  // 编辑器与舞台节点不卸载，Blockly 实例、积木、草稿和运行状态都保持不变；
  // 手机端标签页布局由样式表恢复完整任务面板。
  const [missionCollapsed, setMissionCollapsed] = useState(false)
  const handleMissionToggle = useCallback(() => {
    setMissionCollapsed((collapsed) => !collapsed)
  }, [])

  return (
    <StudioShell
      lesson={studioLesson}
      saveState={saveState}
      saveMessage={saveMessage}
      shellControl={shellControl}
      layout="blockly-v3"
    >
      <EventSessionContext.Provider value={sessionValue}>
        <LessonWorkspace
          contract={toLessonContract(studioLesson)}
          adapter={adapter}
          editorSlot={EventEditorSlot}
          stageSlot={EventStageSlot}
          runAdapter={runAdapter}
          initialScript={initialScript}
          chrome="studio"
          studioLayout="blockly-v3"
          onSaveStateChange={handleSaveStateChange}
          onShellControl={handleShellControl}
          missionCollapsed={missionCollapsed}
          onMissionToggle={handleMissionToggle}
        />
      </EventSessionContext.Provider>
    </StudioShell>
  )
}
