import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DEMO_A } from './demo-contracts'
import { draftKeyFor } from './lesson-contract'
import { LessonWorkspace } from './lesson-workspace'
import type { EngineAdapter, EngineState, RunEvent, SlotRunAdapter } from './workspace-adapters'
import type { EditorSlotProps } from './workspace-slots'

/**
 * OPS-022 slot channel tests (contract §6): run resolution, shell prop
 * passthrough, sticky-row visibility, and the slot container height rule.
 * The shell's judgment/invalidation/save logic is covered by the fake
 * engine tests in lesson-workspace.test.tsx; these tests pin ONLY the new
 * OPS-022 surface, with a fake slot adapter standing in for a course.
 */

/** Minimal imperative adapter: never mounted for slot courses, but the
 * shell still reads its optional extensions, so it must exist. */
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

/** Synchronous slot run adapter: finishes immediately with its own judgment. */
class SyncSlotRun implements SlotRunAdapter {
  received: unknown = undefined
  runs = 0

  runProgram(program: unknown, onEvent: (e: RunEvent) => void) {
    this.received = program
    this.runs += 1
    onEvent({ kind: 'finished', state: { x: 40, score: 1, running: false, frames: 2 } })
  }

  stop() {}

  getState(): EngineState {
    return { x: 40, score: 1, running: false, frames: 2 }
  }

  getJudgmentResult() {
    return {
      layers: [{ id: 'task', label: '任务', passed: true, detail: '槽位任务通过' }],
      passed: true,
      conclusion: '槽位结论：已完成',
    }
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

/**
 * Probe slot: renders the shell channel as observable DOM. A real course
 * slot (e.g. 3 号的 script-editor.tsx) renders its own toolbar the same
 * way: buttons call shell.run/stop/save, labels read shell.running and
 * shell.saveState. Defined at module level so re-renders never remount it.
 */
function ProbeSlot(props: EditorSlotProps) {
  const shell = props.shell
  return (
    <div data-testid="ws-probe-slot">
      <span data-testid="ws-probe-shell">{shell ? '有通道' : '无通道'}</span>
      <span data-testid="ws-probe-running">{shell?.running ? '运行中' : '未运行'}</span>
      <span data-testid="ws-probe-savestate">{shell?.saveState ?? '无'}</span>
      <button type="button" data-testid="ws-probe-run" onClick={() => shell?.run()}>
        槽位运行
      </button>
      <button type="button" data-testid="ws-probe-stop" onClick={() => shell?.stop()}>
        槽位停止
      </button>
      <button type="button" data-testid="ws-probe-save" onClick={() => shell?.save()}>
        槽位保存
      </button>
      <button
        type="button"
        data-testid="ws-probe-edit"
        onClick={() => props.onChange({ items: ['edited'] })}
      >
        槽位编辑
      </button>
    </div>
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('OPS-022 run resolution', () => {
  it('slot + runAdapter: stage button and slot toolbar both run the slot adapter with the latest slot data', () => {
    const slotRun = new SyncSlotRun()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new DummyAdapter()}
        initialScript={{ items: ['initial'] }}
        editorSlot={ProbeSlot}
        runAdapter={slotRun}
      />,
    )
    // A run target exists, so both run entries render.
    expect(screen.getByTestId('ws-run-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('ws-sticky-run')).toBeInTheDocument()
    expect(screen.getByTestId('ws-probe-shell')).toHaveTextContent('有通道')
    // Slot toolbar run: the adapter receives the initial slot data.
    fireEvent.click(screen.getByTestId('ws-probe-run'))
    expect(slotRun.runs).toBe(1)
    expect(slotRun.received).toEqual({ items: ['initial'] })
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('槽位结论：已完成')
    // Edit through the slot, then run from the stage button: the run
    // must see the EDITED data, never the stale initial.
    fireEvent.click(screen.getByTestId('ws-probe-edit'))
    fireEvent.click(screen.getByTestId('ws-run-toggle'))
    expect(slotRun.runs).toBe(2)
    expect(slotRun.received).toEqual({ items: ['edited'] })
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('槽位结论：已完成')
  })

  it('slot + runAdapter: slot toolbar stop ends a live run and slot save writes the spec draft key', () => {
    const slotRun = new AsyncSlotRun()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new DummyAdapter()}
        initialScript={{ items: ['initial'] }}
        editorSlot={ProbeSlot}
        runAdapter={slotRun}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-probe-run'))
    expect(screen.getByTestId('ws-probe-running')).toHaveTextContent('运行中')
    expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('运行中')
    fireEvent.click(screen.getByTestId('ws-probe-stop'))
    expect(slotRun.stopped).toBe(1)
    expect(screen.getByTestId('ws-probe-running')).toHaveTextContent('未运行')
    expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('未运行')
    fireEvent.click(screen.getByTestId('ws-probe-save'))
    expect(screen.getByTestId('ws-save-chip')).toHaveTextContent('已保存到本机')
    expect(screen.getByTestId('ws-probe-savestate')).toHaveTextContent('saved')
    expect(window.localStorage.getItem(draftKeyFor(DEMO_A.contract.lessonId))).toContain('initial')
  })

  it('slot without runAdapter: no stage run button, no sticky row, no shell channel, no fake action', () => {
    // OPS-022 D1 note: a blockly slot course has no adapter host (the
    // script panel renders the slot, not a Blockly mount), so it still
    // gets no mounted run target and no run button. Assertions unchanged.
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new DummyAdapter()}
        initialScript={{ items: ['initial'] }}
        editorSlot={ProbeSlot}
      />,
    )
    expect(screen.getByTestId('ws-probe-shell')).toHaveTextContent('无通道')
    expect(screen.queryByTestId('ws-run-toggle')).toBeNull()
    expect(screen.queryByTestId('ws-sticky-run')).toBeNull()
    // Clicking the slot's run button with no channel must be a silent
    // no-op: no crash, no judgment, no save chip flip.
    fireEvent.click(screen.getByTestId('ws-probe-run'))
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
    fireEvent.click(screen.getByTestId('ws-probe-save'))
    expect(screen.getByTestId('ws-save-chip')).toHaveTextContent('未保存')
  })

  it('adapter path still runs via the stage toggle after the OPS-022 refactor', () => {
    const fake: EngineAdapter = {
      mount() {},
      unmount() {},
      loadScript() {},
      getScript: () => [],
      run(onEvent) {
        onEvent({ kind: 'finished', state: { x: 150, score: 1, running: false, frames: 3 } })
      },
      stop() {},
      getState: () => ({ x: 150, score: 1, running: false, frames: 3 }),
      getJudgmentResult: () => ({
        layers: [{ id: 'task', label: '任务', passed: true, detail: '适配器任务通过' }],
        passed: true,
        conclusion: '适配器结论：已完成',
      }),
    }
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-run-toggle'))
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('适配器结论：已完成')
  })
})

describe('OPS-022 slot container height (contract §3b)', () => {
  it('the slot container carries the phone min-height rule (tablet/desktop covered by E2E)', () => {
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new DummyAdapter()}
        initialScript={{ items: ['initial'] }}
        editorSlot={ProbeSlot}
        runAdapter={new SyncSlotRun()}
      />,
    )
    const slot = screen.getByTestId('ws-editor-slot')
    expect(window.getComputedStyle(slot).minHeight).toBe('360px')
  })
})
