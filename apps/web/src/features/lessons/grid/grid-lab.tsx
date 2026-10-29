'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { GridLesson, GridLessonStep } from '@/content/curriculum/g0-u1-grid-lessons'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { BlocklyWorkspace } from '@/features/lessons/blockly/blockly-workspace'
import { getKidsBlockLabel } from '@/features/lessons/blockly/register-kids-blocks'
import { GuidedLessonShell, type LessonLocalSaveState } from '@/features/lessons/guided-lesson-shell'
import { ReadAloudButton } from '@/features/lessons/voice/read-aloud'
import { ResetIcon } from '@/features/ui/reset-icon'
import { runGridProgram, type GridFailure, type GridLevel, type GridRun } from './grid-engine'
import { GridStage, useGridPlayback } from './grid-stage'
import { parseGridDraft, gridDraftKey, type GridDraft } from './grid-draft'

type Block = ProgramBlock

/** Failures that happen on one specific block, so we can point at it. */
const BLOCK_FAILURES: GridFailure[] = ['hit_rock', 'fell_in_water', 'out_of_bounds', 'door_locked', 'need_key', 'no_key_here', 'not_at_door']

/** EDU-105: name the exact block where the run went wrong (numbered like the blocks after “开始时”). */
export function failingBlockNote(run: GridRun, blocks: Block[]): string | null {
  if (run.passed || !run.failure || !BLOCK_FAILURES.includes(run.failure)) return null
  const index = run.frames[run.frames.length - 1]?.blockIndex
  if (!index || !blocks[index]) return null
  return `问题出在第 ${index} 块“${getKidsBlockLabel(blocks[index].type)}”。`
}

/** The level a step really runs on: a creative step uses the goal the child placed. */
export function stepLevel(step: GridLessonStep, draft: Pick<GridDraft, 'creative'>): GridLevel {
  const goal = step.creative ? draft.creative?.[step.id]?.goal : undefined
  const patterns = step.creative?.patterns
  if (patterns) {
    // G0-U3: each goal choice comes with its own footprint pattern; nothing to copy before a choice.
    const i = goal ? step.creative!.goalChoices.findIndex(c => c.x === goal.x && c.y === goal.y) : -1
    return goal && i >= 0 ? { ...step.level, goal, footprints: patterns[i] } : { ...step.level, footprints: undefined }
  }
  const waters = step.creative?.waters
  if (waters) {
    // G0-U3-L02: each goal choice comes with its own puddles.
    const i = goal ? step.creative!.goalChoices.findIndex(c => c.x === goal.x && c.y === goal.y) : -1
    return goal && i >= 0 ? { ...step.level, goal, water: waters[i] } : step.level
  }
  return goal ? { ...step.level, goal } : step.level
}

/** Short names for the mistakes listed in 复盘. */
export const MISTAKE_LABELS: Record<GridFailure, string> = {
  no_start: '忘了“开始时”',
  disconnected: '有积木掉队',
  empty_repeat: '重复里面是空的',
  too_deep: '重复套了太多层',
  stamp_twice: '同一格放了两个脚印',
  wrong_pattern: '脚印规律乱了',
  pattern_short: '脚印放得不够',
  unknown_block: '用了这关没有的积木',
  too_many: '积木太多',
  out_of_bounds: '走出了地图',
  hit_rock: '撞到石头',
  fell_in_water: '掉进小河',
  door_locked: '门还锁着',
  no_key_here: '这里没有钥匙',
  not_at_door: '离门太远',
  need_key: '没拿钥匙就开门',
  not_at_goal: '没走到目标',
}

/**
 * EDU-104 grid classroom: the V2 three-zone shell with a real Blockly
 * workspace and the SYS-106 engine. A step passes only after a real run
 * reaches the goal; the child's program for every step is saved locally.
 */
export function GridLab({ lesson }: { lesson: GridLesson }) {
  const [draft, setDraft] = useState<GridDraft>({ stepIndex: 0, programs: {}, passed: [], savedAt: null })
  const [hydrated, setHydrated] = useState(false)
  const [resumedFrom, setResumedFrom] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<LessonLocalSaveState>('unsaved')
  const [run, setRun] = useState<GridRun | null>(null)
  const [failures, setFailures] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [guess, setGuess] = useState<number | null>(null)

  const step = lesson.steps[Math.min(draft.stepIndex, lesson.steps.length - 1)]
  const blocks: Block[] = draft.programs[step.id] ?? step.starterBlocks ?? []
  const passedHere = draft.passed.includes(step.id)
  const level = stepLevel(step, draft)
  const needsGoal = !!step.creative && !draft.creative?.[step.id]
  const observedHere = !step.errorLab || !!draft.observed?.includes(step.id)
  const { state, trail, stamps, done } = useGridPlayback(level, run)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = parseGridDraft(lesson, window.localStorage.getItem(gridDraftKey(lesson.id)))
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

  const persist = useCallback((next: GridDraft) => {
    setDraft(next)
    try {
      const value = { ...next, savedAt: new Date().toISOString() }
      window.localStorage.setItem(gridDraftKey(lesson.id), JSON.stringify(value))
      setSaveState('saved')
    } catch {
      setSaveState('failed')
    }
  }, [lesson.id])

  const handleSnapshot = useCallback((next: Block[]) => {
    if (!hydrated) return
    setDraft(prev => {
      const key = lesson.steps[Math.min(prev.stepIndex, lesson.steps.length - 1)].id
      if (JSON.stringify(prev.programs[key] ?? null) === JSON.stringify(next)) return prev
      const updated = { ...prev, programs: { ...prev.programs, [key]: next } }
      try {
        window.localStorage.setItem(gridDraftKey(lesson.id), JSON.stringify({ ...updated, savedAt: new Date().toISOString() }))
        setSaveState('saved')
      } catch { setSaveState('failed') }
      return updated
    })
    setRun(null)
    setNotice(null)
  }, [hydrated, lesson])

  function handleRun() {
    if (needsGoal) {
      setNotice(step.creative?.patterns ? '先选一种脚印节奏，再运行。' : step.creative?.waters ? '先选有几个水坑，再运行。' : '先选一格，把蘑菇屋搬过去，再运行。')
      return
    }
    const result = runGridProgram(level, blocks)
    setRun(result)
    setNotice(null)
    if (result.passed) {
      // An error-lab fix only counts after the planned mistake was really run and seen.
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

  function chooseGoal(index: number) {
    const goal = step.creative!.goalChoices[index]
    setRun(null)
    setNotice(null)
    // Moving the house means the old pass no longer proves this map.
    persist({ ...draft, creative: { ...(draft.creative ?? {}), [step.id]: { goal } }, passed: draft.passed.filter(id => id !== step.id) })
  }

  function restoreStarter() {
    setRun(null)
    setNotice(null)
    persist({ ...draft, programs: { ...draft.programs, [step.id]: step.starterBlocks ?? [] } })
  }

  function handleReset() {
    setRun(null)
    setNotice(null)
  }

  function goToStep(index: number) {
    setRun(null)
    setGuess(null)
    setFailures(0)
    setNotice(null)
    persist({ ...draft, stepIndex: index })
  }

  function handleComplete() {
    if (!passedHere) {
      setNotice(needsGoal ? (step.creative?.patterns ? '先选一种脚印节奏，再拼程序运行。' : step.creative?.waters ? '先选有几个水坑，再拼程序运行。' : '先选一格，把蘑菇屋搬过去，再拼程序运行。') : !observedHere ? '这是错误实验：先按原样运行一次，亲眼看看错在哪，再修好它。' : '先按“运行”，让小狐狸真的到达目标，才能完成这一关。')
      return
    }
    if (draft.stepIndex < lesson.steps.length - 1) goToStep(draft.stepIndex + 1)
    else setFinished(true)
  }

  const feedback = useMemo(() => {
    if (notice) return { tone: 'warning', text: notice }
    if (!run) return { tone: 'idle', text: passedHere ? '这一关已经通过。可以再试一种不同的程序，或者点“完成这一关”。' : '想好了就按“运行”，看看小狐狸会不会按你猜的走。' }
    if (!done) return { tone: 'idle', text: '小狐狸正在按积木一块一块走……' }
    const outcome = run.passed ? 'pass' : run.failure
    const picked = guess === null ? null : step.predictChoices?.[guess]
    const guessNote = picked ? (picked.when === outcome ? `你猜“${picked.text}”，猜对了！` : `你猜“${picked.text}”，实际不一样，猜错也没关系，看看发生了什么。`) : ''
    if (run.passed && !observedHere) {
      return { tone: 'warning', text: `程序成功了！不过这是错误实验：先按原样运行一次，看看错在哪，再来修。` }
    }
    if (run.passed) return { tone: 'success', text: `🎉 ${guessNote}${run.message}` }
    if (step.errorLab && run.failure === step.errorLab.expect) {
      return { tone: 'error', text: `${guessNote}预想：${step.errorLab.expected} 实际：${step.errorLab.actual} 现在把它修好吧。` }
    }
    const diagnosis = lesson.diagnoses[run.failure!] ?? run.message
    const pointer = failingBlockNote(run, blocks)
    // Keep the engine's measured gap ("往右还差 1 格") next to the lesson's diagnosis.
    const text = run.failure === 'not_at_goal' ? `${diagnosis}（${run.message}）` : diagnosis
    return { tone: 'error', text: `${guessNote}${pointer ? `${text}${pointer}` : text}` }
  }, [notice, run, done, passedHere, lesson.diagnoses, blocks, guess, step, observedHere])

  const hintLayer = failures === 0 ? -1 : Math.min(failures - 1, 2)
  const hintCopy = hintLayer >= 0 ? `（第 ${hintLayer + 1} 层）${step.hints[hintLayer]}` : undefined

  if (finished) {
    return (
      <section className="kc-lesson-shell p-6" data-testid="grid-lesson-finished">
        <div className="kc-feedback kc-feedback-success">
          <p className="kc-feedback-title">🎉 {lesson.title}：{lesson.steps.length} 关全部真的跑通了！</p>
          <p className="mt-2 kc-text-muted">给家长：{lesson.parentQuestion}</p>
          <p className="mt-2 kc-text-muted">这是实验课，成绩只保存在本机，不是正式课程成绩。</p>
        </div>
        <ReviewCard lesson={lesson} mistakes={draft.mistakes ?? []} />
        <ReflectionCheck lesson={lesson} chosen={draft.reflection} onChoose={i => persist({ ...draft, reflection: i })} />
        {lesson.project ? <ProjectCard lesson={lesson} draft={draft} /> : null}
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
      completionPreview={`在森林网格里用积木亲手走完 ${lesson.steps.length} 关，包括一关修好别人的程序。`}
      codeSlot={
        hydrated ? (
          <BlocklyWorkspace key={step.id} allowedBlocks={step.allowedBlocks} blocks={blocks} enableProgramTools snapStartOnTop onSnapshotChange={handleSnapshot} />
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
                <p>🍄 {step.creative.prompt}</p>
                <div className={`mt-2 grid grid-cols-2 gap-2 ${step.creative.labels ? '' : 'sm:grid-cols-4'}`} data-testid="grid-goal-choices">
                  {step.creative.goalChoices.map((cell, i) => {
                    const chosen = draft.creative?.[step.id]?.goal
                    return (
                      <button key={`${cell.x}-${cell.y}`} type="button" className="kc-reflect-option kc-choice-compact" data-testid={`grid-goal-choice-${i}`}
                        aria-pressed={chosen?.x === cell.x && chosen?.y === cell.y}
                        data-chosen={chosen?.x === cell.x && chosen?.y === cell.y ? 'true' : 'false'} onClick={() => chooseGoal(i)}>{step.creative!.labels?.[i] ?? (step.level.rows > 1 ? `第 ${cell.x + 1} 列第 ${cell.y + 1} 行` : `第 ${cell.x + 1} 格`)}</button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
          <div className="kc-stage-panel">
            <GridStage level={level} state={state} trail={run ? trail : []} stamps={run ? stamps : []} />
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
              <button type="button" className="kc-action-surface disabled:opacity-50" data-testid="grid-run" disabled={!!run && !done} onClick={handleRun}>
                {run && !done ? '运行中…' : '▶ 运行'}
              </button>
              <button type="button" className="kc-action-surface kc-btn-outline" data-testid="grid-reset" disabled={!!run && !done} onClick={handleReset}><ResetIcon />回到起点</button>
              {step.errorLab && !observedHere && JSON.stringify(blocks) !== JSON.stringify(step.starterBlocks ?? []) ? (
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

/** Unit project: the child's own passing route, saved locally, replayed by the real engine. */
/** SYS-107: a repeat reads as “重复 4 次（放红脚印、向前走一格…）”. */
function blockText(b: Block): string {
  if (b.type !== 'repeat_times') return getKidsBlockLabel(b.type)
  return `重复 ${b.times ?? 2} 次（${(b.body ?? []).map(blockText).join('、') || '空'}）`
}

function ProjectCard({ lesson, draft }: { lesson: GridLesson; draft: GridDraft }) {
  const project = lesson.project!
  const step = lesson.steps.find(s => s.id === project.stepId)!
  const blocks = useMemo(() => draft.programs[project.stepId] ?? [], [draft.programs, project.stepId])
  const level = useMemo(() => stepLevel(step, draft), [step, draft])
  const [run, setRun] = useState<GridRun | null>(null)
  const { state, trail, stamps, done } = useGridPlayback(level, run)
  const verdict = useMemo(() => runGridProgram(level, blocks), [level, blocks])
  return (
    <section className="kc-surface-3d mt-4 rounded-[18px] p-5" data-testid="grid-project-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-black">🗺️ {project.title}</h3>
        <span className={`kc-chip ${verdict.passed ? 'kc-chip-success' : 'kc-chip-warning'}`} data-testid="grid-project-status">
          {verdict.passed ? '真实运行能走到蘑菇屋' : '这张卡还走不到，回去改一改'}
        </span>
      </div>
      <ol className="mt-3 flex flex-wrap gap-2" data-testid="grid-project-steps">
        {blocks.map((b, i) => (
          <li key={i} className="kc-block-chip" data-block={b.type}>{i === 0 ? '' : `${i}. `}{blockText(b)}</li>
        ))}
      </ol>
      <div className="mt-4 max-w-[420px]">
        <GridStage level={level} state={state} trail={run ? trail : []} stamps={run ? stamps : []} />
      </div>
      <button type="button" className="kc-action-surface mt-3" data-testid="grid-project-play" disabled={!!run && !done}
        onClick={() => setRun(runGridProgram(level, blocks))}>
        {run && !done ? '播放中…' : `▶ 播放${project.title}`}
      </button>
      <p className="kc-text-muted mt-2 text-sm">作品保存在这台设备上，下次打开这节课还在。</p>
    </section>
  )
}

/** 复盘: what the lesson set out to do, the mistakes this child really met and fixed, and a what-if. */
function ReviewCard({ lesson, mistakes }: { lesson: GridLesson; mistakes: GridFailure[] }) {
  const [shown, setShown] = useState(false)
  return (
    <section className="kc-surface-3d mt-4 rounded-[18px] p-5" data-testid="grid-review">
      <h3 className="text-lg font-black">📝 复盘</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {lesson.objectives.map(o => <li key={o}>{o}</li>)}
      </ul>
      <p className="mt-3 text-sm font-bold" data-testid="grid-review-mistakes">
        {mistakes.length ? `这节课你遇到过、又自己修好的错：${mistakes.map(m => MISTAKE_LABELS[m]).join('、')}。` : '这节课你一次都没出错。'}
      </p>
      {lesson.review ? (
        <div className="mt-3 text-sm">
          <p className="font-bold">🔁 {lesson.review.whatIf}</p>
          {shown ? <p className="mt-1" data-testid="grid-review-answer">{lesson.review.answer}</p> : (
            <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm mt-2" data-testid="grid-review-reveal" onClick={() => setShown(true)}>想好了，看看答案</button>
          )}
        </div>
      ) : null}
    </section>
  )
}

/** EDU-105: a one-tap reflection the child answers; the choice is saved with the lesson. */
function ReflectionCheck({ lesson, chosen, onChoose }: { lesson: GridLesson; chosen?: number; onChoose: (index: number) => void }) {
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
