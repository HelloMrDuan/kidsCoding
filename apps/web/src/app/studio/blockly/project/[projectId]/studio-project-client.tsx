/**
 * OPS-057：Blockly V3 作品编辑路由客户端装配
 * （/studio/blockly/project/<projectId>，lesson-01～lesson-12）。
 *
 * 外壳与课程完全同一套（StudioShell + LessonWorkspace，chrome="studio"，
 * studioLayout="blockly-v3"），只把编辑器 / 舞台 / 运行来源换成作品版本：
 * - 编辑器：LaunchProjectEditorSlot（docked Blockly，作品信息 + 创作说明 + 保存）。
 * - 舞台：LaunchProjectStageSlot（external 快照，无教学关卡 / 预测 / 奖励）。
 * - 数据：LessonWorkspace.draftStore = launchProjectDraftStore，键为
 *   `kidscoding-project:<lessonId>`（按 owner 前缀），绝不写课程草稿键。
 * - 运行：LaunchRunAdapter + launchProjectRunSource，只如实播放，不按教学答案判分，
 *   不写课程进度、不发奖励。
 */
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { LaunchProjectEditorSlot } from '@/features/lessons/launch-v3/launch-project-slot'
import { LaunchProjectStageSlot } from '@/features/lessons/launch-v3/launch-project-stage'
import {
  buildLaunchProjectStudioLesson,
  emptyLaunchProjectDraft,
  launchProjectDraftStore,
  launchProjectRunSource,
  loadLaunchProjectDraft,
} from '@/features/lessons/launch-v3/launch-v3-project'
import { LaunchRolesSlot } from '@/features/lessons/launch-v3/launch-v3-roles'
import { LaunchAdapter, LaunchRunAdapter } from '@/features/lessons/launch-v3/launch-v3-run-adapter'
import {
  createLaunchSessionStore,
  LaunchSessionContext,
} from '@/features/lessons/launch-v3/launch-v3-session'
import { StudioShell } from '@/features/lessons/studio/studio-shell'
import { toLessonContract } from '@/features/lessons/studio/studio-lesson'
import type { ProgramBlock } from '@/features/lessons/blockly/observable-run'
import type { StudioPane } from '@/features/lessons/workspace/blockly-studio-layout'
import { LessonWorkspace } from '@/features/lessons/workspace/lesson-workspace'
import type { SaveState, ShellControl } from '@/features/lessons/workspace/workspace-slots'

export default function StudioProjectClient({
  projectId,
  owner,
}: {
  projectId: string
  owner: string | null
}) {
  const studioLesson = useMemo(() => buildLaunchProjectStudioLesson(projectId), [projectId])
  const [saved, setSaved] = useState<ReturnType<typeof loadLaunchProjectDraft> | null>(null)

  // 只在挂载后读本机存储（SSR 不读 localStorage）。没有真实保存的作品或作品损坏时
  // 如实提示，绝不用规格里的起始程序冒充孩子的历史作品。
  useEffect(() => {
    setSaved(loadLaunchProjectDraft(projectId, owner))
  }, [projectId, owner])

  if (!studioLesson) return null
  if (!saved) {
    return (
      <main className="p-6 text-base text-slate-600" data-testid="project-work-loading" role="status">
        正在读取作品…
      </main>
    )
  }
  if (!saved.data) {
    const broken = saved.reason !== null
    return (
      <main className="min-h-screen bg-[var(--kc-canvas)] p-6" data-testid={broken ? 'project-work-broken' : 'project-work-missing'}>
        <section className="kc-panel mx-auto max-w-xl p-6">
          <h1 className="text-2xl font-bold">
            {broken ? '这件作品暂时打不开' : '还没有保存过这件作品'}
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            {broken
              ? `${saved.reason}。作品数据没有被改动，也不会用默认积木冒充。`
              : '作品中心只显示真实保存过的作品；这里还没有这件作品。先回课程完成并保存，再回来编辑。'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="kc-action-surface min-h-11" href="/learn/portfolio">回作品中心</Link>
            <Link className="kc-action-surface kc-btn-outline min-h-11" href="/learn/map">回学习地图</Link>
          </div>
        </section>
      </main>
    )
  }
  return <ProjectStudioWorkspace projectId={projectId} studioLesson={studioLesson} />
}

function ProjectStudioWorkspace({
  projectId,
  studioLesson,
}: {
  projectId: string
  studioLesson: NonNullable<ReturnType<typeof buildLaunchProjectStudioLesson>>
}) {
  const store = useMemo(() => createLaunchSessionStore(projectId), [projectId])
  const runSource = useMemo(() => launchProjectRunSource(projectId), [projectId])
  const runAdapter = useMemo(
    () => new LaunchRunAdapter(projectId, { source: runSource }),
    [projectId, runSource],
  )
  useEffect(() => () => runAdapter.stop(), [runAdapter])
  const adapter = useMemo(
    () => new LaunchAdapter(projectId, undefined, runSource),
    [projectId, runSource],
  )
  const initialScript = useMemo(() => emptyLaunchProjectDraft(projectId), [projectId])

  // 舞台读取编辑插槽同步过来的当前作品程序。
  const [program, setProgram] = useState<ProgramBlock[]>(() => initialScript.program)
  const [pane, setPane] = useState<StudioPane>('code')
  const revealAlerts = useCallback(() => setPane('code'), [])
  const project = useMemo(() => ({ program, setProgram }), [program])
  const sessionValue = useMemo(
    () => ({ lessonId: projectId, store, runAdapter, project, revealAlerts }),
    [projectId, store, runAdapter, project, revealAlerts],
  )

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
      <LaunchSessionContext.Provider value={sessionValue}>
        <LessonWorkspace
          contract={toLessonContract(studioLesson)}
          adapter={adapter}
          editorSlot={LaunchProjectEditorSlot}
          stageSlot={LaunchProjectStageSlot}
          rolesSlot={LaunchRolesSlot}
          runAdapter={runAdapter}
          draftStore={launchProjectDraftStore}
          initialScript={initialScript}
          chrome="studio"
          studioLayout="blockly-v3"
          studioPane={pane}
          onStudioPaneChange={setPane}
          onSaveStateChange={handleSaveStateChange}
          onShellControl={handleShellControl}
          missionCollapsed={missionCollapsed}
          onMissionToggle={handleMissionToggle}
        />
      </LaunchSessionContext.Provider>
    </StudioShell>
  )
}
