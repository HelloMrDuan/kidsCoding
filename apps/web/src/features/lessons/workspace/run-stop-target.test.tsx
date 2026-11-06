import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DEMO_A, DEMO_B } from './demo-contracts'
import { draftKeyFor } from './lesson-contract'
import { LessonWorkspace } from './lesson-workspace'
import type { EngineAdapter, EngineState, RunEvent, SlotRunAdapter } from './workspace-adapters'
import type { EditorSlotProps } from './workspace-slots'

/**
 * F2/F3 run-stop target tests (chief final remediation, #480).
 * F2: after a mid-run runAdapter swap, stop must stop the target that
 * actually started the run (runTargetRef), never the new prop.
 * F3: lesson switch / component unmount must best-effort stop the old
 * run target, not only drop its late callbacks.
 */

/** Minimal imperative adapter: never mounted for slot courses. */
class DummyAdapter implements EngineAdapter {
  mount() {}
  unmount() {}
  loadScript() {}
  getScript() {
    return []
  }
  run() {}
  stop() {}
  getState(): EngineState {
    return { x: 0, score: 0, running: false, frames: 0 }
  }
}

/** Async slot run adapter: runs until stop() is called. */
class AsyncSlotRun implements SlotRunAdapter {
  onEvent: ((e: RunEvent) => void) | null = null
  running = false
  stopped = 0

  runProgram(_program: unknown, onEvent: (e: RunEvent) => void) {
    this.running = true
    this.onEvent = onEvent
  }

  stop() {
    this.running = false
    this.stopped += 1
  }

  getState(): EngineState {
    return { x: 0, score: 0, running: this.running, frames: 0 }
  }
}

/** Async imperative adapter: runs until stop() is called. */
class AsyncEngine implements EngineAdapter {
  onEvent: ((e: RunEvent) => void) | null = null
  running = false
  stopped = 0

  mount() {}
  unmount() {}
  loadScript() {}
  getScript() {
    return []
  }

  run(onEvent: (e: RunEvent) => void) {
    this.running = true
    this.onEvent = onEvent
  }

  stop() {
    this.running = false
    this.stopped += 1
  }

  getState(): EngineState {
    return { x: 0, score: 0, running: this.running, frames: 0 }
  }
}

/** Probe slot: only the run/stop buttons and the live running label. */
function ProbeSlot(props: EditorSlotProps) {
  const shell = props.shell
  return (
    <div data-testid="ws-probe-slot">
      <span data-testid="ws-probe-running">{shell?.running ? '运行中' : '未运行'}</span>
      <button type="button" data-testid="ws-probe-run" onClick={() => shell?.run()}>
        槽位运行
      </button>
      <button type="button" data-testid="ws-probe-stop" onClick={() => shell?.stop()}>
        槽位停止
      </button>
    </div>
  )
}

function renderSlotCourse(runAdapter: SlotRunAdapter) {
  return render(
    <LessonWorkspace
      contract={DEMO_A.contract}
      adapter={new DummyAdapter()}
      initialScript={{ items: ['initial'] }}
      editorSlot={ProbeSlot}
      runAdapter={runAdapter}
    />,
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('F2: stop binds to the run that actually started', () => {
  it('stop after a mid-run runAdapter swap stops the OLD target, never the new one', () => {
    const oldRun = new AsyncSlotRun()
    const newRun = new AsyncSlotRun()
    // One shared imperative adapter instance across the rerender: the
    // mount effect must NOT remount here, so the stop below can only come
    // from handleRunStop's runTargetRef binding (the adapter-instance
    // swap path is covered by the coexistence tests below).
    const dummy = new DummyAdapter()
    const { rerender } = render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={dummy}
        initialScript={{ items: ['initial'] }}
        editorSlot={ProbeSlot}
        runAdapter={oldRun}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-probe-run'))
    expect(screen.getByTestId('ws-probe-running')).toHaveTextContent('运行中')
    // The course swaps its run adapter while the old run is still live.
    rerender(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={dummy}
        initialScript={{ items: ['initial'] }}
        editorSlot={ProbeSlot}
        runAdapter={newRun}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-probe-stop'))
    expect(oldRun.stopped).toBe(1)
    expect(oldRun.running).toBe(false)
    expect(newRun.stopped).toBe(0)
    expect(screen.getByTestId('ws-probe-running')).toHaveTextContent('未运行')
  })
})

describe('F3: switch / unmount best-effort stops the old run', () => {
  it('lesson switch stops the old slot run target', () => {
    const slotRun = new AsyncSlotRun()
    const { rerender } = renderSlotCourse(slotRun)
    fireEvent.click(screen.getByTestId('ws-probe-run'))
    expect(screen.getByTestId('ws-probe-running')).toHaveTextContent('运行中')
    rerender(
      <LessonWorkspace
        contract={DEMO_B.contract}
        adapter={new DummyAdapter()}
        initialScript={DEMO_B.initialScript}
        editorSlot={ProbeSlot}
        runAdapter={slotRun}
      />,
    )
    expect(slotRun.stopped).toBe(1)
    expect(slotRun.running).toBe(false)
    expect(screen.getByTestId('ws-probe-running')).toHaveTextContent('未运行')
    // A late 'finished' from the old run must not pollute the new lesson
    // (the generation guard already drops it; this locks that in).
    slotRun.onEvent?.({ kind: 'finished', state: { x: 40, score: 1, running: false, frames: 2 } })
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
  })

  it('lesson switch stops the old imperative adapter run target', () => {
    const engine = new AsyncEngine()
    const { rerender } = render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={engine}
        initialScript={DEMO_A.initialScript}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-run-toggle'))
    expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('运行中')
    rerender(
      <LessonWorkspace
        contract={DEMO_B.contract}
        adapter={engine}
        initialScript={DEMO_B.initialScript}
      />,
    )
    expect(engine.stopped).toBe(1)
    expect(engine.running).toBe(false)
    expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('未运行')
  })

  it('unmount stops the old slot run target', () => {
    const slotRun = new AsyncSlotRun()
    const { unmount } = renderSlotCourse(slotRun)
    fireEvent.click(screen.getByTestId('ws-probe-run'))
    expect(screen.getByTestId('ws-probe-running')).toHaveTextContent('运行中')
    unmount()
    expect(slotRun.stopped).toBe(1)
    expect(slotRun.running).toBe(false)
  })
})

describe('F2 + OPS-023 coexistence: the two stop paths must not double-stop or mis-stop', () => {
  it('adapter-instance swap mid-run: remount cleanup stops the old target once, state resets, later stop never touches the new target', () => {
    const oldRun = new AsyncSlotRun()
    const newRun = new AsyncSlotRun()
    const { rerender } = render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new DummyAdapter()}
        initialScript={{ items: ['initial'] }}
        editorSlot={ProbeSlot}
        runAdapter={oldRun}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-probe-run'))
    expect(screen.getByTestId('ws-probe-running')).toHaveTextContent('运行中')
    // The course swaps BOTH its imperative adapter instance and its run
    // adapter while the old run is live: the OPS-023 mount effect remounts.
    rerender(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new DummyAdapter()}
        initialScript={{ items: ['initial'] }}
        editorSlot={ProbeSlot}
        runAdapter={newRun}
      />,
    )
    // The remount cleanup already stopped the old run and reset the state.
    expect(oldRun.stopped).toBe(1)
    expect(oldRun.running).toBe(false)
    expect(newRun.stopped).toBe(0)
    expect(screen.getByTestId('ws-probe-running')).toHaveTextContent('未运行')
    // A later stop click must be a no-op (nothing is running any more),
    // never a fallback stop of the new target.
    fireEvent.click(screen.getByTestId('ws-probe-stop'))
    expect(oldRun.stopped).toBe(1)
    expect(newRun.stopped).toBe(0)
    // And the new target can start a fresh run afterwards.
    fireEvent.click(screen.getByTestId('ws-probe-run'))
    expect(screen.getByTestId('ws-probe-running')).toHaveTextContent('运行中')
    expect(newRun.running).toBe(true)
  })

  it('lesson switch with adapter swap mid-run: old target stopped exactly once, new lesson starts fresh with its draft isolated', () => {
    const oldRun = new AsyncSlotRun()
    const newRun = new AsyncSlotRun()
    const { rerender } = render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new DummyAdapter()}
        initialScript={{ items: ['initial'] }}
        editorSlot={ProbeSlot}
        runAdapter={oldRun}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-probe-run'))
    expect(screen.getByTestId('ws-probe-running')).toHaveTextContent('运行中')
    rerender(
      <LessonWorkspace
        contract={DEMO_B.contract}
        adapter={new DummyAdapter()}
        initialScript={DEMO_B.initialScript}
        editorSlot={ProbeSlot}
        runAdapter={newRun}
      />,
    )
    // Exactly one stop of the old target: the mount cleanup stops it
    // first; the switch effect must not stop it a second time.
    expect(oldRun.stopped).toBe(1)
    expect(oldRun.running).toBe(false)
    expect(newRun.stopped).toBe(0)
    expect(screen.getByTestId('ws-probe-running')).toHaveTextContent('未运行')
    // The old lesson's draft stays under its own key.
    const oldDraft = window.localStorage.getItem(draftKeyFor(DEMO_A.contract.lessonId))
    expect(oldDraft).toContain('initial')
    // A late 'finished' from the old run must not pollute the new lesson.
    oldRun.onEvent?.({ kind: 'finished', state: { x: 40, score: 1, running: false, frames: 2 } })
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
    // The new lesson can run on its own target.
    fireEvent.click(screen.getByTestId('ws-probe-run'))
    expect(newRun.running).toBe(true)
    expect(screen.getByTestId('ws-probe-running')).toHaveTextContent('运行中')
  })
})
