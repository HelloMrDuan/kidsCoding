import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DEMO_A } from './demo-contracts'
import { LessonWorkspace } from './lesson-workspace'
import type { EngineAdapter, EngineState, RunEvent } from './workspace-adapters'

/**
 * OPS-022 D1 regression: a slot course with a real engine mounts its
 * imperative adapter (the run target) instead of leaving the run button
 * dead, while the slot keeps owning its data (the shell never loads into
 * the adapter). Summary courses still mount nothing. This pins the
 * shared-shell-defects D1 acceptance at the shell level, with a counting
 * stub adapter standing in for a course VM adapter.
 */
class CountingAdapter implements EngineAdapter {
  mounts = 0
  unmounts = 0
  loadScriptCalls = 0
  runs = 0

  mount() {
    this.mounts += 1
  }

  unmount() {
    this.unmounts += 1
  }

  loadScript() {
    this.loadScriptCalls += 1
  }

  getScript() {
    return []
  }

  run(onEvent: (e: RunEvent) => void) {
    this.runs += 1
    onEvent({ kind: 'finished', state: { x: 0, score: 0, running: false, frames: 1 } })
  }

  stop() {}

  getState(): EngineState {
    return { x: 0, score: 0, running: false, frames: 0 }
  }
}

function StubEditorSlot() {
  return <div data-testid="stub-editor-slot" />
}

function StubStageSlot() {
  return <div data-testid="stub-stage-slot" />
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('OPS-022 D1: slot + adapter coexist', () => {
  it('scratch-vm + editorSlot + stageSlot: shell mounts the adapter into ws-adapter-mount, never a double host', () => {
    const adapter = new CountingAdapter()
    render(
      <LessonWorkspace
        contract={{ ...DEMO_A.contract, engine: 'scratch-vm' }}
        adapter={adapter}
        editorSlot={StubEditorSlot}
        stageSlot={StubStageSlot}
      />,
    )
    expect(adapter.mounts).toBe(1)
    expect(screen.getByTestId('ws-adapter-mount')).toBeInTheDocument()
    // The no-slot scratch host must not render alongside the slot host.
    expect(screen.queryByTestId('ws-scratch-mount')).toBeNull()
    expect(screen.getByTestId('stub-stage-slot')).toBeInTheDocument()
  })

  it('scratch-vm + editorSlot: the stage run button calls adapter.run', () => {
    const adapter = new CountingAdapter()
    render(
      <LessonWorkspace
        contract={{ ...DEMO_A.contract, engine: 'scratch-vm' }}
        adapter={adapter}
        editorSlot={StubEditorSlot}
        stageSlot={StubStageSlot}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-run-toggle'))
    expect(adapter.runs).toBe(1)
  })

  it('scratch-vm + editorSlot: the shell never loads into the adapter (slot owns the session)', () => {
    const adapter = new CountingAdapter()
    render(
      <LessonWorkspace
        contract={{ ...DEMO_A.contract, engine: 'scratch-vm' }}
        adapter={adapter}
        editorSlot={StubEditorSlot}
        stageSlot={StubStageSlot}
      />,
    )
    expect(adapter.loadScriptCalls).toBe(0)
  })

  it('summary + editorSlot: the shell still mounts no adapter and renders no run button', () => {
    const adapter = new CountingAdapter()
    render(
      <LessonWorkspace
        contract={{ ...DEMO_A.contract, engine: 'summary' }}
        adapter={adapter}
        editorSlot={StubEditorSlot}
      />,
    )
    expect(adapter.mounts).toBe(0)
    expect(screen.queryByTestId('ws-run-toggle')).toBeNull()
  })
})
