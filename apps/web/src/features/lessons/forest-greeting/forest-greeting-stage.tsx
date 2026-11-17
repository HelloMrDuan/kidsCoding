/**
 * lesson-02-forest-greeting 舞台插槽（GreetingStageSlot）：课程自有 StageSlot。
 *
 * 只做一件事：把课程会话状态与运行适配器的执行快照交给 PlayableStage
 * （external 模式）。舞台不跑自己的执行器、不产生第二份运行状态与判定：
 * - 执行快照经路由 context 取自 GreetingRunAdapter（getExecutionSnapshot，
 *   含逐块动作日志数组——外壳的标量 stageState 装不下数组）。
 * - 当前关程序、错误实验的观察与回答、预测回答经会话 store 读取；
 *   回答与“再摆一次错误程序”经 store 写回（编辑插槽采纳 store 的草稿
 *   变更并重建画布）。
 * - PlayableStage 的 onRunSuccess / onRunClear / onRunFailure 传空函数：
 *   external 模式永不回调它们（适配器经外壳上报判定）；旧路由的内部
 *   模式不受影响。
 * - key 按关重挂：切关时舞台内部状态（预测、attempt）全新开始。
 * - 跨关隔离（防上一关 success 快照泄漏）：编辑插槽 goToStep 切关时
 *   同步复位运行适配器；本插槽再兜底一次——stepIndex 在挂载后发生变化
 *   时（如一键导入旧草稿直接落到别的关）复位适配器。挂载本身不复位
 *   （不扰动已就绪的快照），运行期间 stepIndex 不变也不会触发。
 */
'use client'

import { useEffect, useRef } from 'react'

import { getMistakeStep } from '@/content/curriculum/mistake-steps'
import { getPracticeStep } from '@/content/curriculum/practice-steps'
import { launchTemplates } from '@/content/curriculum/launch-lessons'
import { getStepJudgeOptions } from '@/features/lessons/blockly/step-judge-options'
import { PlayableStage } from '@/features/lessons/playable-stage/playable-stage'
import type { StageSlotProps } from '@/features/lessons/workspace/workspace-slots'

import { GREETING_LESSON_ID, GREETING_SOURCE_LESSON, GREETING_STEPS } from './forest-greeting-contract'
import { greetingStarterProgram, type GreetingStepId } from './forest-greeting-draft'
import { useGreetingSession, useGreetingSessionState } from './forest-greeting-session'

export function GreetingStageSlot({ lessonId }: StageSlotProps) {
  const { store, runAdapter } = useGreetingSession()
  const sessionState = useGreetingSessionState()
  const draft = sessionState.draft
  const step = GREETING_STEPS[Math.min(draft.stepIndex, GREETING_STEPS.length - 1)]
  const stepId = step.id
  const blocks = draft.programs[stepId] ?? greetingStarterProgram(stepId as GreetingStepId)
  const template = launchTemplates.find(
    (item) => item.id === GREETING_SOURCE_LESSON?.templateId,
  )
  const mistakeStep = getMistakeStep(GREETING_LESSON_ID, stepId)
  const practiceStep = getPracticeStep(GREETING_LESSON_ID, stepId)

  // 跨关隔离兜底：stepIndex 在挂载后变化时复位运行状态（见文件头说明）。
  const mountedStepRef = useRef<number | null>(null)
  useEffect(() => {
    if (mountedStepRef.current === null) {
      mountedStepRef.current = draft.stepIndex
      return
    }
    if (mountedStepRef.current !== draft.stepIndex) {
      mountedStepRef.current = draft.stepIndex
      runAdapter.reset()
    }
  }, [runAdapter, draft.stepIndex])

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
    <div data-testid="forest-greeting-stage">
      <PlayableStage
        key={`${lessonId}:${draft.stepIndex}`}
        blocks={blocks}
        template={template}
        requiredBlocks={step.requiredBlockTypes}
        stepIndex={draft.stepIndex}
        judgeOptions={getStepJudgeOptions(GREETING_LESSON_ID, stepId)}
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
