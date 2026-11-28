/**
 * OPS-052：G0-U1 六节 grid 课共用的 V3 舞台插槽（GridStageSlot）。
 *
 * 只渲染，不跑第二个播放器：唯一的运行与判定来源是 GridRunAdapter。
 * 舞台按适配器的执行快照（run + frameIndex）逐帧呈现真实引擎结果——
 * 旧课堂的 useGridPlayback 有独立计时器，在 V3 里会出现第二个时钟，
 * 主舞台不复用它（只有完成页里自成一体的作品卡回放继续用它）。
 *
 * 舞台承担的课程交互（与旧课堂一致）：
 * - 先猜一猜（会话内，不持久化）与猜对/猜错说明；
 * - 创意关选目标格（写入草稿，换目标格即清掉本关通过记录）；
 * - 真实运行反馈：通过 / 设计错误 / 诊断 + 出错积木定位 / 未到时提示；
 * - 三层提示随真实失败次数逐层揭示（“再给点提示”同样记一次失败）；
 * - 错误实验可一键“换回原来的错误程序”（重建画布、清掉本关通过）；
 * - 整课完成后：复盘、反思选择、真实作品卡、重玩任关、回课程介绍。
 * 运行/停止/重来按钮由外壳经 sceneActions 传进来，舞台只负责摆位置。
 */
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import type { GridLesson, GridLessonStep } from '@/content/curriculum/g0-u1-grid-lessons'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { getKidsBlockLabel } from '@/features/lessons/blockly/register-kids-blocks'
import { ReadAloudButton } from '@/features/lessons/voice/read-aloud'
import type { StageSlotProps } from '@/features/lessons/workspace/workspace-slots'

import { runGridProgram, type GridFailure, type GridRun } from '../grid/grid-engine'
import { failingBlockNote, MISTAKE_LABELS, stepLevel } from '../grid/grid-lab'
import { GridStage, useGridPlayback, type GridStageState } from '../grid/grid-stage'
import { gridStarterProgram, type GridSlotData } from './grid-v3-draft'
import { useGridSession, useGridSessionState } from './grid-v3-session'
import { gridActorName, gridStageLabel } from './grid-v3-actor'

function goalPromptFor(step: GridLessonStep): string {
  const creative = step.creative
  if (creative?.layouts) return '先选围栏的边长，再运行。'
  if (creative?.patterns) return '先选一种脚印节奏，再运行。'
  if (creative?.waters) return '先选有几个水坑，再运行。'
  if (creative?.pots) return '先选要浇哪一种花园，再运行。'
  return '先选一格，把蘑菇屋搬过去，再运行。'
}

export function GridStageSlot({ sceneActions }: StageSlotProps) {
  const { lesson, store, runAdapter } = useGridSession()
  const sessionState = useGridSessionState()
  const draft = sessionState.draft
  const [notice, setNotice] = useState<string | null>(null)

  // 关卡边界清快照：主清理在编辑插槽 goToStep（persist 之前同步执行），
  // 这里覆盖一切绕过 goToStep 的切关路径（例如旧草稿导入落在别的关），
  // 挂载时同样执行一次（适配器本就是 idle，无副作用）。
  useEffect(() => {
    runAdapter.reset()
  }, [runAdapter, draft.stepIndex])

  const observation = runAdapter.getExecutionSnapshot()
  const step = lesson.steps[Math.min(Math.max(draft.stepIndex, 0), lesson.steps.length - 1)]
  const stepId = step.id
  const blocks: ProgramBlock[] = draft.programs[stepId] ?? gridStarterProgram(step)
  const passedHere = draft.passed.includes(stepId)
  const observedHere = !step.errorLab || !!draft.observed?.includes(stepId)
  const needsGoal = !!step.creative && !draft.creative?.[step.id]
  const goalPrompt = goalPromptFor(step)
  const level = observation.stepId === stepId && observation.level
    ? observation.level
    : stepLevel(step, draft)
  const run = observation.stepId === stepId ? observation.run : null
  const frames = run?.frames ?? []
  const index = run ? observation.frameIndex : -1
  const start: GridStageState = {
    x: level.start.x,
    y: level.start.y,
    facing: level.start.facing,
    hasKey: false,
    doorOpen: !level.door,
  }
  const display: GridStageState = index >= 0 ? frames[index] ?? start : start
  const trail = [
    { x: level.start.x, y: level.start.y },
    ...frames.slice(0, index + 1).map((item) => ({ x: item.x, y: item.y })),
  ]
  const stamps = frames.slice(0, index + 1).flatMap((item) => (item.stamp ? [item.stamp] : []))
  const watered = frames.slice(0, index + 1).flatMap((item) => (item.water ? [item.water] : []))
  const done = !!run && index >= frames.length - 1
  const playing = !!run && !done && observation.playing
  // 外壳“停止”后适配器进入 idle 且保留本次 run（stop 不清快照）；
  // 运行结束则是 success/error，reset 后 run 为 null。据此派生停止提示，
  // 不需要额外 effect 写状态。
  const stopped = !!run && !observation.playing && observation.executionState === 'idle'
  const guess = sessionState.guess
  // 角色名在 memo 外派生成字符串，memo 只依赖纯值。
  const actorName = gridActorName(step.level)
  // 舞台 aria-label 只读原始值拼字符串：不把 run 派生的帧对象交给函数，
  // React Compiler 才能确认 feedback 的 memo 依赖之后不会被改写。
  const stageLabel = gridStageLabel(
    { actor: level.actor, cols: level.cols, rows: level.rows },
    { x: display.x, y: display.y, facing: display.facing },
  )

  const feedback = useMemo(() => {
    if (notice) return { tone: 'warning', text: notice }
    if (needsGoal) return { tone: 'warning', text: goalPrompt }
    if (stopped) {
      return { tone: 'warning', text: '已停止。积木还在，可以改完再运行。' }
    }
    if (!run) {
      return {
        tone: 'idle',
        text: passedHere
          ? '这一关已经通过。可以再试一种不同的程序，或者点“完成这一关”。'
          : `想好了就按“运行”，看看${actorName}会不会按你猜的走。`,
      }
    }
    if (!done) return { tone: 'idle', text: `${actorName}正在按积木一块一块走……` }
    const outcome = run.passed ? 'pass' : run.failure
    const picked = guess === null ? null : step.predictChoices?.[guess]
    const guessNote = picked
      ? picked.when === outcome
        ? `你猜“${picked.text}”，猜对了！`
        : `你猜“${picked.text}”，实际不一样，猜错也没关系，看看发生了什么。`
      : ''
    if (run.passed && !observedHere) {
      return {
        tone: 'warning',
        text: '程序成功了！不过这是错误实验：先按原样运行一次，看看错在哪，再来修。',
      }
    }
    if (run.passed) return { tone: 'success', text: `🎉 ${guessNote}${run.message}` }
    if (step.errorLab && run.failure === step.errorLab.expect) {
      return {
        tone: 'error',
        text: `${guessNote}预想：${step.errorLab.expected} 实际：${step.errorLab.actual} 现在把它修好吧。`,
      }
    }
    const diagnosis = lesson.diagnoses[run.failure!] ?? run.message
    const pointer = failingBlockNote(run, blocks)
    const text = run.failure === 'not_at_goal' ? `${diagnosis}（${run.message}）` : diagnosis
    return { tone: 'error', text: `${guessNote}${pointer ? `${text}${pointer}` : text}` }
  }, [notice, needsGoal, goalPrompt, stopped, run, done, passedHere, lesson.diagnoses, blocks, guess, step, observedHere, actorName])

  const hintLayer = draft.failures === 0 ? -1 : Math.min(draft.failures - 1, 2)
  const hintCopy = hintLayer >= 0 ? `（第 ${hintLayer + 1} 层）${step.hints[hintLayer]}` : undefined

  function updateDraft(next: GridSlotData) {
    store.setState({ draft: next })
  }

  function chooseGuess(choice: number) {
    store.setState({ guess: choice })
  }

  function chooseGoal(choice: number) {
    const goal = step.creative!.goalChoices[choice]
    runAdapter.reset()
    setNotice(null)
    // 目标格换了：旧通过记录不再证明这张地图。
    updateDraft({
      ...draft,
      creative: { ...(draft.creative ?? {}), [step.id]: { goal } },
      passed: draft.passed.filter((id) => id !== step.id),
      finished: false,
    })
  }

  function restoreStarter() {
    runAdapter.reset()
    setNotice(null)
    store.setState({
      draft: {
        ...draft,
        programs: { ...draft.programs, [step.id]: gridStarterProgram(step) },
        passed: draft.passed.filter((id) => id !== step.id),
        finished: false,
      },
      editorRevision: store.getState().editorRevision + 1,
    })
  }

  function showMoreHint() {
    updateDraft({ ...draft, failures: draft.failures + 1 })
  }

  function replayStep(index: number) {
    runAdapter.reset()
    store.setState({
      guess: null,
      draft: { ...draft, stepIndex: index, failures: 0, finished: false },
    })
    setNotice(null)
  }

  if (draft.finished === true) {
    return (
      <section className="kc-lesson-shell p-6" data-testid="grid-lesson-finished">
        <div className="kc-feedback kc-feedback-success">
          <p className="kc-feedback-title">
            🎉 {lesson.title}：{lesson.steps.length} 关全部真的跑通了！
          </p>
          {lesson.completionBadge ? (
            <p className="mt-2" data-testid="grid-completion-badge">
              本机成就 · {lesson.completionBadge}
            </p>
          ) : null}
          <p className="mt-2 kc-text-muted">给家长：{lesson.parentQuestion}</p>
          <p className="mt-2 kc-text-muted">这是实验课，成绩只保存在本机，不是正式课程成绩。</p>
        </div>
        <GridReviewCard lesson={lesson} mistakes={draft.mistakes ?? []} />
        <GridReflectionCheck
          lesson={lesson}
          chosen={draft.reflection}
          onChoose={(choice) => updateDraft({ ...draft, reflection: choice })}
        />
        {lesson.project ? <GridProjectCard lesson={lesson} draft={draft} /> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {lesson.steps.map((item, stepIndex) => (
            <button
              key={item.id}
              type="button"
              className="kc-action-surface kc-btn-outline kc-btn-sm"
              data-testid={`grid-replay-${item.id}`}
              onClick={() => replayStep(stepIndex)}
            >
              再玩：{item.title}
            </button>
          ))}
          <Link className="kc-action-surface kc-btn-sm" href={`/learn/catalog/${lesson.id}`}>
            回到课程介绍
          </Link>
          {lesson.project?.showInPortfolio ? (
            <Link className="kc-action-surface kc-btn-outline kc-btn-sm" href="/learn/portfolio">
              查看作品中心
            </Link>
          ) : null}
        </div>
      </section>
    )
  }

  return (
    <div data-testid="grid-stage-slot">
      <div
        className="flex flex-wrap items-center gap-2 rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950"
        data-testid="grid-predict"
      >
        <span className="flex-1">🤔 {step.predict}</span>
        <ReadAloudButton
          key={step.id}
          testId="grid-read-instruction"
          text={`第 ${draft.stepIndex + 1} 关，${step.title}。${step.instruction}。${step.predict}`}
        />
        {step.predictChoices ? (
          <div className="grid w-full gap-2 sm:grid-cols-2" data-testid="grid-predict-choices">
            {step.predictChoices.map((choice, choiceIndex) => (
              <button
                key={choice.text}
                type="button"
                className="kc-reflect-option"
                data-testid={`grid-predict-choice-${choiceIndex}`}
                data-chosen={guess === choiceIndex ? 'true' : 'false'}
                aria-pressed={guess === choiceIndex}
                onClick={() => chooseGuess(choiceIndex)}
              >
                {choice.text}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {step.creative ? (
        <div
          className="mt-3 rounded-[8px] border border-sky-200 bg-sky-50 p-3 text-sm font-bold text-sky-950"
          data-testid="grid-creative"
        >
          <p>🍄 {step.creative.prompt}</p>
          <div
            className={`mt-2 grid grid-cols-2 gap-2 ${step.creative.labels ? '' : 'sm:grid-cols-4'}`}
            data-testid="grid-goal-choices"
          >
            {step.creative.goalChoices.map((cell, cellIndex) => {
              const chosen = draft.creative?.[step.id]?.goal
              const isChosen = chosen?.x === cell.x && chosen?.y === cell.y
              return (
                <button
                  key={`${cell.x}-${cell.y}`}
                  type="button"
                  className="kc-reflect-option kc-choice-compact"
                  data-testid={`grid-goal-choice-${cellIndex}`}
                  aria-pressed={isChosen}
                  data-chosen={isChosen ? 'true' : 'false'}
                  disabled={playing}
                  onClick={() => chooseGoal(cellIndex)}
                >
                  {step.creative!.labels?.[cellIndex] ??
                    (step.level.rows > 1
                      ? `第 ${cell.x + 1} 列第 ${cell.y + 1} 行`
                      : `第 ${cell.x + 1} 格`)}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="kc-stage-panel" data-testid="grid-stage-panel">
        <GridStage
          level={level}
          state={display}
          trail={run ? trail : []}
          stamps={run ? stamps : []}
          watered={run ? watered : []}
          label={stageLabel}
        />
      </div>

      {sceneActions ? (
        <div className="kc-run-actions" data-testid="grid-scene-actions">
          {sceneActions}
        </div>
      ) : null}

      <div className="kc-stage-panel space-y-3 pt-0">
        <div
          aria-live="polite"
          data-testid="grid-feedback"
          data-tone={feedback.tone}
          className={`kc-feedback ${
            feedback.tone === 'success'
              ? 'kc-feedback-success'
              : feedback.tone === 'error'
                ? 'kc-feedback-error'
                : feedback.tone === 'warning'
                  ? 'kc-feedback-warning'
                  : ''
          }`}
        >
          <div className="flex flex-wrap items-start gap-2">
            <span className="flex-1">{feedback.text}</span>
            {feedback.tone === 'error' || feedback.tone === 'success' ? (
              <ReadAloudButton
                key={`${feedback.text}${hintCopy ?? ''}`}
                testId="grid-read-feedback"
                text={hintCopy ? `${feedback.text} 提示：${hintCopy}` : feedback.text}
              />
            ) : null}
          </div>
        </div>

        {hintCopy ? (
          <p className="kc-hint" data-testid="lesson-hint">
            {hintCopy}
          </p>
        ) : null}

        <div className="kc-run-actions flex-wrap">
          {step.errorLab &&
          !observedHere &&
          JSON.stringify(blocks) !== JSON.stringify(step.starterBlocks ?? []) ? (
            <button
              type="button"
              className="kc-action-surface kc-btn-outline"
              data-testid="grid-restore-starter"
              disabled={playing}
              onClick={restoreStarter}
            >
              换回原来的错误程序
            </button>
          ) : null}
          {draft.failures > 0 && hintLayer < 2 ? (
            <button
              type="button"
              className="kc-action-surface kc-btn-outline"
              data-testid="grid-more-hint"
              onClick={showMoreHint}
            >
              再给点提示
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** SYS-107：重复积木读作“重复 4 次（放红脚印、向前走一格…）”。 */
function blockText(block: ProgramBlock): string {
  if (block.type !== 'repeat_times') return getKidsBlockLabel(block.type)
  return `重复 ${block.times ?? 2} 次（${(block.body ?? []).map(blockText).join('、') || '空'}）`
}

/** 单元作品卡：孩子自己通过的那一关程序，保存在本机，用真实引擎回放。 */
function GridProjectCard({ lesson, draft }: { lesson: GridLesson; draft: GridSlotData }) {
  const project = lesson.project!
  const step = lesson.steps.find((item) => item.id === project.stepId)!
  const blocks = useMemo(() => draft.programs[project.stepId] ?? [], [draft.programs, project.stepId])
  const level = useMemo(() => stepLevel(step, draft), [step, draft])
  const [run, setRun] = useState<GridRun | null>(null)
  const { state, trail, stamps, watered, done } = useGridPlayback(level, run)
  const verdict = useMemo(() => runGridProgram(level, blocks), [level, blocks])
  return (
    <section className="kc-surface-3d mt-4 rounded-[18px] p-5" data-testid="grid-project-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-black">🗺️ {project.title}</h3>
        <span
          className={`kc-chip ${verdict.passed ? 'kc-chip-success' : 'kc-chip-warning'}`}
          data-testid="grid-project-status"
        >
          {verdict.passed ? project.passedText ?? '真实运行能走到蘑菇屋' : '这张卡还没达到目标，回去改一改'}
        </span>
      </div>
      <ol className="mt-3 flex flex-wrap gap-2" data-testid="grid-project-steps">
        {blocks.map((block, index) => (
          <li key={index} className="kc-block-chip" data-block={block.type}>
            {index === 0 ? '' : `${index}. `}
            {blockText(block)}
          </li>
        ))}
      </ol>
      <div className="mt-4 max-w-[420px]">
        <GridStage level={level} state={state} trail={run ? trail : []} stamps={run ? stamps : []} watered={run ? watered : []} label={gridStageLabel(level, state)} />
      </div>
      <button
        type="button"
        className="kc-action-surface mt-3"
        data-testid="grid-project-play"
        disabled={!!run && !done}
        onClick={() => setRun(runGridProgram(level, blocks))}
      >
        {run && !done ? '播放中…' : `▶ 播放${project.title}`}
      </button>
      <p className="kc-text-muted mt-2 text-sm">作品保存在这台设备上，下次打开这节课还在。</p>
    </section>
  )
}

/** 复盘：这节课要学的、孩子真实遇到又修好的错，以及一个想一想。 */
function GridReviewCard({ lesson, mistakes }: { lesson: GridLesson; mistakes: GridFailure[] }) {
  const [shown, setShown] = useState(false)
  return (
    <section className="kc-surface-3d mt-4 rounded-[18px] p-5" data-testid="grid-review">
      <h3 className="text-lg font-black">📝 复盘</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {lesson.objectives.map((objective) => (
          <li key={objective}>{objective}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-bold" data-testid="grid-review-mistakes">
        {mistakes.length
          ? `这节课你遇到过、又自己修好的错：${mistakes.map((mistake) => MISTAKE_LABELS[mistake]).join('、')}。`
          : '这节课你一次都没出错。'}
      </p>
      {lesson.review ? (
        <div className="mt-3 text-sm">
          <p className="font-bold">🔁 {lesson.review.whatIf}</p>
          {shown ? (
            <p className="mt-1" data-testid="grid-review-answer">
              {lesson.review.answer}
            </p>
          ) : (
            <button
              type="button"
              className="kc-action-surface kc-btn-outline kc-btn-sm mt-2"
              data-testid="grid-review-reveal"
              onClick={() => setShown(true)}
            >
              想好了，看看答案
            </button>
          )}
        </div>
      ) : null}
    </section>
  )
}

/** EDU-105：点一下就想明白的反思题，孩子选过的答案随草稿保存。 */
function GridReflectionCheck({
  lesson,
  chosen,
  onChoose,
}: {
  lesson: GridLesson
  chosen?: number
  onChoose: (index: number) => void
}) {
  const check = lesson.reflectionCheck
  const picked = chosen === undefined ? undefined : check.options[chosen]
  return (
    <section className="kc-surface-3d mt-4 rounded-[18px] p-5" data-testid="grid-reflection">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-black">💭 想一想：{check.question}</h3>
        <ReadAloudButton
          testId="grid-read-reflection"
          text={`想一想，${check.question} ${check.options.map((option, index) => `第${index + 1}个，${option.text}`).join('。')}`}
        />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {check.options.map((option, index) => (
          <button
            key={option.text}
            type="button"
            className="kc-reflect-option"
            data-testid={`grid-reflection-option-${index}`}
            data-chosen={chosen === index ? 'true' : 'false'}
            data-correct={option.correct ? 'true' : 'false'}
            onClick={() => onChoose(index)}
          >
            {option.text}
          </button>
        ))}
      </div>
      {picked ? (
        <p
          className="mt-3 font-bold"
          data-testid="grid-reflection-result"
          data-correct={picked.correct ? 'true' : 'false'}
        >
          {picked.correct ? `✅ 对啦！${check.why}` : `再想想：${check.why}`}
        </p>
      ) : null}
      <p className="kc-text-muted mt-2 text-sm">{lesson.reflection}（可以说给家长听）</p>
    </section>
  )
}
