'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { LessonLocalSaveState } from '../guided-lesson-shell'
import './golden-lesson-layout.css'

const panes = [['task', '任务'], ['code', '代码'], ['stage', '舞台']] as const
const saveLabels: Record<LessonLocalSaveState, string> = {
  saved: '已保存到本机',
  unsaved: '尚未保存',
  failed: '本机保存失败',
}

type GoldenLessonLayoutProps = {
  lessonId: string
  title: string
  stepTitle: string
  stepIndex: number
  stepCount: number
  saveState: LessonLocalSaveState
  resumedFromStep: number | null
  task: ReactNode
  editor: ReactNode
  stage: ReactNode
  runControls: (showStage: () => void) => ReactNode
  onSave: () => void
  onComplete: () => boolean
  completeDisabled: boolean
}

export function GoldenLessonLayout({
  lessonId, title, stepTitle, stepIndex, stepCount, saveState, resumedFromStep,
  task, editor, stage, runControls, onSave, onComplete, completeDisabled,
}: GoldenLessonLayoutProps) {
  const root = useRef<HTMLElement>(null)
  const [taskOpen, setTaskOpen] = useState(true)
  const [tabletTaskOpen, setTabletTaskOpen] = useState(false)
  const [pane, setPane] = useState<(typeof panes)[number][0]>('code')
  const [fullscreen, setFullscreen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === root.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])

  useEffect(() => {
    if (!focusMode) return
    const exit = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocusMode(false)
    }
    window.addEventListener('keydown', exit)
    return () => window.removeEventListener('keydown', exit)
  }, [focusMode])

  function toggleTask() {
    if (!window.matchMedia('(min-width: 1200px)').matches) {
      if (window.matchMedia('(max-width: 767px)').matches) {
        setPane(pane === 'task' ? 'code' : 'task')
        return
      }
      setTabletTaskOpen(!tabletTaskOpen)
      return
    }
    setTaskOpen(!taskOpen)
  }

  async function toggleFullscreen() {
    if (focusMode) {
      setFocusMode(false)
    } else if (fullscreen) {
      await document.exitFullscreen()
    } else {
      try {
        if (!root.current?.requestFullscreen) throw new Error('Fullscreen unavailable')
        await root.current.requestFullscreen()
      } catch {
        setFocusMode(true)
      }
    }
  }

  return (
    <section ref={root} className="kc-golden" data-testid="golden-lesson"
      data-pane={pane} data-task-open={taskOpen} data-tablet-task-open={tabletTaskOpen} data-focus-mode={focusMode}>
      <header className="kc-golden-toolbar" data-testid="grid-lab-title-row">
        <div className="kc-golden-title">
          <span className="kc-golden-brand">KidsCoding</span>
          <h1>{title}</h1>
        </div>
        <div className="kc-golden-top-actions">
          <Link className="kc-action-surface kc-btn-outline kc-btn-sm" href={`/learn/catalog/${lessonId}`} aria-label="返回课程"
            onNavigate={event => {
              if (saveState === 'failed' && !window.confirm('这次修改还没保存。要离开课堂吗？')) event.preventDefault()
            }}>返回<span className="kc-golden-wide-label">课程</span></Link>
          <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" data-testid="golden-save" onClick={onSave}>保存</button>
          <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" data-testid="golden-task-toggle" aria-controls="golden-task-panel" onClick={toggleTask}>任务</button>
          <button type="button" className="kc-action-surface kc-btn-sm" data-testid="golden-fullscreen"
            onClick={() => void toggleFullscreen()}>{fullscreen || focusMode ? '退出全屏' : '全屏'}</button>
        </div>
        <div className="kc-golden-progress">
          <span>第 {stepIndex + 1} / {stepCount} 关</span>
          <progress value={stepIndex + 1} max={stepCount} aria-label="关卡进度" />
          <span className={`kc-chip ${saveState === 'saved' ? 'kc-chip-success' : saveState === 'failed' ? 'kc-chip-warning' : 'kc-chip-info'}`}
            data-testid="lesson-save-local" role="status">{saveLabels[saveState]}</span>
          {saveState === 'failed' && (
            <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" data-testid="lesson-save-retry" onClick={onSave}>重试保存</button>
          )}
          {resumedFromStep !== null && <span className="kc-text-muted" data-testid="lesson-resume-note">已回到第 {resumedFromStep + 1} 关</span>}
          <span className="kc-golden-step-title">{stepTitle}</span>
        </div>
      </header>
      <nav className="kc-golden-tabs" data-testid="lesson-mobile-tabs" aria-label="课堂分区">
        {panes.map(([id, label]) => (
          <button className={`kc-action-surface kc-btn-sm ${pane === id ? '' : 'kc-btn-outline'}`}
            key={id} type="button" data-testid={`lesson-mobile-tab-${id}`} aria-pressed={pane === id}
            onClick={() => setPane(id)}>{label}</button>
        ))}
      </nav>
      <div className="kc-golden-panels">
        <section className="kc-golden-panel kc-golden-task" id="golden-task-panel" aria-label="学习任务">
          <div className="kc-golden-panel-title">学习任务</div>
          <div className="kc-golden-task-body">
            <div data-testid="lesson-task-card"><h2>{stepTitle}</h2></div>
            {task}
            <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" data-testid="golden-task-close" onClick={toggleTask}>收起任务</button>
          </div>
        </section>
        <section className="kc-golden-panel kc-golden-editor" aria-label="真实 Blockly 编辑器">
          <div className="kc-golden-panel-title">Blockly 编辑器</div>
          {editor}
        </section>
        <section className="kc-golden-panel kc-golden-stage" aria-label="实时舞台">
          <div className="kc-golden-panel-title">实时舞台</div>
          {stage}
        </section>
        <div className="kc-golden-runbar">
          {runControls(() => {
            setPane('stage')
            setTabletTaskOpen(false)
          })}
          <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" data-testid="lesson-complete-step"
            disabled={completeDisabled} onClick={() => setPane(onComplete() ? 'task' : 'stage')}>{stepIndex + 1 === stepCount ? '完成这节课' : '完成这一关'}</button>
        </div>
      </div>
    </section>
  )
}
