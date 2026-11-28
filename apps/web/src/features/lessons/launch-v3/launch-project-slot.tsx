/**
 * OPS-057：作品编辑插槽（LaunchProjectEditorSlot）。
 *
 * 复用 V3 工作台已通过的编辑器结构（单实例 docked Blockly + 任务卡 + 步骤条），
 * 只把“教学关卡”换成“作品信息 / 创作说明 / 保存操作”：
 * - 不显示关卡列表、预测答题、错误实验、过关按钮与奖励；作品模式本来就没有“过关”。
 * - 可用积木 / 对白预设 / 起始程序全部来自作品规格（lesson-01～09 取 unit-projects 原文，
 *   10～12 取旧 DuoProject 原文），不另编课程内容。
 * - 编辑 → 同步会话 store（舞台读取）→ onChange（外壳防抖保存到作品草稿键）。
 * - 保存按钮复用外壳的 ShellControl.save()，与顶栏保存是同一个保存路径。
 */
'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { motionVerbForTemplate } from '@/features/lessons/blockly/block-labels'
import type { ProgramBlock } from '@/features/lessons/blockly/observable-run'
import { BlocklyStudioMission, BlocklyStudioSteps } from '@/features/lessons/workspace/blockly-studio-layout'
import type { EditorSlotProps } from '@/features/lessons/workspace/workspace-slots'

import {
  coerceLaunchProjectDraft,
  getLaunchProjectSpec,
  launchProjectTemplate,
  type LaunchProjectDraft,
} from './launch-v3-project'
import { useLaunchSession } from './launch-v3-session'

const BlocklyWorkspace = dynamic(
  () => import('@/features/lessons/blockly/blockly-workspace').then((m) => m.BlocklyWorkspace),
  { ssr: false },
)

export function LaunchProjectEditorSlot({ initial, onChange, editable, shell }: EditorSlotProps) {
  const { lessonId, project } = useLaunchSession()
  const spec = useMemo(() => getLaunchProjectSpec(lessonId), [lessonId])
  const template = useMemo(() => launchProjectTemplate(lessonId), [lessonId])
  const [program, setProgram] = useState<ProgramBlock[]>(
    () => coerceLaunchProjectDraft(lessonId, initial).program,
  )
  const programRef = useRef(program)
  const onChangeRef = useRef(onChange)
  // Render must not touch refs (react-hooks/refs): sync the latest callback after commit.
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  const setProjectProgram = project?.setProgram

  // 挂载 / 重挂（恢复草稿、重置、导入）时把作品程序交给舞台插槽。
  useEffect(() => {
    setProjectProgram?.(programRef.current)
  }, [setProjectProgram])

  const handleSnapshot = useCallback(
    (next: ProgramBlock[]) => {
      setProgram(next)
      setProjectProgram?.(next)
      const draft: LaunchProjectDraft = { version: 1, kind: 'project', lessonId, program: next }
      onChangeRef.current(draft)
    },
    [lessonId, setProjectProgram],
  )

  if (!spec) {
    return <p data-testid="launch-project-slot-missing">作品数据缺失，无法打开这件作品。</p>
  }

  if (!editable) {
    return (
      <div data-testid="launch-project-slot-readonly">
        <p>作品只读预览：{spec.title}，共 {program.length} 块积木。</p>
      </div>
    )
  }

  return (
    <div
      className="kc-v3-slot-editor"
      data-testid="launch-project-slot"
      data-lesson-id={lessonId}
      style={{ height: '100%', overflowY: 'auto' }}
    >
      <BlocklyStudioMission>
        <div className="kc-v3-task" data-testid="launch-project-info">
          <p className="kc-v3-step-index">作品模式 · 我的作品</p>
          <div className="kc-v3-task-copy">
            <h2 data-testid="launch-project-title">{spec.title}</h2>
            <p data-testid="launch-project-prompt">{spec.prompt}</p>
          </div>
        </div>
        {spec.choiceHint ? (
          <p className="kc-text-muted px-4 pt-2 text-xs font-bold" data-testid="launch-project-choice-hint">
            两种改法都可以：{spec.choiceHint}
          </p>
        ) : null}
        <div className="px-4 pt-3" data-testid="launch-project-notes">
          <p className="text-sm leading-7 text-slate-700">
            创作说明：左边改积木，右边按运行看舞台；停止随时停下，重来把舞台放回起点。
          </p>
          <p className="mt-1 text-sm leading-7 text-slate-700">
            这里只改这件作品，不会改变课堂草稿、课程进度和奖励。
          </p>
        </div>
        <div className="px-4 pt-3 pb-1" data-testid="launch-project-save-area">
          <button
            type="button"
            data-testid="launch-project-save"
            disabled={!shell}
            onClick={() => shell?.save()}
          >
            保存作品
          </button>
          <span className="ml-3 text-xs font-bold text-slate-500" data-testid="launch-project-save-hint">
            保存后重新打开，积木会和现在一样。
          </span>
        </div>
      </BlocklyStudioMission>

      <BlocklyStudioSteps>
        <span className="kc-v3-step-note" data-testid="launch-project-mode">
          作品编辑 · 当前 {program.length} 块积木 · 不显示教学关卡与过关奖励
        </span>
      </BlocklyStudioSteps>

      <BlocklyWorkspace
        allowedBlocks={spec.allowedBlocks}
        blocks={program}
        docked={{ stepKey: 'project' }}
        sayLineChoices={spec.sayLineChoices}
        motionVerb={motionVerbForTemplate(template?.id)}
        onSnapshotChange={handleSnapshot}
      />
    </div>
  )
}
