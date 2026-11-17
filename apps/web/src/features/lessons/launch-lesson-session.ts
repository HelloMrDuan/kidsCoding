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
import { useCallback, useEffect, useRef, useState } from 'react'
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
  | 'navigate-failed'

/**
 * retryCloudSync 的结果（OPS-046 F1）：此前 retryCloudSync 返回 void，
 * 云端同步成功但跳转失败时只复位守卫便静默返回——失败横幅已消失、
 * 页面没跳走、孩子没有任何提示或恢复入口。现在每种结果都有名有姓：
 * - 'completed'：同步成功且已发起跳转（到达核验见 navigationFailed）；
 * - 'cloud-failed'：同步仍失败，cloudSyncState 保持 'failed'，可再重试；
 * - 'navigate-failed'：同步已成功、本机与云端状态都成立，但跳转失败；
 *   navigationFailed 同时置 true，调用方显示横幅与备用入口。绝不回滚
 *   已保存的进度、奖励或已同步的云端状态，也绝不重复同步/发奖。
 * - 'not-pending'：没有待同步进度（未失败过或已被处理），无事发生；
 * - 'already-completing'：已有完成/重试正在进行，本次不改任何状态。
 */
export type LaunchLessonRetryOutcome =
  | 'completed'
  | 'cloud-failed'
  | 'navigate-failed'
  | 'not-pending'
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
   * 导航失败状态（OPS-046 F1）：跳转同步抛错，或跳转后宽限窗口内
   * 地址仍未到达完成页（到达核验）时为 true。调用方据此显示横幅，
   * 并用 completePath 渲染整页跳转的备用入口（<a href>，不依赖
   * 客户端路由器，路由器坏掉时也能打开完成页）。
   */
  navigationFailed: boolean
  /** 完成页路径（默认跳转目标），供调用方渲染备用导航入口。 */
  completePath: string
  /**
   * 完成整课：发奖励 → 算新进度 → 写本机 → 云端同步 → 清草稿 → 跳转。
   * 返回 outcome 供调用方决定反馈文案（OPS-046：每一种 outcome
   * 都必须有可见反馈，不得静默无响应）：
   * - 'completed'：已跳转；
   * - 'local-save-failed'：本机写失败，奖励与进度未保存，未跳转；
   * - 'cloud-failed'：本机已保存、云端未同步，cloudSyncState 为 'failed'，
   *   未跳转，等待调用方展示重试 / 仅用本机继续。
   * - 'already-completing'：已有一次完成正在进行，本次调用不改任何
   *   状态；调用方须给可见提示（新路由显示“正在完成中”；旧路由保
   *   持原有行为，即不额外提示）。
   * - 'navigate-failed'：本机已保存、云端已同步，但清草稿后的跳转
   *   失败，未跳转；调用方须给可见提示（进度已保存，刷新后查看）。
   */
  completeLesson: (args: {
    blocks: ProgramBlock[]
    lesson: LaunchLessonDefinition
    lessons: LaunchLessonDefinition[]
  }) => Promise<LaunchLessonCompletionOutcome>
  /**
   * 重试云端同步（仅当上次同步失败、仍有待同步进度时有效）。
   * 返回 LaunchLessonRetryOutcome：同步成功后的跳转失败会明确返回
   * 'navigate-failed' 并置 navigationFailed，绝不静默返回。
   */
  retryCloudSync: () => Promise<LaunchLessonRetryOutcome>
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
  const [navigationFailed, setNavigationFailed] = useState(false)
  const completePath = `/project/${lessonId}/complete`
  const pendingProgressRef = useRef<ReturnType<typeof readGuestProgress> | null>(null)
  const navCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (navCheckTimerRef.current) {
        clearTimeout(navCheckTimerRef.current)
        navCheckTimerRef.current = null
      }
    }
  }, [])
  // OPS-046：完成守卫必须是 ref。isCompleting 是 state，同一渲染
  // 周期内的两次调用会读到同一个旧值，双击会并发执行两次完成流程
  // （奖励虽由 completeLaunchLesson 幂等兜底，但仍会重复写进度与
  // 重复跳转）。ref 在调用入口同步置位，杜绝竞态。
  const completingRef = useRef(false)

  const navigateToComplete = useCallback(() => {
    if (onNavigateToComplete) {
      onNavigateToComplete()
      return
    }
    router.push(completePath)
  }, [completePath, onNavigateToComplete, router])

  /**
   * 导航到达核验（OPS-046 F1）：Next.js App Router 的 router.push()
   * 返回 void，不是导航完成的 Promise——try/catch 只能抓到同步抛错，
   * 抓不到“调用没报错但页面没跳过去”。因此发起跳转后留一个宽限
   * 窗口：到期时组件仍挂载且地址仍不是完成页，即判定导航失败并置
   * navigationFailed，调用方显示横幅与整页跳转备用入口。跳转成功
   * 时页面卸载，定时器随 cleanup 取消，不会误报。调用方提供自定义
   * 跳转（onNavigateToComplete）时目标路径不可知，只做同步抛错检测。
   */
  const scheduleNavigationArrivalCheck = useCallback(() => {
    if (onNavigateToComplete) {
      return
    }
    if (navCheckTimerRef.current) {
      clearTimeout(navCheckTimerRef.current)
    }
    navCheckTimerRef.current = setTimeout(() => {
      navCheckTimerRef.current = null
      if (!mountedRef.current) {
        return
      }
      if (window.location.pathname !== completePath) {
        setNavigationFailed(true)
      }
    }, 3000)
  }, [completePath, onNavigateToComplete])

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
      // 同步守卫：同一时刻至多一次完成流程。
      if (completingRef.current) {
        return 'already-completing'
      }
      completingRef.current = true
      setIsCompleting(true)
      setNavigationFailed(false)

      // 阶段一：算奖励与新进度并写本机。任一步抛错（例如损坏的进度键、
      // 存储已满）都按本机保存失败返回，奖励与进度未保存，未跳转。
      let nextProgress: ReturnType<typeof readGuestProgress>
      try {
        const progress = readGuestProgress()
        const reward = awardLessonCompletion({
          lessonId: lesson.id,
          rewardCardId: lesson.rewardCardId,
          isFirstProject: progress.completedProjectIds.length === 0,
          streakDays: progress.streakDays,
        })
        nextProgress = completeLaunchLesson({
          blocks,
          lesson,
          lessons,
          progress,
          reward,
          updatedAt: new Date().toISOString(),
        })
        writeGuestProgress(nextProgress)
      } catch {
        completingRef.current = false
        setIsCompleting(false)
        return 'local-save-failed'
      }

      // 阶段二：云端同步（带超时，见 syncGuestSnapshot）。同步是与本机
      // 保存分开的第二重事实：失败必须保持 failed 可见、可重试，永不
      // 显示成功；本机保存已是真实的。
      setCloudSyncState('syncing')
      let syncResult: Awaited<ReturnType<typeof syncGuestSnapshot>>
      try {
        syncResult = await syncGuestSnapshot({
          onboarding: readOnboardingSession(),
          progress: nextProgress,
        })
      } catch {
        syncResult = { ok: false, synced: false }
      }
      if (!syncResult.ok) {
        pendingProgressRef.current = nextProgress
        setCloudSyncState('failed')
        completingRef.current = false
        setIsCompleting(false)
        return 'cloud-failed'
      }
      setCloudSyncState(syncResult.synced ? 'synced' : 'local-only')
      pendingProgressRef.current = null

      // 阶段三：清草稿并跳转。清草稿是 best-effort（失败也不阻塞跳转，
      // 进度已保存）；跳转失败则明确返回 'navigate-failed'，调用方给
      // 出可见提示，绝不静默。
      try {
        onClearDrafts()
      } catch {
        // 草稿残留不影响已保存的进度与奖励；下次打开课程时仍可清理。
      }
      try {
        navigateToComplete()
      } catch {
        setNavigationFailed(true)
        completingRef.current = false
        setIsCompleting(false)
        return 'navigate-failed'
      }
      scheduleNavigationArrivalCheck()
      completingRef.current = false
      setIsCompleting(false)
      return 'completed'
    },
    [navigateToComplete, onClearDrafts, scheduleNavigationArrivalCheck],
  )

  const retryCloudSync = useCallback(async (): Promise<LaunchLessonRetryOutcome> => {
    const pending = pendingProgressRef.current
    if (!pending) {
      return 'not-pending'
    }
    if (completingRef.current) {
      return 'already-completing'
    }
    completingRef.current = true
    setIsCompleting(true)
    setNavigationFailed(false)
    setCloudSyncState('syncing')

    let syncResult: Awaited<ReturnType<typeof syncGuestSnapshot>>
    try {
      syncResult = await syncGuestSnapshot({
        onboarding: readOnboardingSession(),
        progress: pending,
      })
    } catch {
      syncResult = { ok: false, synced: false }
    }
    if (!syncResult.ok) {
      setCloudSyncState('failed')
      completingRef.current = false
      setIsCompleting(false)
      return 'cloud-failed'
    }

    // 同步已成功：这是既成事实。此后无论跳转成败，都不得把状态改回
    // failed、不得回滚本机进度/奖励、不得保留待同步进度去重复同步。
    setCloudSyncState(syncResult.synced ? 'synced' : 'local-only')
    pendingProgressRef.current = null
    try {
      onClearDrafts()
    } catch {
      // 同上：清草稿失败不阻塞跳转。
    }
    try {
      navigateToComplete()
    } catch {
      // OPS-046 F1：此前这里只复位守卫便静默返回，横幅已消失、页面
      // 没跳走，孩子没有任何提示或恢复入口。现在明确返回
      // 'navigate-failed' 并置 navigationFailed：调用方显示横幅，
      // 并提供用 completePath 整页打开完成页的备用入口。
      setNavigationFailed(true)
      completingRef.current = false
      setIsCompleting(false)
      return 'navigate-failed'
    }
    // router.push() 不返回导航 Promise：没抛错不等于已到达。挂上
    // 到达核验，宽限期内没到达完成页同样置 navigationFailed。
    scheduleNavigationArrivalCheck()
    completingRef.current = false
    setIsCompleting(false)
    return 'completed'
  }, [navigateToComplete, onClearDrafts, scheduleNavigationArrivalCheck])

  const continueLocalOnly = useCallback(() => {
    // Explicit choice: the local save is real, the cloud copy is missing,
    // and the next lesson completion re-syncs the full snapshot.
    // OPS-046：清草稿与跳转均不得抛错到调用方（按钮点击无处承接
    // 异常）；清草稿失败是 best-effort，跳转失败时保留 failed 横幅，
    // 用户仍可重试同步或再次点击仅用本机继续。
    pendingProgressRef.current = null
    try {
      onClearDrafts()
    } catch {
      // 草稿残留不影响已保存的进度。
    }
    try {
      navigateToComplete()
    } catch {
      // 跳转失败：不改 cloudSyncState，failed 横幅与重试入口仍在；
      // 同时置 navigationFailed，备用入口横幅一并出现。
      setNavigationFailed(true)
    }
  }, [navigateToComplete, onClearDrafts])

  return {
    cloudSyncState,
    isCompleting,
    navigationFailed,
    completePath,
    completeLesson,
    retryCloudSync,
    continueLocalOnly,
  }
}
