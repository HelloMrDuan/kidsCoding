'use client'

/**
 * OPS-057：完成页的只读作品回放。
 *
 * 完成页保留完成总结、奖励与作品回放，但不再挂载旧 UnitProject /
 * DuoProject 编辑器：所有编辑统一进入 `/studio/blockly/project/<id>`。
 * 回放复用真实运行适配器（LaunchRunAdapter + launchProjectRunSource），
 * 只播放已保存的积木，不写草稿、不写进度、不发奖励；舞台用 external
 * 模式渲染适配器的执行快照，因此回放与作品模式看到的是同一次真实执行。
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ProjectTemplateDefinition } from '@/features/domain/types'
import type { ProgramBlock } from '@/features/lessons/blockly/observable-run'
import { launchProjectRunSource } from '@/features/lessons/launch-v3/launch-v3-project'
import {
  LaunchRunAdapter,
  launchExternalState,
} from '@/features/lessons/launch-v3/launch-v3-run-adapter'
import { PlayableStage } from '@/features/lessons/playable-stage/playable-stage'

export function ProjectWorkReplay({
  lessonId,
  blocks,
  template,
}: {
  lessonId: string
  blocks: ProgramBlock[]
  template?: ProjectTemplateDefinition
}) {
  const adapter = useMemo(
    () => new LaunchRunAdapter(lessonId, { source: launchProjectRunSource(lessonId) }),
    [lessonId],
  )
  const [snapshot, setSnapshot] = useState(() => adapter.getExecutionSnapshot())
  const [status, setStatus] = useState('这是你保存的作品，只读回放；要改积木请进入作品编辑模式。')

  useEffect(() => {
    const unsubscribe = adapter.subscribe(() => setSnapshot(adapter.getExecutionSnapshot()))
    return () => {
      unsubscribe()
      adapter.stop()
    }
  }, [adapter])

  const envelope = useMemo(
    () => ({ version: 1 as const, kind: 'project' as const, lessonId, program: blocks }),
    [lessonId, blocks],
  )

  const replay = useCallback(() => {
    setStatus('正在回放作品…')
    adapter.runProgram(envelope, (event) => {
      if (event.kind !== 'finished') return
      const next = adapter.getExecutionSnapshot()
      setStatus(
        next.executionState === 'success'
          ? '回放完成。要改积木，请点“继续编辑作品”。'
          : `这次没能跑完：${next.failureReason ?? '请进入作品编辑模式检查积木。'}`,
      )
    })
  }, [adapter, envelope])

  // 首次挂载自动回放一次；完成页“回看我的作品”会重挂本组件，从而再次回放。
  // 放到下一个任务执行：回放会同步更新状态与舞台订阅，不在 effect 体内级联渲染。
  useEffect(() => {
    const timer = setTimeout(replay, 0)
    return () => clearTimeout(timer)
  }, [replay])

  return (
    <div data-testid="project-work-replay">
      <PlayableStage
        blocks={blocks}
        externalState={launchExternalState(snapshot)}
        onExternalCharacterClick={() => adapter.clickCharacter()}
        onRunSuccess={() => {}}
        requiredBlocks={[]}
        runControls="external"
        stepIndex={0}
        successMessage="回放完成。要改积木，请点“继续编辑作品”。"
        template={template}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button
          className="kc-action-surface kc-btn-outline min-h-11"
          data-testid="project-replay-again"
          onClick={replay}
          type="button"
        >
          ▶ 再回放一次
        </button>
        <p className="text-sm leading-6 text-slate-600" role="status">
          {status}
        </p>
      </div>
    </div>
  )
}
