'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { GridLesson } from '@/content/curriculum/g0-u1-grid-lessons'
import { BlocklyWorkspace } from '@/features/lessons/blockly/blockly-workspace'
import { getKidsBlockLabel } from '@/features/lessons/blockly/register-kids-blocks'
import { GuidedLessonShell, type LessonLocalSaveState } from '@/features/lessons/guided-lesson-shell'
import { ReadAloudButton } from '@/features/lessons/voice/read-aloud'
import { runGridProgram, type GridFailure, type GridRun } from './grid-engine'
import { GridStage, useGridPlayback } from './grid-stage'
import { parseGridDraft, gridDraftKey, type GridDraft } from './grid-draft'

type Block = { type: string; disconnected?: boolean }

/** Failures that happen on one specific block, so we can point at it. */
const BLOCK_FAILURES: GridFailure[] = ['hit_rock', 'fell_in_water', 'out_of_bounds', 'door_locked', 'need_key', 'no_key_here', 'not_at_door']

/** EDU-105: name the exact block where the run went wrong (numbered like the blocks after “开始时”). */
export function failingBlockNote(run: GridRun, blocks: Block[]): string | null {
  if (run.passed || !run.failure || !BLOCK_FAILURES.includes(run.failure)) return null
  const index = run.frames[run.frames.length - 1]?.blockIndex
  if (!index || !blocks[index]) return null
  return `问题出在第 ${index} 块“${getKidsBlockLabel(blocks[index].type)}”。`
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

  const step = lesson.steps[Math.min(draft.stepIndex, lesson.steps.length - 1)]
  const blocks: Block[] = draft.programs[step.id] ?? step.starterBlocks ?? []
  const passedHere = draft.passed.includes(step.id)
  const { state, trail, done } = useGridPlayback(step.level, run)

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
    const result = runGridProgram(step.level, blocks)
    setRun(result)
    setNotice(null)
    if (result.passed) {
      if (!passedHere) persist({ ...draft, passed: [...draft.passed, step.id] })
    } else {
      setFailures(n => n + 1)
    }
  }

  function handleReset() {
    setRun(null)
    setNotice(null)
  }

  function goToStep(index: number) {
    setRun(null)
    setFailures(0)
    setNotice(null)
    persist({ ...draft, stepIndex: index })
  }

  function handleComplete() {
    if (!passedHere) {
      setNotice('先按“运行”，让小狐狸真的到达目标，才能完成这一步。')
      return
    }
    if (draft.stepIndex < lesson.steps.length - 1) goToStep(draft.stepIndex + 1)
    else setFinished(true)
  }

  const feedback = useMemo(() => {
    if (notice) return { tone: 'warning', text: notice }
    if (!run) return { tone: 'idle', text: passedHere ? '这一步已经通过。可以再试一种不同的程序，或者点“完成这一步”。' : '想好了就按“运行”，看看小狐狸会不会按你猜的走。' }
    if (!done) return { tone: 'idle', text: '小狐狸正在按积木一块一块走……' }
    if (run.passed) return { tone: 'success', text: `🎉 ${run.message}` }
    const diagnosis = lesson.diagnoses[run.failure!] ?? run.message
    const pointer = failingBlockNote(run, blocks)
    // Keep the engine's measured gap ("往右还差 1 格") next to the lesson's diagnosis.
    const text = run.failure === 'not_at_goal' ? `${diagnosis}（${run.message}）` : diagnosis
    return { tone: 'error', text: pointer ? `${text}${pointer}` : text }
  }, [notice, run, done, passedHere, lesson.diagnoses, blocks])

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
        <ReflectionCheck lesson={lesson} chosen={draft.reflection} onChoose={i => persist({ ...draft, reflection: i })} />
        {lesson.project ? <ProjectCard lesson={lesson} blocks={draft.programs[lesson.project.stepId] ?? []} /> : null}
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
            </div>
          </div>
          <div className="kc-stage-panel">
            <GridStage level={step.level} state={state} trail={run ? trail : []} />
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
              <button type="button" className="kc-action-surface kc-btn-outline" data-testid="grid-reset" disabled={!!run && !done} onClick={handleReset}>↺ 回到起点</button>
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
function ProjectCard({ lesson, blocks }: { lesson: GridLesson; blocks: Block[] }) {
  const project = lesson.project!
  const step = lesson.steps.find(s => s.id === project.stepId)!
  const [run, setRun] = useState<GridRun | null>(null)
  const { state, trail, done } = useGridPlayback(step.level, run)
  const verdict = useMemo(() => runGridProgram(step.level, blocks), [step.level, blocks])
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
          <li key={i} className="kc-block-chip" data-block={b.type}>{i === 0 ? '' : `${i}. `}{getKidsBlockLabel(b.type)}</li>
        ))}
      </ol>
      <div className="mt-4 max-w-[420px]">
        <GridStage level={step.level} state={state} trail={run ? trail : []} />
      </div>
      <button type="button" className="kc-action-surface mt-3" data-testid="grid-project-play" disabled={!!run && !done}
        onClick={() => setRun(runGridProgram(step.level, blocks))}>
        {run && !done ? '播放中…' : '▶ 播放我的寻路卡'}
      </button>
      <p className="kc-text-muted mt-2 text-sm">作品保存在这台设备上，下次打开这节课还在。</p>
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
