/**
 * lesson-01-forest-hello 舞台插槽（ForestStageSlot）：课程自有 StageSlot。
 *
 * 只做一件事：把课程会话状态与运行适配器的执行快照交给 PlayableStage
 * （external 模式）。舞台不跑自己的执行器、不产生第二份运行状态与判定：
 * - 执行快照经路由 context 取自 ForestRunAdapter（getExecutionSnapshot，
 *   含逐块动作日志数组——外壳的标量 stageState 装不下数组）。
 * - 当前关程序、错误实验的观察与回答、预测回答经会话 store 读取；
 *   回答与“再摆一次错误程序”经 store 写回（编辑插槽采纳 store 的草稿
 *   变更并重建画布）。
 * - PlayableStage 的 onRunSuccess / onRunClear / onRunFailure 传空函数：
 *   external 模式永不回调它们（适配器经外壳上报判定）；旧路由的内部
 *   模式不受影响。
 * - key 按关重挂：切关时舞台内部状态（预测、attempt）全新开始。
 */
'use client'

import { useEffect } from 'react'

import { getMistakeStep } from '@/content/curriculum/mistake-steps'
import { getPracticeStep } from '@/content/curriculum/practice-steps'
import { launchTemplates } from '@/content/curriculum/launch-lessons'
import { getStepJudgeOptions } from '@/features/lessons/blockly/step-judge-options'
import { PlayableStage } from '@/features/lessons/playable-stage/playable-stage'
import type { StageSlotProps } from '@/features/lessons/workspace/workspace-slots'

import { FOREST_LESSON_ID, FOREST_SOURCE_LESSON, FOREST_STEPS } from './forest-hello-contract'
import { forestStarterProgram, type ForestStepId } from './forest-hello-draft'
import { useForestSession, useForestSessionState } from './forest-hello-session'

export function ForestStageSlot({ lessonId, sceneActions }: StageSlotProps) {
  const { store, runAdapter } = useForestSession()
  const sessionState = useForestSessionState()
  const draft = sessionState.draft

  // OPS-045 纵深防御：切关时清理上一关的运行快照。主清理在插槽
  // goToStep（persist 之前同步执行，新关首帧即为 idle）；此处覆盖一切
  // 绕过 goToStep 的切关路径（例如旧草稿导入直接落在第 2 关之后）。
  // 挂载时亦执行一次（适配器本就是 idle，无副作用）；切关不可能打断
  // 正在播放的运行（过关门控要求本关先运行成功），故 reset 安全。
  useEffect(() => {
    runAdapter.reset()
  }, [runAdapter, draft.stepIndex])

  const step = FOREST_STEPS[Math.min(draft.stepIndex, FOREST_STEPS.length - 1)]
  const stepId = step.id
  const blocks = draft.programs[stepId] ?? forestStarterProgram(stepId as ForestStepId)
  const template = launchTemplates.find(
    (item) => item.id === FOREST_SOURCE_LESSON?.templateId,
  )
  const mistakeStep = getMistakeStep(FOREST_LESSON_ID, stepId)
  const practiceStep = getPracticeStep(FOREST_LESSON_ID, stepId)
  const snapshot = runAdapter.getExecutionSnapshot()

  function handleMistakeAnswer(choiceId: string) {
    store.setState({
      mistakeAnswers: { ...sessionState.mistakeAnswers, [stepId]: choiceId },
    })
  }

  function handlePracticeAnswer(choiceId: string) {
    store.setState({
      practiceAnswers: { ...sessionState.practiceAnswers, [stepId]: choiceId },
    })
  }

  function handleReloadMistake() {
    if (!mistakeStep) return
    // 只重铺错误程序：观察标记不动（已观察后重跑同一错误程序即为真实失败，
    // 与旧课堂一致；旧路由的 handleReloadMistake 同样不重置 observed）。
    const wrong = mistakeStep.wrongProgram.map((block) => ({ ...block }))
    const next = {
      ...draft,
      programs: { ...draft.programs, [stepId]: wrong },
    }
    store.setState({ draft: next })
  }

  return (
    <div data-testid="forest-hello-stage">
      <PlayableStage
        key={`${lessonId}:${draft.stepIndex}`}
        blocks={blocks}
        template={template}
        requiredBlocks={step.requiredBlockTypes}
        stepIndex={draft.stepIndex}
        judgeOptions={getStepJudgeOptions(FOREST_LESSON_ID, stepId)}
        onRunSuccess={() => {}}
        onRunClear={() => {}}
        onRunFailure={() => {}}
        mistake={mistakeStep}
        mistakeObserved={sessionState.observed.includes(stepId)}
        mistakeAnswer={sessionState.mistakeAnswers[stepId] ?? null}
        onMistakeAnswer={handleMistakeAnswer}
        onReloadMistake={mistakeStep ? handleReloadMistake : undefined}
        practice={practiceStep}
        practiceAnswer={sessionState.practiceAnswers[stepId] ?? null}
        onPracticeAnswer={handlePracticeAnswer}
        runControls="external"
        sceneActions={sceneActions}
        externalState={{
          executionState: snapshot.executionState,
          characterPosition: snapshot.foxPosition,
          message: snapshot.message ?? '',
          actionLog: snapshot.actionLog,
          frameIndex: snapshot.frameIndex,
          designedMistake: snapshot.designedMistake,
        }}
      />
    </div>
  )
}
