'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { GridLesson } from '@/content/curriculum/g0-u1-grid-lessons'
import { BlocklyWorkspace } from '@/features/lessons/blockly/blockly-workspace'
import { GuidedLessonShell, type LessonLocalSaveState } from '@/features/lessons/guided-lesson-shell'
import { runGridProgram, type GridRun } from './grid-engine'
import { GridStage, useGridPlayback } from './grid-stage'
import { parseGridDraft, gridDraftKey, type GridDraft } from './grid-draft'

type Block = { type: string; disconnected?: boolean }

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
    const diagnosis = lesson.diagnoses[run.failure!]
    if (!diagnosis) return { tone: 'error', text: run.message }
    // Keep the engine's measured gap ("往右还差 1 格") next to the lesson's diagnosis.
    return { tone: 'error', text: run.failure === 'not_at_goal' ? `${diagnosis}（${run.message}）` : diagnosis }
  }, [notice, run, done, passedHere, step.predict, lesson.diagnoses])

  const hintLayer = failures === 0 ? -1 : Math.min(failures - 1, 2)
  const hintCopy = hintLayer >= 0 ? `（第 ${hintLayer + 1} 层）${step.hints[hintLayer]}` : undefined

  if (finished) {
    return (
      <section className="kc-lesson-shell p-6" data-testid="grid-lesson-finished">
        <div className="kc-feedback kc-feedback-success">
          <p className="kc-feedback-title">🎉 {lesson.title}：{lesson.steps.length} 关全部真的跑通了！</p>
          <p className="mt-2">{lesson.reflection}</p>
          <p className="mt-2 kc-text-muted">给家长：{lesson.parentQuestion}</p>
          <p className="mt-2 kc-text-muted">这是实验课，成绩只保存在本机，不是正式课程成绩。</p>
        </div>
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
            <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950" data-testid="grid-predict">
              🤔 {step.predict}
            </div>
          </div>
          <div className="kc-stage-panel">
            <GridStage level={step.level} state={state} trail={run ? trail : []} />
          </div>
          <div className="kc-stage-panel space-y-3 pt-0">
            <div aria-live="polite" data-testid="grid-feedback" data-tone={feedback.tone}
              className={`kc-feedback ${feedback.tone === 'success' ? 'kc-feedback-success' : feedback.tone === 'error' ? 'kc-feedback-error' : feedback.tone === 'warning' ? 'kc-feedback-warning' : ''}`}>
              {feedback.text}
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
