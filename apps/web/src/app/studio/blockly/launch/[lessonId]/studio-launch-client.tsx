/**
 * OPS-056：启蒙课 lesson-02～lesson-12 的 V3 studio 路由客户端装配
 * （/studio/blockly/launch/<lessonId>）。
 *
 * 外壳与 OPS-041 / OPS-053 完全同一套（StudioShell + LessonWorkspace，chrome="studio"，
 * studioLayout="blockly-v3"），十一节课共用 launch-v3 唯一一套编辑 / 舞台 / 角色插槽，
 * 禁止每课复制外壳。
 *
 * 数据流：
 * - 路由级会话 store（编辑插槽与舞台插槽共享草稿镜像、问答、双角色预测与复盘）与
 *   LaunchRunAdapter（唯一运行与判定来源）以 lessonId 为依赖构造，不做模块级单例；
 *   切课节时整体重建，不存在跨课泄漏。
 * - 草稿信封由外壳管理：键 kidscoding-draft:<lessonId>，归属人来自服务端边界。
 * - 课程准入守卫与旧路由同一套（/api/course-access + resolveCourseAccess）；
 *   locked 时诚实提示、不展示编辑器。
 */
'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { resolveCourseAccess } from '@/features/billing/resolve-course-access'
import { useLaunchCurriculum } from '@/features/curriculum/use-launch-curriculum'
import { buildLaunchContract, buildLaunchHelp } from '@/features/lessons/launch-v3/launch-v3-contract'
import { emptyLaunchDraft } from '@/features/lessons/launch-v3/launch-v3-draft'
import { getLaunchV3Lesson } from '@/features/lessons/launch-v3/launch-v3-lessons'
import { LaunchRolesSlot } from '@/features/lessons/launch-v3/launch-v3-roles'
import { LaunchAdapter, LaunchRunAdapter } from '@/features/lessons/launch-v3/launch-v3-run-adapter'
import { createLaunchSessionStore, LaunchSessionContext } from '@/features/lessons/launch-v3/launch-v3-session'
import { LaunchEditorSlot } from '@/features/lessons/launch-v3/launch-v3-slot'
import { LaunchStageSlot } from '@/features/lessons/launch-v3/launch-v3-stage'
import { StudioShell } from '@/features/lessons/studio/studio-shell'
import { toLessonContract, type StudioLesson } from '@/features/lessons/studio/studio-lesson'
import type { StudioPane } from '@/features/lessons/workspace/blockly-studio-layout'
import { LessonWorkspace } from '@/features/lessons/workspace/lesson-workspace'
import type { SaveState, ShellControl } from '@/features/lessons/workspace/workspace-slots'

export default function StudioLaunchClient({ lessonId }: { lessonId: string }) {
  const studioLesson = useMemo<StudioLesson | null>(() => {
    const contract = buildLaunchContract(lessonId)
    if (!contract) return null
    return { ...contract, backHref: '/learn/map', help: buildLaunchHelp(lessonId) }
  }, [lessonId])

  // 页面已在服务端 notFound 未登记的 id；这里兜底不渲染空白外壳。
  if (!studioLesson) return null

  return <LaunchStudioWorkspace key={lessonId} lessonId={lessonId} studioLesson={studioLesson} />
}

function LaunchStudioWorkspace({ lessonId, studioLesson }: { lessonId: string; studioLesson: StudioLesson }) {
  const store = useMemo(() => createLaunchSessionStore(lessonId), [lessonId])
  const runAdapter = useMemo(
    () =>
      new LaunchRunAdapter(lessonId, {
        isStepObserved: (stepId) => store.getState().observed.includes(stepId),
      }),
    [lessonId, store],
  )
  // 离开页面（或换课）时停止播放，不留后台计时器。
  useEffect(() => () => runAdapter.stop(), [runAdapter])
  const adapter = useMemo(() => new LaunchAdapter(lessonId), [lessonId])
  // 复审 HOLD P1：受控面板（同 G1 故事课 studioPane 写法）。插槽出现新提示时切到编程面板，
  // 手机端提示与重试操作始终在当前可见面板；桌面三栏同时可见，data-pane 不影响视觉。
  const [pane, setPane] = useState<StudioPane>('code')
  const revealAlerts = useCallback(() => setPane('code'), [])
  const sessionValue = useMemo(
    () => ({ lessonId, store, runAdapter, revealAlerts }),
    [lessonId, store, runAdapter, revealAlerts],
  )
  const initialScript = useMemo(() => emptyLaunchDraft(lessonId), [lessonId])

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
  // 桌面端“收起任务”：复用 BlocklyStudioLayout 已有能力（同 OPS-054 event 路由），只切列宽不卸载编辑器。
  const [missionCollapsed, setMissionCollapsed] = useState(false)
  const handleMissionToggle = useCallback(() => {
    setMissionCollapsed((collapsed) => !collapsed)
  }, [])

  // 课程准入守卫（与旧路由同一套）：十一节课 phase=trial，正常不 locked。
  const curriculum = useLaunchCurriculum()
  const [hasCourseEntitlement, setHasCourseEntitlement] = useState(false)
  useEffect(() => {
    let isActive = true
    fetch('/api/course-access')
      .then(async (response) => {
        if (!response.ok) return { hasLaunchPack: false }
        return (await response.json()) as { hasLaunchPack?: boolean }
      })
      .then((payload) => {
        if (isActive) setHasCourseEntitlement(Boolean(payload.hasLaunchPack))
      })
      .catch(() => {})
    return () => {
      isActive = false
    }
  }, [])

  // phase 与旧路由、学习地图同源：读 /api/curriculum/launch（useLaunchCurriculum，首帧为同一份种子课程）。
  // 课程数据里有这节课时原样使用其 phase（缺失 phase 的异常数据由 resolveCourseAccess 失败关闭为 locked）；
  // 仅当课程数据里找不到这节课时才回退到静态登记。
  const curriculumLesson = curriculum.lessons.find((item) => item.id === lessonId)
  const courseAccess = resolveCourseAccess({
    lessonPhase: curriculumLesson ? curriculumLesson.phase : (getLaunchV3Lesson(lessonId)?.phase ?? 'trial'),
    hasLaunchPack: hasCourseEntitlement,
  })

  if (courseAccess === 'locked') {
    // ux-102 裁定：恢复旧锁定页有效的升级入口与返回导航入口（文案与样式沿用旧 guided-lesson-shell 锁定页）。
    return (
      <main className="p-6" data-testid="launch-v3-locked">
        <section className="kc-surface-3d rounded-[2.5rem] p-8">
          <div className="max-w-3xl space-y-5">
            <p className="inline-flex rounded-full bg-[#f2ecff] px-4 py-2 text-sm font-semibold text-[#6b46ff]">
              高阶创作入口
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">{studioLesson.title}</h1>
            <p className="rounded-[1.5rem] bg-[#fff6ea] px-5 py-4 text-base leading-8 text-amber-800">
              这节高阶内容会在启蒙毕业后开启。先学完 12 节启蒙课，再决定要不要继续升级更复杂的互动故事。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex rounded-full bg-[#7c5cff] px-5 py-3 font-bold text-white transition hover:bg-[#6948f2]"
                data-testid="launch-v3-locked-upgrade"
                href="/parent/purchase"
              >
                看看高阶升级内容
              </Link>
              <Link
                className="inline-flex rounded-full bg-slate-100 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-200"
                data-testid="launch-v3-locked-back"
                href="/learn/map"
              >
                返回学习地图
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

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
          editorSlot={LaunchEditorSlot}
          stageSlot={LaunchStageSlot}
          rolesSlot={LaunchRolesSlot}
          runAdapter={runAdapter}
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
