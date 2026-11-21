'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LessonWorkspace } from '@/features/lessons/workspace/lesson-workspace'
import type { EditorSlotProps, ShellControl } from '@/features/lessons/workspace/workspace-slots'
import { G1_WORKSPACE_CONTRACT } from './g1-u1-l01-contract'
import { emptyStoryDraft } from './g1-u1-l01-draft'
import { StoryAdapter, StoryRunAdapter } from './g1-u1-l01-run-adapter'
import { StoryEditorSlot } from './g1-u1-l01-slot'
import { StoryStageSlot } from './g1-u1-l01-stage'
import '../golden/golden-lesson-layout.css'
import './story-golden-classroom.css'

function GoldenStoryEditor(props: EditorSlotProps) {
  return <StoryEditorSlot {...props} goldenLayout />
}

export function StoryGoldenClassroom() {
  const adapter = useMemo(() => new StoryAdapter(), [])
  const runAdapter = useMemo(() => new StoryRunAdapter(true), [])
  const initial = useMemo(() => emptyStoryDraft(), [])
  const root = useRef<HTMLElement>(null)
  const [controls, setControls] = useState<ShellControl>()
  const [pane, setPane] = useState<'code' | 'task' | 'stage'>('code')
  const [taskOpen, setTaskOpen] = useState(true)
  const [tabletTaskOpen, setTabletTaskOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [focus, setFocus] = useState(false)

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === root.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])

  useEffect(() => {
    if (!focus) return
    const exit = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocus(false)
    }
    window.addEventListener('keydown', exit)
    return () => window.removeEventListener('keydown', exit)
  }, [focus])

  useEffect(() => {
    if (controls?.saveState !== 'failed') return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [controls?.saveState])

  async function toggleFullscreen() {
    if (focus) setFocus(false)
    else if (fullscreen) await document.exitFullscreen()
    else {
      try {
        if (!root.current?.requestFullscreen) throw new Error('Fullscreen unavailable')
        await root.current.requestFullscreen()
      } catch {
        setFocus(true)
      }
    }
  }

  function run() {
    setPane('stage')
    setTabletTaskOpen(false)
    controls?.run()
  }

  const saveLabel = controls?.saveState === 'saved' ? '已保存到本机'
    : controls?.saveState === 'failed' ? '本机保存失败' : '尚未保存'
  return (
    <main ref={root} className="kc-golden kc-golden-story" data-testid="golden-story"
      data-pane={pane} data-task-open={taskOpen} data-tablet-task-open={tabletTaskOpen} data-focus-mode={focus}>
      <header className="kc-golden-toolbar">
        <div className="kc-golden-title">
          <span className="kc-golden-brand">KidsCoding</span>
          <h1>{G1_WORKSPACE_CONTRACT.title}</h1>
        </div>
        <div className="kc-golden-top-actions">
          <Link href="/learn/catalog/G1-U1-L01" className="kc-action-surface kc-btn-outline kc-btn-sm" aria-label="返回课程"
            onNavigate={event => {
              if (controls?.saveState === 'failed' && !window.confirm('这次修改还没保存。要离开课堂吗？')) event.preventDefault()
            }}>返回</Link>
          <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => controls?.save()} disabled={!controls}>保存</button>
          <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm kc-golden-story-task-toggle"
            onClick={() => setTaskOpen(open => !open)} aria-expanded={taskOpen}>{taskOpen ? '收起任务' : '展开任务'}</button>
          <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm kc-golden-story-tablet-task"
            onClick={() => setTabletTaskOpen(open => !open)} aria-expanded={tabletTaskOpen}>{tabletTaskOpen ? '收起任务' : '任务'}</button>
          {controls?.file && (
            <details className="kc-golden-story-file">
              <summary className="kc-action-surface kc-btn-outline kc-btn-sm">文件</summary>
              <div>
                <button type="button" onClick={() => controls.file?.export()}>导出作品</button>
                <button type="button" onClick={() => controls.file?.import()}>导入作品</button>
              </div>
            </details>
          )}
          <button type="button" className="kc-action-surface kc-btn-sm" onClick={() => void toggleFullscreen()}>
            {fullscreen || focus ? '退出全屏' : '全屏'}
          </button>
        </div>
        <div className="kc-golden-progress"><span role="status">{saveLabel}</span></div>
      </header>
      <nav className="kc-golden-tabs" aria-label="课堂分区">
        {([['task', '任务'], ['code', '代码'], ['stage', '舞台']] as const).map(([id, label]) =>
          <button type="button" key={id} onClick={() => setPane(id)} aria-pressed={pane === id}
            data-testid={`golden-story-pane-${id}`} className={`kc-action-surface kc-btn-sm ${pane === id ? '' : 'kc-btn-outline'}`}>{label}</button>)}
      </nav>
      <div className="kc-golden-story-workspace">
        <LessonWorkspace contract={G1_WORKSPACE_CONTRACT} adapter={adapter} runAdapter={runAdapter} stageSlot={StoryStageSlot}
          editorSlot={GoldenStoryEditor} initialScript={initial} onShellControl={setControls} />
      </div>
      <div className="kc-golden-runbar kc-golden-story-runbar">
        <button type="button" className="kc-action-surface kc-btn-sm" onClick={run} disabled={!controls || controls.running}>运行</button>
        <button type="button" className="kc-action-surface kc-btn-outline kc-btn-sm" onClick={() => controls?.stop()} disabled={!controls?.running}>停止</button>
      </div>
    </main>
  )
}
