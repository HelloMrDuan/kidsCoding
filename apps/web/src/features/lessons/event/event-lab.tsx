'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { resolveEventGoal, type EventLesson, type EventLessonStep } from '@/content/curriculum/g0-u2-event-lessons'
import dynamic from 'next/dynamic'

const BlocklyWorkspace = dynamic(
  () => import('@/features/lessons/blockly/blockly-workspace').then((m) => m.BlocklyWorkspace),
  { ssr: false },
)
import { getKidsBlockLabel } from '@/features/lessons/blockly/register-kids-blocks'
import { GuidedLessonShell, type LessonLocalSaveState } from '@/features/lessons/guided-lesson-shell'
import { ReadAloudButton } from '@/features/lessons/voice/read-aloud'
import { ResetIcon } from '@/features/ui/reset-icon'
import { checkEventGoal, runEventProgram, type EventActorId, type EventBlock, type EventCheck, type EventFailure, type EventInteraction, type EventScripts } from './event-engine'
import { eventDraftKey, parseEventDraft, type EventDraft } from './event-draft'
import { EventStage, useEventPlayback } from './event-stage'

/** Short names for the mistakes listed in 复盘. */
export const EVENT_MISTAKE_LABELS: Record<EventFailure, string> = {
  no_hat: '忘了事件积木',
  hat_not_on_top: '事件没放在最上面',
  disconnected: '有积木掉队',
  unknown_block: '用了这关没有的积木',
  cannot_do: '角色做不了这个动作',
  loop: '铃铛响个不停',
  too_early: '还没触发就先动了',
  nothing_happened: '触发了却没反应',
  wrong_actor: '动的不是要动的角色',
  wrong_order: '动作顺序反了',
  missing_effect: '少了一个动作',
  extra_effect: '多了不该有的动作',
  wrong_trigger: '点错角色也有反应',
}

const actorName = (step: EventLessonStep, id?: EventActorId) => step.level.actors.find(a => a.id === id)?.name ?? ''

/** The scripts a step really runs: what the child built for each editable character, else its starter. */
export function stepScripts(step: EventLessonStep, draft: Pick<EventDraft, 'programs'>): EventScripts {
  const scripts: EventScripts = {}
  for (const id of step.editable) {
    const blocks = draft.programs[step.id]?.[id] ?? step.starter?.[id]
    if (blocks?.length) scripts[id] = blocks
  }
  return scripts
}

/** Child-facing description of the checker's interactions. */
export function describeInteractions(step: EventLessonStep, interactions: EventInteraction[]) {
  return interactions.map(i => (i.kind === 'start' ? '按开始旗' : `点${actorName(step, i.actor)}`)).join(' → ')
}

/**
 * G0-U2 event classroom: the V2 three-zone shell with a real Blockly workspace
 * per character and the event-stage engine. A step passes only after a real
 * check run (start flag, then the clicks the goal names) matches the goal.
 */
export function EventLab({ lesson }: { lesson: EventLesson }) {
  const [draft, setDraft] = useState<EventDraft>({ stepIndex: 0, programs: {}, passed: [], savedAt: null })
  const [hydrated, setHydrated] = useState(false)
  const [resumedFrom, setResumedFrom] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<LessonLocalSaveState>('unsaved')
  const [check, setCheck] = useState<EventCheck | null>(null)
  const [play, setPlay] = useState<EventInteraction[]>([])
  const [failures, setFailures] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [guess, setGuess] = useState<number | null>(null)
  const [editing, setEditing] = useState<EventActorId | null>(null)

  const step = lesson.steps[Math.min(draft.stepIndex, lesson.steps.length - 1)]
  const actor = editing && step.editable.includes(editing) ? editing : step.editable[0]
  const blocks: EventBlock[] = draft.programs[step.id]?.[actor] ?? step.starter?.[actor] ?? []
  const scripts = useMemo(() => stepScripts(step, draft), [step, draft])
  const target = draft.creative?.[step.id]?.target
  const needsPick = !!step.creative && !target
  const goal = useMemo(() => resolveEventGoal(step, target), [step, target])
  const passedHere = draft.passed.includes(step.id)
  const observedHere = !step.errorLab || !!draft.observed?.includes(step.id)
  const freeEffects = useMemo(() => (play.length ? runEventProgram(step.level, scripts, play).effects : []), [play, step.level, scripts])
  const { visible, done } = useEventPlayback(check ? check.run.effects : null)
  const shownEffects = check ? visible : freeEffects

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = parseEventDraft(lesson, window.localStorage.getItem(eventDraftKey(lesson.id)))
        if (saved) {
          setDraft(saved)
          if (saved.stepIndex > 0 || saved.passed.length) setResumedFrom(saved.stepIndex)
          setFinished(saved.passed.length === lesson.steps.length)
          setSaveState('saved')
        }
      } catch { /* storage blocked: the lesson still works */ }
      setHydrated(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [lesson])

  const persist = useCallback((next: EventDraft) => {
    setDraft(next)
    try {
      window.localStorage.setItem(eventDraftKey(lesson.id), JSON.stringify({ ...next, savedAt: new Date().toISOString() }))
      setSaveState('saved')
    } catch {
      setSaveState('failed')
    }
  }, [lesson.id])

  const handleSnapshot = useCallback((next: EventBlock[]) => {
    if (!hydrated) return
    setDraft(prev => {
      const s = lesson.steps[Math.min(prev.stepIndex, lesson.steps.length - 1)]
      const who = actor
      if (JSON.stringify(prev.programs[s.id]?.[who] ?? null) === JSON.stringify(next)) return prev
      const updated = { ...prev, programs: { ...prev.programs, [s.id]: { ...(s.starter ?? {}), ...(prev.programs[s.id] ?? {}), [who]: next } } }
      try {
        window.localStorage.setItem(eventDraftKey(lesson.id), JSON.stringify({ ...updated, savedAt: new Date().toISOString() }))
        setSaveState('saved')
      } catch { setSaveState('failed') }
      return updated
    })
    setCheck(null)
    setPlay([])
    setNotice(null)
  }, [hydrated, lesson, actor])

  function handleRun() {
    if (needsPick) {
      setNotice('先在上面选好一位朋友，再拼程序运行检查。')
      return
    }
    const result = checkEventGoal(step.level, scripts, goal.expectations, goal.probes)
    setPlay([])
    setCheck(result)
    setNotice(null)
    if (result.passed) {
      if (!passedHere && observedHere) persist({ ...draft, passed: [...draft.passed, step.id] })
    } else {
      setFailures(n => n + 1)
      const mistakes = draft.mistakes ?? []
      const seen = step.errorLab && result.failure === step.errorLab.expect && !draft.observed?.includes(step.id)
      if (seen || !mistakes.includes(result.failure!)) {
        persist({
          ...draft,
          mistakes: mistakes.includes(result.failure!) ? mistakes : [...mistakes, result.failure!],
          ...(seen ? { observed: [...(draft.observed ?? []), step.id] } : {}),
        })
      }
    }
  }

  function freePlay(interaction: EventInteraction) {
    setCheck(null)
    setNotice(null)
    setPlay(p => [...p, interaction])
  }

  function pickTarget(index: number) {
    const picked = step.creative!.choices[index]
    setCheck(null)
    setPlay([])
    setNotice(null)
    setEditing(picked)
    // A new pick means the old pass no longer proves this card.
    persist({ ...draft, creative: { ...(draft.creative ?? {}), [step.id]: { target: picked } }, passed: draft.passed.filter(id => id !== step.id) })
  }

  function restoreStarter() {
    setCheck(null)
    setPlay([])
    persist({ ...draft, programs: { ...draft.programs, [step.id]: { ...(step.starter ?? {}) } } })
  }

  function handleReset() {
    setCheck(null)
    setPlay([])
    setNotice(null)
  }

  function goToStep(index: number) {
    setCheck(null)
    setPlay([])
    setGuess(null)
    setFailures(0)
    setNotice(null)
    setEditing(null)
    persist({ ...draft, stepIndex: index })
  }

  function handleComplete() {
    if (!passedHere) {
      setNotice(needsPick ? '先在上面选好一位朋友，再拼程序运行检查。' : !observedHere ? '这是错误实验：先按原样运行检查一次，亲眼看看错在哪，再修好它。' : '先按“运行检查”，让舞台真的符合目标，才能完成这一关。')
      return
    }
    if (draft.stepIndex < lesson.steps.length - 1) goToStep(draft.stepIndex + 1)
    else setFinished(true)
  }

  const checkPlan = describeInteractions(step, [...goal.expectations.map(e => e.interaction), ...goal.probes])

  const feedback = useMemo(() => {
    if (notice) return { tone: 'warning', text: notice }
    if (!check) {
      if (play.length) return { tone: 'idle', text: `自由试一试：${describeInteractions(step, play)}。想好了就按“运行检查”。` }
      return { tone: 'idle', text: passedHere ? '这一关已经通过。可以再改一改，或者点“完成这一关”。' : `运行检查会依次：${checkPlan}，看看舞台是不是符合目标。` }
    }
    if (!done) return { tone: 'idle', text: `正在检查：${checkPlan}……` }
    const outcome = check.passed ? 'pass' : check.failure
    const picked = guess === null ? null : step.predictChoices?.[guess]
    const guessNote = picked ? (picked.when === outcome ? `你猜“${picked.text}”，猜对了！` : `你猜“${picked.text}”，实际不一样，猜错也没关系，看看发生了什么。`) : ''
    if (check.passed && !observedHere) return { tone: 'warning', text: '程序成功了！不过这是错误实验：先按原样运行检查一次，看看错在哪，再来修。' }
    if (check.passed) return { tone: 'success', text: `🎉 ${guessNote}检查通过：${checkPlan}，每一步都和目标一样。` }
    if (step.errorLab && check.failure === step.errorLab.expect) {
      return { tone: 'error', text: `${guessNote}预想：${step.errorLab.expected} 实际：${step.errorLab.actual} 现在把它修好吧。` }
    }
    const diagnosis = lesson.diagnoses[check.failure!] ?? EVENT_MISTAKE_LABELS[check.failure!]
    const who = check.actor ? `（看看${actorName(step, check.actor)}的积木）` : ''
    return { tone: 'error', text: `${guessNote}${diagnosis}${who}` }
  }, [notice, check, play, done, passedHere, lesson.diagnoses, guess, step, observedHere, checkPlan])

  const hintLayer = failures === 0 ? -1 : Math.min(failures - 1, 2)
  const hintCopy = hintLayer >= 0 ? `（第 ${hintLayer + 1} 层）${step.hints[hintLayer]}` : undefined
  const busy = !!check && !done

  if (finished) {
    return (
      <section className="kc-lesson-shell p-6" data-testid="grid-lesson-finished">
        <div className="kc-feedback kc-feedback-success">
          <p className="kc-feedback-title">🎉 {lesson.title}：{lesson.steps.length} 关全部真的检查通过了！</p>
          <p className="mt-2 kc-text-muted">给家长：{lesson.parentQuestion}</p>
          <p className="mt-2 kc-text-muted">这是实验课，成绩只保存在本机，不是正式课程成绩。</p>
        </div>
        <EventReviewCard lesson={lesson} mistakes={draft.mistakes ?? []} />
        <EventReflection lesson={lesson} chosen={draft.reflection} onChoose={i => persist({ ...draft, reflection: i })} />
        <EventProjectCard lesson={lesson} draft={draft} />
        <div className="mt-4 flex flex-wrap gap-2">
          {lesson.steps.map((s, i) => (
            <button key={s.id} type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" data-testid={`grid-replay-${s.id}`}
              onClick={() => { setFinished(false); goToStep(i) }}>再玩：{s.title}</button>
          ))}
          <Link className="kc-action-surface kc-btn-sm" href={`/learn/catalog/${lesson.id}`}>回到课程介绍</Link>
        </div>
      </section>
    )
  }

  return (
    <GuidedLessonShell
      completionPreview={`在林间舞台上给角色拼事件积木，亲手完成 ${lesson.steps.length} 关，包括一关修好别人的程序。`}
      codeSlot={
        hydrated ? (
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 px-1" role="tablist" aria-label="给哪个角色拼积木" data-testid="event-edit-tabs">
              <span className="text-sm font-bold">给谁拼：</span>
              {step.editable.map(id => (
                <button key={id} type="button" role="tab" aria-selected={id === actor} className="kc-reflect-option kc-choice-compact"
                  data-testid={`event-edit-${id}`} data-chosen={id === actor ? 'true' : 'false'} onClick={() => setEditing(id)}>
                  {actorName(step, id)}
                </button>
              ))}
            </div>
            <BlocklyWorkspace key={`${step.id}-${actor}`} allowedBlocks={step.allowedBlocks} blocks={blocks} enableProgramTools snapStartOnTop onSnapshotChange={handleSnapshot} />
          </div>
        ) : null
      }
      feedback={undefined}
      hintCopy={hintCopy}
      instruction={step.instruction}
      isLocked={false}
      lessonGoal={lesson.objectives.join('；')}
      lessonTitle={lesson.title}
      localSaveState={saveState}
      onCompleteStep={handleComplete}
      onStartRemedial={() => {}}
      resumedFromStep={resumedFrom}
      stageSlot={
        <section className="flex flex-1 flex-col" data-testid="grid-lab-stage">
          <div className="kc-stage-panel pb-0">
            <div className="flex flex-wrap items-center gap-2 rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950" data-testid="grid-predict">
              <span className="flex-1">🤔 {step.predict}</span>
              <ReadAloudButton key={step.id} testId="grid-read-instruction" text={`第 ${draft.stepIndex + 1} 关，${step.title}。${step.instruction}。${step.predict}`} />
              {step.predictChoices ? (
                <div className="grid w-full gap-2 sm:grid-cols-2" data-testid="grid-predict-choices">
                  {step.predictChoices.map((choice, i) => (
                    <button key={choice.text} type="button" className="kc-reflect-option" data-testid={`grid-predict-choice-${i}`}
                      data-chosen={guess === i ? 'true' : 'false'} aria-pressed={guess === i} onClick={() => setGuess(i)}>{choice.text}</button>
                  ))}
                </div>
              ) : null}
            </div>
            {step.creative ? (
              <div className="mt-3 rounded-[8px] border border-sky-200 bg-sky-50 p-3 text-sm font-bold text-sky-950" data-testid="grid-creative">
                <p>🌟 {step.creative.prompt}</p>
                <div className="mt-2 grid grid-cols-3 gap-2" data-testid="grid-goal-choices">
                  {step.creative.choices.map((id, i) => (
                    <button key={id} type="button" className="kc-reflect-option kc-choice-compact" data-testid={`grid-goal-choice-${i}`}
                      aria-pressed={target === id} data-chosen={target === id ? 'true' : 'false'} onClick={() => pickTarget(i)}>{step.creative!.labels[i]}</button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="kc-stage-panel">
            <EventStage level={step.level} effects={shownEffects} onActorClick={busy ? undefined : id => freePlay({ kind: 'click', actor: id })} />
          </div>
          <div className="kc-stage-panel space-y-3 pt-0">
            <div aria-live="polite" data-testid="grid-feedback" data-tone={feedback.tone}
              className={`kc-feedback ${feedback.tone === 'success' ? 'kc-feedback-success' : feedback.tone === 'error' ? 'kc-feedback-error' : feedback.tone === 'warning' ? 'kc-feedback-warning' : ''}`}>
              <div className="flex flex-wrap items-start gap-2">
                <span className="flex-1">{feedback.text}</span>
                {feedback.tone === 'error' || feedback.tone === 'success' ? (
                  <ReadAloudButton key={`${feedback.text}${hintCopy ?? ''}`} testId="grid-read-feedback" text={hintCopy ? `${feedback.text} 提示：${hintCopy}` : feedback.text} />
                ) : null}
              </div>
            </div>
            <div className="kc-run-actions flex-wrap">
              <button type="button" className="kc-action-surface disabled:opacity-50" data-testid="grid-run" disabled={busy} onClick={handleRun}>
                {busy ? '检查中…' : '▶ 运行检查'}
              </button>
              <button type="button" className="kc-action-surface kc-btn-outline" data-testid="event-flag" disabled={busy} onClick={() => freePlay({ kind: 'start' })}>🏁 开始旗</button>
              <button type="button" className="kc-action-surface kc-btn-outline" data-testid="grid-reset" disabled={busy} onClick={handleReset}><ResetIcon />回到起点</button>
              {step.errorLab && !observedHere && JSON.stringify(draft.programs[step.id] ?? step.starter) !== JSON.stringify(step.starter) ? (
                <button type="button" className="kc-action-surface kc-btn-outline" data-testid="grid-restore-starter" onClick={restoreStarter}>换回原来的错误程序</button>
              ) : null}
              {failures > 0 && hintLayer < 2 ? (
                <button type="button" className="kc-action-surface kc-btn-outline" data-testid="grid-more-hint" onClick={() => setFailures(n => n + 1)}>再给点提示</button>
              ) : null}
            </div>
          </div>
        </section>
      }
      stepCount={lesson.steps.length}
      stepIndex={draft.stepIndex}
      stepTitle={`第 ${draft.stepIndex + 1} 关：${step.title}`}
      voiceover={undefined}
    />
  )
}

/** The saved work: the child's scripts for the creative step, replayed by the real engine. */
function EventProjectCard({ lesson, draft }: { lesson: EventLesson; draft: EventDraft }) {
  const project = lesson.project
  const step = lesson.steps.find(s => s.id === project.stepId)!
  const target = draft.creative?.[step.id]?.target
  const scripts = useMemo(() => stepScripts(step, draft), [step, draft])
  const goal = useMemo(() => resolveEventGoal(step, target), [step, target])
  const verdict = useMemo(() => checkEventGoal(step.level, scripts, goal.expectations, goal.probes), [step.level, scripts, goal])
  const [effects, setEffects] = useState<ReturnType<typeof runEventProgram>['effects'] | null>(null)
  const { visible, done } = useEventPlayback(effects)
  return (
    <section className="kc-surface-3d mt-4 rounded-[18px] p-5" data-testid="grid-project-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-black">🌞 {project.title}</h3>
        <span className={`kc-chip ${verdict.passed ? 'kc-chip-success' : 'kc-chip-warning'}`} data-testid="grid-project-status">
          {verdict.passed ? project.passedText.replace('{target}', actorName(step, target ?? step.creative?.choices[0])) : '这张卡还不符合目标，回去改一改'}
        </span>
      </div>
      <ul className="mt-3 space-y-2" data-testid="grid-project-steps">
        {Object.entries(scripts).map(([id, list]) => (
          <li key={id} className="flex flex-wrap items-center gap-2 text-sm" data-actor={id}>
            <span className="font-black">{actorName(step, id as EventActorId)}：</span>
            {(list ?? []).map((b, i) => <span key={i} className="kc-block-chip" data-block={b.type}>{getKidsBlockLabel(b.type)}</span>)}
          </li>
        ))}
      </ul>
      <div className="mt-4 max-w-[420px]">
        <EventStage level={step.level} effects={effects ? visible : []} />
      </div>
      <button type="button" className="kc-action-surface mt-3" data-testid="grid-project-play" disabled={!!effects && !done}
        onClick={() => setEffects(runEventProgram(step.level, scripts, [...goal.expectations.map(e => e.interaction), ...goal.probes]).effects)}>
        {effects && !done ? '播放中…' : `▶ 播放${project.title}`}
      </button>
      <p className="kc-text-muted mt-2 text-sm">播放会依次：{describeInteractions(step, [...goal.expectations.map(e => e.interaction), ...goal.probes])}。作品保存在这台设备上，下次打开这节课还在。</p>
    </section>
  )
}

function EventReviewCard({ lesson, mistakes }: { lesson: EventLesson; mistakes: EventFailure[] }) {
  const [shown, setShown] = useState(false)
  return (
    <section className="kc-surface-3d mt-4 rounded-[18px] p-5" data-testid="grid-review">
      <h3 className="text-lg font-black">📝 复盘</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {lesson.objectives.map(o => <li key={o}>{o}</li>)}
      </ul>
      <p className="mt-3 text-sm font-bold" data-testid="grid-review-mistakes">
        {mistakes.length ? `这节课你遇到过、又自己修好的错：${mistakes.map(m => EVENT_MISTAKE_LABELS[m]).join('、')}。` : '这节课你一次都没出错。'}
      </p>
      <div className="mt-3 text-sm">
        <p className="font-bold">🔁 {lesson.review.whatIf}</p>
        {shown ? <p className="mt-1" data-testid="grid-review-answer">{lesson.review.answer}</p> : (
          <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm mt-2" data-testid="grid-review-reveal" onClick={() => setShown(true)}>想好了，看看答案</button>
        )}
      </div>
    </section>
  )
}

function EventReflection({ lesson, chosen, onChoose }: { lesson: EventLesson; chosen?: number; onChoose: (index: number) => void }) {
  const check = lesson.reflectionCheck
  const picked = chosen === undefined ? undefined : check.options[chosen]
  return (
    <section className="kc-surface-3d mt-4 rounded-[18px] p-5" data-testid="grid-reflection">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-black">💭 想一想：{check.question}</h3>
        <ReadAloudButton testId="grid-read-reflection" text={`想一想，${check.question} ${check.options.map((o, i) => `第${i + 1}个，${o.text}`).join('。')}`} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {check.options.map((option, i) => (
          <button key={option.text} type="button" className="kc-reflect-option" data-testid={`grid-reflection-option-${i}`}
            data-chosen={chosen === i ? 'true' : 'false'} data-correct={option.correct ? 'true' : 'false'} onClick={() => onChoose(i)}>
            {option.text}
          </button>
        ))}
      </div>
      {picked ? (
        <p className="mt-3 font-bold" data-testid="grid-reflection-result" data-correct={picked.correct ? 'true' : 'false'}>
          {picked.correct ? `✅ 对啦！${check.why}` : `再想想：${check.why}`}
        </p>
      ) : null}
      <p className="kc-text-muted mt-2 text-sm">{lesson.reflection}（可以说给家长听）</p>
    </section>
  )
}
