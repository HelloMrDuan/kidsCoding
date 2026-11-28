/**
 * OPS-056：启蒙课 V3 编辑器插槽（LaunchEditorSlot，按课程 ID 参数化）。
 *
 * 与 OPS-041 ForestEditorSlot 同一结构与数据流，只把 lesson-01 的常量换成按 lessonId 取值，
 * 不另做设计、不为每节课复制工作台：
 * - 单实例 BlocklyWorkspace（docked），切关只按新关程序重建画布积木（rebuildLaunchProgram）。
 * - 编辑 → persist → onChange（外壳防抖自动保存、旧判定失效）；运行由外壳经 LaunchRunAdapter 完成，
 *   插槽观测 shell.judgment，对运行开始时那一关应用通过 / 失败 / observed 副作用。
 * - 完成本课走共享 useLaunchLessonCompletion（奖励 + 本机进度 + 云端同步 + 跳转）。
 * - 点击课（L07–L09）：门控文案按旧课堂“启动点击程序 + 亲自点击”传入。
 * - 双角色课（L10–L12）：预测（第 1 关）、错误实验（第 4 关）、复盘（第 5 关）按旧课堂 DuoStage
 *   的 ready 条件门控；外壳运行按钮是唯一运行入口，无法禁用，第 1 关未预测时在完成门控拦截并提示。
 * - 首次访问兼容导入：只读旧课堂 sessionStorage 按步草稿，不改旧键（launch-v3-legacy）；
 *   仅当认领戳与当前 owner 完全一致时才读内容，点击时重新校验 owner 与草稿为空，
 *   编辑 / 舞台写回 / 切关即撤销资格；lastGood 按 owner+lessonId 隔离。
 * - 对白下拉沿用 #554（OPS-047）applyGreetingLine 的有效功能（applyLaunchLine，按课参数化）。
 */
'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { getFoundationUnitByLessonId } from '@/content/curriculum/foundation-units'
import { launchLessons } from '@/content/curriculum/launch-lessons'
import { getMistakeStep } from '@/content/curriculum/mistake-steps'
import { asksClickPrediction, getPracticeStepFor } from '@/content/curriculum/practice-steps'
import { getKidsBlockLabel, motionVerbForTemplate } from '@/features/lessons/blockly/block-labels'
import { evaluateObservable } from '@/features/lessons/blockly/observable-run'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { explainRunFailure } from '@/features/lessons/blockly/run-feedback'
import { getSayLineChoices, getStepJudgeOptions } from '@/features/lessons/blockly/step-judge-options'
import { buildHintState } from '@/features/lessons/build-hint-state'
import { getFoundationLessonFeedback } from '@/features/lessons/foundation-lesson-feedback'
import { launchStepGate, useLaunchLessonCompletion } from '@/features/lessons/launch-lesson-session'
import { RemedialLinkCard } from '@/features/lessons/remedial-link-card'
import { getRemedialIdForLesson } from '@/features/lessons/remedial-routing'
import { isKnownOwner } from '@/features/lessons/legacy-draft-claim'
import { LessonDraftOwnerContext } from '@/features/lessons/lesson-draft-boundary'
import { scopedLessonDraftKey } from '@/features/lessons/scoped-draft-key'
import { getMainCharacterLabel } from '@/features/lessons/playable-stage/playable-stage'
import { BlocklyStudioMission, BlocklyStudioSteps } from '@/features/lessons/workspace/blockly-studio-layout'
import { draftKeyFor } from '@/features/lessons/workspace/lesson-contract'
import type { EditorSlotProps, JudgmentResult } from '@/features/lessons/workspace/workspace-slots'
import { readGuestProgress } from '@/features/progress/local-progress'

import {
  findLaunchWorkspace,
  launchSnapshot,
  moveLaunchBlock,
  rebuildLaunchProgram,
} from './launch-v3-blockly-ops'
import { buildLaunchHelp, launchV3IsClickLesson, launchV3Steps } from './launch-v3-contract'
import {
  coerceLaunchDraft,
  emptyLaunchDraft,
  isEmptyLaunchDraft,
  launchStarterProgram,
  type LaunchSlotData,
} from './launch-v3-draft'
import { judgeLaunchStep } from './launch-v3-judging'
import {
  hasLegacyLaunchDraft,
  hasUnclaimableLegacyLaunchDraft,
  importLegacyLaunchDraft,
  type LegacyLaunchImport,
} from './launch-v3-legacy'
import { getLaunchV3Lesson, getLaunchV3Template, launchV3DuoMode } from './launch-v3-lessons'
import { useLaunchSession, useLaunchSessionState } from './launch-v3-session'
import { launchDuoStepReady } from './launch-v3-stage'

/** 完成流程超过该时长仍未结束即显示慢提示（同 #554 / OPS-047 的 15 秒）。 */
export const LAUNCH_SLOW_COMPLETE_MS = 15000

/**
 * 会话内最近一次好草稿（复审 HOLD P0：owner 安全）。
 * - 键为 `${owner}|${lessonId}`：同一标签页里 A/B 账号切换，B 永远拿不到 A 的草稿；
 * - 身份未知时不缓存、不回显（fail-closed，回退为空草稿）；
 * - 写入某 owner 的条目时清掉其他 owner 的全部条目：owner 一变，旧 owner 的缓存即失效。
 */
const lastGoodLaunchDrafts = new Map<string, LaunchSlotData>()

function lastGoodKey(owner: string | null | undefined, lessonId: string): string | null {
  return isKnownOwner(owner) ? `${owner}|${lessonId}` : null
}

function readLastGoodLaunchDraft(owner: string | null | undefined, lessonId: string): LaunchSlotData | undefined {
  const key = lastGoodKey(owner, lessonId)
  return key ? lastGoodLaunchDrafts.get(key) : undefined
}

function writeLastGoodLaunchDraft(owner: string | null | undefined, lessonId: string, data: LaunchSlotData): void {
  const key = lastGoodKey(owner, lessonId)
  if (!key) return
  const ownerPrefix = `${owner}|`
  for (const existing of [...lastGoodLaunchDrafts.keys()]) {
    if (!existing.startsWith(ownerPrefix)) lastGoodLaunchDrafts.delete(existing)
  }
  lastGoodLaunchDrafts.set(key, data)
}

/** 仅单测用：复位模块级 lastGood。 */
export function resetLaunchSlotLastGoodForTest(): void {
  lastGoodLaunchDrafts.clear()
}

/** 仅单测用：读取某 owner 某课的 lastGood（验证 owner 隔离）。 */
export function readLaunchSlotLastGoodForTest(owner: string | null | undefined, lessonId: string) {
  return readLastGoodLaunchDraft(owner, lessonId)
}

const BlocklyWorkspace = dynamic(
  () => import('@/features/lessons/blockly/blockly-workspace').then((m) => m.BlocklyWorkspace),
  { ssr: false },
)

export function LaunchEditorSlot({ initial, onChange, editable, shell, onJudgment }: EditorSlotProps) {
  const draftOwner = useContext(LessonDraftOwnerContext)
  const { lessonId, store, runAdapter, revealAlerts } = useLaunchSession()
  const sessionState = useLaunchSessionState()
  const steps = useMemo(() => launchV3Steps(lessonId), [lessonId])
  const lesson = getLaunchV3Lesson(lessonId)
  const template = getLaunchV3Template(lessonId)
  const duoMode = launchV3DuoMode(lessonId)
  const clickLesson = launchV3IsClickLesson(lessonId)
  const characterLabel = getMainCharacterLabel(template)
  const help = useMemo(() => buildLaunchHelp(lessonId), [lessonId])

  const [draft, setDraft] = useState<LaunchSlotData>(() => coerceLaunchDraft(lessonId, initial))
  const draftRef = useRef(draft)
  draftRef.current = draft
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onJudgmentRef = useRef(onJudgment)
  onJudgmentRef.current = onJudgment
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [legacyImport, setLegacyImport] = useState<LegacyLaunchImport | null>(null)
  /**
   * 导入资格（复审 HOLD P0，同 grid/event 已验收模式）：挂载时提示出现即为 true；之后任何
   * 新数据写入（编辑、运行判定、舞台写回、切关）立即撤销且不可恢复。
   */
  const legacyEligibleRef = useRef(false)
  const draftOwnerRef = useRef(draftOwner)
  draftOwnerRef.current = draftOwner
  const revokeLegacyImport = useCallback(() => {
    if (!legacyEligibleRef.current) return
    legacyEligibleRef.current = false
    setLegacyImport(null)
  }, [])
  /** 同一标签页内身份切换（A→B）：挂载时为 A 给出的导入资格立即作废，不留给 B。 */
  const mountedOwnerRef = useRef(draftOwner)
  useEffect(() => {
    if (draftOwner !== mountedOwnerRef.current) revokeLegacyImport()
  }, [draftOwner, revokeLegacyImport])
  const runStepRef = useRef<number>(draft.stepIndex)
  const runAsyncRef = useRef(false)
  const appliedJudgmentRef = useRef<JudgmentResult | null>(null)
  const [runPassedStep, setRunPassedStep] = useState<number | null>(null)
  const countedRunFailureRef = useRef<string | null>(null)
  const router = useRouter()
  /**
   * 复审 HOLD P1：「刚完成的小结果」卡（对齐原课堂 handleNext 的 setFeedback）。
   * 过关后显示 practiceStep.done 或 progress 文案；切到新关后保留到下一次过关或离开本关时更新。
   */
  const [stepFeedback, setStepFeedback] = useState<string | null>(null)

  const {
    cloudSyncState,
    isCompleting,
    navigationFailed,
    completePath,
    completeLesson,
    retryCloudSync,
    continueLocalOnly,
  } = useLaunchLessonCompletion({
    lessonId,
    owner: draftOwner,
    onClearDrafts: () => {
      const empty = emptyLaunchDraft(lessonId)
      const owner = draftOwnerRef.current
      writeLastGoodLaunchDraft(owner, lessonId, empty)
      draftRef.current = empty
      setDraft(empty)
      store.setState({ draft: empty })
      onChangeRef.current(empty)
      // 复审 HOLD P0：只清当前 owner 的分键 V3 草稿（外壳 saveDraftToLocal 写的键）；
      // 无 owner 的历史键 `kidscoding-draft:<id>` 与旧课堂按步键一律不改、不删。
      if (typeof window !== 'undefined' && isKnownOwner(owner)) {
        try {
          window.localStorage.removeItem(scopedLessonDraftKey(owner, draftKeyFor(lessonId)))
        } catch {
          // 存储不可用：清草稿是 best-effort，不阻塞完成跳转。
        }
      }
    },
  })

  /**
   * 完成看门狗（复用 #554 / OPS-047 思路）：isCompleting 持续 15 秒未落下即显示慢提示，
   * 不让孩子对着一直转圈的按钮干等；完成结束或卸载时清理计时器。
   */
  const [slowComplete, setSlowComplete] = useState(false)
  useEffect(() => {
    if (!isCompleting) {
      setSlowComplete(false)
      return
    }
    const timer = setTimeout(() => setSlowComplete(true), LAUNCH_SLOW_COMPLETE_MS)
    return () => clearTimeout(timer)
  }, [isCompleting])

  /**
   * 复审 HOLD P1：手机端（1040px 以下按面板切换）提示都渲染在编程面板顶部。出现新提示时
   * 通知路由切到编程面板，避免孩子停在任务 / 舞台面板时看不到失败与重试操作。
   */
  const alertKey = [
    notice ?? '',
    legacyImport?.ok ? 'legacy' : '',
    cloudSyncState === 'failed' ? 'cloud' : '',
    navigationFailed ? 'navigation' : '',
    slowComplete && isCompleting ? 'slow' : '',
  ].join('|')
  const revealAlertsRef = useRef(revealAlerts)
  revealAlertsRef.current = revealAlerts
  useEffect(() => {
    if (alertKey.replace(/\|/g, '') !== '') revealAlertsRef.current?.()
  }, [alertKey])

  const safeIndex = Math.min(Math.max(draft.stepIndex, 0), Math.max(steps.length - 1, 0))
  /**
   * ux-201 裁定：挂载时恢复的草稿若已在第 2 关及以后，即为「回到上次进度」（同旧
   * guided-lesson-shell 的 resumedFromStep）；只取挂载那一刻，之后过关不再显示为续学。
   */
  const [resumedFromStep] = useState<number | null>(() => (draft.stepIndex > 0 ? draft.stepIndex : null))
  const progressPercent =
    steps.length > 0 ? Math.round(Math.min(100, Math.max(0, ((safeIndex + 1) / steps.length) * 100))) : 0
  const step = steps[safeIndex]
  const stepId = step?.id ?? ''
  const savedBlocks = draft.programs[stepId]
  const blocks: ProgramBlock[] = savedBlocks ?? launchStarterProgram(lessonId, stepId)
  const passedHere = draft.passed.includes(stepId)
  const mistakeStep = getMistakeStep(lessonId, stepId)
  const practiceStep = step ? getPracticeStepFor(lessonId, step) : undefined
  const judgment = shell?.judgment ?? null
  const running = shell?.running ?? false
  const firstLoose = blocks.findIndex((block) => block.disconnected)
  const chainLength = firstLoose === -1 ? blocks.length : firstLoose
  const isLastStep = safeIndex >= steps.length - 1

  /**
   * 复审 HOLD P1：卡住时的分级提示与 tier-3 补救入口（对齐原课堂 legacy-lesson-client 第 314–339 行）。
   * - 失败次数取本关 draft.failures（过关切关时归零）；
   * - 练习关在 tier 1–2 用本关专属 practiceStep.hint，否则用课程 hintLayers 的当前层；
   * - tier 3（offer_remedial）给出补救小节入口与单元微脚本。
   */
  // 复审 HOLD P1（对齐原课堂 TQ-011）：续学落在练习关或错误实验关时主搭建已完成，
  // 「刚完成的小结果」显示进度文案，而不是空着。
  const resumedAtFollowUp = draft.stepIndex > 0 && Boolean(practiceStep || mistakeStep)
  useEffect(() => {
    if (resumedAtFollowUp) setStepFeedback((current) => current ?? getFoundationLessonFeedback(lessonId, 'progress'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumedAtFollowUp])
  const hintState = buildHintState({ failedAttempts: draft.failures, hintLayers: lesson?.hintLayers ?? [] })
  const hintCopy =
    practiceStep && hintState.tier > 0 && hintState.tier < 3 ? practiceStep.hint : hintState.activeHint?.copy
  const remedialLessonId = hintState.showRemedialJump
    ? getRemedialIdForLesson(lessonId, hintState.activeHint?.remedialLessonId)
    : undefined
  const remedialMicroScript =
    draft.failures > 0 && hintState.showRemedialJump
      ? getFoundationUnitByLessonId(lessonId)?.remedialMicroScript
      : undefined

  function handleStartRemedial(remedialId: string) {
    router.push(`/learn/remedial/${remedialId}?from=${lessonId}&step=${stepId}`)
  }

  const persist = useCallback(
    (next: LaunchSlotData) => {
      // 任何新数据写入都撤销旧草稿导入资格（导入本身先撤销再 persist）。
      revokeLegacyImport()
      draftRef.current = next
      writeLastGoodLaunchDraft(draftOwnerRef.current, lessonId, next)
      setDraft(next)
      store.setState({ draft: next })
      onChangeRef.current(next)
    },
    [lessonId, store, revokeLegacyImport],
  )

  /** 挂载时一次性处理：外来课节拒绝回显、store 草稿镜像初始化、旧草稿导入提示。 */
  useEffect(() => {
    const raw = initial as { lessonId?: unknown } | null
    if (raw && typeof raw === 'object' && raw.lessonId !== undefined && raw.lessonId !== lessonId) {
      setNotice('导入文件属于其他课节，已拒绝，原作品未变。')
      const fallback = readLastGoodLaunchDraft(draftOwner, lessonId) ?? emptyLaunchDraft(lessonId)
      draftRef.current = fallback
      writeLastGoodLaunchDraft(draftOwner, lessonId, fallback)
      setDraft(fallback)
      store.setState({ draft: fallback })
      onChangeRef.current(fallback)
      const workspace = findLaunchWorkspace(containerRef.current)
      const fallbackStep = steps[fallback.stepIndex]
      if (workspace && fallbackStep) {
        rebuildLaunchProgram(lessonId, workspace, fallback.programs[fallbackStep.id] ?? [])
      }
      return
    }
    const coerced = coerceLaunchDraft(lessonId, initial)
    store.setState({ draft: coerced })
    if (isEmptyLaunchDraft(coerced)) {
      if (hasLegacyLaunchDraft(lessonId, draftOwner)) {
        // 归属已确认（认领戳与当前 owner 完全一致）：本课未完成时才提示导入；
        // 新版草稿非空时根本不进这里，绝不覆盖。
        let completed = false
        try {
          completed = readGuestProgress(draftOwner).completedLessonIds.includes(lessonId)
        } catch {
          completed = false
        }
        if (!completed) {
          const imported = importLegacyLaunchDraft(lessonId, draftOwner)
          if (imported.ok) {
            legacyEligibleRef.current = true
            setLegacyImport(imported)
          } else {
            setNotice(`旧课堂的草稿没能导入：${imported.reason}`)
          }
        }
      } else if (hasUnclaimableLegacyLaunchDraft(lessonId, draftOwner)) {
        // 本浏览器有旧草稿但无法确认属于当前账号：不读内容、不展示、不导入，旧键原样保留。
        setNotice('这台设备上有旧课堂留下的草稿，但无法确认属于当前账号，不能自动恢复；原草稿已原样保留。')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 采纳会话 store 的草稿变更（舞台“再摆一次错误程序”）；读 store 实时值，JSON 比较防循环。 */
  useEffect(() => {
    const storeDraft = store.getState().draft
    if (JSON.stringify(storeDraft) !== JSON.stringify(draftRef.current)) {
      // 舞台写回的新数据同样撤销旧草稿导入资格。
      revokeLegacyImport()
      draftRef.current = storeDraft
      writeLastGoodLaunchDraft(draftOwnerRef.current, lessonId, storeDraft)
      setDraft(storeDraft)
      onChangeRef.current(storeDraft)
    }
  }, [sessionState.draft, store, lessonId, revokeLegacyImport])

  const handleSnapshot = useCallback(
    (next: ProgramBlock[]) => {
      const current = draftRef.current
      const key = steps[Math.min(current.stepIndex, steps.length - 1)]?.id
      if (!key) return
      if (JSON.stringify(current.programs[key] ?? null) === JSON.stringify(next)) return
      setRunPassedStep(null)
      persist({ ...current, programs: { ...current.programs, [key]: next } })
    },
    [persist, steps],
  )

  /** 切关 / 外部改程序：按当前关程序重建画布积木（快照一致时跳过）。 */
  useEffect(() => {
    const workspace = findLaunchWorkspace(containerRef.current)
    if (!workspace || !stepId) return
    const target = savedBlocks ?? launchStarterProgram(lessonId, stepId)
    if (JSON.stringify(launchSnapshot(workspace)) === JSON.stringify(target)) return
    rebuildLaunchProgram(lessonId, workspace, target)
  }, [lessonId, stepId, savedBlocks])

  useEffect(() => {
    if (running) {
      runStepRef.current = draftRef.current.stepIndex
      runAsyncRef.current = true
    }
  }, [running])

  /** 判定到达：对运行开始时那一关应用通过 / 失败副作用（同一判定对象只应用一次）。 */
  useEffect(() => {
    if (!judgment) return
    const runStepIndex = runAsyncRef.current ? runStepRef.current : draftRef.current.stepIndex
    runAsyncRef.current = false
    if (appliedJudgmentRef.current === judgment) return
    appliedJudgmentRef.current = judgment
    const current = draftRef.current
    const runStep = steps[runStepIndex]
    if (!runStep) return
    const observedState = store.getState().observed
    const wasObserved = observedState.includes(runStep.id)
    const result = judgeLaunchStep(lessonId, current.programs[runStep.id] ?? [], runStepIndex, wasObserved)
    const needsObservation = Boolean(getMistakeStep(lessonId, runStep.id)) || (duoMode !== null && runStepIndex === 3)
    if (result.passed) {
      // 复审 HOLD P1：花园课先预测再运行（旧课堂未预测时运行按钮禁用）。V3 外壳运行按钮不可禁用，
      // 改为：未预测时的成功运行不计为本关通过，提示先猜再运行验证。
      if (asksClickPrediction(lessonId, runStep.id) && !store.getState().clickPredictions[runStep.id]) {
        if (current.stepIndex === runStepIndex) {
          setNotice('你先运行了程序。先在舞台上猜一猜：只启动、不点它，它会自己动吗？猜好后再运行一次验证。')
        }
        return
      }
      setRunPassedStep(runStepIndex)
      if (needsObservation && !wasObserved) {
        if (current.stepIndex === runStepIndex) {
          setNotice('程序成功了！不过这是错误实验：先按原样运行一次，看看错在哪，再来修。')
        }
        return
      }
      if (!current.passed.includes(runStep.id)) {
        persist({ ...current, passed: [...current.passed, runStep.id] })
        onJudgmentRef.current?.(judgment)
      }
    } else if (result.failure) {
      if (result.designedMistake) {
        if (!wasObserved) store.setState({ observed: [...observedState, runStep.id] })
        return
      }
      // 复审 HOLD P1：对齐原课堂 handleRunFailure——每次真实失败运行都计一次（不按程序去重），
      // 并记下这次程序，供完成门控 alreadyCounted 判断，避免「运行失败 + 点完成」重复计数。
      countedRunFailureRef.current = `${runStepIndex}|${JSON.stringify(current.programs[runStep.id] ?? [])}`
      persist({ ...current, failures: current.failures + 1 })
      onJudgmentRef.current?.(judgment)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [judgment])

  function goToStep(index: number) {
    const current = draftRef.current
    setNotice(null)
    // 切关属于新数据写入：撤销旧草稿导入资格（persist 内也会撤销，这里先收起提示）。
    revokeLegacyImport()
    setRunPassedStep(null)
    // OPS-045：切关前先清理上一关的运行快照与判定（persist 之前同步执行）。
    runAdapter.reset()
    // 复审 HOLD P1：对齐原课堂 handleNext——进入新关时失败计数归零、去重 ref 置空，
    // 提示分级从新关的第 0 层重新开始。
    countedRunFailureRef.current = null
    persist({ ...current, stepIndex: index, finished: false, failures: 0 })
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const workspace = findLaunchWorkspace(containerRef.current)
    if (!workspace) {
      setNotice('工作区还没准备好，稍后再试。')
      return
    }
    if (!moveLaunchBlock(workspace, index, direction)) {
      setNotice('这块积木不能再往这个方向移了。')
    }
  }

  async function handleRetryCloudSync() {
    const outcome = await retryCloudSync()
    if (outcome === 'navigate-failed') {
      setNotice('进度和奖励已经保存并同步好了，但打开完成页失败了。请用下面的按钮打开完成页。')
    }
  }

  async function handleComplete() {
    if (!step || !lesson) {
      setNotice('课程数据缺失，无法完成本课。')
      return
    }
    const current = draftRef.current
    const program = current.programs[stepId] ?? []
    const state = store.getState()
    const observedNow = state.observed.includes(stepId)
    const correct = judgeLaunchStep(lessonId, program, current.stepIndex, observedNow).passed
    if (asksClickPrediction(lessonId, stepId) && !state.clickPredictions[stepId]) {
      setNotice('先在舞台上猜一猜：只启动、不点它，它会自己动吗？选好再运行验证。')
      return
    }
    if (duoMode) {
      const prediction = state.duoPredictions[stepId] ?? null
      const reflection = state.duoReflections[stepId] ?? null
      if (current.stepIndex === 0 && prediction === null) {
        setNotice('先在舞台下方猜一猜：切换到小熊后，下一块会让谁行动？选好再运行。')
        return
      }
      if (current.stepIndex === 3 && !observedNow) {
        setNotice('先按舞台上的运行按钮，看看摆好的这段程序会让两位朋友怎样，再来修好它。')
        return
      }
      if (current.stepIndex === 4 && reflection !== 'own') {
        setNotice('先在舞台下方想一想：动作会交给谁？选出正确的复盘答案再完成。')
        return
      }
      if (!launchDuoStepReady(current.stepIndex, { prediction, observedMistake: observedNow, reflection })) return
    }
    const judgeOptions = getStepJudgeOptions(lessonId, stepId)
    const gate = launchStepGate({
      mistakeStep: mistakeStep ?? null,
      mistakeObserved: observedNow,
      mistakeAnswer: state.mistakeAnswers[stepId] ?? null,
      practiceStep: practiceStep ?? null,
      practiceAnswer: state.practiceAnswers[stepId] ?? null,
      needsRun: true,
      correct,
      hasRunSuccess: runPassedStep === current.stepIndex,
      runButtonLabel: step.requiredBlockTypes[0] === 'when_clicked' ? '「启动点击程序」' : '运行按钮',
      needsRunFeedback:
        step.requiredBlockTypes[0] === 'when_clicked'
          ? '请先在舞台启动程序，再亲自点击蝴蝶，观察事件触发的结果。'
          : undefined,
      mainCharacterLabel: characterLabel,
      failureFeedback: duoMode
        ? '请先运行并观察角色结果，完成本关的预测、错误实验或复盘。舞台会告诉你还缺什么。'
        : explainRunFailure(
            evaluateObservable(step.requiredBlockTypes, program, judgeOptions),
            characterLabel,
            motionVerbForTemplate(lesson.templateId),
          ) || getFoundationLessonFeedback(lessonId, 'retry'),
      alreadyCounted: countedRunFailureRef.current === `${current.stepIndex}|${JSON.stringify(program)}`,
    })
    if (gate.outcome === 'blocked') {
      if (gate.countFailedAttempt) {
        persist({ ...current, failures: current.failures + 1 })
      } else if (!correct) {
        countedRunFailureRef.current = null
      }
      setNotice(gate.feedback)
      return
    }
    if (!isLastStep) {
      goToStep(current.stepIndex + 1)
      // 复审 HOLD P1：恢复「刚完成的小结果」（原课堂 handleNext：practiceStep.done 或 progress 文案）。
      setStepFeedback(practiceStep ? practiceStep.done : getFoundationLessonFeedback(lessonId, 'progress'))
      setNotice(
        practiceStep
          ? `第 ${current.stepIndex + 1} 关已完成。${practiceStep.done}`
          : `第 ${current.stepIndex + 1} 关已完成，开始下一关吧！`,
      )
      return
    }
    let outcome: Awaited<ReturnType<typeof completeLesson>>
    try {
      outcome = await completeLesson({ blocks: program, lesson, lessons: launchLessons })
    } catch {
      setNotice('完成时遇到问题，请再点一次“完成本课”重试。')
      return
    }
    if (outcome === 'local-save-failed') {
      setNotice('本机存储失败，作品和奖励尚未保存。请检查浏览器存储空间后重试完成。')
    } else if (outcome === 'already-completing') {
      setNotice('正在完成本课，请稍等，不要重复点击。')
    } else if (outcome === 'navigate-failed') {
      setNotice('奖励和进度已保存到本机，但跳转到完成页失败。请刷新页面后在学习地图查看进度。')
    }
  }

  function handleImportLegacy() {
    if (!legacyImport || !legacyImport.ok) return
    const eligible = legacyEligibleRef.current
    // 先撤销资格并收起提示：无论成功与否，这次点击之后都不能再导入一次。
    legacyEligibleRef.current = false
    setLegacyImport(null)
    // 点击时重新校验（复审 HOLD P0）：资格仍在、当前草稿仍为空，并按当前身份与认领戳
    // 重新读取旧草稿——不使用挂载时缓存的数据。
    if (!eligible || !isEmptyLaunchDraft(draftRef.current)) {
      setNotice('你已经开始了新的作品，旧草稿不会覆盖它；原草稿已原样保留。')
      return
    }
    const fresh = importLegacyLaunchDraft(lessonId, draftOwnerRef.current)
    if (!fresh.ok) {
      setNotice('无法再确认旧草稿属于当前账号，没有导入；原草稿已原样保留。')
      return
    }
    setNotice(`已导入旧课堂的草稿（到第 ${fresh.fromStep + 1} 关），通过记录须重新运行才能恢复。`)
    persist(fresh.data)
    // 旧草稿可能改了当前关程序：按导入后的程序重建画布。
    const workspace = findLaunchWorkspace(containerRef.current)
    const importedStep = steps[fresh.data.stepIndex]
    if (workspace && importedStep) {
      rebuildLaunchProgram(lessonId, workspace, fresh.data.programs[importedStep.id] ?? [])
    }
  }

  function handleDismissLegacy() {
    legacyEligibleRef.current = false
    setLegacyImport(null)
  }

  if (!step || !lesson) {
    return <p data-testid="launch-v3-slot-missing">课程数据缺失，无法打开本课。</p>
  }

  if (!editable) {
    return (
      <div data-testid="launch-v3-slot-readonly">
        <p>本课为只读预览：{lesson.title}，共 {steps.length} 关。</p>
        <p>当前是第 {safeIndex + 1} 关：{step.title}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="kc-v3-slot-editor"
      data-testid="launch-v3-slot"
      data-lesson-id={lessonId}
      style={{ height: '100%', overflowY: 'auto' }}
    >
      <BlocklyStudioMission>
        <div data-testid="launch-v3-step-header" className="kc-v3-task">
          <p className="kc-v3-step-index" data-testid="launch-v3-step-progress">
            第 {safeIndex + 1} / {steps.length} 关{passedHere ? ' ✓' : ''}
          </p>
          {/* ux-201 裁定：恢复可访问进度语义（同旧 guided-lesson-shell 的 lesson-progress-bar），
              仅供辅助技术读取，不改变 V3 冻结视觉。 */}
          <div
            aria-label={`课堂进度：第 ${safeIndex + 1} 关，共 ${steps.length} 关`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progressPercent}
            className="sr-only"
            data-testid="lesson-progress-bar"
            role="progressbar"
          />
          <div className="kc-v3-task-copy">
            <h2 data-testid="launch-v3-step-title"><span className="sr-only">第 {safeIndex + 1} 关：</span>{step.title}</h2>
            <p data-testid="launch-v3-instruction">{step.instruction}</p>
          </div>
          <button
            type="button"
            data-testid="launch-v3-complete-step"
            disabled={isCompleting}
            onClick={() => void handleComplete()}
          >
            {isCompleting ? '正在完成…' : isLastStep ? '完成本课' : '完成这一关'}
          </button>
        </div>
        {resumedFromStep !== null ? (
          <p className="kc-text-muted px-4 pt-2 text-xs font-bold" data-testid="lesson-resume-note" role="status">
            已回到上次进度：第 {resumedFromStep + 1} 关
          </p>
        ) : null}
        {stepFeedback ? (
          <div className="kc-feedback kc-feedback-success" data-testid="lesson-feedback-card">
            <p className="kc-feedback-title">刚完成的小结果</p>
            <p className="mt-1" data-testid="lesson-feedback-preview">{stepFeedback}</p>
          </div>
        ) : null}
        {hintCopy ? (
          <div className="kc-hint" data-hint-tier={hintState.tier} data-testid="lesson-hint">
            卡住时提示：{hintCopy}
          </div>
        ) : null}
        {hintCopy && (remedialLessonId || remedialMicroScript) ? (
          <div className="mt-3">
            <RemedialLinkCard
              copy={hintCopy}
              onStartRemedial={handleStartRemedial}
              remedialLessonId={remedialLessonId}
              remedialMicroScript={remedialMicroScript}
            />
          </div>
        ) : null}
      </BlocklyStudioMission>

      <BlocklyStudioSteps>
        <div className="kc-v3-stepbar-pills" data-testid="launch-v3-stepbar">
          {steps.map((item, index) => (
            <Fragment key={item.id}>
              {index > 0 && <span className="kc-v3-step-line" aria-hidden="true" />}
              <span
                className={`kc-v3-step-pill${index < safeIndex ? ' is-complete' : index === safeIndex ? ' is-active' : ''}`}
                aria-current={index === safeIndex ? 'step' : undefined}
                data-testid={`launch-v3-stepbar-${index + 1}`}
              >
                <span className="kc-v3-step-dot" aria-hidden="true">
                  {index < safeIndex ? '✓' : index + 1}
                </span>
                {item.title}
              </span>
            </Fragment>
          ))}
        </div>
        <span className="kc-v3-step-note">第 {safeIndex + 1} / {steps.length} 关 · {step.title}</span>
      </BlocklyStudioSteps>

      <BlocklyWorkspace
        allowedBlocks={step.allowedBlocks}
        blocks={blocks}
        docked={{ stepKey: stepId, preferredBlock: step.requiredBlockTypes.find((type) => type !== 'when_start' && type !== 'when_clicked') }}
        enableProgramTools={Boolean(mistakeStep || practiceStep) || duoMode !== null}
        snapStartOnTop={Boolean(mistakeStep)}
        sayLineChoices={getSayLineChoices(lessonId)}
        motionVerb={motionVerbForTemplate(lesson.templateId)}
        onSnapshotChange={handleSnapshot}
      />

      <details className="kc-v3-editor-details">
        <summary>本关指引与积木顺序</summary>
        <div data-testid="launch-v3-step-guide">
          <p data-testid="launch-v3-voiceover">主语音：{step.voiceover}</p>
          <div data-testid="launch-v3-help">
            {help.body.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          {clickLesson && <p data-testid="launch-v3-click-note">点击课：按运行只会启动程序，要在舞台上亲自点一下角色才会开始动。</p>}
        </div>

        <ol data-testid="launch-v3-block-list">
          {blocks.map((block, index) => (
            <li key={`${block.type}-${index}`} data-testid={`launch-v3-block-${index}`}>
              <span>
                {index + 1}. {getKidsBlockLabel(block.type, motionVerbForTemplate(lesson.templateId))}
                {block.disconnected ? '（散块，不计入运行）' : ''}
              </span>{' '}
              <button
                type="button"
                data-testid={`launch-v3-block-up-${index}`}
                disabled={index <= 1 || index >= chainLength}
                onClick={() => moveBlock(index, -1)}
                aria-label={`第 ${index + 1} 块上移`}
              >
                ↑
              </button>{' '}
              <button
                type="button"
                data-testid={`launch-v3-block-down-${index}`}
                disabled={index < 1 || index >= chainLength - 1}
                onClick={() => moveBlock(index, 1)}
                aria-label={`第 ${index + 1} 块下移`}
              >
                ↓
              </button>
            </li>
          ))}
        </ol>

        <div>
          <button type="button" data-testid="launch-v3-save" disabled={!shell} onClick={() => shell?.save()}>
            保存作品
          </button>
        </div>
      </details>

      {legacyImport?.ok ? (
        <div className="kc-v3-alert" data-testid="launch-v3-legacy-import">
          <p>
            发现你在旧课堂留下的草稿（到第 {legacyImport.fromStep + 1} 关，共 {legacyImport.importedSteps} 关有程序），
            要一键导入吗？导入后通过记录须重新运行才能恢复。
          </p>
          <button type="button" data-testid="launch-v3-import-legacy" onClick={handleImportLegacy}>
            一键导入旧草稿
          </button>{' '}
          <button type="button" data-testid="launch-v3-dismiss-legacy" onClick={handleDismissLegacy}>
            不用了
          </button>
        </div>
      ) : null}

      {cloudSyncState === 'failed' ? (
        <div className="kc-v3-alert" data-testid="launch-v3-cloud-failed">
          <p>云端同步失败，本机进度已保存。请重试同步，或选择仅用本机继续。</p>
          <button type="button" data-testid="launch-v3-retry-cloud-sync" onClick={() => void handleRetryCloudSync()}>
            重试同步
          </button>{' '}
          <button type="button" data-testid="launch-v3-continue-local-only" onClick={continueLocalOnly}>
            仅用本机继续
          </button>
        </div>
      ) : null}

      {navigationFailed ? (
        <div className="kc-v3-alert" data-testid="launch-v3-navigation-failed">
          <p>本课的进度和奖励已经保存好了，但打开完成页失败了。点下面的按钮，用整页打开的方式打开完成页。</p>
          <a data-testid="launch-v3-open-complete-page" href={completePath}>
            打开完成页
          </a>
        </div>
      ) : null}

      {slowComplete && isCompleting ? (
        <p className="kc-v3-alert" data-testid="launch-v3-complete-slow" role="status">
          完成处理比平时久，可能是云端同步卡住了。你的作品草稿已自动保存，可以刷新页面后再点“完成本课”。
        </p>
      ) : null}

      {notice && <p className="kc-v3-alert" data-testid="launch-v3-notice">{notice}</p>}
    </div>
  )
}
