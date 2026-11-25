/**
 * OPS-053：G0-U2 六节事件课共用的 V3 编辑器插槽（EventEditorSlot）。
 *
 * 六节课共用这一个插槽（禁止每课复制工作台外壳）：内容全部来自 `EventLesson`
 * 课程数据，插槽只负责把真实 BlocklyWorkspace（每个可编辑角色一块 docked 画布，
 * 用“给谁拼”标签切换）与四步教学、旧草稿兼容导入接进 V3 外壳。任务简报、方法
 * 步骤、三级提示、反馈三行、文件菜单由外壳渲染。
 *
 * 数据流（与 grid-v3 同一套，只经 onChange 交外壳）：
 * - 编辑（某角色快照变化）→ 按角色合并进本关 programs → persist → onChange；
 *   编辑会清掉本关通过记录与完成态，并 runAdapter.reset()、清空自由试玩。
 * - 运行检查由外壳经 EventRunAdapter 完成；插槽观测 shell.judgment，用运行快照
 *   里那一关的真实检查结果应用副作用（只应用一次）：
 *   · 通过且错误实验已亲眼看到过错误 → 记 passed；
 *   · 错误实验跑通但还没看过错 → 只提示，不记通过（旧课堂语义）；
 *   · 真实失败 → failures+1、记下真实失败码；跑出设计错误 → 同时记 observed。
 * - 创意关选角色、恢复预置程序、再给点提示、复盘选择、重玩某关由舞台插槽经路由
 *   store 写回草稿；本插槽的采纳 effect 接到后自动保存。
 * - 切关（goToStep）先 runAdapter.reset() 再 persist。
 *
 * 旧事件课堂草稿（`kids-event-lesson-v1:<id>`，从未按账号分键）只读兼容，严格
 * 归属策略与 OPS-052 grid 相同：仅当新草稿为空、且归属当前 owner 已确认时提示
 * 一键导入；归属无法确认时不读内容，只提示原草稿已保留。提示出现后任何新数据写入
 * （编辑、运行判定、舞台写回、切关）即撤销导入资格；点击导入时重新校验身份、
 * 归属与草稿仍为空。旧键原样保留，永不删除、永不覆盖，也不写认领戳。
 */
'use client'

import dynamic from 'next/dynamic'
import { Fragment, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { getKidsBlockLabel } from '@/features/lessons/blockly/register-kids-blocks'
import { LessonDraftOwnerContext } from '@/features/lessons/lesson-draft-boundary'
import { BlocklyStudioMission, BlocklyStudioSteps } from '@/features/lessons/workspace/blockly-studio-layout'
import type { EditorSlotProps, JudgmentResult } from '@/features/lessons/workspace/workspace-slots'

import { EVENT_HATS, type EventActorId, type EventBlock } from '../event/event-engine'
import {
  coerceEventDraft,
  emptyEventDraft,
  eventActorProgram,
  eventStarterPrograms,
  hasLegacyEventDraft,
  hasUnclaimableLegacyEventDraft,
  importLegacyEventDraft,
  isEmptyEventDraft,
  type EventSlotData,
} from './event-v3-draft'
import { eventActorName } from './event-v3-run-adapter'
import { useEventSession, useEventSessionState } from './event-v3-session'

const BlocklyWorkspace = dynamic(
  () => import('@/features/lessons/blockly/blockly-workspace').then((m) => m.BlocklyWorkspace),
  { ssr: false },
)

/** 会话内最近一次好草稿（模块级，仅本页会话内有效；外来课节导入时回显）。 */
let lastGoodEventDraft: EventSlotData | null = null

/** 仅单测用：把模块级 lastGood 复位到全新加载状态。 */
export function resetEventSlotLastGoodForTest(): void {
  lastGoodEventDraft = null
}

export const EVENT_PICK_PROMPT = '先在上面选好一位朋友，再拼程序运行检查。'

/** 重复积木读作“重复 3 次（发光、熄灭）”。 */
function blockText(block: EventBlock): string {
  if (!block.body) return getKidsBlockLabel(block.type)
  return `重复 ${block.times ?? 2} 次（${block.body.map(blockText).join('、') || '空'}）`
}

export function EventEditorSlot({ initial, onChange, editable, shell, onJudgment }: EditorSlotProps) {
  // 进度归属人来自外壳边界；单测直接渲染插槽时没有边界 → 身份未知，旧草稿一律不读。
  const draftOwner = useContext(LessonDraftOwnerContext)
  const { lesson, store, runAdapter } = useEventSession()
  const sessionState = useEventSessionState()
  const [draft, setDraft] = useState<EventSlotData>(() => coerceEventDraft(lesson, initial))
  const draftRef = useRef(draft)
  draftRef.current = draft
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onJudgmentRef = useRef(onJudgment)
  onJudgmentRef.current = onJudgment
  const [notice, setNotice] = useState<string | null>(null)
  const [legacyImport, setLegacyImport] = useState<ReturnType<typeof importLegacyEventDraft> | null>(null)
  /** 导入资格：提示出现即为 true；之后任何新数据写入立即撤销且不可恢复。 */
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

  const stepIndex = Math.min(Math.max(draft.stepIndex, 0), lesson.steps.length - 1)
  const step = lesson.steps[stepIndex]
  const stepId = step.id
  const editing = sessionState.editing
  const actor: EventActorId = editing && step.editable.includes(editing) ? editing : step.editable[0]
  const actorRef = useRef(actor)
  actorRef.current = actor
  const blocks: EventBlock[] = eventActorProgram(step, draft, actor)
  const passedHere = draft.passed.includes(stepId)
  const isLastStep = stepIndex >= lesson.steps.length - 1
  const running = shell?.running ?? false
  const judgment = shell?.judgment ?? null
  const playing = runAdapter.getExecutionSnapshot().playing

  const persist = useCallback(
    (next: EventSlotData) => {
      // 任何新数据写入都撤销旧草稿导入资格（导入本身先撤销再 persist）。
      revokeLegacyImport()
      draftRef.current = next
      lastGoodEventDraft = next
      setDraft(next)
      store.setState({ draft: next })
      onChangeRef.current(next)
    },
    [store, revokeLegacyImport],
  )

  /** 挂载时一次性处理：外来课节拒绝、store 镜像初始化、旧草稿导入提示。 */
  useEffect(() => {
    const raw = initial as { lessonId?: unknown } | null
    if (raw && typeof raw === 'object' && raw.lessonId !== undefined && raw.lessonId !== lesson.id) {
      setNotice('导入文件属于其他课节，已拒绝，原作品未变。')
      const fallback = lastGoodEventDraft ?? emptyEventDraft(lesson)
      draftRef.current = fallback
      lastGoodEventDraft = fallback
      setDraft(fallback)
      store.setState({ draft: fallback, editorRevision: store.getState().editorRevision + 1 })
      onChangeRef.current(fallback)
      return
    }
    const coerced = coerceEventDraft(lesson, initial)
    store.setState({ draft: coerced })
    if (isEmptyEventDraft(lesson, coerced)) {
      if (hasLegacyEventDraft(lesson, draftOwner)) {
        const imported = importLegacyEventDraft(lesson, draftOwner)
        if (imported.ok) {
          legacyEligibleRef.current = true
          setLegacyImport(imported)
        } else {
          setNotice(`旧课堂的草稿没能导入：${imported.reason}`)
        }
      } else if (hasUnclaimableLegacyEventDraft(lesson, draftOwner)) {
        // 无法确认属于当前账号：不读内容、不展示、不导入，旧键原样保留。
        setNotice('这台设备上有旧课堂留下的草稿，但无法确认属于当前账号，不能自动恢复；原草稿已原样保留。')
      }
    }
    // 仅挂载时执行一次；initial 在插槽生命周期内只由外壳在挂载/重置时给。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 采纳舞台插槽经 store 写回的草稿（读 store 实时值；JSON 比较防循环）。 */
  useEffect(() => {
    const storeDraft = store.getState().draft
    if (JSON.stringify(storeDraft) !== JSON.stringify(draftRef.current)) {
      revokeLegacyImport()
      draftRef.current = storeDraft
      lastGoodEventDraft = storeDraft
      setDraft(storeDraft)
      onChangeRef.current(storeDraft)
    }
  }, [sessionState.draft, store, revokeLegacyImport])

  /** 当前角色画布快照变化即 persist（按角色合并，含去重）。 */
  const handleSnapshot = useCallback(
    (next: EventBlock[]) => {
      const current = draftRef.current
      const index = Math.min(Math.max(current.stepIndex, 0), lesson.steps.length - 1)
      const currentStep = lesson.steps[index]
      const who = actorRef.current
      if (!currentStep.editable.includes(who)) return
      if (JSON.stringify(eventActorProgram(currentStep, current, who)) === JSON.stringify(next)) return
      // 程序变了：本关的通过记录与整课完成状态都不再被这份程序证明。
      persist({
        ...current,
        programs: {
          ...current.programs,
          [currentStep.id]: { ...eventStarterPrograms(currentStep), ...(current.programs[currentStep.id] ?? {}), [who]: next },
        },
        passed: current.passed.filter((id) => id !== currentStep.id),
        finished: false,
      })
      runAdapter.reset()
      store.setState({ play: [] })
      setNotice(null)
    },
    [lesson, persist, runAdapter, store],
  )

  /**
   * 判定到达：按运行快照定位真实检查的那一关，应用副作用且只应用一次。
   * persist 会触发外壳判定失效，须把同一判定对象经 onJudgment 原样再上报一次。
   */
  useEffect(() => {
    if (!judgment) return
    const execution = runAdapter.getExecutionSnapshot()
    const runStepIndex = execution.stepIndex
    const check = execution.check
    if (runStepIndex === null || check === null) return
    if (appliedJudgmentRef.current === judgment) return
    appliedJudgmentRef.current = judgment
    const runStep = lesson.steps[runStepIndex]
    if (!runStep) return
    const current = draftRef.current
    const observed = current.observed?.includes(runStep.id) ?? false
    if (check.passed) {
      if (runStep.errorLab && !observed) {
        // 错误实验：先按原样跑出错、亲眼看到，修好才算通过。
        if (Math.min(current.stepIndex, lesson.steps.length - 1) === runStepIndex) {
          setNotice('程序成功了！不过这是错误实验：先按原样运行检查一次，看看错在哪，再来修。')
        }
        return
      }
      if (!current.passed.includes(runStep.id)) {
        persist({ ...current, passed: [...current.passed, runStep.id] })
        onJudgmentRef.current?.(judgment)
      }
      return
    }
    const failure = check.failure
    if (!failure) return
    const designedMistake = !!runStep.errorLab && failure === runStep.errorLab.expect && !observed
    const mistakes = current.mistakes ?? []
    persist({
      ...current,
      failures: current.failures + 1,
      ...(mistakes.includes(failure) ? {} : { mistakes: [...mistakes, failure] }),
      ...(designedMistake ? { observed: [...(current.observed ?? []), runStep.id] } : {}),
    })
    onJudgmentRef.current?.(judgment)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [judgment])

  function chooseActor(id: EventActorId) {
    if (id === actor) return
    store.setState({ editing: id })
  }

  function goToStep(index: number) {
    const current = draftRef.current
    setNotice(null)
    setLegacyImport(null)
    // 关卡边界：先同步清掉上一关的运行快照与判定，再切关。
    runAdapter.reset()
    store.setState({ guess: null, editing: null, play: [] })
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
          ? EVENT_PICK_PROMPT
          : !observed
            ? '这是错误实验：先按原样运行检查一次，亲眼看看错在哪，再修好它。'
            : '先按“运行检查”，让舞台真的符合目标，才能完成这一关。',
      )
      return
    }
    if (current.stepIndex < lesson.steps.length - 1) {
      goToStep(current.stepIndex + 1)
      setNotice(`第 ${current.stepIndex + 1} 关已完成，开始下一关吧！`)
      return
    }
    persist({ ...current, finished: true })
    setNotice('全部关卡都真的检查通过了！看看舞台上的复盘和作品卡吧。')
  }

  function handleImportLegacy() {
    if (!legacyImport || !legacyImport.ok) return
    const eligible = legacyEligibleRef.current
    // 先撤销资格并收起提示：这次点击之后都不能再导入一次。
    legacyEligibleRef.current = false
    setLegacyImport(null)
    // 点击时重新校验：资格仍在、当前草稿仍为空、并按当前身份与归属重新读取。
    if (!eligible || !isEmptyEventDraft(lesson, draftRef.current)) {
      setNotice('你已经开始了新的作品，旧草稿不会覆盖它；原草稿已原样保留。')
      return
    }
    const fresh = importLegacyEventDraft(lesson, draftOwnerRef.current)
    if (!fresh.ok) {
      setNotice('无法再确认旧草稿属于当前账号，没有导入；原草稿已原样保留。')
      return
    }
    setNotice(
      fresh.data.finished === true
        ? `已恢复旧课堂里完成的这节课（共 ${fresh.importedSteps} 关有程序），完成状态、通过记录、复盘选择和作品都带过来了。`
        : `已导入旧课堂的草稿（到第 ${fresh.fromStep + 1} 关，共 ${fresh.importedSteps} 关有程序），原来的通过记录也一起带过来了。`,
    )
    runAdapter.reset()
    persist(fresh.data)
    // 旧草稿可能改了当前关程序：重建画布，确保显示的是导入后的积木。
    store.setState({ editing: null, play: [], editorRevision: store.getState().editorRevision + 1 })
  }

  if (!editable) {
    return (
      <div data-testid="event-slot-readonly">
        <p>本课为只读预览：{lesson.title}，共 {lesson.steps.length} 关。</p>
        <p>当前是第 {stepIndex + 1} 关：{step.title}</p>
      </div>
    )
  }

  const preferredBlock = step.allowedBlocks.find((type) => !(EVENT_HATS as readonly string[]).includes(type))

  return (
    <div className="kc-v3-slot-editor" data-testid="event-slot" style={{ height: '100%', overflowY: 'auto' }}>
      <BlocklyStudioMission>
        <div data-testid="grid-step-header" className="kc-v3-task">
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
          <button type="button" data-testid="grid-complete-step" disabled={playing || running} onClick={handleComplete}>
            {isLastStep ? '完成本课' : '完成这一关'}
          </button>
        </div>
      </BlocklyStudioMission>

      <BlocklyStudioSteps>
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
        <span className="kc-v3-step-note">
          第 {stepIndex + 1} / {lesson.steps.length} 关 · {step.title}
        </span>
      </BlocklyStudioSteps>

      <div
        className="flex flex-wrap items-center gap-2 px-1"
        role="tablist"
        aria-label="给哪个角色拼积木"
        data-testid="event-edit-tabs"
      >
        <span className="text-sm font-bold">给谁拼：</span>
        {step.editable.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={id === actor}
            className="kc-reflect-option kc-choice-compact"
            data-testid={`event-edit-${id}`}
            data-chosen={id === actor ? 'true' : 'false'}
            disabled={playing}
            onClick={() => chooseActor(id)}
          >
            {eventActorName(step, id)}
          </button>
        ))}
      </div>

      <BlocklyWorkspace
        key={`${step.id}:${actor}:${sessionState.editorRevision}`}
        allowedBlocks={step.allowedBlocks}
        blocks={blocks}
        // 与 G0-U1 同一套 V3 docked 编辑器；每个可编辑角色各自一块画布（按 key 重建）。
        docked={{ stepKey: step.id, preferredBlock }}
        enableProgramTools
        snapStartOnTop
        layoutMode="golden"
        // 挂载不是编辑：初始脚本故意把“开始时”放在下面（错误实验），Blockly 重建成
        // 两条积木串；若挂载即上报，会被当成编辑而落盘并撤销旧草稿导入资格。
        reportMountNormalization={false}
        onSnapshotChange={handleSnapshot}
      />

      <details className="kc-v3-editor-details">
        <summary>本关目标、三级提示与积木清单</summary>
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
        <ol data-testid="grid-block-list" data-actor={actor}>
          {blocks.map((block, index) => (
            <li key={`${block.type}-${index}`} data-testid={`grid-block-${index}`} data-block={block.type}>
              {index + 1}. {blockText(block)}
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

      {legacyImport?.ok ? (
        <div className="kc-v3-alert" data-testid="grid-legacy-import">
          {legacyImport.data.finished === true ? (
            <p data-testid="grid-legacy-import-finished">
              发现你在旧课堂已经完成了这节课（共 {legacyImport.importedSteps} 关有程序），要一键恢复吗？完成状态、通过记录、复盘选择和作品会一起带过来。
            </p>
          ) : (
            <p>
              发现你在旧课堂留下的草稿（到第 {legacyImport.fromStep + 1} 关，共 {legacyImport.importedSteps}{' '}
              关有程序），要一键导入吗？原来的通过记录会一起带过来。
            </p>
          )}
          <button type="button" data-testid="grid-import-legacy" onClick={handleImportLegacy}>
            一键导入旧草稿
          </button>{' '}
          <button
            type="button"
            data-testid="grid-dismiss-legacy"
            onClick={() => {
              legacyEligibleRef.current = false
              setLegacyImport(null)
            }}
          >
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
