/**
 * OPS-047: G0《小狐狸打招呼》studio 路由（/studio/blockly/lesson-02-forest-greeting）。
 *
 * 真正的 lesson-02-forest-greeting（不是 G1-U1-L01）：StudioShell 包
 * LessonWorkspace（chrome="studio"，100dvh 全屏，不继承 /learn 的
 * AppShell），课程自有 GreetingEditorSlot（真实 BlocklyWorkspace）+
 * GreetingStageSlot（PlayableStage external 模式），运行与判定唯一来源
 * 为 GreetingRunAdapter。旧路由 /learn/lesson/lesson-02-forest-greeting
 * 一字不动、继续可用。
 *
 * 组装模式仿 /learn/story-lab/[lessonId] 与 /studio/demo/[lessonId]：
 * adapter 与 runAdapter 用 useMemo 稳定构造；会话 store（编辑插槽与
 * 舞台插槽共享草稿与问答状态）与 runAdapter 同为路由级、每次挂载新建，
 * 不用模块级单例。课程准入守卫与旧路由同一套（/api/course-access +
 * resolveCourseAccess；本课 phase=trial，正常不 locked；locked 时诚实
 * 提示、不展示编辑器）。
 * 专属 E2E 进 CI 的 workflow 配置由主号另行安排，本路由不改
 * curriculum-content.yml、不改任何 workflow 文件。
 */
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { resolveCourseAccess } from '@/features/billing/resolve-course-access'
import { GreetingAdapter, GreetingRunAdapter } from '@/features/lessons/forest-greeting/forest-greeting-run-adapter'
import { GreetingEditorSlot } from '@/features/lessons/forest-greeting/forest-greeting-slot'
import { GreetingStageSlot } from '@/features/lessons/forest-greeting/forest-greeting-stage'
import {
  GREETING_HELP,
  GREETING_SOURCE_LESSON,
  GREETING_WORKSPACE_CONTRACT,
} from '@/features/lessons/forest-greeting/forest-greeting-contract'
import { emptyGreetingDraft } from '@/features/lessons/forest-greeting/forest-greeting-draft'
import {
  createGreetingSessionStore,
  GreetingSessionContext,
} from '@/features/lessons/forest-greeting/forest-greeting-session'
import { StudioShell } from '@/features/lessons/studio/studio-shell'
import { toLessonContract, type StudioLesson } from '@/features/lessons/studio/studio-lesson'
import { LessonWorkspace } from '@/features/lessons/workspace/lesson-workspace'
import type { SaveState, ShellControl } from '@/features/lessons/workspace/workspace-slots'

export default function StudioForestGreetingPage() {
  // 会话 store：路由每次挂载新建；运行适配器的“已观察”读取它。
  const store = useMemo(() => createGreetingSessionStore(), [])
  const runAdapter = useMemo(
    () =>
      new GreetingRunAdapter({
        isStepObserved: (stepId) => store.getState().observed.includes(stepId),
      }),
    [store],
  )
  const adapter = useMemo(() => new GreetingAdapter(), [])
  const sessionValue = useMemo(() => ({ store, runAdapter }), [store, runAdapter])
  const initialScript = useMemo(() => emptyGreetingDraft(), [])

  const lesson: StudioLesson = useMemo(
    () => ({
      ...GREETING_WORKSPACE_CONTRACT,
      backHref: '/learn/map',
      help: {
        title: '小狐狸打招呼 · 玩法帮助',
        body: GREETING_HELP.split('\n'),
      },
    }),
    [],
  )

  // The workspace reports its save state and control surface upward; the
  // shell renders them in its own topbar. Nothing is shown until the
  // first report — the shell never writes a save state it was not given.
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

  // 课程准入守卫（与旧路由同一套）：本课 phase=trial，正常不 locked。
  const [hasCourseEntitlement, setHasCourseEntitlement] = useState(false)
  useEffect(() => {
    let isActive = true
    fetch('/api/course-access')
      .then(async (response) => {
        if (!response.ok) {
          return { hasLaunchPack: false }
        }
        return (await response.json()) as { hasLaunchPack?: boolean }
      })
      .then((payload) => {
        if (isActive) {
          setHasCourseEntitlement(Boolean(payload.hasLaunchPack))
        }
      })
      .catch(() => {})
    return () => {
      isActive = false
    }
  }, [])

  const courseAccess = resolveCourseAccess({
    lessonPhase: GREETING_SOURCE_LESSON?.phase ?? 'trial',
    hasLaunchPack: hasCourseEntitlement,
  })

  if (courseAccess === 'locked') {
    return (
      <main className="p-6 text-lg font-semibold" data-testid="forest-greeting-locked">
        这一节课暂未开放，先回学习地图再重新进入试试。
      </main>
    )
  }

  return (
    <StudioShell
      lesson={lesson}
      saveState={saveState}
      saveMessage={saveMessage}
      shellControl={shellControl}
    >
      <GreetingSessionContext.Provider value={sessionValue}>
        <LessonWorkspace
          contract={toLessonContract(lesson)}
          adapter={adapter}
          editorSlot={GreetingEditorSlot}
          stageSlot={GreetingStageSlot}
          runAdapter={runAdapter}
          initialScript={initialScript}
          chrome="studio"
          onSaveStateChange={handleSaveStateChange}
          onShellControl={handleShellControl}
        />
      </GreetingSessionContext.Provider>
    </StudioShell>
  )
}
