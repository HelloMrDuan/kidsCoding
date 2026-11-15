/**
 * OPS-039: studio demo route — serves ONLY the demo contracts from
 * `features/lessons/workspace/demo-contracts.ts`, otherwise notFound().
 * The adapter construction is identical to the /learn/workspace demo
 * route; the only difference is the shell: StudioShell (fullscreen,
 * 100dvh, no AppShell) wraps LessonWorkspace in `chrome="studio"`, so
 * the topbar / save chip / file menu / guidance drawer come from
 * StudioShell, driven by the workspace's own ShellControl surface.
 *
 * There is no demo nav strip above the shell: a strip would break the
 * fullscreen model. Lesson switching in the studio demo works by direct
 * URL (e.g. /studio/demo/demo-b).
 *
 * TEST HOOK (demo route only): `?demoFailSave=1` makes 保存 report
 * failure without writing, so the E2E save-failure case can prove
 * fail-closed behavior. It is never part of the real save path.
 */

'use client'

import { notFound } from 'next/navigation'
import { use, useCallback, useMemo, useState } from 'react'

import { BlocklyAdapter } from '@/features/lessons/workspace/blockly-adapter'
import { getDemoContract } from '@/features/lessons/workspace/demo-contracts'
import { createDemoStage, DemoRoles } from '@/features/lessons/workspace/demo-stage'
import { SlotDemoAdapter } from '@/features/lessons/workspace/demo-slot-adapter'
import { DemoSlotEditor } from '@/features/lessons/workspace/demo-slot-editor'
import { DemoSummaryEditor } from '@/features/lessons/workspace/demo-summary-editor'
import { LessonWorkspace } from '@/features/lessons/workspace/lesson-workspace'
import { ScratchVMAdapter } from '@/features/lessons/workspace/scratch-adapter'
import type { SaveState, ShellControl } from '@/features/lessons/workspace/workspace-slots'
import type { EngineAdapter } from '@/features/lessons/workspace/workspace-adapters'
import { StudioShell } from '@/features/lessons/studio/studio-shell'
import { toLessonContract, type StudioLesson } from '@/features/lessons/studio/studio-lesson'

export default function StudioDemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>
  searchParams?: Promise<{ demoFailSave?: string | string[] }>
}) {
  const { lessonId } = use(params)
  const sp = searchParams ? use(searchParams) : {}
  const demo = getDemoContract(lessonId)
  if (!demo) notFound()

  const engine = demo.contract.engine
  // Adapter construction is identical to the /learn/workspace demo route:
  // stable per lesson, never shared across lessons (see the note there).
  const adapter: EngineAdapter = useMemo(() => {
    if (engine === 'blockly') {
      return new BlocklyAdapter({ stageTarget: demo.contract.judging.target })
    }
    if (engine === 'scratch-vm') {
      return new ScratchVMAdapter()
    }
    if (engine === 'slot') {
      return new SlotDemoAdapter()
    }
    return new BlocklyAdapter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, engine, demo.contract.judging.target?.fruitX, demo.contract.judging.target?.threshold])

  const testFailSave = sp.demoFailSave === '1'

  const isBlocklyDemo = engine === 'blockly' && demo.contract.judging.target !== undefined
  const fruitX = demo.contract.judging.target?.fruitX ?? 200
  const demoStageSlot = useMemo(
    () => (isBlocklyDemo ? createDemoStage(fruitX) : undefined),
    [isBlocklyDemo, fruitX],
  )

  // OPS-039: the StudioLesson is the demo contract plus the studio-only
  // fields. backHref returns to the learning map; the help text is
  // demo-shell help (the demo contracts carry no lesson help).
  const lesson: StudioLesson = useMemo(
    () => ({
      ...demo.contract,
      backHref: '/learn/map',
      help: {
        title: '演示帮助',
        body: [
          '这是全屏课堂的演示：顶栏的返回、课程名、进度与保存状态由 StudioShell 渲染。',
          '点“指引”随时查看学习目标与提示；抽屉开关不会重新挂载编辑器。',
        ],
      },
    }),
    [demo.contract],
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

  return (
    <StudioShell
      lesson={lesson}
      saveState={saveState}
      saveMessage={saveMessage}
      shellControl={shellControl}
    >
      <LessonWorkspace
        contract={toLessonContract(lesson)}
        adapter={adapter}
        initialScript={demo.initialScript}
        testFailSave={testFailSave}
        editorSlot={lessonId === 'demo-s' ? DemoSummaryEditor : lessonId === 'demo-slot' ? DemoSlotEditor : undefined}
        stageSlot={demoStageSlot}
        rolesSlot={isBlocklyDemo ? DemoRoles : undefined}
        chrome="studio"
        onSaveStateChange={handleSaveStateChange}
        onShellControl={handleShellControl}
      />
    </StudioShell>
  )
}
