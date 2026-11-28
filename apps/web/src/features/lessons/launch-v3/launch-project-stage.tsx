/**
 * OPS-057：作品舞台插槽（LaunchProjectStageSlot）。
 *
 * 与课程舞台同一分工：舞台不跑自己的执行器、不产生第二份运行状态；
 * 执行快照唯一来自路由的 LaunchRunAdapter（作品模式运行来源），按 external 模式渲染。
 * 作品模式不渲染预测 / 错误实验 / 复盘 / 礼物 / 对白板等教学块：
 * - 单角色作品：狐狸按积木走、换场景、说话。
 * - 双角色作品：狐狸与小熊各自按积木走，切换角色后的动作只给小熊。
 * 运行 / 停止 / 重来由外壳 V3 舞台栏统一提供（不另做按钮）。
 */
'use client'

import { useEffect, useReducer } from 'react'

import { PlayableStage } from '@/features/lessons/playable-stage/playable-stage'
import type { StageSlotProps } from '@/features/lessons/workspace/workspace-slots'

import { launchProjectTemplate } from './launch-v3-project'
import { launchExternalState } from './launch-v3-run-adapter'
import { useLaunchSession } from './launch-v3-session'

function useAdapterTick(adapter: { subscribe: (listener: () => void) => () => void }) {
  const [, force] = useReducer((count: number) => count + 1, 0)
  useEffect(() => adapter.subscribe(force), [adapter])
}

export function LaunchProjectStageSlot({ lessonId, sceneActions }: StageSlotProps) {
  const { lessonId: sessionLessonId, runAdapter, project } = useLaunchSession()
  const id = sessionLessonId || lessonId
  const program = project?.program ?? []
  const template = launchProjectTemplate(id)
  useAdapterTick(runAdapter)

  // 换作品时清掉上一件作品的运行快照（编辑中的程序不重置舞台，孩子自己按运行）。
  useEffect(() => {
    runAdapter.reset()
  }, [runAdapter])

  const snapshot = runAdapter.getExecutionSnapshot()

  return (
    <div data-testid="launch-project-stage" data-lesson-id={id}>
      <PlayableStage
        key={id}
        blocks={program}
        template={template}
        requiredBlocks={[]}
        stepIndex={0}
        onRunSuccess={() => {}}
        onRunClear={() => {}}
        onRunFailure={() => {}}
        runControls="external"
        // 作品模式没有“完成这一关”，成功文案只说运行完成，不指向教学关卡。
        successMessage="🎉 运行完成！可以继续改积木，改完记得保存。"
        sceneActions={sceneActions}
        externalState={launchExternalState(snapshot)}
        onExternalCharacterClick={() => {
          runAdapter.clickCharacter()
        }}
      />
    </div>
  )
}
