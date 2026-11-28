/**
 * OPS-052：G0-U1 六节 grid 课共用的 V3 编辑器插槽（GridEditorSlot）。
 *
 * 六节课共用这一个插槽（禁止每课复制工作台外壳）：内容全部来自
 * `GridLesson` 课程数据，插槽只负责把真实 BlocklyWorkspace 与四步教学、
 * 旧草稿兼容导入接进 V3 外壳。任务简报、方法步骤、三级提示、反馈三行、
 * 文件菜单由外壳渲染。
 *
 * 数据流（与 lesson-01-forest-hello 同一套，只经 onChange 交外壳）：
 * - 编辑（快照变化）→ persist → onChange → 外壳防抖自动保存 + 判定失效。
 * - 运行由外壳经 GridRunAdapter 完成；插槽观测 shell.judgment，用运行
 *   快照里的那一关真实复算结果并应用副作用：
 *   · 通过且错误实验已亲眼看到过错误 → 记 passed；
 *   · 错误实验成功但还没看过错 → 只提示，不记通过（旧课堂语义）；
 *   · 真实失败 → failures+1、记下真实失败码；跑出设计错误并因此看到
 *     错误 → 同时记 observed（这些都是同机真实运行记录）。
 * - 创意关目标格、恢复错误程序、再给点提示、复盘选择由舞台插槽经路由
 *   store 写回草稿；本插槽的采纳 effect 接到后自动保存并重建画布。
 * - 切关（goToStep）先 runAdapter.reset() 再 persist：适配器是路由级
 *   单例，stop() 只清 running，上一关的 success/error 会泄漏到新关。
 * - 关卡通过的硬证据只有真实运行；编辑会清掉本关通过记录（旧课堂语义）。
 *
 * 旧课堂草稿（`kids-grid-lesson-v1:<id>`，G0-U1 未按账号分键）只读兼容：
 * 仅当新草稿为空、且旧草稿归属当前 owner 已确认（同 owner 分键旧键，或已有
 * 与当前 owner 完全一致的认领戳；严格策略，见 grid-v3-draft）时提示一键导入；
 * 已完成的历史课同样可导入，保留完成态、通过记录、反思与作品。归属无法确认
 * 时不读内容、不解析、不认领，只如实提示原草稿已保留。提示出现后任何新数据
 * 写入即撤销导入资格；点击导入时重新校验身份、归属与草稿仍为空。导入后旧键
 * 原样保留，永不删除、永不覆盖（调用方不写旧键，也不写认领戳）。
 */
'use client'

import dynamic from 'next/dynamic'
import { Fragment, useCallback, useContext, useEffect, useRef, useState } from 'react'

import type { GridLesson } from '@/content/curriculum/g0-u1-grid-lessons'
import { getKidsBlockLabel } from '@/features/lessons/blockly/register-kids-blocks'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { LessonDraftOwnerContext } from '@/features/lessons/lesson-draft-boundary'
import { BlocklyStudioMission, BlocklyStudioSteps } from '@/features/lessons/workspace/blockly-studio-layout'
import type { EditorSlotProps, JudgmentResult } from '@/features/lessons/workspace/workspace-slots'

import {
  coerceGridDraft,
  emptyGridDraft,
  gridStarterProgram,
  hasLegacyGridDraft,
  hasUnclaimableLegacyGridDraft,
  importLegacyGridDraft,
  isEmptyGridDraft,
  type GridSlotData,
} from './grid-v3-draft'
import { useGridSession, useGridSessionState } from './grid-v3-session'
import { gridActorName, gridStepGoalPhrase } from './grid-v3-actor'

const BlocklyWorkspace = dynamic(
  () => import('@/features/lessons/blockly/blockly-workspace').then((m) => m.BlocklyWorkspace),
  { ssr: false },
)

/**
 * 会话内最近一次好草稿（模块级，仅本页会话内有效）：外壳把外来课节的
 * 导入载荷交给插槽时（壳不代判他课数据），插槽拒绝该载荷并把当前作品
 * 回显给外壳，避免外来数据被自动保存进本课键。
 */
let lastGoodGridDraft: GridSlotData | null = null

/** 仅单测用：把模块级 lastGood 复位到全新加载状态。 */
export function resetGridSlotLastGoodForTest(): void {
  lastGoodGridDraft = null
}

/** 创意关未选目标格时的提示（与旧课堂同一组文案）。 */
function goalPromptFor(step: GridLesson['steps'][number]): string {
  const creative = step.creative
  if (creative?.layouts) return '先选围栏的边长，再运行。'
  if (creative?.patterns) return '先选一种脚印节奏，再运行。'
  if (creative?.waters) return '先选有几个水坑，再运行。'
  if (creative?.pots) return '先选要浇哪一种花园，再运行。'
  return '先选一格，把蘑菇屋搬过去，再运行。'
}

function blockLabel(block: ProgramBlock): string {
  return getKidsBlockLabel(block.type)
}

export function GridEditorSlot({ initial, onChange, editable, shell, onJudgment }: EditorSlotProps) {
  // 进度归属人来自外壳边界（路由在服务端解析）；单测直接渲染插槽时没有
  // 边界，保持 undefined → 身份未知，旧草稿一律不读（fail-closed）。
  const draftOwner = useContext(LessonDraftOwnerContext)
  const { lesson, store, runAdapter, work } = useGridSession()
  const workStepIndex = work
    ? lesson.steps.findIndex((item) => item.id === work.stepId)
    : -1
  const workMode = workStepIndex >= 0
  const normalizeDraft = useCallback(
    (data: GridSlotData): GridSlotData =>
      workMode ? { ...data, stepIndex: workStepIndex } : data,
    [workMode, workStepIndex],
  )
  const sessionState = useGridSessionState()
  const [draft, setDraft] = useState<GridSlotData>(() =>
    normalizeDraft(coerceGridDraft(lesson, initial)),
  )
  const draftRef = useRef(draft)
  draftRef.current = draft
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onJudgmentRef = useRef(onJudgment)
  onJudgmentRef.current = onJudgment
  const [notice, setNotice] = useState<string | null>(null)
  /** 旧草稿导入提示（仅当新草稿为空且旧草稿可导入时出现）。 */
  const [legacyImport, setLegacyImport] = useState<ReturnType<typeof importLegacyGridDraft> | null>(null)
  /**
   * 导入资格（复审 #7149447993）：挂载时提示出现即为 true；之后任何新数据写入
   * （编辑、运行判定、舞台写回、切关）立即撤销，且不可恢复——不得用缓存的
   * 旧数据覆盖刚写入的新草稿。
   */
  const legacyEligibleRef = useRef(false)
  const draftOwnerRef = useRef(draftOwner)
  draftOwnerRef.current = draftOwner
  const revokeLegacyImport = useCallback(() => {
    if (!legacyEligibleRef.current) return
    legacyEligibleRef.current = false
    setLegacyImport(null)
  }, [])
  /** 已应用过副作用的那个判定对象（同一对象只应用一次）。 */
  const appliedJudgmentRef = useRef<JudgmentResult | null>(null)

  const stepIndex = workMode
    ? workStepIndex
    : Math.min(Math.max(draft.stepIndex, 0), lesson.steps.length - 1)
  const step = lesson.steps[stepIndex]
  const stepId = step.id
  const blocks: ProgramBlock[] = draft.programs[stepId] ?? gridStarterProgram(step)
  const passedHere = draft.passed.includes(stepId)
  const isLastStep = stepIndex >= lesson.steps.length - 1
  const running = shell?.running ?? false
  const judgment = shell?.judgment ?? null
  const snapshot = runAdapter.getExecutionSnapshot()
  const playing = snapshot.playing
  const frame = snapshot.frameIndex >= 0 ? snapshot.run?.frames[snapshot.frameIndex] : undefined
  const highlightIndex =
    snapshot.run && (snapshot.playing || snapshot.run.failure) && snapshot.frameIndex >= 0
      ? frame?.blockIndex
      : undefined

  const persist = useCallback(
    (next: GridSlotData) => {
      // 任何新数据写入都撤销旧草稿导入资格（导入本身先撤销再 persist）。
      revokeLegacyImport()
      draftRef.current = next
      lastGoodGridDraft = next
      setDraft(next)
      store.setState({ draft: next })
      onChangeRef.current(next)
    },
    [store, revokeLegacyImport],
  )

  /**
   * 挂载时一次性处理：
   * 1. 外来课节导入：initial 的 lessonId 不是本课时，拒绝载荷并回显会话内
   *    最近的好草稿（或空草稿），绝不把外来数据存进本课键；画布按重挂载
   *    计数重建，确保不会留着外来的积木。
   * 2. 会话 store 的草稿镜像初始化（舞台插槽读它）。
   * 3. 旧草稿导入提示：新草稿为空、旧课堂留有草稿、且旧草稿尚未走完全部
   *    关时尝试导入；有效则提示一键导入，无效则如实提示原因。
   */
  useEffect(() => {
    const raw = initial as { lessonId?: unknown } | null
    if (raw && typeof raw === 'object' && raw.lessonId !== undefined && raw.lessonId !== lesson.id) {
      setNotice('导入文件属于其他课节，已拒绝，原作品未变。')
      const fallback = normalizeDraft(lastGoodGridDraft ?? emptyGridDraft(lesson))
      draftRef.current = fallback
      lastGoodGridDraft = fallback
      setDraft(fallback)
      store.setState({
        draft: fallback,
        editorRevision: store.getState().editorRevision + 1,
      })
      onChangeRef.current(fallback)
      return
    }
    const coerced = normalizeDraft(coerceGridDraft(lesson, initial))
    store.setState({ draft: coerced })
    // 作品模式只编辑作品关，不提示导入课堂旧草稿。
    if (workMode) return
    if (isEmptyGridDraft(lesson, coerced)) {
      if (hasLegacyGridDraft(lesson, draftOwner)) {
        // 归属已确认：未完成与已完成的历史课都提示导入（已完成的保留完成态、
        // 通过记录、反思与作品）；新版草稿非空时根本不进这里，绝不覆盖。
        const imported = importLegacyGridDraft(lesson, draftOwner)
        if (imported.ok) {
          legacyEligibleRef.current = true
          setLegacyImport(imported)
        } else {
          setNotice(`旧课堂的草稿没能导入：${imported.reason}`)
        }
      } else if (hasUnclaimableLegacyGridDraft(lesson, draftOwner)) {
        // 本浏览器有旧草稿但无法确认属于当前账号：不读内容、不展示、不导入，
        // 旧键原样保留。
        setNotice('这台设备上有旧课堂留下的草稿，但无法确认属于当前账号，不能自动恢复；原草稿已原样保留。')
      }
    }
    // 仅挂载时执行一次；initial 在插槽生命周期内只由外壳在挂载/重置时给。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * 采纳会话 store 的草稿变更（舞台插槽写回创意目标格、恢复错误程序、
   * 再给点提示、复盘选择、重玩某关）：JSON 比较防循环——本插槽自己的
   * persist 已同步写过 store，内容一致时跳过。读 store 的实时值而不是
   * 渲染快照，避免挂载那一拍把已加载草稿短暂覆成空草稿。
   */
  useEffect(() => {
    const storeDraft = normalizeDraft(store.getState().draft)
    if (JSON.stringify(storeDraft) !== JSON.stringify(draftRef.current)) {
      // 舞台插槽写回的新数据同样撤销旧草稿导入资格。
      revokeLegacyImport()
      draftRef.current = storeDraft
      lastGoodGridDraft = storeDraft
      setDraft(storeDraft)
      onChangeRef.current(storeDraft)
    }
  }, [sessionState.draft, store, revokeLegacyImport, normalizeDraft])

  /** 快照变化即 persist（与旧课堂 handleSnapshot 同语义，含去重）。 */
  const handleSnapshot = useCallback(
    (next: ProgramBlock[]) => {
      const current = draftRef.current
      const index = Math.min(Math.max(current.stepIndex, 0), lesson.steps.length - 1)
      const key = lesson.steps[index].id
      const fallback = gridStarterProgram(lesson.steps[index])
      if (JSON.stringify(current.programs[key] ?? fallback) === JSON.stringify(next)) return
      if (workMode) {
        // 作品模式只更新作品关的程序；不改课堂 passed / finished。
        persist({
          ...current,
          stepIndex: workStepIndex,
          programs: { ...current.programs, [key]: next },
        })
      } else {
        // 程序变了：本关的通过记录与整课完成状态都不再被这份程序证明。
        persist({
          ...current,
          programs: { ...current.programs, [key]: next },
          passed: current.passed.filter((id) => id !== key),
          finished: false,
        })
      }
      runAdapter.reset()
      setNotice(null)
    },
    [lesson, persist, runAdapter, workMode, workStepIndex],
  )

  /**
   * 判定到达：按运行快照定位真实运行的那一关（含关号），应用副作用
   * 且只应用一次。persist 会触发外壳判定失效，必须把同一判定对象经
   * onJudgment 原样再上报一次；appliedJudgmentRef 防重复应用、防循环。
   */
  useEffect(() => {
    // 作品模式不应用课堂判定：不记 passed / failures / observed / mistakes。
    if (workMode || !judgment) return
    const execution = runAdapter.getExecutionSnapshot()
    const runStepIndex = execution.stepIndex
    const run = execution.run
    if (runStepIndex === null || run === null) return
    if (appliedJudgmentRef.current === judgment) return
    appliedJudgmentRef.current = judgment
    const runStep = lesson.steps[runStepIndex]
    if (!runStep) return
    const current = draftRef.current
    const observed = current.observed?.includes(runStep.id) ?? false
    if (run.passed) {
      if (runStep.errorLab && !observed) {
        // 错误实验：先按原样跑出错、亲眼看到，修好才算通过。
        if (Math.min(current.stepIndex, lesson.steps.length - 1) === runStepIndex) {
          setNotice('程序成功了！不过这是错误实验：先按原样运行一次，看看错在哪，再来修。')
        }
        return
      }
      if (!current.passed.includes(runStep.id)) {
        persist({ ...current, passed: [...current.passed, runStep.id] })
        onJudgmentRef.current?.(judgment)
      }
      return
    }
    const failure = run.failure
    if (!failure) return
    const designedMistake =
      runStep.errorLab && failure === runStep.errorLab.expect && !observed
    const mistakes = current.mistakes ?? []
    persist({
      ...current,
      failures: current.failures + 1,
      ...(mistakes.includes(failure) ? {} : { mistakes: [...mistakes, failure] }),
      ...(designedMistake
        ? { observed: [...(current.observed ?? []), runStep.id] }
        : {}),
    })
    onJudgmentRef.current?.(judgment)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [judgment])

  function goToStep(index: number) {
    const current = draftRef.current
    setNotice(null)
    setLegacyImport(null)
    // 关卡边界：先同步清掉上一关的运行快照与判定，再切关。
    runAdapter.reset()
    store.setState({ guess: null })
    persist({ ...current, stepIndex: index, failures: 0, finished: false })
  }

  function handleComplete() {
    const current = draftRef.current
    const currentStep = lesson.steps[Math.min(current.stepIndex, lesson.steps.length - 1)]
    if (runAdapter.getExecutionSnapshot().playing) return
    if (!current.passed.includes(currentStep.id)) {
      const observed = !currentStep.errorLab || !!current.observed?.includes(currentStep.id)
      setNotice(
        currentStep.creative && !current.creative?.[currentStep.id]
          ? goalPromptFor(currentStep)
          : !observed
            ? '这是错误实验：先按原样运行一次，亲眼看看错在哪，再修好它。'
            : gridStepGoalPhrase(currentStep) === '走到目标格'
              ? `先按“运行”，让${gridActorName(currentStep.level)}真的到达目标，才能完成这一关。`
              : `先按“运行”，让${gridActorName(currentStep.level)}真的${gridStepGoalPhrase(currentStep)}，才能完成这一关。`,
      )
      return
    }
    if (current.stepIndex < lesson.steps.length - 1) {
      goToStep(current.stepIndex + 1)
      setNotice(`第 ${current.stepIndex + 1} 关已完成，开始下一关吧！`)
      return
    }
    persist({ ...current, finished: true })
    setNotice('全部关卡都真的跑通了！看看舞台上的复盘和作品卡吧。')
  }

  function handleImportLegacy() {
    if (!legacyImport || !legacyImport.ok) return
    const eligible = legacyEligibleRef.current
    // 先撤销资格并收起提示：无论成功与否，这次点击之后都不能再导入一次。
    legacyEligibleRef.current = false
    setLegacyImport(null)
    // 点击时重新校验（复审 #7149447993）：资格仍在、当前草稿仍为空、并按
    // 当前身份与归属重新读取旧草稿——不使用挂载时缓存的数据。
    if (!eligible || !isEmptyGridDraft(lesson, draftRef.current)) {
      setNotice('你已经开始了新的作品，旧草稿不会覆盖它；原草稿已原样保留。')
      return
    }
    const fresh = importLegacyGridDraft(lesson, draftOwnerRef.current)
    if (!fresh.ok) {
      setNotice('无法再确认旧草稿属于当前账号，没有导入；原草稿已原样保留。')
      return
    }
    setNotice(
      fresh.data.finished === true
        ? `已恢复旧课堂里完成的这节课（共 ${fresh.importedSteps} 关有程序），完成状态、通过记录、复盘选择和作品都带过来了。`
        : `已导入旧课堂的草稿（到第 ${fresh.fromStep + 1} 关，共 ${fresh.importedSteps} 关有程序），原来的通过记录也一起带过来了。`,
    )
    persist(fresh.data)
    // 旧草稿可能改了当前关程序：重建画布，确保显示的是导入后的积木。
    store.setState({ editorRevision: store.getState().editorRevision + 1 })
  }

  if (!editable) {
    return (
      <div data-testid="grid-slot-readonly">
        <p>本课为只读预览：{lesson.title}，共 {lesson.steps.length} 关。</p>
        <p>当前是第 {stepIndex + 1} 关：{step.title}</p>
      </div>
    )
  }

  return (
    <div className="kc-v3-slot-editor" data-testid="grid-slot" style={{ height: '100%', overflowY: 'auto' }}>
      <BlocklyStudioMission>
        <div data-testid="grid-step-header" className="kc-v3-task">
          {workMode ? (
            <>
              <p className="kc-v3-step-index" data-testid="grid-work-mode">
                作品编辑模式 · 只编辑这一关
              </p>
              <div className="kc-v3-task-copy">
                <h2 data-testid="grid-step-title">{step.title}</h2>
                <p data-testid="grid-work-note">这是我的作品；修改后按“运行”看看真实效果，再保存。</p>
              </div>
            </>
          ) : (
            <>
              <p className="kc-v3-step-index" data-testid="grid-step-progress">
                第 {stepIndex + 1} / {lesson.steps.length} 关{passedHere ? ' ✓' : ''}
              </p>
              <div className="kc-v3-task-copy">
                <h2 data-testid="grid-step-title">
                  <span className="sr-only">第 {stepIndex + 1} 关：</span>
                  {step.title}
                </h2>
                <p data-testid="grid-instruction">{step.instruction}</p>
              </div>
              <button
                type="button"
                data-testid="grid-complete-step"
                disabled={playing || running}
                onClick={handleComplete}
              >
                {isLastStep ? '完成本课' : '完成这一关'}
              </button>
            </>
          )}
        </div>
      </BlocklyStudioMission>

      <BlocklyStudioSteps>
        {workMode ? (
          <span className="kc-v3-step-note" data-testid="grid-work-step-note">
            作品模式：只编辑实际保存的作品关，不进入课堂关卡流程
          </span>
        ) : (
          <div className="kc-v3-stepbar-pills" data-testid="grid-stepbar">
            {lesson.steps.map((item, index) => (
              <Fragment key={item.id}>
                {index > 0 && <span className="kc-v3-step-line" aria-hidden="true" />}
                <span
                  className={`kc-v3-step-pill${index < stepIndex ? ' is-complete' : index === stepIndex ? ' is-active' : ''}`}
                  aria-current={index === stepIndex ? 'step' : undefined}
                  data-testid={`grid-stepbar-${index + 1}`}
                  data-passed={draft.passed.includes(item.id) ? 'true' : 'false'}
                >
                  <span className="kc-v3-step-dot" aria-hidden="true">
                    {index < stepIndex ? '✓' : index + 1}
                  </span>
                  {item.title}
                </span>
              </Fragment>
            ))}
          </div>
        )}
        <span className="kc-v3-step-note">
          {workMode ? '我的作品' : `第 ${stepIndex + 1} / ${lesson.steps.length} 关 · ${step.title}`}
        </span>
      </BlocklyStudioSteps>

      <BlocklyWorkspace
        key={`${step.id}:${sessionState.editorRevision}`}
        allowedBlocks={step.allowedBlocks}
        blocks={blocks}
        // P0-1：六课统一接入《小狐狸出场》同一套 V3 docked 编辑器（分类图标、
        // 固定素材区、撤销/重做/适合画面）；starter / 预置错误程序仍放在画布里。
        // layoutMode="golden" 只为保留运行时逐块高亮（docked 下挂载与外观以 docked 为准）。
        docked={{ stepKey: step.id, preferredBlock: step.allowedBlocks.find((type) => type !== 'when_start') }}
        enableProgramTools
        snapStartOnTop
        layoutMode="golden"
        highlightIndex={highlightIndex}
        onSnapshotChange={handleSnapshot}
      />

      <details className="kc-v3-editor-details">
        <summary>{workMode ? '积木清单与保存' : '本关目标、三级提示与积木清单'}</summary>
        {!workMode ? (
          <div data-testid="grid-step-guide">
            <div data-testid="grid-objectives">
              <b>学习目标</b>
              <ul>
                {lesson.objectives.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </div>
            <ol data-testid="grid-hints">
              {step.hints.map((text, index) => (
                <li key={text} data-testid={`grid-hint-${index + 1}`}>
                  第 {index + 1} 层：{text}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <ol data-testid="grid-block-list">
          {blocks.map((block, index) => (
            <li key={`${block.type}-${index}`} data-testid={`grid-block-${index}`} data-block={block.type}>
              {index + 1}. {blockLabel(block)}
              {block.disconnected ? '（散块，不计入运行）' : ''}
            </li>
          ))}
        </ol>

        <div>
          <button type="button" data-testid="grid-save" disabled={!shell} onClick={() => shell?.save()}>
            保存作品
          </button>
        </div>
      </details>

      {!workMode && legacyImport?.ok ? (
        <div className="kc-v3-alert" data-testid="grid-legacy-import">
          {legacyImport.data.finished === true ? (
            <p data-testid="grid-legacy-import-finished">
              发现你在旧课堂已经完成了这节课（共 {legacyImport.importedSteps} 关有程序），要一键恢复吗？完成状态、通过记录、复盘选择和作品会一起带过来。
            </p>
          ) : (
            <p>
              发现你在旧课堂留下的草稿（到第 {legacyImport.fromStep + 1} 关，共{' '}
              {legacyImport.importedSteps} 关有程序），要一键导入吗？原来的通过记录会一起带过来。
            </p>
          )}
          <button type="button" data-testid="grid-import-legacy" onClick={handleImportLegacy}>
            一键导入旧草稿
          </button>{' '}
          <button type="button" data-testid="grid-dismiss-legacy" onClick={() => { legacyEligibleRef.current = false; setLegacyImport(null) }}>
            不用了
          </button>
        </div>
      ) : null}

      {notice && (
        <p className="kc-v3-alert" data-testid="grid-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  )
}
