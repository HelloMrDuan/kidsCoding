/**
 * OPS-053：G0-U2 六节事件课共用的 V3 舞台插槽（EventStageSlot）。
 *
 * 只渲染，不跑第二个播放器：“运行检查”唯一的运行与判定来源是 EventRunAdapter，
 * 舞台按适配器执行快照（check + shown）逐步揭示真实引擎动作。
 * 自由试玩（按开始旗 / 点角色）与旧课堂一致：不经过适配器、不产生判定，
 * 直接用 runEventProgram 即时显示；交互序列存在路由 store 的 `play` 里，
 * 编辑、切关、选角色时清空。
 *
 * 舞台承担的课程交互（与旧 event-lab 一致）：
 * - 先猜一猜（会话内）与猜对/猜错说明；
 * - 创意关选一位朋友（写入草稿，换人即清掉本关通过记录，并切到它的脚本）；
 * - 真实运行反馈：通过 / 设计错误 / 诊断 + 看看谁的积木 / 自由试玩说明；
 * - 三层提示随真实失败次数逐层揭示（“再给点提示”同样记一次失败）；
 * - 错误实验可一键“换回原来的错误程序”（重建画布、清掉本关通过）；
 * - 整课完成后：复盘、反思选择、真实作品卡、重玩任关、回课程介绍。
 * 运行/停止/重来按钮由外壳经 sceneActions 传进来，舞台只负责摆位置。
 */
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { resolveEventGoal, type EventLesson } from '@/content/curriculum/g0-u2-event-lessons'
import { getKidsBlockLabel } from '@/features/lessons/blockly/register-kids-blocks'
import { ReadAloudButton } from '@/features/lessons/voice/read-aloud'
import type { StageSlotProps } from '@/features/lessons/workspace/workspace-slots'

import {
  checkEventGoal,
  runEventProgram,
  type EventActorId,
  type EventBlock,
  type EventEffect,
  type EventFailure,
  type EventInteraction,
} from '../event/event-engine'
import { EventStage, useEventPlayback } from '../event/event-stage'
import { eventStarterPrograms, isStarterProgram, type EventSlotData } from './event-v3-draft'
import {
  describeEventInteractions,
  eventActorName,
  eventDiagnosis,
  eventStepGoal,
  eventStepScripts,
  EVENT_FRAME_MS,
  EVENT_V3_MISTAKE_LABELS,
  visibleEffects,
} from './event-v3-run-adapter'
import { useEventSession, useEventSessionState } from './event-v3-session'
import { EVENT_PICK_PROMPT } from './event-v3-slot'

/** 重复积木读作“重复 3 次（发光、熄灭）”。 */
function blockText(block: EventBlock): string {
  if (!block.body) return getKidsBlockLabel(block.type)
  return `重复 ${block.times ?? 2} 次（${block.body.map(blockText).join('、') || '空'}）`
}

export function EventStageSlot({ sceneActions }: StageSlotProps) {
  const { lesson, store, runAdapter } = useEventSession()
  const sessionState = useEventSessionState()
  const draft = sessionState.draft
  const play = sessionState.play
  const guess = sessionState.guess

  // 关卡边界清快照：主清理在编辑插槽 goToStep（persist 之前同步执行），
  // 这里覆盖一切绕过 goToStep 的切关路径（例如旧草稿导入落在别的关）。
  useEffect(() => {
    runAdapter.reset()
  }, [runAdapter, draft.stepIndex])

  const observation = runAdapter.getExecutionSnapshot()
  const step = lesson.steps[Math.min(Math.max(draft.stepIndex, 0), lesson.steps.length - 1)]
  const stepId = step.id
  const target = draft.creative?.[stepId]?.target
  const needsPick = !!step.creative && !target
  const passedHere = draft.passed.includes(stepId)
  const observedHere = !step.errorLab || !!draft.observed?.includes(stepId)
  const scripts = useMemo(() => eventStepScripts(step, draft), [step, draft])
  const idlePlan = useMemo(() => eventStepGoal(step, target).checkPlan, [step, target])

  // 只采用本关的真实检查快照（别关遗留的快照一律不显示）。
  const check = observation.stepId === stepId ? observation.check : null
  const checkPlan = check ? observation.checkPlan : idlePlan
  const playing = !!check && observation.playing
  const done = !!check && !observation.playing && observation.shown >= observation.total
  const stopped = !!check && !observation.playing && observation.executionState === 'idle'
  const freeEffects = useMemo<EventEffect[]>(
    () => (play.length ? runEventProgram(step.level, scripts, play).effects : []),
    [play, step.level, scripts],
  )
  const shownEffects = check ? visibleEffects(observation) : freeEffects

  const feedback = useMemo(() => {
    if (needsPick) return { tone: 'warning', text: EVENT_PICK_PROMPT }
    if (stopped) return { tone: 'warning', text: '已停止。积木还在，可以改完再运行检查。' }
    if (!check) {
      if (play.length) {
        return { tone: 'idle', text: `自由试一试：${describeEventInteractions(step, play)}。想好了就按“运行检查”。` }
      }
      return {
        tone: 'idle',
        text: passedHere
          ? '这一关已经通过。可以再改一改，或者点“完成这一关”。'
          : `运行检查会依次：${checkPlan}，看看舞台是不是符合目标。`,
      }
    }
    if (!done) return { tone: 'idle', text: `正在检查：${checkPlan}……` }
    const outcome = check.passed ? 'pass' : check.failure
    const picked = guess === null ? null : step.predictChoices?.[guess]
    const guessNote = picked
      ? picked.when === outcome
        ? `你猜“${picked.text}”，猜对了！`
        : `你猜“${picked.text}”，实际不一样，猜错也没关系，看看发生了什么。`
      : ''
    if (check.passed && !observedHere) {
      return { tone: 'warning', text: '程序成功了！不过这是错误实验：先按原样运行检查一次，看看错在哪，再来修。' }
    }
    if (check.passed) return { tone: 'success', text: `🎉 ${guessNote}检查通过：${checkPlan}，每一步都和目标一样。` }
    if (step.errorLab && check.failure === step.errorLab.expect) {
      return {
        tone: 'error',
        text: `${guessNote}预想：${step.errorLab.expected} 实际：${step.errorLab.actual} 现在把它修好吧。`,
      }
    }
    const diagnosis = check.failure ? eventDiagnosis(lesson, check.failure) : ''
    const who = check.actor ? `（看看${eventActorName(step, check.actor)}的积木）` : ''
    return { tone: 'error', text: `${guessNote}${diagnosis}${who}` }
  }, [needsPick, stopped, check, play, step, passedHere, checkPlan, done, guess, observedHere, lesson])

  const hintLayer = draft.failures === 0 ? -1 : Math.min(draft.failures - 1, 2)
  const hintCopy = hintLayer >= 0 ? `（第 ${hintLayer + 1} 层）${step.hints[hintLayer]}` : undefined

  function updateDraft(next: EventSlotData) {
    store.setState({ draft: next })
  }

  function chooseGuess(choice: number) {
    store.setState({ guess: choice })
  }

  /** 自由试玩：不判定；刚看完一次检查时从头开始记交互（与旧课堂“运行检查清空试玩”一致）。 */
  function freePlay(interaction: EventInteraction) {
    if (playing) return
    const fresh = !!check
    runAdapter.reset()
    store.setState({ play: fresh ? [interaction] : [...store.getState().play, interaction] })
  }

  function pickTarget(index: number) {
    const creative = step.creative!
    const picked = creative.choices[index]
    runAdapter.reset()
    // 选的是角色时顺手打开它的脚本；带 goals 的创意关（选目标）保持当前角色。
    const editing =
      !creative.goals && (step.editable as readonly string[]).includes(picked)
        ? (picked as EventActorId)
        : store.getState().editing
    store.setState({
      play: [],
      editing,
      // 换了人：旧通过记录不再证明这张卡。
      draft: {
        ...draft,
        creative: { ...(draft.creative ?? {}), [stepId]: { target: picked } },
        passed: draft.passed.filter((id) => id !== stepId),
        finished: false,
      },
    })
  }

  function restoreStarter() {
    runAdapter.reset()
    store.setState({
      play: [],
      draft: {
        ...draft,
        programs: { ...draft.programs, [stepId]: eventStarterPrograms(step) },
        passed: draft.passed.filter((id) => id !== stepId),
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
      editing: null,
      play: [],
      draft: { ...draft, stepIndex: index, failures: 0, finished: false },
    })
  }

  if (draft.finished === true) {
    return (
      <section className="kc-lesson-shell p-6" data-testid="grid-lesson-finished">
        <div className="kc-feedback kc-feedback-success">
          <p className="kc-feedback-title">
            🎉 {lesson.title}：{lesson.steps.length} 关全部真的检查通过了！
          </p>
          <p className="mt-2 kc-text-muted">给家长：{lesson.parentQuestion}</p>
          <p className="mt-2 kc-text-muted">这是实验课，成绩只保存在本机，不是正式课程成绩。</p>
        </div>
        <EventReviewCard lesson={lesson} mistakes={draft.mistakes ?? []} />
        <EventReflectionCheck
          lesson={lesson}
          chosen={draft.reflection}
          onChoose={(choice) => updateDraft({ ...draft, reflection: choice })}
        />
        <EventProjectCard lesson={lesson} draft={draft} />
        <div className="mt-4 flex flex-wrap gap-2">
          {lesson.steps.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="kc-action-surface kc-btn-outline kc-btn-sm"
              data-testid={`grid-replay-${item.id}`}
              onClick={() => replayStep(index)}
            >
              再玩：{item.title}
            </button>
          ))}
          <Link className="kc-action-surface kc-btn-sm" href={`/learn/catalog/${lesson.id}`}>
            回到课程介绍
          </Link>
        </div>
      </section>
    )
  }

  return (
    <div data-testid="event-stage-slot">
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
          <p>🌟 {step.creative.prompt}</p>
          <div className="mt-2 grid grid-cols-3 gap-2" data-testid="grid-goal-choices">
            {step.creative.choices.map((id, choiceIndex) => (
              <button
                key={id}
                type="button"
                className="kc-reflect-option kc-choice-compact"
                data-testid={`grid-goal-choice-${choiceIndex}`}
                aria-pressed={target === id}
                data-chosen={target === id ? 'true' : 'false'}
                disabled={playing}
                onClick={() => pickTarget(choiceIndex)}
              >
                {step.creative!.labels[choiceIndex]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="kc-stage-panel" data-testid="grid-stage-panel">
        <EventStage
          level={step.level}
          effects={shownEffects}
          onActorClick={playing ? undefined : (id) => freePlay({ kind: 'click', actor: id })}
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
          <button
            type="button"
            className="kc-action-surface kc-btn-outline"
            data-testid="event-flag"
            disabled={playing}
            onClick={() => freePlay({ kind: 'start' })}
          >
            🏁 开始旗
          </button>
          {step.errorLab && !observedHere && !isStarterProgram(step, draft) ? (
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

/** 单元作品卡：孩子自己通过的创意关脚本，保存在本机，用真实引擎回放。 */
function EventProjectCard({ lesson, draft }: { lesson: EventLesson; draft: EventSlotData }) {
  const project = lesson.project
  const step = lesson.steps.find((item) => item.id === project.stepId)!
  const target = draft.creative?.[step.id]?.target
  const scripts = useMemo(() => eventStepScripts(step, draft), [step, draft])
  const goal = useMemo(() => resolveEventGoal(step, target), [step, target])
  const verdict = useMemo(
    () => checkEventGoal(step.level, scripts, goal.expectations, goal.probes),
    [step.level, scripts, goal],
  )
  const interactions = useMemo(
    () => [...goal.expectations.map((expectation) => expectation.interaction), ...goal.probes],
    [goal],
  )
  const [effects, setEffects] = useState<EventEffect[] | null>(null)
  // 作品卡自成一体的回放（与主舞台无关，不产生判定）。
  const { visible, done } = useEventPlayback(effects, EVENT_FRAME_MS, step.level.parallel)
  const choiceIndex = Math.max(0, step.creative?.choices.indexOf(target ?? '') ?? 0)
  const statusText = project.passedText
    .replace('{target}', eventActorName(step, (target ?? step.creative?.choices[0]) as EventActorId))
    .replace('{label}', step.creative?.labels[choiceIndex] ?? '')
  return (
    <section className="kc-surface-3d mt-4 rounded-[18px] p-5" data-testid="grid-project-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-black">🌞 {project.title}</h3>
        <span
          className={`kc-chip ${verdict.passed ? 'kc-chip-success' : 'kc-chip-warning'}`}
          data-testid="grid-project-status"
        >
          {verdict.passed ? statusText : '这张卡还不符合目标，回去改一改'}
        </span>
      </div>
      <ul className="mt-3 space-y-2" data-testid="grid-project-steps">
        {Object.entries(scripts).map(([id, list]) => (
          <li key={id} className="flex flex-wrap items-center gap-2 text-sm" data-actor={id}>
            <span className="font-black">{eventActorName(step, id as EventActorId)}：</span>
            {(list ?? []).map((block, index) => (
              <span key={index} className="kc-block-chip" data-block={block.type}>
                {blockText(block)}
              </span>
            ))}
          </li>
        ))}
      </ul>
      <div className="mt-4 max-w-[420px]">
        <EventStage level={step.level} effects={effects ? visible : []} />
      </div>
      <button
        type="button"
        className="kc-action-surface mt-3"
        data-testid="grid-project-play"
        disabled={!!effects && !done}
        onClick={() => setEffects(runEventProgram(step.level, scripts, interactions).effects)}
      >
        {effects && !done ? '播放中…' : `▶ 播放${project.title}`}
      </button>
      <p className="kc-text-muted mt-2 text-sm">
        播放会依次：{describeEventInteractions(step, interactions)}。作品保存在这台设备上，下次打开这节课还在。
      </p>
    </section>
  )
}

/** 复盘：这节课要学的、孩子真实遇到又修好的错，以及一个想一想。 */
function EventReviewCard({ lesson, mistakes }: { lesson: EventLesson; mistakes: EventFailure[] }) {
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
          ? `这节课你遇到过、又自己修好的错：${mistakes.map((mistake) => EVENT_V3_MISTAKE_LABELS[mistake]).join('、')}。`
          : '这节课你一次都没出错。'}
      </p>
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
    </section>
  )
}

/** 反思题：孩子选过的答案随草稿保存。 */
function EventReflectionCheck({
  lesson,
  chosen,
  onChoose,
}: {
  lesson: EventLesson
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
