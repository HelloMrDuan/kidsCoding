'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './blockly-studio-layout.css'

export type StudioPane = 'task' | 'code' | 'stage'

const MissionHost = createContext<HTMLElement | null>(null)
const StepbarHost = createContext<HTMLElement | null>(null)

const PANES: { id: StudioPane; label: string }[] = [
  { id: 'task', label: '学习任务' },
  { id: 'code', label: '积木编程' },
  { id: 'stage', label: '作品舞台' },
]

/**
 * Layout only. Lesson slots publish live classroom chrome into the two
 * hosts below (step pills into the step bar, the current step card into the
 * mission panel); the layout never invents a step or a judgment.
 *
 * Geometry follows the approved V3 classroom baseline: 3 columns
 * (mission / editor / stage) on desktop, and 任务·编程·舞台 panes below
 * 1040px. Panes hide with `display:none`, never unmount: the Blockly
 * instance and the stage stay alive, and the editor's ResizeObserver
 * re-measures Blockly when its pane is shown again.
 */
export function BlocklyStudioLayout({ mission, editor, stage, missionMeta, stageVisible = true, pane: controlledPane, onPaneChange, paneTestIdPrefix = 'v3-pane', missionCollapsed = false, onMissionToggle }: {
  mission: ReactNode
  editor: ReactNode
  stage?: ReactNode
  /** Secondary label in the 学习任务 panel head, e.g. "LEVEL 01 · 4 关". */
  missionMeta?: string
  /** Whether the stage pane is offered (stage node stays mounted either way). */
  stageVisible?: boolean
  /**
   * Optional controlled pane. The classroom owns the pane when it needs to
   * expose it (e.g. G1's `golden-story-pane-*` buttons and `data-pane`
   * attribute); absent, the layout keeps its own state as before.
   */
  pane?: StudioPane
  onPaneChange?: (pane: StudioPane) => void
  /** Test-id prefix for the pane tabs, so existing classroom ids survive. */
  paneTestIdPrefix?: string
  /** Desktop task-column collapse (the G1 "收起任务" control). */
  missionCollapsed?: boolean
  onMissionToggle?: () => void
}) {
  const [missionHost, setMissionHost] = useState<HTMLElement | null>(null)
  const [stepbarHost, setStepbarHost] = useState<HTMLElement | null>(null)
  const [internalPane, setPane] = useState<StudioPane>('code')
  const paneState = controlledPane ?? internalPane
  const setPaneState = (next: StudioPane) => {
    if (controlledPane === undefined) setPane(next)
    onPaneChange?.(next)
  }
  const hasStagePane = Boolean(stage) && stageVisible
  const panes = hasStagePane ? PANES : PANES.filter((item) => item.id !== 'stage')
  const pane = hasStagePane || paneState !== 'stage' ? paneState : 'code'

  return (
    <MissionHost.Provider value={missionHost}>
      <StepbarHost.Provider value={stepbarHost}>
        <div className="kc-v3-stepbar" data-testid="v3-stepbar" ref={setStepbarHost} />
        <div className="kc-v3-mobiletabs" role="tablist" aria-label="课堂面板" data-testid="v3-mobiletabs">
          {panes.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${paneTestIdPrefix}-tab-${item.id}`}
              aria-selected={pane === item.id}
              aria-controls="v3-panes"
              className={pane === item.id ? 'on' : undefined}
              onClick={() => setPaneState(item.id)}
              data-testid={`${paneTestIdPrefix}-${item.id}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className={`kc-v3-regions${missionCollapsed ? ' is-mission-collapsed' : ''}`} id="v3-panes" data-testid="ws-grid" data-pane={pane}>
          <aside className="kc-v3-mission" data-pane="task" aria-label="学习任务" data-testid="v3-mission">
            <header className="kc-v3-panelhead">
              <span className="kc-v3-paneltitle">
                <span className="kc-v3-headerglyph" aria-hidden="true">◎</span>
                学习任务
              </span>
              <span className="kc-v3-panel-actions">
                <span className="kc-v3-secondary">{missionMeta ?? '分步任务'}</span>
                {onMissionToggle && (
                  <button
                    type="button"
                    className="kc-v3-mission-toggle"
                    data-testid="v3-mission-toggle"
                    onClick={onMissionToggle}
                    aria-expanded={!missionCollapsed}
                  >
                    {missionCollapsed ? '展开任务' : '收起任务'}
                  </button>
                )}
              </span>
            </header>
            <div className="kc-v3-mission-portal" ref={setMissionHost} />
            <div className="kc-v3-mission-body" data-testid="v3-mission-body">
              <div data-testid="ws-task-panel">{mission}</div>
            </div>
          </aside>
          <div className="kc-v3-editor-region" data-pane="code">{editor}</div>
          {stage && <div className="kc-v3-stage-column" data-pane="stage">{stage}</div>}
        </div>
      </StepbarHost.Provider>
    </MissionHost.Provider>
  )
}


/** Portals the live step card into the mission panel (null host = inline fallback). */
export function BlocklyStudioMission({ children }: { children: ReactNode }) {
  const host = useContext(MissionHost)
  return host ? createPortal(children, host) : children
}

/** Portals the real step pills into the step bar; an unfilled bar hides itself. */
export function BlocklyStudioSteps({ children }: { children: ReactNode }) {
  const host = useContext(StepbarHost)
  return host ? createPortal(children, host) : children
}
