/**
 * lesson-01-forest-hello 编辑器插槽（ForestEditorSlot）：课程自有 EditorSlot。
 *
 * 内嵌真实 BlocklyWorkspace（单实例：切关不重建工作区，只按新关的程序
 * 数据重建画布上的积木，见 forest-hello-blockly-ops.rebuildForestProgram）。
 * 四步教学（步骤头 + 指导 + 主语音 + 完成按钮）与逐块 ↑↓ 排序在插槽内；
 * 任务简报、方法步骤、三级提示、反馈三行、文件菜单由外壳渲染。
 *
 * 数据流（只经 onChange 交外壳，不得直接读写草稿键；运行/保存用
 * shell.*，不自建运行/保存状态机）：
 * - 编辑（快照变化）→ persist → onChange → 外壳防抖自动保存 + 旧判定失效。
 * - 运行由外壳经 ForestRunAdapter 完成；插槽观测 shell.judgment 的变化，
 *   对运行开始时那一关应用通过/失败副作用（passed / failures /
 *   observed），判定本身由适配器同步算出，插槽只复算同一程序取失败码。
 * - 错误实验的观察与问答是会话内状态（与旧课堂一致，不持久化），
 *   经路由级 ForestSessionContext 与舞台插槽共享；草稿只存 passed 与
 *   failures 计数。
 * - 完成本课（第 4 关通过后）走共享完成 hook（奖励 + 本机进度 + 云端
 *   同步 + 跳转，launch-lesson-session.ts）：云端失败时横幅与重试 /
 *   仅用本机继续由本插槽的反馈区承接；保存失败不得显示成功。
 *
 * 完成时清草稿（onClearDrafts）：先把内存草稿重置为空草稿（经 onChange，
 * 外壳 editorDataRef 同步更新），再删 localStorage 键。外壳卸载时仍会
 * 把内存草稿再存一次（lesson-workspace 的卸载保存），所以键内最终留
 * 下的是空草稿信封——重进即全新开始，与彻底清键的 observable 行为一致。
 * 旧课堂草稿（sessionStorage 按步键）永不删除。
 *
 * 首次访问兼容导入（裁定 5）：新草稿为空且旧课堂留有草稿时，提示一键
 * 导入；已完成过本课时不再提示（旧草稿是完成前的旧程序）；导入前逐关
 * 校验（importLegacyForestDraft），未知积木整单失败、如实提示。
 * 关间只许顺序前进（与旧课堂一致，无自由跳关按钮）。
 * 数字改参不适用：本课无数字参数（移动固定 100 步），不得造假参数。
 * ✕ 删除复用 BlocklyWorkspace 自带删除（选中 + 删除按钮、拖到垃圾桶）。
 */
'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getMistakeStep } from '@/content/curriculum/mistake-steps'
import { getPracticeStep } from '@/content/curriculum/practice-steps'
import { launchLessons } from '@/content/curriculum/launch-lessons'
import { getKidsBlockLabel } from '@/features/lessons/blockly/block-labels'
import { evaluateObservable } from '@/features/lessons/blockly/observable-run'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { explainRunFailure } from '@/features/lessons/blockly/run-feedback'
import { motionVerbForTemplate } from '@/features/lessons/blockly/block-labels'
import { launchStepGate, useLaunchLessonCompletion } from '@/features/lessons/launch-lesson-session'
import { readGuestProgress } from '@/features/progress/local-progress'
import { draftKeyFor } from '@/features/lessons/workspace/lesson-contract'
import type { EditorSlotProps, JudgmentResult } from '@/features/lessons/workspace/workspace-slots'

import {
  findForestWorkspace,
  forestSnapshot,
  mainForestStack,
  moveForestBlock,
  rebuildForestProgram,
} from './forest-hello-blockly-ops'
import {
  FOREST_HELP,
  FOREST_LESSON_ID,
  FOREST_SOURCE_LESSON,
  FOREST_STEPS,
} from './forest-hello-contract'
import {
  coerceForestDraft,
  emptyForestDraft,
  forestStarterProgram,
  hasLegacyForestDraft,
  importLegacyForestDraft,
  isEmptyForestDraft,
  type ForestSlotData,
  type ForestStepId,
} from './forest-hello-draft'
import { judgeForestStep } from './forest-hello-judging'
import { useForestSession, useForestSessionState } from './forest-hello-session'

/**
 * 会话内最近一次好草稿（模块级，仅本页会话内有效）：外壳把外来课节的
 * 导入载荷交给插槽时（OPS-028 例外：壳不代判他课数据），插槽拒绝该载荷
 * 并把当前作品回显给外壳，避免外来数据被自动保存进本课键（L02 同款）。
 * 全新加载时 initial 只会是本课草稿或空草稿，lastGood 为空时回显空草稿。
 */
let lastGoodForestDraft: ForestSlotData | null = null

/**
 * 仅单测用：把模块级 lastGood 复位到全新加载状态。生产里 lastGood 随页面
 * 会话自然消亡；单测多用例共用同一模块时，不复位会让“外来导入回显空草稿”
 * 这类用例读到前一个用例留下的好草稿（采纳 effect 修掉脏快照覆写后，该
 * 顺序依赖不再被掩盖，见 forest-hello-slot.test.tsx 的 beforeEach）。
 */
export function resetForestSlotLastGoodForTest(): void {
  lastGoodForestDraft = null
}

const BlocklyWorkspace = dynamic(
  () => import('@/features/lessons/blockly/blockly-workspace').then((m) => m.BlocklyWorkspace),
  { ssr: false },
)

function blockLabel(block: ProgramBlock): string {
  return getKidsBlockLabel(block.type)
}

export function ForestEditorSlot({ initial, onChange, editable, shell, onJudgment }: EditorSlotProps) {
  const { store, runAdapter } = useForestSession()
  const sessionState = useForestSessionState()
  const [draft, setDraft] = useState<ForestSlotData>(() => coerceForestDraft(initial))
  const draftRef = useRef(draft)
  draftRef.current = draft
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onJudgmentRef = useRef(onJudgment)
  onJudgmentRef.current = onJudgment
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  /** 旧草稿导入提示（仅当新草稿为空且旧草稿有效时出现）。 */
  const [legacyImport, setLegacyImport] = useState<ReturnType<typeof importLegacyForestDraft> | null>(null)
  /** 最近一次运行所属的关（供运行日志展示用，与副作用同一定位）。 */
  const [lastRunStep, setLastRunStep] = useState<number>(draft.stepIndex)
  /** 运行开始时所在的关：判定副作用必须应用到那一关，而非切关后的关。 */
  const runStepRef = useRef<number>(draft.stepIndex)
  /** 该次运行是否经过 running=true 的异步播放（空帧运行同步结束，无此阶段）。 */
  const runAsyncRef = useRef(false)
  /** 已应用过副作用的那个判定对象（同一对象只应用一次）。 */
  const appliedJudgmentRef = useRef<JudgmentResult | null>(null)
  /** 最近一次成功运行所属的关（完成门控的 hasRunSuccess；编辑后清掉）。 */
  const [runPassedStep, setRunPassedStep] = useState<number | null>(null)
  /** TQ-008：已计过失败的那次运行的程序键（同一程序的失败只计一次）。 */
  const countedRunFailureRef = useRef<string | null>(null)

  // 完成流程（奖励 + 本机进度 + 云端同步 + 跳转）：与旧路由共用的共享 hook。
  const {
    cloudSyncState,
    isCompleting,
    navigationFailed,
    completePath,
    completeLesson,
    retryCloudSync,
    continueLocalOnly,
  } = useLaunchLessonCompletion({
      lessonId: FOREST_LESSON_ID,
      onClearDrafts: () => {
        // 先重置内存草稿（外壳卸载保存写回的即是空草稿），再删存储键。
        const empty = emptyForestDraft()
        lastGoodForestDraft = empty
        draftRef.current = empty
        setDraft(empty)
        store.setState({ draft: empty })
        onChangeRef.current(empty)
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(draftKeyFor(FOREST_LESSON_ID))
        }
      },
    })

  const step = FOREST_STEPS[Math.min(draft.stepIndex, FOREST_STEPS.length - 1)]
  const stepId = step.id
  const blocks: ProgramBlock[] = draft.programs[stepId] ?? forestStarterProgram(stepId as ForestStepId)
  const passedHere = draft.passed.includes(stepId)
  const mistakeStep = getMistakeStep(FOREST_LESSON_ID, stepId)
  const practiceStep = getPracticeStep(FOREST_LESSON_ID, stepId)
  const mistakeObserved = sessionState.observed.includes(stepId)
  const mistakeAnswer = sessionState.mistakeAnswers[stepId] ?? null
  const practiceAnswer = sessionState.practiceAnswers[stepId] ?? null
  const running = shell?.running ?? false
  const judgment = shell?.judgment ?? null
  const firstLoose = blocks.findIndex((block) => block.disconnected)
  const chainLength = firstLoose === -1 ? blocks.length : firstLoose
  const isLastStep = draft.stepIndex >= FOREST_STEPS.length - 1

  const persist = useCallback((next: ForestSlotData) => {
    draftRef.current = next
    lastGoodForestDraft = next
    setDraft(next)
    store.setState({ draft: next })
    onChangeRef.current(next)
  }, [store])

  /**
   * 挂载时一次性处理：
   * 1. 外来课节导入：initial 的 lessonId 不是本课时，拒绝该载荷并回显
   *    会话内最近的好草稿（或空草稿），绝不把外来数据存进本课键。
   * 2. 会话 store 的草稿镜像初始化（舞台插槽读它）。
   * 3. 旧草稿导入提示：新草稿为空、旧课堂留有草稿、且本课尚未完成时，
   *    尝试导入；有效则提示一键导入，无效则如实提示原因。
   */
  useEffect(() => {
    const raw = initial as { lessonId?: unknown } | null
    if (raw && typeof raw === 'object' && raw.lessonId !== undefined && raw.lessonId !== FOREST_LESSON_ID) {
      setNotice('导入文件属于其他课节，已拒绝，原作品未变。')
      const fallback = lastGoodForestDraft ?? emptyForestDraft()
      draftRef.current = fallback
      lastGoodForestDraft = fallback
      setDraft(fallback)
      store.setState({ draft: fallback })
      onChangeRef.current(fallback)
      const workspace = findForestWorkspace(containerRef.current)
      if (workspace) {
        rebuildForestProgram(workspace, fallback.programs[FOREST_STEPS[fallback.stepIndex].id] ?? [])
      }
      return
    }
    const coerced = coerceForestDraft(initial)
    store.setState({ draft: coerced })
    if (isEmptyForestDraft(coerced) && hasLegacyForestDraft()) {
      let completed = false
      try {
        completed = readGuestProgress().completedLessonIds.includes(FOREST_LESSON_ID)
      } catch {
        completed = false
      }
      if (!completed) {
        const imported = importLegacyForestDraft()
        if (imported.ok) {
          setLegacyImport(imported)
        } else {
          setNotice(`旧课堂的草稿没能导入：${imported.reason}`)
        }
      }
    }
    // 仅挂载时执行一次；initial 在插槽生命周期内只由外壳在挂载/重置时给。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * 采纳会话 store 的草稿变更（舞台插槽的“再摆一次错误程序”经 store
   * 写回草稿）：JSON 比较防循环——编辑插槽自己的 persist 已同步写过
   * store，内容一致时跳过。
   */
  useEffect(() => {
    // 读 store 的实时值：挂载那一拍 useSyncExternalStore 的快照仍是 store
    // 的初始空草稿（挂载 effect 刚把已加载草稿写进 store，订阅重渲染还没
    // 到），直接采纳快照会把已加载的草稿短暂覆成空草稿、再翻回来；翻转期
    // 间重建 effect 与自动保存会把空态当真，丢掉已保存的程序。
    const storeDraft = store.getState().draft
    if (JSON.stringify(storeDraft) !== JSON.stringify(draftRef.current)) {
      draftRef.current = storeDraft
      setDraft(storeDraft)
      onChangeRef.current(storeDraft)
    }
  }, [sessionState.draft, store])

  /** 快照变化即 persist（与旧课堂 handleSnapshot 同语义，含去重）；编辑后运行成功标记失效。 */
  const handleSnapshot = useCallback(
    (next: ProgramBlock[]) => {
      const current = draftRef.current
      const key = FOREST_STEPS[Math.min(current.stepIndex, FOREST_STEPS.length - 1)].id
      if (JSON.stringify(current.programs[key] ?? null) === JSON.stringify(next)) return
      setRunPassedStep(null)
      persist({ ...current, programs: { ...current.programs, [key]: next } })
    },
    [persist],
  )

  /**
   * 切关 / 外部改程序：画布按当前关程序重建积木，工作区实例不重建
   * （快照一致时跳过）。依赖含当前关程序数组——舞台插槽经 store 改写
   * 程序（如“再摆一次错误程序”）时，本 effect 重建画布。
   */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const workspace = findForestWorkspace(container)
    if (!workspace) return
    const target = draft.programs[stepId] ?? forestStarterProgram(stepId as ForestStepId)
    if (JSON.stringify(forestSnapshot(workspace)) === JSON.stringify(target)) return
    rebuildForestProgram(workspace, target)
  }, [stepId, draft.programs[stepId]])

  /** 运行开始时记下关号（shell.judgment 到达时可能已切关）。 */
  useEffect(() => {
    if (running) {
      runStepRef.current = draftRef.current.stepIndex
      runAsyncRef.current = true
    }
  }, [running])

  /**
   * 判定到达：对运行开始时那一关应用通过/失败副作用（只应用一次）。
   * 与 L01 插槽同一定位：每次 persist 之后必须经 OPS-025 的 onJudgment
   * 把同一个判定对象原样再上报一次（外壳的编辑失效会清掉它）；
   * appliedJudgmentRef 保证同一对象不会被重复应用，不会循环。
   * - 通过：错误实验未观察时只提示、不记通过；否则记入 passed。
   * - 设计错误实验（失败但 designedMistake）：记 observed（会话内，
   *   经 store），不计 failures。
   * - 真实失败：failures + 1（同一程序只计一次，去重 ref 见 TQ-008）。
   */
  useEffect(() => {
    if (!judgment) return
    // 同步结束的空帧运行没有 running 阶段：判定即属当前关；异步运行用
    // 运行开始时记下的关号。
    const runStepIndex = runAsyncRef.current ? runStepRef.current : draftRef.current.stepIndex
    runAsyncRef.current = false
    setLastRunStep(runStepIndex)
    if (appliedJudgmentRef.current === judgment) return
    appliedJudgmentRef.current = judgment
    const current = draftRef.current
    const runStep = FOREST_STEPS[runStepIndex]
    if (!runStep) return
    const result = judgeForestStep(current.programs[runStep.id] ?? [], runStepIndex, sessionState.observed.includes(runStep.id))
    if (result.passed) {
      setRunPassedStep(runStepIndex)
      if (runStep.id === 'step-4' && !sessionState.observed.includes(runStep.id)) {
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
        if (!sessionState.observed.includes(runStep.id)) {
          store.setState({ observed: [...sessionState.observed, runStep.id] })
        }
        return
      }
      const programKey = `${runStepIndex}|${JSON.stringify(current.programs[runStep.id] ?? [])}`
      if (countedRunFailureRef.current !== programKey) {
        countedRunFailureRef.current = programKey
        persist({ ...current, failures: current.failures + 1 })
        onJudgmentRef.current?.(judgment)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [judgment])

  /** 最近一次运行的日志（仅当判定仍有效且仍在运行那一关时展示）。 */
  const lastRun = useMemo(() => {
    if (!judgment) return null
    if (draft.stepIndex !== lastRunStep) return null
    return judgeForestStep(draft.programs[step.id] ?? [], draft.stepIndex, mistakeObserved)
  }, [judgment, draft, step.id, lastRunStep, mistakeObserved])

  function goToStep(index: number) {
    const current = draftRef.current
    setNotice(null)
    setLegacyImport(null)
    setRunPassedStep(null)
    // OPS-045：切关前先清理上一关的运行快照与判定。适配器是路由级
    // 单例，stop() 只清 'running'，上一关 'success'/'error' 的快照会
    // 泄漏到新关并锁住第 3 关的预测按钮（practiceLocked）。reset() 在
    // persist 之前同步执行，新关首帧即为 idle。
    runAdapter.reset()
    persist({ ...current, stepIndex: index, finished: false })
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const workspace = findForestWorkspace(containerRef.current)
    if (!workspace) {
      setNotice('工作区还没准备好，稍后再试。')
      return
    }
    if (!moveForestBlock(workspace, index, direction)) {
      setNotice('这块积木不能再往这个方向移了。')
    }
  }

  // OPS-046 F1：重试同步的结果必须有反馈通道。同步成功但跳转失败时
  // retryCloudSync 返回 'navigate-failed' 且 hook 置 navigationFailed，
  // 下方横幅提供整页打开完成页的备用入口；这里再补一条 notice 文案。
  async function handleRetryCloudSync() {
    const outcome = await retryCloudSync()
    if (outcome === 'navigate-failed') {
      setNotice('进度和奖励已经保存并同步好了，但打开完成页失败了。请用下面的按钮打开完成页。')
    }
  }

  async function handleComplete() {
    const current = draftRef.current
    const program = current.programs[stepId] ?? []
    const correct = judgeForestStep(program, current.stepIndex, mistakeObserved).passed
    const gate = launchStepGate({
      mistakeStep: mistakeStep ?? null,
      mistakeObserved,
      mistakeAnswer,
      practiceStep: practiceStep ?? null,
      practiceAnswer,
      needsRun: true,
      correct,
      hasRunSuccess: runPassedStep === current.stepIndex,
      mainCharacterLabel: '小狐狸',
      failureFeedback:
        explainRunFailure(
          evaluateObservable(
            FOREST_STEPS[current.stepIndex].requiredBlockTypes,
            program,
          ),
          '小狐狸',
          motionVerbForTemplate('forest-meetup-stage'),
        ) || '再试一次。',
      alreadyCounted:
        countedRunFailureRef.current === `${current.stepIndex}|${JSON.stringify(program)}`,
    })
    if (gate.outcome === 'blocked') {
      if (gate.countFailedAttempt) {
        persist({ ...current, failures: current.failures + 1 })
      } else if (!correct) {
        // 这次失败已被计过一次（运行失败时已计），清掉去重标记。
        countedRunFailureRef.current = null
      }
      setNotice(gate.feedback)
      return
    }
    if (!isLastStep) {
      goToStep(current.stepIndex + 1)
      setNotice(
        practiceStep
          ? practiceStep.done
          : '这一关完成啦！',
      )
      return
    }
    // 最后一关：完成整课（奖励 + 本机进度 + 云端同步 + 跳转）。
    // OPS-046：每一种 outcome 都必须有可见反馈，不得静默无响应。
    if (!FOREST_SOURCE_LESSON) {
      setNotice('课程数据缺失，无法完成本课。')
      return
    }
    let outcome: Awaited<ReturnType<typeof completeLesson>>
    try {
      outcome = await completeLesson({
        blocks: program,
        lesson: FOREST_SOURCE_LESSON,
        lessons: launchLessons,
      })
    } catch {
      // 兜底：completeLesson 本身已在各阶段做 fail-closed 处理，此处
      // 不应再抛；万一抛错也要给孩子可见提示，而不是卡在“正在完成…”。
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
    // 'cloud-failed' 时横幅与重试入口在下方反馈区承接；'completed' 时已跳转。
  }

  function handleImportLegacy() {
    if (!legacyImport || !legacyImport.ok) return
    setLegacyImport(null)
    setNotice(`已导入旧课堂的草稿（到第 ${legacyImport.fromStep + 1} 关），通过记录须重新运行才能恢复。`)
    persist(legacyImport.data)
  }

  if (!editable) {
    return (
      <div data-testid="forest-hello-slot-readonly">
        <p>本课为只读预览：小狐狸出场，共 4 关。</p>
        <p>当前是第 {draft.stepIndex + 1} 关：{step.title}</p>
      </div>
    )
  }

  // 画布 Gate 1（平板 ≥300px、手机 ≥220px，有效可视高度 = 视口 ∩ 画布）：
  // 画布上方只留一行紧凑步骤行（进度 + 标题 + 完成按钮）；指导、语音、
  // 关间导航移到画布下方（仍在同一插槽内，testid 不变），否则
  // 768×1024 与 375×812 首屏画布均不足（L01 同款布局，实测 241px / 40px
  // 教训）。外壳顶栏、目标条、舞台、运行条为共享布局，本课不动。
  //
  // 插槽根节点自己滚动（height 100% + overflow-y auto）：studio 为
  // 100dvh 固定壳、文档不滚动，外壳反馈条是主区底部通栏（flex 0 0 auto）。
  // 本插槽内容（步骤行 + 画布 + 指导 + 积木列表 + 运行/保存行）高于编辑
  // 列时，若根节点不滚动，底部“保存作品”与旧草稿导入按钮会落在反馈条
  // 下方、无法点击（E2E N4/N6 实测：elementFromPoint 命中反馈条 h2，
  // 且无任何可滚动祖先）。外壳不改：滚动是插槽自己的内部区域行为
  // （OPS-039 模型“inner regions scroll on their own”）。
  return (
    <div
      ref={containerRef}
      data-testid="forest-hello-slot"
      style={{ height: '100%', minHeight: 0, overflowY: 'auto' }}
    >
      <div
        data-testid="forest-hello-step-header"
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 6px' }}
      >
        <p data-testid="forest-hello-step-progress">
          第 {draft.stepIndex + 1} / {FOREST_STEPS.length} 关{passedHere ? ' ✓' : ''}
        </p>
        <h3 data-testid="forest-hello-step-title">
          第 {draft.stepIndex + 1} 关：{step.title}
        </h3>
        <button
          type="button"
          data-testid="forest-hello-complete-step"
          disabled={isCompleting}
          onClick={() => void handleComplete()}
        >
          {isCompleting ? '正在完成…' : isLastStep ? '完成本课' : '完成这一关'}
        </button>
      </div>

      <BlocklyWorkspace
        allowedBlocks={step.allowedBlocks}
        blocks={blocks}
        enableProgramTools={Boolean(mistakeStep || practiceStep)}
        snapStartOnTop={Boolean(mistakeStep)}
        onSnapshotChange={handleSnapshot}
      />

      <div data-testid="forest-hello-step-guide">
        <p data-testid="forest-hello-instruction">{step.instruction}</p>
        <p data-testid="forest-hello-voiceover">主语音：{step.voiceover}</p>
        <div data-testid="forest-hello-help">
          {FOREST_HELP.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>

      <ol data-testid="forest-hello-block-list">
        {blocks.map((block, index) => (
          <li key={`${block.type}-${index}`} data-testid={`forest-hello-block-${index}`}>
            <span>
              {index + 1}. {blockLabel(block)}
              {block.disconnected ? '（散块，不计入运行）' : ''}
            </span>{' '}
            <button
              type="button"
              data-testid={`forest-hello-block-up-${index}`}
              disabled={index <= 1 || index >= chainLength}
              onClick={() => moveBlock(index, -1)}
              aria-label={`第 ${index + 1} 块上移`}
            >
              ↑
            </button>{' '}
            <button
              type="button"
              data-testid={`forest-hello-block-down-${index}`}
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
        <button
          type="button"
          data-testid="forest-hello-run"
          disabled={!shell}
          onClick={() => shell?.run()}
        >
          {running ? '停止' : '▶ 运行'}
        </button>{' '}
        <button type="button" data-testid="forest-hello-save" disabled={!shell} onClick={() => shell?.save()}>
          保存作品
        </button>
      </div>

      {legacyImport?.ok ? (
        <div data-testid="forest-hello-legacy-import">
          <p>
            发现你在旧课堂留下的草稿（到第 {legacyImport.fromStep + 1} 关，共{' '}
            {legacyImport.importedSteps} 关有程序），要一键导入吗？导入后通过记录须重新运行才能恢复。
          </p>
          <button type="button" data-testid="forest-hello-import-legacy" onClick={handleImportLegacy}>
            一键导入旧草稿
          </button>{' '}
          <button type="button" data-testid="forest-hello-dismiss-legacy" onClick={() => setLegacyImport(null)}>
            不用了
          </button>
        </div>
      ) : null}

      {cloudSyncState === 'failed' ? (
        <div data-testid="forest-hello-cloud-failed">
          <p>云端同步失败，本机进度已保存。请重试同步，或选择仅用本机继续。</p>
          <button type="button" data-testid="forest-hello-retry-cloud-sync" onClick={() => void handleRetryCloudSync()}>
            重试同步
          </button>{' '}
          <button type="button" data-testid="forest-hello-continue-local-only" onClick={continueLocalOnly}>
            仅用本机继续
          </button>
        </div>
      ) : null}

      {navigationFailed ? (
        <div data-testid="forest-hello-navigation-failed">
          <p>本课的进度和奖励已经保存好了，但打开完成页失败了。点下面的按钮，用整页打开的方式打开完成页。</p>
          <a data-testid="forest-hello-open-complete-page" href={completePath}>
            打开完成页
          </a>
        </div>
      ) : null}

      {notice && <p data-testid="forest-hello-notice">{notice}</p>}

      {lastRun && lastRun.frames.length > 0 ? (
        <ol data-testid="forest-hello-run-log">
          {lastRun.frames.map((frame, i) => (
            <li key={i}>向右走 100 步（第 {i + 1} 块，小狐狸走到 {frame.foxPosition} 步）</li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
