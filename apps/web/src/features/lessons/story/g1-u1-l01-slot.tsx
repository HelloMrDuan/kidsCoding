/**
 * G1-U1-L01 编辑器插槽（StoryEditorSlot）：课程自有 EditorSlot。
 *
 * 内嵌真实 BlocklyWorkspace（单实例：切关不重建工作区，只按新关的程序
 * 数据重建画布上的积木，见 g1-u1-l01-blockly-ops.rebuildStoryProgram；
 * key 不再按关重建）。7 关流程（逐关标题/指导/预测/复盘/完成门控）与
 * 运行日志全部在插槽内；任务简报、方法步骤、三级提示、反馈三行、文件
 * 菜单由外壳渲染。
 *
 * 数据流（只经 onChange 交外壳，不得直接读写草稿键；运行/保存用
 * shell.*，不自建运行/保存状态机）：
 * - 编辑（快照变化）→ persist → onChange → 外壳防抖自动保存 + 旧判定失效。
 * - 运行由外壳经 StoryRunAdapter 完成；插槽观测 shell.judgment 的变化，
 *   对运行开始时那一关应用通过/失败副作用（passed / mistakes /
 *   observed），判定本身由适配器同步算出，插槽只复算同一程序取失败码。
 * - 提示揭示跟外壳抽屉走（ws-hint-reveal-{1,2,3}）；TIERED_HINTS 原文
 *   进契约不变；failures 计数不持久化，mistakes 仍记入草稿。
 *
 * 双台词（Q4/§5）：全局“选一句对白”按钮会改写全部 say_line（共享组件
 * 既有行为，保留原样），插槽内写明这一点；逐块配句走每块自己的下拉框——
 * 画布上该块的 LINE 字段，或下面逐块列表里的选句（经 Blockly 公共 API
 * 只改该块的 LINE 字段，不另造全局态）。新加的 say_line 默认取上次所选行。
 * 数字改参不适用：本课无数字参数（移动固定 100 步），不得造假参数。
 * ✕ 删除复用 BlocklyWorkspace 自带删除（选中 + 删除按钮、拖到垃圾桶）。
 */
'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  G1_U1_L01_STORY_LESSON,
  STORY_SAY_CHOICES,
  resolveStorySayText,
} from '@/content/curriculum/g1-u1-story-lessons'
import { getKidsBlockLabel } from '@/features/lessons/blockly/block-labels'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import type { EditorSlotProps, JudgmentResult } from '@/features/lessons/workspace/workspace-slots'

import {
  findStoryWorkspace,
  mainStoryStack,
  moveStoryBlock,
  rebuildStoryProgram,
  storySnapshot,
} from './g1-u1-l01-blockly-ops'
import { coerceStoryDraft, emptyStoryDraft, type StorySlotData } from './g1-u1-l01-draft'
import { judgeStoryProgram } from './g1-u1-l01-judging'

/**
 * 会话内最近一次好草稿（模块级，仅本页会话内有效）：外壳把外来课节的
 * 导入载荷交给插槽时（OPS-028 例外：壳不代判他课数据），插槽拒绝该载荷
 * 并把当前作品回显给外壳，避免外来数据被自动保存进本课键（L02 同款）。
 * 全新加载时 initial 只会是本课草稿或空草稿，lastGood 为空时回显空草稿。
 */
let lastGoodStoryDraft: StorySlotData | null = null

const BlocklyWorkspace = dynamic(
  () => import('@/features/lessons/blockly/blockly-workspace').then((m) => m.BlocklyWorkspace),
  { ssr: false },
)

function blockLabel(block: ProgramBlock): string {
  const base = getKidsBlockLabel(block.type)
  if (block.type === 'say_line') {
    return `${base}：${resolveStorySayText(block.line) ?? '未选对白'}`
  }
  return base
}

export function StoryEditorSlot({ initial, onChange, editable, shell, onJudgment }: EditorSlotProps) {
  const lesson = G1_U1_L01_STORY_LESSON
  const [draft, setDraft] = useState<StorySlotData>(() => coerceStoryDraft(initial))
  const draftRef = useRef(draft)
  draftRef.current = draft
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onJudgmentRef = useRef(onJudgment)
  onJudgmentRef.current = onJudgment
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [guess, setGuess] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  /** 最近一次运行所属的关（供运行日志展示用，与副作用同一定位）。 */
  const [lastRunStep, setLastRunStep] = useState<number>(draft.stepIndex)
  /** 运行开始时所在的关：判定副作用必须应用到那一关，而非切关后的关。 */
  const runStepRef = useRef<number>(draft.stepIndex)
  /** 该次运行是否经过 running=true 的异步播放（空帧运行同步结束，无此阶段）。 */
  const runAsyncRef = useRef(false)
  /** 已应用过副作用的那个判定对象（同一对象只应用一次）。 */
  const appliedJudgmentRef = useRef<JudgmentResult | null>(null)

  const step = lesson.steps[Math.min(draft.stepIndex, lesson.steps.length - 1)]
  const blocks: ProgramBlock[] = draft.programs[step.id] ?? step.starterBlocks ?? []
  const passedHere = draft.passed.includes(step.id)
  const observedHere = !step.errorLab || draft.observed.includes(step.id)
  const running = shell?.running ?? false
  const judgment = shell?.judgment ?? null
  const firstLoose = blocks.findIndex((block) => block.disconnected)
  const chainLength = firstLoose === -1 ? blocks.length : firstLoose

  const persist = useCallback((next: StorySlotData) => {
    draftRef.current = next
    lastGoodStoryDraft = next
    setDraft(next)
    onChangeRef.current(next)
  }, [])

  /**
   * 挂载时一次性处理外来课节导入：initial 的 lessonId 不是本课时，拒绝该
   * 载荷并回显会话内最近的好草稿（或空草稿），绝不把外来数据存进本课键。
   * 正常挂载（本课草稿 / 空草稿）不触发。
   */
  useEffect(() => {
    const raw = initial as { lessonId?: unknown } | null
    if (raw && typeof raw === 'object' && raw.lessonId !== undefined && raw.lessonId !== 'G1-U1-L01') {
      setNotice('导入文件属于其他课节，已拒绝，原作品未变。')
      const fallback = lastGoodStoryDraft ?? emptyStoryDraft()
      draftRef.current = fallback
      lastGoodStoryDraft = fallback
      setDraft(fallback)
      onChangeRef.current(fallback)
      // 回显的作品可能与画布上以外来数据挂载的程序不一致：按回显数据重建画布。
      const workspace = findStoryWorkspace(containerRef.current)
      if (workspace) {
        const fallbackStep = G1_U1_L01_STORY_LESSON.steps[fallback.stepIndex]
        rebuildStoryProgram(workspace, fallback.programs[fallbackStep.id] ?? [], STORY_SAY_CHOICES)
      }
    }
    // 仅挂载时执行一次；initial 在插槽生命周期内只由外壳在挂载/重置时给。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 快照变化即 persist（与旧课堂 handleSnapshot 同语义，含去重）。 */
  const handleSnapshot = useCallback(
    (next: ProgramBlock[]) => {
      const current = draftRef.current
      const key = lesson.steps[Math.min(current.stepIndex, lesson.steps.length - 1)].id
      if (JSON.stringify(current.programs[key] ?? null) === JSON.stringify(next)) return
      persist({ ...current, programs: { ...current.programs, [key]: next } })
    },
    [lesson, persist],
  )

  /** 切关：画布按新关程序重建积木，工作区实例不重建（快照一致时跳过）。 */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const workspace = findStoryWorkspace(container)
    if (!workspace) return
    const target = draftRef.current.programs[step.id] ?? step.starterBlocks ?? []
    if (JSON.stringify(storySnapshot(workspace)) === JSON.stringify(target)) return
    rebuildStoryProgram(workspace, target, STORY_SAY_CHOICES)
  }, [step.id, step.starterBlocks])

  /** 运行开始时记下关号（shell.judgment 到达时可能已切关）。 */
  useEffect(() => {
    if (running) {
      runStepRef.current = draftRef.current.stepIndex
      runAsyncRef.current = true
    }
  }, [running])

  /** 判定到达：对运行开始时那一关应用通过/失败副作用（只应用一次）。
   *
   *  竞态（E1 实测）：副作用经 persist → onChange 交给外壳时，外壳的
   *  handleEditorSlotChange 会把当前正显示的判定当作“编辑后失效”清掉
   *  （setJudgment(null) + stale），导致运行结论刚出现就消失。所以每次
   *  persist 之后必须经 OPS-025 的 onJudgment 把同一个判定对象原样
   *  再上报一次，外壳重新显示它；appliedJudgmentRef 保证同一对象不
   *  会被重复应用，不会循环。未 persist 的分支（错误实验先观察、
   *  已通过重跑）不触发清除，也无需再上报。 */
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
    const runStep = lesson.steps[runStepIndex]
    if (!runStep) return
    const result = judgeStoryProgram(current.programs[runStep.id] ?? [])
    if (result.passed) {
      if (runStep.errorLab && !current.observed.includes(runStep.id)) {
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
      const seen = runStep.errorLab && result.failure === 'move_only' && !current.observed.includes(runStep.id)
      const mistakes = current.mistakes.includes(result.failure)
        ? current.mistakes
        : [...current.mistakes, result.failure]
      persist({
        ...current,
        mistakes,
        ...(seen ? { observed: [...current.observed, runStep.id] } : {}),
      })
      onJudgmentRef.current?.(judgment)
    }
  }, [judgment, lesson, persist])

  /** 最近一次运行的日志（仅当判定仍有效且仍在运行那一关时展示）。 */
  const lastRun = useMemo(() => {
    if (!judgment) return null
    if (draft.stepIndex !== lastRunStep) return null
    return judgeStoryProgram(draft.programs[step.id] ?? [])
  }, [judgment, draft, step.id, lastRunStep])

  function goToStep(index: number) {
    const current = draftRef.current
    setGuess(null)
    setNotice(null)
    persist({ ...current, stepIndex: index, finished: false })
  }

  function restoreStarter() {
    const current = draftRef.current
    const starter = step.starterBlocks ?? []
    const workspace = findStoryWorkspace(containerRef.current)
    if (workspace) rebuildStoryProgram(workspace, starter, STORY_SAY_CHOICES)
    setNotice(null)
    persist({ ...current, programs: { ...current.programs, [step.id]: starter } })
  }

  function handleComplete() {
    const current = draftRef.current
    if (step.kind === 'guided' || step.kind === 'design' || step.kind === 'review') {
      if (current.stepIndex < lesson.steps.length - 1) goToStep(current.stepIndex + 1)
      else {
        persist({ ...current, finished: true })
      }
      return
    }
    if (step.errorLab && !observedHere) {
      setNotice('这是错误实验：先按原样运行一次，亲眼看看错在哪，再修好它。')
      return
    }
    if (!passedHere) {
      setNotice('先按“运行”，让狐狸真的先打招呼再移动，才能完成这一关。')
      return
    }
    if (current.stepIndex < lesson.steps.length - 1) goToStep(current.stepIndex + 1)
    else persist({ ...current, finished: true })
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const workspace = findStoryWorkspace(containerRef.current)
    if (!workspace) {
      setNotice('工作区还没准备好，稍后再试。')
      return
    }
    if (!moveStoryBlock(workspace, index, direction)) {
      setNotice('这块积木不能再往这个方向移了。')
    }
  }

  function setBlockLine(index: number, lineId: string) {
    const workspace = findStoryWorkspace(containerRef.current)
    if (!workspace) return
    const block = mainStoryStack(workspace)[index]
    block?.getField('LINE')?.setValue(lineId)
  }

  if (!editable) {
    return (
      <div data-testid="g1-u1-l01-slot-readonly">
        <p>本课为只读预览：{lesson.title}，共 {lesson.steps.length} 关。</p>
        <p>当前是第 {draft.stepIndex + 1} 关：{step.title}</p>
      </div>
    )
  }

  if (draft.finished) {
    return (
      <section data-testid="g1-u1-l01-finished">
        <p>🎉 {lesson.title}：{lesson.steps.length} 关全部真的跑通了！</p>
        <p>给家长：{lesson.parentQuestion}</p>
        <p>这是实验课，成绩只保存在本机，不是正式课程成绩。</p>
        <div>
          {lesson.steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              data-testid={`g1-u1-l01-replay-${s.id}`}
              onClick={() => goToStep(i)}
            >
              再玩：{s.title}
            </button>
          ))}
          <Link href={`/learn/catalog/${lesson.id}`}>回到课程介绍</Link>
        </div>
      </section>
    )
  }

  const guessPicked = guess === null ? null : step.predictChoices?.[guess]

  // 画布 Gate 1（平板 ≥300px、手机 ≥220px，有效可视高度 = 视口 ∩ 画布）：
  // 画布上方只留一行紧凑步骤行（进度 + 标题 + 完成按钮）；指导、预测、
  // 创意、关间导航移到画布下方（仍在同一插槽内，testid 不变），否则
  // 768×1024 与 375×812 首屏画布均不足（实测 241px / 40px）。外壳顶栏、
  // 目标条、舞台、运行条为共享布局，本课不动；本课只压缩自己的画布上
  // 方内容。任务简报与三级提示仍在外壳任务抽屉内，无需滚动可达。
  // E7（2026-11-12）：通过标记只写 ✓ 不写“（已通过）”，否则第 3 关
  // 通过后步骤行换行、画布顶再下沉约 30px。
  return (
    <div ref={containerRef} data-testid="g1-u1-l01-slot">
      <div
        data-testid="g1-u1-l01-step-header"
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 6px' }}
      >
        <p data-testid="g1-u1-l01-step-progress">
          第 {draft.stepIndex + 1} / {lesson.steps.length} 关{passedHere ? ' ✓' : ''}
        </p>
        <h3 data-testid="g1-u1-l01-step-title">
          第 {draft.stepIndex + 1} 关：{step.title}
        </h3>
        <button type="button" data-testid="g1-u1-l01-complete-step" onClick={handleComplete}>
          {draft.stepIndex === lesson.steps.length - 1 ? '完成本课' : '完成这一关'}
        </button>
      </div>

      <BlocklyWorkspace
        allowedBlocks={step.allowedBlocks}
        blocks={blocks}
        enableProgramTools
        snapStartOnTop
        sayLineChoices={STORY_SAY_CHOICES}
        onSnapshotChange={handleSnapshot}
      />

      <div data-testid="g1-u1-l01-step-guide">
        <p data-testid="g1-u1-l01-instruction">{step.instruction}</p>

        <div data-testid="g1-u1-l01-predict">
          <p>🤔 {step.predict}</p>
          {step.predictChoices ? (
            <div data-testid="g1-u1-l01-predict-choices">
              {step.predictChoices.map((choice, i) => (
                <button
                  key={choice.text}
                  type="button"
                  data-testid={`g1-u1-l01-predict-choice-${i}`}
                  data-chosen={guess === i ? 'true' : 'false'}
                  aria-pressed={guess === i}
                  onClick={() => setGuess(i)}
                >
                  {choice.text}
                </button>
              ))}
            </div>
          ) : null}
          {guessPicked ? <p>你猜“{guessPicked.text}”。运行后对照一下，猜错也没关系。</p> : null}
        </div>

        {step.creative ? (
          <div data-testid="g1-u1-l01-creative">
            <p>🎤 {step.creative.prompt}</p>
          </div>
        ) : null}

        <div data-testid="g1-u1-l01-step-nav">
          {lesson.steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              data-testid={`g1-u1-l01-goto-${s.id}`}
              aria-current={i === draft.stepIndex}
              onClick={() => goToStep(i)}
            >
              第 {i + 1} 关{draft.passed.includes(s.id) ? ' ✓' : ''}
            </button>
          ))}
        </div>
      </div>

      <p data-testid="g1-u1-l01-line-note">
        提醒：“选一句对白”按钮会改写全部“说一句话”积木；要给两块各配一句，用每块积木自己的
        下拉框（点积木上的对白小箭头），或下面列表里每块后面的选句。
      </p>
      <ol data-testid="g1-u1-l01-block-list">
        {blocks.map((block, index) => (
          <li key={`${block.type}-${index}`} data-testid={`g1-u1-l01-block-${index}`}>
            <span>
              {index + 1}. {blockLabel(block)}
              {block.disconnected ? '（散块，不计入运行）' : ''}
            </span>{' '}
            <button
              type="button"
              data-testid={`g1-u1-l01-block-up-${index}`}
              disabled={index <= 1 || index >= chainLength}
              onClick={() => moveBlock(index, -1)}
              aria-label={`第 ${index + 1} 块上移`}
            >
              ↑
            </button>{' '}
            <button
              type="button"
              data-testid={`g1-u1-l01-block-down-${index}`}
              disabled={index < 1 || index >= chainLength - 1}
              onClick={() => moveBlock(index, 1)}
              aria-label={`第 ${index + 1} 块下移`}
            >
              ↓
            </button>
            {block.type === 'say_line' && index < chainLength ? (
              <label>
                选句
                <select
                  data-testid={`g1-u1-l01-block-line-${index}`}
                  value={block.line ?? 'opening'}
                  onChange={(event) => setBlockLine(index, event.target.value)}
                >
                  {STORY_SAY_CHOICES.map((choice) => (
                    <option key={choice.id} value={choice.id}>
                      {choice.text}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </li>
        ))}
      </ol>

      <div>
        <button
          type="button"
          data-testid="g1-u1-l01-run"
          disabled={!shell}
          onClick={() => shell?.run()}
        >
          {running ? '停止' : '▶ 运行'}
        </button>{' '}
        <button type="button" data-testid="g1-u1-l01-save" disabled={!shell} onClick={() => shell?.save()}>
          保存作品
        </button>{' '}
        {step.errorLab && !observedHere && JSON.stringify(blocks) !== JSON.stringify(step.starterBlocks ?? []) ? (
          <button type="button" data-testid="g1-u1-l01-restore-starter" onClick={restoreStarter}>
            换回原来的错误程序
          </button>
        ) : null}
      </div>

      {notice && <p data-testid="g1-u1-l01-notice">{notice}</p>}

      {step.kind === 'review' ? (
        <div data-testid="g1-u1-l01-reflection">
          <p>💭 想一想：{lesson.reflection.question}</p>
          <div>
            {lesson.reflection.options.map((option, i) => (
              <button
                key={option.text}
                type="button"
                data-testid={`g1-u1-l01-reflection-option-${i}`}
                data-chosen={draft.reflection === i ? 'true' : 'false'}
                data-correct={option.correct ? 'true' : 'false'}
                onClick={() => persist({ ...draftRef.current, reflection: i })}
              >
                {option.text}
              </button>
            ))}
          </div>
          {draft.reflection !== undefined ? (
            <p data-testid="g1-u1-l01-reflection-result" data-correct={lesson.reflection.options[draft.reflection].correct ? 'true' : 'false'}>
              {lesson.reflection.why}
            </p>
          ) : null}
          <p>给家长：{lesson.parentQuestion}</p>
        </div>
      ) : null}

      {lastRun ? (
        <ol data-testid="g1-u1-l01-run-log">
          {lastRun.log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
