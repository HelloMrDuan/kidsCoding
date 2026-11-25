'use client'

/**
 * G1 金色课堂（/learn/story-lab/G1-U1-L01/golden）。
 *
 * V3 整改（2026-11-22）：课堂外壳改用与 G0 相同的 StudioShell +
 * LessonWorkspace(chrome="studio", studioLayout="blockly-v3")，让课程体系
 * 与编程课堂进入同一节课时看到同一套工作台、存档与学习进度。课程语义
 * 全部保留：
 * - 课程自有 EditorSlot / StageSlot / SlotRunAdapter 原样挂载（真实
 *   Blockly、7 关流程、判定、草稿键都不动）；
 * - 根节点仍为 `golden-story`，`data-pane` 与 `golden-story-pane-*`
 *   测试 id 不变，手机端点“运行”仍切到舞台；
 * - 顶栏“返回 / 保存 / 全屏”与桌面“收起任务”继续可用，分别交给
 *   StudioShell 的返回链接、ShellTopbarAction 与任务列折叠；
 * - 保存失败时的 beforeunload 提醒保留。
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { LessonWorkspace } from '@/features/lessons/workspace/lesson-workspace'
import type { EditorSlotProps, SaveState, ShellControl, ShellTopbarAction } from '@/features/lessons/workspace/workspace-slots'
import { StudioShell } from '@/features/lessons/studio/studio-shell'
import type { StudioLesson } from '@/features/lessons/studio/studio-lesson'
import { G1_WORKSPACE_CONTRACT, G1_WORKSPACE_CONTRACT_FIELDS } from './g1-u1-l01-contract'
import { emptyStoryDraft } from './g1-u1-l01-draft'
import { StoryAdapter, StoryRunAdapter } from './g1-u1-l01-run-adapter'
import { StoryEditorSlot } from './g1-u1-l01-slot'
import { StoryStageSlot } from './g1-u1-l01-stage'
import '../golden/golden-lesson-layout.css'

const STUDIO_LESSON: StudioLesson = {
  ...G1_WORKSPACE_CONTRACT_FIELDS,
  engine: 'slot',
  demo: true,
  backHref: '/learn/catalog/G1-U1-L01',
}

export function StoryGoldenClassroom() {
  const adapter = useMemo(() => new StoryAdapter(), [])
  const runAdapter = useMemo(() => new StoryRunAdapter(true), [])
  const initial = useMemo(() => emptyStoryDraft(), [])
  const root = useRef<HTMLElement>(null)
  const [controls, setControls] = useState<ShellControl>()
  const [saveState, setSaveState] = useState<SaveState>()
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [pane, setPane] = useState<'code' | 'task' | 'stage'>('code')
  const [missionCollapsed, setMissionCollapsed] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [focus, setFocus] = useState(false)

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === root.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])

  useEffect(() => {
    if (!focus) return
    const exit = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocus(false)
    }
    window.addEventListener('keydown', exit)
    return () => window.removeEventListener('keydown', exit)
  }, [focus])

  useEffect(() => {
    if (saveState !== 'failed') return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [saveState])

  async function toggleFullscreen() {
    if (focus) setFocus(false)
    else if (fullscreen) await document.exitFullscreen()
    else {
      try {
        if (!root.current?.requestFullscreen) throw new Error('Fullscreen unavailable')
        await root.current.requestFullscreen()
      } catch {
        setFocus(true)
      }
    }
  }

  /** 手机端：点运行先切到舞台再运行（旧课堂行为，测试依赖 data-pane）。 */
  function run() {
    setPane('stage')
    controlsRef.current?.run()
  }
  const controlsRef = useRef<ShellControl | undefined>(undefined)
  controlsRef.current = controls
  const runRef = useRef(run)
  runRef.current = run
  const [controlsReady, setControlsReady] = useState(false)
  useEffect(() => {
    setControlsReady(Boolean(controls))
  }, [controls])

  /** Stable slot identity: V3 docked Blockly + mission/stepbar portals. */
  const editorSlot = useMemo(() => {
    function GoldenStoryEditor(props: EditorSlotProps) {
      return (
        <StoryEditorSlot
          {...props}
          goldenLayout
          v3
          onRunRequest={() => runRef.current()}
        />
      )
    }
    return GoldenStoryEditor
  }, [])

  const fullscreenRef = useRef<() => void>(() => {})
  fullscreenRef.current = () => void toggleFullscreen()
  const fullscreenLabel = fullscreen || focus ? '退出全屏' : '全屏'
  // Stays identity-stable across shellControl updates (controls appear in
  // deps only through the stable ready flag); otherwise the shellControl →
  // onShellControl → setControls effect would re-create itself forever.
  const topbarActions = useMemo<ShellTopbarAction[]>(
    () => [
      {
        label: '保存',
        onClick: () => controlsRef.current?.save(),
        disabled: !controlsReady,
        testId: 'golden-story-save',
      },
      {
        label: fullscreenLabel,
        onClick: () => fullscreenRef.current(),
        testId: 'golden-story-fullscreen',
      },
    ],
    [controlsReady, fullscreenLabel],
  )

  return (
    <main
      ref={root}
      data-testid="golden-story"
      data-pane={pane}
      data-mission-collapsed={missionCollapsed}
      data-focus-mode={focus}
      style={{ position: 'fixed', inset: 0, zIndex: 100, height: '100dvh', overflow: 'hidden' }}
    >
      <StudioShell
        lesson={STUDIO_LESSON}
        layout="blockly-v3"
        saveState={saveState}
        saveMessage={saveMessage}
        shellControl={controls}
      >
        <LessonWorkspace
          contract={G1_WORKSPACE_CONTRACT}
          adapter={adapter}
          runAdapter={runAdapter}
          stageSlot={StoryStageSlot}
          editorSlot={editorSlot}
          initialScript={initial}
          chrome="studio"
          studioLayout="blockly-v3"
          studioPane={pane}
          onStudioPaneChange={setPane}
          paneTestIdPrefix="golden-story-pane"
          missionCollapsed={missionCollapsed}
          onMissionToggle={() => setMissionCollapsed((open) => !open)}
          topbarActions={topbarActions}
          onSaveStateChange={(state, message) => {
            setSaveState(state)
            setSaveMessage(message)
          }}
          onShellControl={setControls}
        />
      </StudioShell>
    </main>
  )
}
