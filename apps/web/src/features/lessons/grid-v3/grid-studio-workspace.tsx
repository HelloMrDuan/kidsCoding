/**
 * OPS-052：网格课唯一一套 V3 studio 工作台装配。
 * OPS-057：作品模式复用同一组件，只替换草稿读写口与 studio 合同。
 *
 * 外壳与 lesson-01-forest-hello 完全同一套（StudioShell + LessonWorkspace，
 * chrome="studio"，studioLayout="blockly-v3"），禁止每课复制外壳。
 *
 * 数据流：
 * - 路由级会话 store（编辑插槽与舞台插槽共享草稿镜像 / 预测回答 /
 *   画布重挂载计数）与 GridRunAdapter（唯一运行与判定来源）在每次挂载
 *   新建，不做模块级单例。
 * - 草稿信封由外壳管理：课程模式键 kidscoding-draft:<lessonId>；作品模式由
 *   注入的 draftStore 使用独立作品信封。保存/恢复/导出/导入/恢复初始全部
 *   走外壳真实实现。
 */
'use client'

import { useCallback, useMemo, useState } from 'react'

import type { GridLesson } from '@/content/curriculum/g0-u1-grid-lessons'
import { buildGridStudioLesson } from '@/features/lessons/grid-v3/grid-v3-contract'
import { emptyGridDraft } from '@/features/lessons/grid-v3/grid-v3-draft'
import { GridAdapter, GridRunAdapter } from '@/features/lessons/grid-v3/grid-v3-run-adapter'
import {
  createGridSessionStore,
  GridSessionContext,
} from '@/features/lessons/grid-v3/grid-v3-session'
import { GridEditorSlot } from '@/features/lessons/grid-v3/grid-v3-slot'
import { GridStageSlot } from '@/features/lessons/grid-v3/grid-v3-stage'
import { StudioShell } from '@/features/lessons/studio/studio-shell'
import { toLessonContract, type StudioLesson } from '@/features/lessons/studio/studio-lesson'
import { LessonWorkspace, type WorkspaceDraftStore } from '@/features/lessons/workspace/lesson-workspace'
import type { SlotRunAdapter } from '@/features/lessons/workspace/workspace-adapters'
import type { SaveState, ShellControl } from '@/features/lessons/workspace/workspace-slots'

/**
 * 保证每个课节的 store / 适配器都以 lesson 为依赖构造：
 * 同一路由参数下不会重建，切课节时整体重建（不存在跨课泄漏）。
 */
export function GridStudioWorkspace({
  lesson,
  draftStore,
  studioLesson: studioLessonOverride,
  workStepId,
}: {
  lesson: GridLesson
  draftStore?: WorkspaceDraftStore
  studioLesson?: StudioLesson
  /** OPS-057 复审：作品模式只编辑这个作品关，不进入课堂关卡流程。 */
  workStepId?: string
}) {
  const store = useMemo(() => createGridSessionStore(lesson), [lesson])
  const runAdapter = useMemo(() => new GridRunAdapter(lesson), [lesson])
  const adapter = useMemo(() => new GridAdapter(lesson), [lesson])
  const sessionValue = useMemo(
    () => ({ lesson, store, runAdapter, ...(workStepId ? { work: { stepId: workStepId } } : {}) }),
    [lesson, store, runAdapter, workStepId],
  )
  const initialScript = useMemo(() => {
    const empty = emptyGridDraft(lesson)
    if (!workStepId) return empty
    const stepIndex = lesson.steps.findIndex((step) => step.id === workStepId)
    return stepIndex < 0 ? empty : { ...empty, stepIndex }
  }, [lesson, workStepId])
  const studioLesson: StudioLesson = useMemo(
    () => studioLessonOverride ?? buildGridStudioLesson(lesson),
    [lesson, studioLessonOverride],
  )
  // 作品模式：运行仍走同一个网格引擎，但外壳不接收教学判定——
  // 作品不能按课堂标准答案显示“通过/未通过”。
  const shellRunAdapter = useMemo<SlotRunAdapter>(() => {
    if (!workStepId) return runAdapter
    return {
      runProgram: (program, onEvent) => runAdapter.runProgram(program, onEvent),
      stop: () => runAdapter.stop(),
      reset: () => runAdapter.reset(),
      getState: () => runAdapter.getState(),
      validateDraft: runAdapter.validateDraft,
      getStageState: () => runAdapter.getStageState(),
      getLastRunError: () => null,
      getJudgmentResult: () => null,
    }
  }, [runAdapter, workStepId])

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
      <GridSessionContext.Provider value={sessionValue}>
        <LessonWorkspace
          contract={toLessonContract(studioLesson)}
          adapter={adapter}
          editorSlot={GridEditorSlot}
          stageSlot={GridStageSlot}
          runAdapter={shellRunAdapter}
          draftStore={draftStore}
          initialScript={initialScript}
          chrome="studio"
          studioLayout="blockly-v3"
          onSaveStateChange={handleSaveStateChange}
          onShellControl={handleShellControl}
          missionCollapsed={missionCollapsed}
          onMissionToggle={handleMissionToggle}
        />
      </GridSessionContext.Provider>
    </StudioShell>
  )
}
