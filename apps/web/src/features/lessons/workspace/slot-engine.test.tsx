import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DEMO_A, DEMO_SLOT } from './demo-contracts'
import { DemoSlotEditor } from './demo-slot-editor'
import { SlotDemoAdapter } from './demo-slot-adapter'
import { draftKeyFor, validateLessonContract, type LessonContract } from './lesson-contract'
import { LessonWorkspace } from './lesson-workspace'
import type { EngineAdapter, EngineState, RunEvent, SlotRunAdapter } from './workspace-adapters'
import type { JudgmentResult } from './workspace-slots'

/**
 * OPS-026 generic slot engine (Issue #482, chief ruling option ②):
 * engine='slot' is the generic slot-lesson engine; 'json' is NOT an
 * engine value and JSON courses must never masquerade as 'summary'.
 * A slot course mounts no imperative adapter, shows no run button
 * without a real run target, and never fabricates a judgment: the
 * demo's check result lives inside its slot only.
 */

function seedDraft(lessonId: string, script: unknown) {
  window.localStorage.setItem(
    `kidscoding-draft:${lessonId}`,
    JSON.stringify({ lessonId, savedAt: '2026-11-06T00:00:00.000Z', script }),
  )
}

function checked(index: number): boolean {
  return (screen.getByTestId(`ws-demo-slot-item-${index}`) as HTMLInputElement).checked
}

/** Minimal imperative adapter for the blockly side of the switch test. */
class FakeBlocklyAdapter implements EngineAdapter {
  script: unknown = [
    { type: 'when_start' },
    { type: 'ws_move_right', steps: 30 },
  ]

  mount() {}
  unmount() {}
  loadScript(script: unknown) {
    this.script = script
  }
  getScript() {
    return this.script
  }
  run() {}
  stop() {}
  getState(): EngineState {
    return { x: 0, score: 0, running: false, frames: 0 }
  }
  validateDraft(script: unknown): boolean {
    return Array.isArray(script)
  }
}

/** Slot run target probe: finishes immediately with an owned judgment. */
class SlotProbeRun implements SlotRunAdapter {
  runProgram(_program: unknown, onEvent: (e: RunEvent) => void) {
    onEvent({ kind: 'finished', state: { x: 0, score: 0, running: false, frames: 0 } })
  }

  stop() {}
  getState(): EngineState {
    return { x: 0, score: 0, running: false, frames: 0 }
  }

  getJudgmentResult(): JudgmentResult {
    return {
      layers: [{ id: 'task', label: '任务判定', passed: true, detail: '任务判定：通过。' }],
      passed: true,
      conclusion: '演示检查通过。',
    }
  }
}

const SLOT_INITIAL = { version: 1, items: [false, false, false] } as const

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('OPS-026 slot engine contract', () => {
  it("accepts a slot-engine contract", () => {
    expect(DEMO_SLOT.contract.engine).toBe('slot')
    expect(validateLessonContract(DEMO_SLOT.contract)).toEqual([])
  })

  it("rejects 'json' as an engine value", () => {
    const bad = { ...DEMO_SLOT.contract, engine: 'json' }
    expect(validateLessonContract(bad)).toContain('engine 必须是 blockly、scratch-vm、summary 或 slot')
  })

  it('mounts the slot editor with no stage and no run button, and fabricates no judgment', () => {
    render(
      <LessonWorkspace
        contract={DEMO_SLOT.contract}
        adapter={new SlotDemoAdapter()}
        initialScript={SLOT_INITIAL}
        editorSlot={DemoSlotEditor}
      />,
    )
    expect(screen.getByTestId('ws-demo-slot-editor')).toBeTruthy()
    expect(screen.queryByTestId('ws-stage-panel')).toBeNull()
    expect(screen.queryByTestId('ws-run-script')).toBeNull()
    expect(screen.queryByTestId('ws-run-toggle')).toBeNull()
    expect(screen.queryByTestId('ws-sticky-run')).toBeNull()
    // Neutral placeholder only; no invented pass/fail conclusion.
    expect(screen.getByTestId('ws-feedback')).toHaveTextContent('暂无检查结果')
    expect(screen.queryByText(/已掌握|已完成/)).toBeNull()
  })

  it('checks report the same real result to the shell feedback via onJudgment (premerge #490)', () => {
    render(
      <LessonWorkspace
        contract={DEMO_SLOT.contract}
        adapter={new SlotDemoAdapter()}
        initialScript={SLOT_INITIAL}
        editorSlot={DemoSlotEditor}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-demo-slot-item-0'))
    fireEvent.click(screen.getByTestId('ws-demo-slot-item-1'))
    fireEvent.click(screen.getByTestId('ws-demo-slot-item-2'))
    fireEvent.click(screen.getByTestId('ws-demo-slot-check'))
    expect(screen.getByTestId('ws-demo-slot-conclusion')).toHaveTextContent('三项全部通过。')
    // OPS-025 wiring: the same real result is reported and displayed
    // verbatim in the shell feedback card; nothing is invented there.
    expect(screen.getByTestId('ws-feedback-task')).toHaveTextContent('任务判定：三项全部通过。')
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('三项全部通过。')
    expect(screen.queryByTestId('ws-judgment-stale')).toBeNull()
    expect(screen.queryByText(/已掌握|已完成/)).toBeNull()
  })

  it('reports the real failing count inside the slot', () => {
    render(
      <LessonWorkspace
        contract={DEMO_SLOT.contract}
        adapter={new SlotDemoAdapter()}
        initialScript={SLOT_INITIAL}
        editorSlot={DemoSlotEditor}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-demo-slot-item-0'))
    fireEvent.click(screen.getByTestId('ws-demo-slot-item-2'))
    fireEvent.click(screen.getByTestId('ws-demo-slot-check'))
    expect(screen.getByTestId('ws-demo-slot-conclusion')).toHaveTextContent('还有 1 项未通过。')
  })

  it('editing after a check clears the displayed result (no stale pass)', () => {
    render(
      <LessonWorkspace
        contract={DEMO_SLOT.contract}
        adapter={new SlotDemoAdapter()}
        initialScript={SLOT_INITIAL}
        editorSlot={DemoSlotEditor}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-demo-slot-item-0'))
    fireEvent.click(screen.getByTestId('ws-demo-slot-item-1'))
    fireEvent.click(screen.getByTestId('ws-demo-slot-item-2'))
    fireEvent.click(screen.getByTestId('ws-demo-slot-check'))
    expect(screen.getByTestId('ws-demo-slot-conclusion')).toHaveTextContent('三项全部通过。')
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('三项全部通过。')
    fireEvent.click(screen.getByTestId('ws-demo-slot-item-1'))
    expect(screen.queryByTestId('ws-demo-slot-check-result')).toBeNull()
    // OPS-025 wiring: the edit also invalidates the shell's shown
    // judgment; no run target exists, so the stale notice says 重新检查.
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
    expect(screen.getByTestId('ws-judgment-stale')).toHaveTextContent(
      '旧判定已失效，修改后请重新检查',
    )
  })

  it('restores a valid slot draft and reports it as restored', () => {
    seedDraft('demo-slot', { version: 1, items: [true, false, true] })
    render(
      <LessonWorkspace
        contract={DEMO_SLOT.contract}
        adapter={new SlotDemoAdapter()}
        initialScript={SLOT_INITIAL}
        editorSlot={DemoSlotEditor}
      />,
    )
    expect(checked(0)).toBe(true)
    expect(checked(1)).toBe(false)
    expect(checked(2)).toBe(true)
    expect(screen.getByTestId('ws-save-message')).toHaveTextContent('已恢复草稿')
  })

  it('falls back to the initial script on an invalid slot draft, without reporting a restore', () => {
    seedDraft('demo-slot', { version: 1, items: [true] })
    render(
      <LessonWorkspace
        contract={DEMO_SLOT.contract}
        adapter={new SlotDemoAdapter()}
        initialScript={SLOT_INITIAL}
        editorSlot={DemoSlotEditor}
      />,
    )
    expect(checked(0)).toBe(false)
    expect(checked(1)).toBe(false)
    expect(checked(2)).toBe(false)
    expect(screen.queryByTestId('ws-save-message')).toBeNull()
    expect(window.localStorage.getItem('kidscoding-draft:demo-slot')).toContain('"items":[true]')
  })

  it('a slot course with a real runAdapter still gets a run button and a real run', () => {
    render(
      <LessonWorkspace
        contract={DEMO_SLOT.contract}
        adapter={new SlotDemoAdapter()}
        initialScript={SLOT_INITIAL}
        editorSlot={DemoSlotEditor}
        runAdapter={new SlotProbeRun()}
      />,
    )
    // demo-slot has no stage, so the sticky row is the run entry.
    expect(screen.queryByTestId('ws-run-toggle')).toBeNull()
    expect(screen.queryByTestId('ws-sticky-run')).not.toBeNull()
    fireEvent.click(screen.getByTestId('ws-sticky-run'))
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('演示检查通过。')
  })

  it('a slot course without an editor slot renders the honest fallback, never a dead run button', () => {
    render(
      <LessonWorkspace
        contract={DEMO_SLOT.contract}
        adapter={new SlotDemoAdapter()}
        initialScript={SLOT_INITIAL}
      />,
    )
    expect(screen.getByTestId('ws-root')).toHaveTextContent('插槽编辑尚未接入')
    expect(screen.queryByTestId('ws-run-script')).toBeNull()
    expect(screen.queryByTestId('ws-run-toggle')).toBeNull()
    expect(screen.queryByTestId('ws-sticky-run')).toBeNull()
    expect(screen.queryByText(/尚未运行/)).toBeNull()
  })
})

describe('OPS-026 slot lifecycle', () => {
  it('slot-to-slot switch saves the outgoing lesson under its own key', () => {
    const probe: LessonContract = {
      ...DEMO_SLOT.contract,
      lessonId: 'demo-slot-2',
      title: '演示：插槽课二',
      draftKey: draftKeyFor('demo-slot-2'),
    }
    const { rerender } = render(
      <LessonWorkspace
        contract={DEMO_SLOT.contract}
        adapter={new SlotDemoAdapter()}
        initialScript={SLOT_INITIAL}
        editorSlot={DemoSlotEditor}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-demo-slot-item-0'))
    rerender(
      <LessonWorkspace
        contract={probe}
        adapter={new SlotDemoAdapter()}
        initialScript={SLOT_INITIAL}
        editorSlot={DemoSlotEditor}
      />,
    )
    // Outgoing lesson saved under its own key (OPS-023 rule).
    const saved = JSON.parse(window.localStorage.getItem('kidscoding-draft:demo-slot') ?? '{}')
    expect(saved.script).toEqual({ version: 1, items: [true, false, false] })
    // New lesson mounts with its own initial, not the old lesson's data.
    expect(checked(0)).toBe(false)
    expect(checked(1)).toBe(false)
    expect(checked(2)).toBe(false)
  })

  it('blockly-to-slot switch keeps the blockly script out of the slot', () => {
    const { rerender } = render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new FakeBlocklyAdapter()}
        initialScript={DEMO_A.initialScript}
      />,
    )
    rerender(
      <LessonWorkspace
        contract={DEMO_SLOT.contract}
        adapter={new SlotDemoAdapter()}
        initialScript={SLOT_INITIAL}
        editorSlot={DemoSlotEditor}
      />,
    )
    // The slot mounts with its own initial, never the blockly script.
    expect(checked(0)).toBe(false)
    expect(checked(1)).toBe(false)
    expect(checked(2)).toBe(false)
    // The outgoing blockly lesson is saved under its own key.
    const saved = JSON.parse(window.localStorage.getItem('kidscoding-draft:demo-a') ?? '{}')
    expect(saved.script).toEqual([
      { type: 'when_start' },
      { type: 'ws_move_right', steps: 30 },
    ])
    // NOTE (OPS-023 #483): the outgoing-key assertion below needs #483's
    // mountedLessonRef logic (merged 2026-11-06, main 4ceb9e87). On the
    // pre-merge base the switch effect saves the NEW lesson's slot data
    // under the OLD lesson's key, so this assertion fails there; the
    // visible behavior above (slot shows its own initial) stays correct
    // on both bases because the slot adapter's strict validateDraft
    // rejects the blockly script. This test is verified on the rebased
    // tree; if it fails there, that is a real #483/OPS-026 interaction
    // defect, not a test artifact.
  })
})

describe('OPS-026 slot draft adapter', () => {
  it('accepts only the strict versioned shape', () => {
    const adapter = new SlotDemoAdapter()
    expect(adapter.validateDraft({ version: 1, items: [true, false, true] })).toBe(true)
    expect(adapter.validateDraft({ version: 1, items: [true, false] })).toBe(false)
    expect(adapter.validateDraft({ version: 2, items: [true, false, true] })).toBe(false)
    expect(adapter.validateDraft({ version: 1, items: [1, 0, 1] })).toBe(false)
    expect(adapter.validateDraft(null)).toBe(false)
    expect(adapter.validateDraft('text')).toBe(false)
  })

  it('loadScript ignores invalid input and keeps its data', () => {
    const adapter = new SlotDemoAdapter({ version: 1, items: [true, false, false] })
    adapter.loadScript({ version: 1, items: [true] })
    expect(adapter.getScript()).toEqual({ version: 1, items: [true, false, false] })
    adapter.loadScript({ version: 1, items: [false, true, true] })
    expect(adapter.getScript()).toEqual({ version: 1, items: [false, true, true] })
  })

  it('reports no judgment and all file capabilities', () => {
    const adapter = new SlotDemoAdapter()
    expect('getJudgmentResult' in adapter).toBe(false)
    expect(adapter.getFileCapabilities()).toEqual({
      canNew: true,
      canSave: true,
      canExport: true,
      canImport: true,
      canReset: true,
    })
    expect(adapter.getState()).toEqual({ x: 0, score: 0, running: false, frames: 0 })
  })
})
