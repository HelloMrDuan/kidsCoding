'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './blockly-studio-layout.css'

const MissionHost = createContext<HTMLElement | null>(null)

/** Layout only. The editor slot publishes its current task and actions here. */
export function BlocklyStudioLayout({ stage, editor, feedback }: {
  stage: ReactNode
  editor: ReactNode
  feedback: ReactNode
}) {
  const [missionHost, setMissionHost] = useState<HTMLElement | null>(null)
  return (
    <MissionHost.Provider value={missionHost}>
      <section className="kc-v3-mission" ref={setMissionHost} aria-label="当前任务" data-testid="v3-mission" />
      <div className="kc-v3-regions" data-testid="ws-grid">
        {stage}
        <div className="kc-v3-editor-region">{editor}</div>
      </div>
      {feedback}
    </MissionHost.Provider>
  )
}

export function BlocklyStudioMission({ children }: { children: ReactNode }) {
  const host = useContext(MissionHost)
  return host ? createPortal(children, host) : children
}
