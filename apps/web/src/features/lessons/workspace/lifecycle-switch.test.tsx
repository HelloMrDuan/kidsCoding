import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEMO_A, DEMO_B, DEMO_S, DEMO_SCRATCH } from './demo-contracts'
import { draftKeyFor } from './lesson-contract'
import { LessonWorkspace } from './lesson-workspace'
import type { EngineAdapter, EngineState, RunEvent } from './workspace-adapters'
import type { EditorSlotProps, StageSlotProps } from './workspace-slots'

/**
 * OPS-023 lifecycle tests: cross-lesson switching + engine lifecycle.
 *
 * Test-first: each test pins the CORRECT end state (old adapter released,
 * old run stopped, no judgment/state/draft leaks, no cross-lesson async
 * results). A failing test below is a reproduced defect; a passing test
 * pins behavior that already holds. The shell is driven through its real
 * rerender/unmount paths with per-lesson tracking adapters — never a mock
 * of a mock.
 */

type RunMode = 'sync' | 'async'

/** Per-lesson tracking adapter: counts mount/unmount/stop/run, holds a script. */
class TrackingAdapter implements EngineAdapter {
  label: string
  mode: RunMode
  script: unknown
  mounts = 0
  unmounts = 0
  stops = 0
  runs = 0
  state: EngineState = { x: 0, score: 0, running: false, frames: 0 }
  onEvent: ((e: RunEvent) => void) | null = null
  listeners = new Set<() => void>()
  ready = false

  constructor(label: string, mode: RunMode = 'sync', initial: unknown = []) {
    this.label = label
    this.mode = mode
    this.script = initial
  }

  mount() {
    this.mounts += 1
  }

  // Deliberately does NOT stop the run on unmount: the interface promises
  // no stop-on-unmount, real adapters self-stop (Blockly stops its timer,
  // Scratch sends STOP). The shell must stop a live run itself when it
  // switches lessons or unmounts mid-run.
  unmount() {
    this.unmounts += 1
  }

  loadScript(script: unknown) {
    this.script = script
  }

  getScript() {
    return this.script
  }

  run(onEvent: (e: RunEvent) => void) {
    this.runs += 1
    this.onEvent = onEvent
    if (this.mode === 'sync') {
      this.state = { x: 150, score: 1, running: false, frames: 3 }
      onEvent({ kind: 'finished', state: { ...this.state } })
    } else {
      this.state = { x: 10, score: 0, running: true, frames: 1 }
      onEvent({ kind: 'frame', state: { ...this.state } })
    }
  }

  /** Test control: deliver the (possibly late) finished event. */
  finish() {
    this.state = { x: 150, score: 1, running: false, frames: 3 }
    this.onEvent?.({ kind: 'finished', state: { ...this.state } })
  }

  stop() {
    this.stops += 1
    this.state = { ...this.state, running: false }
    this.onEvent?.({ kind: 'stopped', state: { ...this.state } })
  }

  getState(): EngineState {
    return { ...this.state }
  }

  getJudgmentResult() {
    return {
      layers: [{ id: 'task', label: '任务', passed: true, detail: `${this.label}课任务通过` }],
      passed: true,
      conclusion: `${this.label}课结论：已完成`,
    }
  }

  isReady() {
    return this.ready
  }

  getLoadError() {
    return null
  }

  addChangeListener(cb: () => void) {
    this.listeners.add(cb)
  }

  removeChangeListener(cb: () => void) {
    this.listeners.delete(cb)
  }

  emitChange() {
    for (const cb of this.listeners) cb()
  }
}

/** Minimal slot: only used to mark a lesson as an editorSlot course. */
function ProbeSlot(props: EditorSlotProps) {
  return (
    <div data-testid="ws-probe-slot">
      <button
        type="button"
        data-testid="ws-probe-edit"
        onClick={() => props.onChange({ items: ['edited-by-slot'] })}
      >
        槽位编辑
      </button>
    </div>
  )
}

/** Stage probe: renders the shell's engine state as observable text. */
function StageProbe(props: StageSlotProps) {
  const s = props.state
  return (
    <div data-testid="ws-stage-probe">{`x=${s.x} score=${s.score} running=${s.running ? 1 : 0} frames=${s.frames ?? 0}`}</div>
  )
}

/** Second scratch lesson (same engine as DEMO_SCRATCH, different lessonId). */
const SCRATCH_B = {
  ...DEMO_SCRATCH,
  contract: {
    ...DEMO_SCRATCH.contract,
    lessonId: 'demo-scratch-b',
    draftKey: draftKeyFor('demo-scratch-b'),
  },
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('OPS-023 ① 同引擎切课：适配器归属', () => {
  it('①a 适配器课切到 EditorSlot 课（同引擎）：旧适配器卸载、新适配器挂载，运行走新适配器', () => {
    const a1 = new TrackingAdapter('A', 'sync')
    const a2 = new TrackingAdapter('B', 'sync')
    const { rerender } = render(
      <LessonWorkspace
        contract={DEMO_SCRATCH.contract}
        adapter={a1}
        initialScript={DEMO_SCRATCH.initialScript}
        stageSlot={StageProbe}
      />,
    )
    expect(a1.mounts).toBe(1)
    rerender(
      <LessonWorkspace
        contract={SCRATCH_B.contract}
        adapter={a2}
        initialScript={DEMO_SCRATCH.initialScript}
        editorSlot={ProbeSlot}
        stageSlot={StageProbe}
      />,
    )
    expect(a1.unmounts).toBe(1)
    expect(a2.mounts).toBe(1)
    fireEvent.click(screen.getByTestId('ws-run-toggle'))
    expect(a2.runs).toBe(1)
    expect(a1.runs).toBe(0)
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('B课结论')
  })

  it('①b EditorSlot 课切到适配器课（同引擎）：新适配器挂载并拿到新课脚本', () => {
    const a1 = new TrackingAdapter('A', 'sync')
    const a2 = new TrackingAdapter('B', 'sync')
    const bScript = [
      { type: 'when_start' },
      { type: 'ws_move_right', steps: 55 },
    ]
    const { rerender } = render(
      <LessonWorkspace
        contract={DEMO_SCRATCH.contract}
        adapter={a1}
        initialScript={DEMO_SCRATCH.initialScript}
        editorSlot={ProbeSlot}
        stageSlot={StageProbe}
      />,
    )
    expect(a1.mounts).toBe(1)
    rerender(
      <LessonWorkspace
        contract={SCRATCH_B.contract}
        adapter={a2}
        initialScript={bScript}
        stageSlot={StageProbe}
      />,
    )
    expect(a1.unmounts).toBe(1)
    expect(a2.mounts).toBe(1)
    expect(a2.script).toEqual(bScript)
    fireEvent.click(screen.getByTestId('ws-run-toggle'))
    expect(a2.runs).toBe(1)
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('B课结论')
  })
})

describe('OPS-023 ② 切课时旧运行必须停止', () => {
  it('② 运行中切课：旧适配器 stop 被调用，新课运行状态干净、新课可运行', () => {
    const a = new TrackingAdapter('A', 'async')
    const b = new TrackingAdapter('B', 'async')
    const { rerender } = render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={a}
        initialScript={DEMO_A.initialScript}
        stageSlot={StageProbe}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-run-script'))
    expect(a.runs).toBe(1)
    expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('运行中')
    rerender(
      <LessonWorkspace
        contract={DEMO_B.contract}
        adapter={b}
        initialScript={DEMO_B.initialScript}
        stageSlot={StageProbe}
      />,
    )
    expect(a.stops).toBe(1)
    expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('未运行')
    expect(screen.getByTestId('ws-stage-probe')).toHaveTextContent('running=0')
    fireEvent.click(screen.getByTestId('ws-run-script'))
    expect(b.runs).toBe(1)
    expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('运行中')
  })
})

describe('OPS-023 ③ 旧课判定/状态/草稿不得污染新课', () => {
  it('③a 旧课判定与运行状态不得污染新课', () => {
    const a = new TrackingAdapter('A', 'sync')
    const b = new TrackingAdapter('B', 'sync')
    const { rerender } = render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={a}
        initialScript={DEMO_A.initialScript}
        stageSlot={StageProbe}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-run-script'))
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('A课结论')
    expect(screen.getByTestId('ws-stage-probe')).toHaveTextContent('x=150')
    rerender(
      <LessonWorkspace
        contract={DEMO_B.contract}
        adapter={b}
        initialScript={DEMO_B.initialScript}
        stageSlot={StageProbe}
      />,
    )
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
    expect(screen.getByTestId('ws-stage-probe')).toHaveTextContent('x=0 score=0 running=0 frames=0')
    expect(screen.getByTestId('ws-save-chip')).toHaveTextContent('未保存')
  })

  it('③b 跨引擎切课：旧课草稿写在旧课 key 下，新课草稿 key 与新课脚本不受旧课污染', () => {
    const a = new TrackingAdapter('A', 'sync')
    const c = new TrackingAdapter('C', 'sync')
    const { rerender } = render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={a}
        initialScript={DEMO_A.initialScript}
      />,
    )
    // Edit A through the adapter change channel (the same path a course edit takes).
    act(() => {
      a.script = [{ type: 'when_start' }, { type: 'ws_move_right', steps: 42 }]
      a.emitChange()
    })
    rerender(
      <LessonWorkspace
        contract={DEMO_SCRATCH.contract}
        adapter={c}
        initialScript={DEMO_SCRATCH.initialScript}
      />,
    )
    expect(window.localStorage.getItem('kidscoding-draft:demo-a')).toContain('"steps":42')
    expect(window.localStorage.getItem('kidscoding-draft:demo-scratch')).toBeNull()
    expect(c.script).toEqual([])
  })
})

describe('OPS-023 ④ 卸载与重新进入', () => {
  it('④a 卸载后重新进入：适配器释放、重新挂载、运行恢复', () => {
    const a = new TrackingAdapter('A', 'sync')
    const { unmount } = render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={a}
        initialScript={DEMO_A.initialScript}
      />,
    )
    expect(a.mounts).toBe(1)
    fireEvent.click(screen.getByTestId('ws-run-script'))
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('A课结论')
    unmount()
    expect(a.unmounts).toBe(1)
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={a}
        initialScript={DEMO_A.initialScript}
      />,
    )
    expect(a.mounts).toBe(2)
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
    fireEvent.click(screen.getByTestId('ws-run-script'))
    expect(a.runs).toBe(2)
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('A课结论')
  })

  it('④b 运行中卸载：旧运行不再产生可见副作用，迟到事件不落到新实例', () => {
    const a = new TrackingAdapter('A', 'async')
    const { unmount } = render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={a}
        initialScript={DEMO_A.initialScript}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-run-script'))
    expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('运行中')
    unmount()
    expect(a.unmounts).toBe(1)
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={a}
        initialScript={DEMO_A.initialScript}
      />,
    )
    expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('未运行')
    act(() => {
      a.finish()
    })
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
    expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('未运行')
  })
})

describe('OPS-023 ⑤ 快速连续切课：异步结果不得串课', () => {
  it('⑤a 快速切课两次后，旧课迟到的 finished 不得落到新课判定，新课仍可运行', () => {
    const a = new TrackingAdapter('A', 'async')
    const b = new TrackingAdapter('B', 'async')
    const c = new TrackingAdapter('C', 'async')
    const { rerender } = render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={a}
        initialScript={DEMO_A.initialScript}
        stageSlot={StageProbe}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-run-script'))
    expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('运行中')
    rerender(
      <LessonWorkspace
        contract={DEMO_B.contract}
        adapter={b}
        initialScript={DEMO_B.initialScript}
        stageSlot={StageProbe}
      />,
    )
    rerender(
      <LessonWorkspace
        contract={{
          ...DEMO_A.contract,
          lessonId: 'demo-a2',
          title: '演示 A2',
          draftKey: draftKeyFor('demo-a2'),
        }}
        adapter={c}
        initialScript={DEMO_A.initialScript}
        stageSlot={StageProbe}
      />,
    )
    act(() => {
      a.finish()
    })
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
    expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('未运行')
    fireEvent.click(screen.getByTestId('ws-run-script'))
    expect(c.runs).toBe(1)
    expect(b.runs).toBe(0)
  })

  it('⑤b Scratch 轮询不得把旧适配器的运行状态写进新课', () => {
    vi.useFakeTimers()
    try {
      const a = new TrackingAdapter('A', 'async')
      const b = new TrackingAdapter('B', 'sync')
      const { rerender } = render(
        <LessonWorkspace
          contract={DEMO_SCRATCH.contract}
          adapter={a}
          initialScript={DEMO_SCRATCH.initialScript}
          stageSlot={StageProbe}
        />,
      )
      fireEvent.click(screen.getByTestId('ws-run-script'))
      expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('运行中')
      rerender(
        <LessonWorkspace
          contract={SCRATCH_B.contract}
          adapter={b}
          initialScript={DEMO_SCRATCH.initialScript}
          stageSlot={StageProbe}
        />,
      )
      act(() => {
        vi.advanceTimersByTime(600)
      })
      expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('未运行')
      expect(screen.getByTestId('ws-stage-probe')).toHaveTextContent('running=0')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('OPS-023 ⑥ 三种模式切换的一致性', () => {
  it('⑥a Scratch→Summary→Blockly：旧适配器卸载、Summary 无运行按钮、新引擎挂载运行', () => {
    const s = new TrackingAdapter('S', 'sync')
    const b = new TrackingAdapter('B', 'sync')
    const { rerender } = render(
      <LessonWorkspace
        contract={DEMO_SCRATCH.contract}
        adapter={s}
        initialScript={DEMO_SCRATCH.initialScript}
      />,
    )
    expect(s.mounts).toBe(1)
    rerender(
      <LessonWorkspace
        contract={DEMO_S.contract}
        adapter={s}
        initialScript={DEMO_S.initialScript}
        editorSlot={ProbeSlot}
      />,
    )
    expect(s.unmounts).toBe(1)
    expect(screen.queryByTestId('ws-run-script')).toBeNull()
    expect(screen.queryByTestId('ws-run-toggle')).toBeNull()
    // The old lesson's draft must stay under the old lesson's key.
    expect(window.localStorage.getItem('kidscoding-draft:demo-scratch')).toContain('"script":[]')
    expect(window.localStorage.getItem('kidscoding-draft:demo-s')).toBeNull()
    rerender(
      <LessonWorkspace
        contract={DEMO_B.contract}
        adapter={b}
        initialScript={DEMO_B.initialScript}
      />,
    )
    expect(b.mounts).toBe(1)
    fireEvent.click(screen.getByTestId('ws-run-script'))
    expect(b.runs).toBe(1)
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('B课结论')
  })

  it('⑥b Scratch 就绪状态不得跨课残留', () => {
    vi.useFakeTimers()
    try {
      const a = new TrackingAdapter('A', 'sync')
      a.ready = true
      const b = new TrackingAdapter('B', 'sync')
      b.ready = false
      const { rerender } = render(
        <LessonWorkspace
          contract={DEMO_SCRATCH.contract}
          adapter={a}
          initialScript={DEMO_SCRATCH.initialScript}
        />,
      )
      act(() => {
        vi.advanceTimersByTime(600)
      })
      expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('沙箱已就绪')
      rerender(
        <LessonWorkspace
          contract={SCRATCH_B.contract}
          adapter={b}
          initialScript={DEMO_SCRATCH.initialScript}
        />,
      )
      act(() => {
        vi.advanceTimersByTime(600)
      })
      expect(screen.getByTestId('ws-stage-state')).toHaveTextContent('沙箱握手中')
    } finally {
      vi.useRealTimers()
    }
  })

  it('⑥c Scratch→Summary→Scratch 往返：适配器卸载后重新挂载', () => {
    const s1 = new TrackingAdapter('S1', 'sync')
    const s2 = new TrackingAdapter('S2', 'sync')
    const { rerender } = render(
      <LessonWorkspace
        contract={DEMO_SCRATCH.contract}
        adapter={s1}
        initialScript={DEMO_SCRATCH.initialScript}
      />,
    )
    expect(s1.mounts).toBe(1)
    rerender(
      <LessonWorkspace
        contract={DEMO_S.contract}
        adapter={s1}
        initialScript={DEMO_S.initialScript}
        editorSlot={ProbeSlot}
      />,
    )
    expect(s1.unmounts).toBe(1)
    rerender(
      <LessonWorkspace
        contract={SCRATCH_B.contract}
        adapter={s2}
        initialScript={DEMO_SCRATCH.initialScript}
      />,
    )
    expect(s2.mounts).toBe(1)
    fireEvent.click(screen.getByTestId('ws-run-script'))
    expect(s2.runs).toBe(1)
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('S2课结论')
  })
})
