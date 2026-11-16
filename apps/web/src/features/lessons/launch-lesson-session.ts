/**
 * 共享 launch 课堂会话逻辑（OPS-041 从旧路由抽取，旧路由与新路由共用）。
 *
 * 抽取范围（只抽与课无关的通用部分，行为一字不变）：
 * 1. `launchStepGate`：过关门控纯函数——旧路由 `handleNext` 的门控序列
 *    （错误实验观察 → 回答 → 预测回答 → 程序正确且已运行成功 → 失败计
 *    数与解释 → 练习回答）。只覆盖单角色课 01–09 的路径；双人课
 *    （10–12）的 duo 分支留在旧路由内，不进本模块。
 * 2. `useLaunchLessonCompletion`：完成流程 hook——奖励 + 本机进度 +
 *    云端同步 + 重试 / 仅用本机继续 + 跳转。云端同步是与本机保存分开
 *    的第二重事实：同步失败必须保持 failed 可见、可重试，永不显示成功。
 *
 * 刻意不抽的部分（新旧两路由草稿模型不同，强行统一风险高于收益）：
 * 步骤恢复、按步草稿读写、失败计数状态、问答状态——旧路由用按步
 * sessionStorage（`kc-lesson-draft:{lessonId}:{step}`），新路由用
 * LessonWorkspace 单键（`kidscoding-draft:{lessonId}`）。完成时清草稿
 * 的差异由调用方以 `onClearDrafts` 传入：旧路由清按步草稿
 * （`clearLessonDraftsForLesson`），新路由清新单键。
 */
import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import type { MistakeStepDesign } from '@/content/curriculum/mistake-steps'
import type { PracticeStepDesign } from '@/content/curriculum/practice-steps'
import { isPracticeAnswered } from '@/content/curriculum/practice-steps'
import type { LaunchLessonDefinition } from '@/features/domain/types'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { completeLaunchLesson } from '@/features/lessons/complete-launch-lesson'
import type { LessonCloudSyncState } from '@/features/lessons/guided-lesson-shell'
import { readOnboardingSession } from '@/features/onboarding/onboarding-session'
import { readGuestProgress, writeGuestProgress } from '@/features/progress/local-progress'
import { syncGuestSnapshot } from '@/features/progress/sync-guest-snapshot'
import { awardLessonCompletion } from '@/features/rewards/award-lesson-completion'

/* ------------------------------------------------------------------ */
/* 过关门控（纯函数）                                                   */
/* ------------------------------------------------------------------ */

export type LaunchStepGateInput = {
  /** 设计错误实验（本关有错误实验时传 mistake-steps.ts 的条目）。 */
  mistakeStep?: MistakeStepDesign | null
  /** 是否已在舞台上观察过设计错误实验的运行。 */
  mistakeObserved: boolean
  /** 错误实验的回答（选项 id，未回答为 null）。 */
  mistakeAnswer: string | null
  /** 第二练习（本关是第二练习时传 practice-steps.ts 的条目）。 */
  practiceStep?: PracticeStepDesign | null
  /** 练习的回答（选项 id，未回答为 null）。 */
  practiceAnswer: string | null
  /** 本关是否要求先运行成功（单角色课 01–09 为 true）。 */
  needsRun: boolean
  /** 程序是否正确（evaluateStep / 课程判定）。 */
  correct: boolean
  /** 是否已有一次成功的运行。 */
  hasRunSuccess: boolean
  /** 运行按钮在文案里的称呼（默认“运行按钮”）。 */
  runButtonLabel?: string
  /**
   * “程序正确但未运行”门的专属文案（不传则用通用文案）。旧路由的点击课
   * （when_clicked）用“请先在舞台启动程序，再亲自点击蝴蝶……”——
   * 不可被通用文案覆盖。
   */
  needsRunFeedback?: string
  /** 主角称呼（错误实验未观察时的文案用，默认“小狐狸”）。 */
  mainCharacterLabel?: string
  /** 失败时的解释文案（调用方用 explainRunFailure 算好传入）。 */
  failureFeedback?: string
  /**
   * 本次失败是否已被计过一次（TQ-008 去重：同一程序的失败运行已在
   * handleRunFailure 里计过 tier，点“完成这一关”时不再重复计数）。
   * 为 true 时门控仍返回 blocked，但 countFailedAttempt 为 false；
   * 调用方在消费后须把自己的去重 ref 清掉（见旧路由）。
   */
  alreadyCounted?: boolean
}

export type LaunchStepGateResult =
  | { outcome: 'blocked'; feedback: string; countFailedAttempt: boolean }
  | { outcome: 'pass' }

/**
 * 旧路由 handleNext 的门控序列（单角色课路径），逐字保留文案与顺序：
 * 1. 错误实验未观察 → 先运行看看；
 * 2. 错误实验未答对 → 先回答问题；
 * 3. 预测未回答 → 先猜一猜；
 * 4. 程序正确但未运行成功 → 先运行观察；
 * 5. 程序不正确 → 失败计数（除非已计过）+ 解释文案；
 * 6. 练习未答对 → 先回答问题；
 * 7. 全部通过 → pass。
 */
export function launchStepGate(input: LaunchStepGateInput): LaunchStepGateResult {
  const runButton = input.runButtonLabel ?? '运行按钮'
  const character = input.mainCharacterLabel ?? '小狐狸'
  if (input.mistakeStep && !input.mistakeObserved) {
    return {
      outcome: 'blocked',
      feedback: `先按舞台上的${runButton}，看看摆好的这段程序会让${character}怎样，再来修好它。`,
      countFailedAttempt: false,
    }
  }
  if (
    input.mistakeStep &&
    !input.mistakeStep.choices.some(
      (choice) => choice.id === input.mistakeAnswer && choice.correct,
    )
  ) {
    return {
      outcome: 'blocked',
      feedback: `先回答舞台上的问题：${input.mistakeStep.question}`,
      countFailedAttempt: false,
    }
  }
  if (input.practiceStep?.mode === 'predict' && !input.practiceAnswer) {
    return {
      outcome: 'blocked',
      feedback: `先在舞台上猜一猜：${input.practiceStep.question}`,
      countFailedAttempt: false,
    }
  }
  if (input.needsRun && input.correct && !input.hasRunSuccess) {
    return {
      outcome: 'blocked',
      feedback:
        input.needsRunFeedback ??
        '积木拼好了，请先点击舞台上的“运行”按钮观察结果，再完成这一关。',
      countFailedAttempt: false,
    }
  }
  if (!input.correct) {
    return {
      outcome: 'blocked',
      feedback: input.failureFeedback ?? '再试一次。',
      countFailedAttempt: !input.alreadyCounted,
    }
  }
  if (input.practiceStep && !isPracticeAnswered(input.practiceStep, input.practiceAnswer)) {
    return {
      outcome: 'blocked',
      feedback: `先回答舞台上的问题：${input.practiceStep.question}`,
      countFailedAttempt: false,
    }
  }
  return { outcome: 'pass' }
}

/* ------------------------------------------------------------------ */
/* 完成流程 hook                                                        */
/* ------------------------------------------------------------------ */

export type LaunchLessonCompletionOutcome =
  | 'completed'
  | 'local-save-failed'
  | 'cloud-failed'
  | 'already-completing'

export type UseLaunchLessonCompletionInput = {
  lessonId: string
  /**
   * 完成时清草稿（调用方按自己的草稿模型实现）：
   * 旧路由：clearLessonDraftsForLesson(lessonId)（按步 sessionStorage）；
   * 新路由：清 LessonWorkspace 单键 kidscoding-draft:{lessonId}。
   */
  onClearDrafts: () => void
  /** 跳转目标（默认 `/project/{lessonId}/complete`）。 */
  onNavigateToComplete?: () => void
}

export type UseLaunchLessonCompletion = {
  cloudSyncState: LessonCloudSyncState
  isCompleting: boolean
  /**
   * 完成整课：发奖励 → 算新进度 → 写本机 → 云端同步 → 清草稿 → 跳转。
   * 返回 outcome 供调用方决定反馈文案：
   * - 'completed'：已跳转；
   * - 'local-save-failed'：本机写失败，奖励与进度未保存，未跳转；
   * - 'cloud-failed'：本机已保存、云端未同步，cloudSyncState 为 'failed'，
   *   未跳转，等待调用方展示重试 / 仅用本机继续。
   * - 'already-completing'：已有一次完成正在进行，本次调用静默忽略
   *   （旧路由行为：直接 return，不改任何状态、不报失败）。
   */
  completeLesson: (args: {
    blocks: ProgramBlock[]
    lesson: LaunchLessonDefinition
    lessons: LaunchLessonDefinition[]
  }) => Promise<LaunchLessonCompletionOutcome>
  /** 重试云端同步（仅当上次同步失败、仍有待同步进度时有效）。 */
  retryCloudSync: () => Promise<void>
  /** 明确选择仅用本机继续：丢弃待同步进度，清草稿并跳转。 */
  continueLocalOnly: () => void
}

export function useLaunchLessonCompletion({
  lessonId,
  onClearDrafts,
  onNavigateToComplete,
}: UseLaunchLessonCompletionInput): UseLaunchLessonCompletion {
  const router = useRouter()
  const [cloudSyncState, setCloudSyncState] = useState<LessonCloudSyncState>('idle')
  const [isCompleting, setIsCompleting] = useState(false)
  const pendingProgressRef = useRef<ReturnType<typeof readGuestProgress> | null>(null)

  const navigateToComplete = useCallback(() => {
    if (onNavigateToComplete) {
      onNavigateToComplete()
      return
    }
    router.push(`/project/${lessonId}/complete`)
  }, [lessonId, onNavigateToComplete, router])

  const completeLesson = useCallback(
    async ({
      blocks,
      lesson,
      lessons,
    }: {
      blocks: ProgramBlock[]
      lesson: LaunchLessonDefinition
      lessons: LaunchLessonDefinition[]
    }): Promise<LaunchLessonCompletionOutcome> => {
      const progress = readGuestProgress()
      const reward = awardLessonCompletion({
        lessonId: lesson.id,
        rewardCardId: lesson.rewardCardId,
        isFirstProject: progress.completedProjectIds.length === 0,
        streakDays: progress.streakDays,
      })
      const nextProgress = completeLaunchLesson({
        blocks,
        lesson,
        lessons,
        progress,
        reward,
        updatedAt: new Date().toISOString(),
      })

      if (isCompleting) {
        return 'already-completing'
      }
      setIsCompleting(true)

      try {
        writeGuestProgress(nextProgress)
      } catch {
        setIsCompleting(false)
        return 'local-save-failed'
      }

      // Cloud sync is a separate truth from the local save: a failed sync
      // must stay visible as failed with a retry, never as success.
      setCloudSyncState('syncing')
      const syncResult = await syncGuestSnapshot({
        onboarding: readOnboardingSession(),
        progress: nextProgress,
      })
      if (!syncResult.ok) {
        pendingProgressRef.current = nextProgress
        setCloudSyncState('failed')
        setIsCompleting(false)
        return 'cloud-failed'
      }
      setCloudSyncState(syncResult.synced ? 'synced' : 'local-only')
      pendingProgressRef.current = null
      onClearDrafts()
      navigateToComplete()
      return 'completed'
    },
    [isCompleting, navigateToComplete, onClearDrafts],
  )

  const retryCloudSync = useCallback(async () => {
    const pending = pendingProgressRef.current
    if (!pending || isCompleting) {
      return
    }
    setIsCompleting(true)
    setCloudSyncState('syncing')

    const syncResult = await syncGuestSnapshot({
      onboarding: readOnboardingSession(),
      progress: pending,
    })
    if (!syncResult.ok) {
      setCloudSyncState('failed')
      setIsCompleting(false)
      return
    }

    setCloudSyncState(syncResult.synced ? 'synced' : 'local-only')
    pendingProgressRef.current = null
    onClearDrafts()
    navigateToComplete()
  }, [isCompleting, navigateToComplete, onClearDrafts])

  const continueLocalOnly = useCallback(() => {
    // Explicit choice: the local save is real, the cloud copy is missing,
    // and the next lesson completion re-syncs the full snapshot.
    pendingProgressRef.current = null
    onClearDrafts()
    navigateToComplete()
  }, [navigateToComplete, onClearDrafts])

  return { cloudSyncState, isCompleting, completeLesson, retryCloudSync, continueLocalOnly }
}
