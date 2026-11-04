import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DEMO_A, DEMO_B } from './demo-contracts'
import { buildJudgment } from './demo-judging'
import { draftKeyFor, type LessonContract } from './lesson-contract'
import { LessonWorkspace } from './lesson-workspace'
import type { EngineAdapter, EngineState, RunEvent } from './workspace-adapters'
import { toJudgmentResult } from './workspace-judging'

/**
 * Fake engine: in-memory script + synchronous finished event. It exercises the
 * shell's judgment/invalidation/save-chip logic without Blockly; the real
 * Blockly behavior is covered by the browser E2E.
 */
class FakeAdapter implements EngineAdapter {
  script: unknown = []
  listeners = new Set<() => void>()
  trace = { didMove: true, usedRepeat: true, finalX: 150 }
  mountCalled = 0
  unmountCalled = 0

  mount() {
    this.mountCalled += 1
  }

  unmount() {
    this.unmountCalled += 1
  }

  loadScript(script: unknown) {
    this.script = script
  }

  getScript() {
    return this.script
  }

  run(onEvent: (e: RunEvent) => void) {
    onEvent({
      kind: 'finished',
      state: { x: 150, score: 1, running: false, frames: 3 } satisfies EngineState,
    })
  }

  stop() {}

  getState(): EngineState {
    return { x: 150, score: 1, running: false, frames: 3 }
  }

  // Test double for an adapter-owned judgment: the shell displays only
  // what the adapter returns (demo rules live in demo-judging.ts).
  getJudgmentResult() {
    return toJudgmentResult(buildJudgment(DEMO_A.contract.judging.target, this.getState(), this.trace))
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

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('LessonWorkspace shell (fake engine)', () => {
  it('renders only contract content with a 演示 badge and five goals', () => {
    const fake = new FakeAdapter()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
      />,
    )
    expect(screen.getByTestId('ws-demo-badge')).toHaveTextContent('演示')
    expect(screen.getByTestId('ws-goal5').querySelectorAll('li')).toHaveLength(5)
    expect(screen.getByTestId('ws-save-chip')).toHaveTextContent('未保存')
    expect(fake.mountCalled).toBe(1)
  })

  it('shows 已完成，已掌握 after a passing run, then invalidates on edit', () => {
    const fake = new FakeAdapter()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-run-script'))
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('已完成，已掌握')
    // Edit the program through the fake adapter, then fire its change event.
    act(() => {
      fake.script = [{ type: 'when_start' }, { type: 'ws_move_right', steps: 10 }]
      fake.emitChange()
    })
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
    expect(screen.getByTestId('ws-judgment-stale')).toHaveTextContent('旧判定已失效，修改后请重新运行')
  })

  it('reveals hints strictly in order, never all at once', () => {
    const fake = new FakeAdapter()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
      />,
    )
    const reveal2 = screen.getByTestId('ws-hint-reveal-2')
    expect(reveal2).toBeDisabled()
    fireEvent.click(screen.getByTestId('ws-hint-reveal-1'))
    expect(screen.getByTestId('ws-hint-reveal-2')).not.toBeDisabled()
    expect(screen.getByText(/先看水果 x/)).toBeInTheDocument()
  })

  it('renders the honest summary note for the summary engine, never a fake editor', () => {
    const fake = new FakeAdapter()
    const summary: LessonContract = {
      ...DEMO_A.contract,
      lessonId: 'demo-summary',
      draftKey: draftKeyFor('demo-summary'),
      engine: 'summary',
    }
    render(<LessonWorkspace contract={summary} adapter={fake} />)
    expect(screen.getByText('摘要编辑尚未接入（4 号接入中）。')).toBeInTheDocument()
    expect(screen.queryByTestId('ws-blockly-mount')).toBeNull()
  })

  it('save writes the spec draft key and flips the chip only on success', () => {
    const fake = new FakeAdapter()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-file-menu-button'))
    fireEvent.click(screen.getByTestId('ws-file-save'))
    expect(screen.getByTestId('ws-save-chip')).toHaveTextContent('已保存到本机')
    expect(window.localStorage.getItem('kidscoding-draft:demo-a')).toMatch('when_start')
  })

  it('goal strip shows only the current goal until expanded', () => {
    const fake = new FakeAdapter()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
      />,
    )
    expect(screen.getByTestId('ws-goal-current')).toHaveTextContent('今天学什么')
    expect(screen.getByTestId('ws-goal5')).toHaveClass('ws-goal5-collapsed')
    expect(screen.getByTestId('ws-goal5').querySelectorAll('li')).toHaveLength(5)
    fireEvent.click(screen.getByTestId('ws-goal-expand'))
    expect(screen.getByTestId('ws-goal5')).not.toHaveClass('ws-goal5-collapsed')
  })

  it('palette panel collapses and expands without losing the script', () => {
    const fake = new FakeAdapter()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
      />,
    )
    const scriptPanel = screen.getByTestId('ws-script-panel')
    expect(
      scriptPanel.querySelector('[data-testid="ws-drawer-move-right"]'),
    ).not.toBeNull()
    fireEvent.click(screen.getByTestId('ws-palette-toggle'))
    expect(
      scriptPanel.querySelector('[data-testid="ws-drawer-move-right"]'),
    ).toBeNull()
    fireEvent.click(screen.getByTestId('ws-palette-toggle'))
    expect(
      scriptPanel.querySelector('[data-testid="ws-drawer-move-right"]'),
    ).not.toBeNull()
  })

  it('the save-failure test hook reports 未能保存 and never 已保存到本机', () => {
    const fake = new FakeAdapter()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
        testFailSave
      />,
    )
    fireEvent.click(screen.getByTestId('ws-file-menu-button'))
    fireEvent.click(screen.getByTestId('ws-file-save'))
    expect(screen.getByTestId('ws-save-chip')).toHaveTextContent('未能保存')
    expect(screen.queryByText('已保存到本机')).toBeNull()
  })
})

/**
 * R3 run-generation guard: an adapter that stores its run callback and
 * emits later, so a late 'finished' after stop can be observed directly.
 */
class LateFakeAdapter implements EngineAdapter {
  script: unknown = []
  listeners = new Set<() => void>()
  onEvent: ((e: RunEvent) => void) | null = null
  running = false
  trace = { didMove: true, usedRepeat: true, finalX: 150 }

  mount() {}
  unmount() {}
  loadScript(script: unknown) {
    this.script = script
  }
  getScript() {
    return this.script
  }
  run(onEvent: (e: RunEvent) => void) {
    this.onEvent = onEvent
    this.running = true
  }
  stop() {
    this.running = false
  }
  getState(): EngineState {
    return { x: 0, score: 0, running: this.running, frames: 0 }
  }
  getJudgmentResult() {
    return toJudgmentResult(buildJudgment(DEMO_A.contract.judging.target, this.getState(), this.trace))
  }
  addChangeListener(cb: () => void) {
    this.listeners.add(cb)
  }
  removeChangeListener(cb: () => void) {
    this.listeners.delete(cb)
  }
  emitLate() {
    this.onEvent?.({
      kind: 'finished',
      state: { x: 150, score: 1, running: false, frames: 3 } satisfies EngineState,
    })
  }
}

class CappedFakeAdapter extends FakeAdapter {
  // No `override`: these are optional EngineAdapter members the base
  // FakeAdapter does not declare, so `override` is a type error here.
  getFileCapabilities() {
    return { canNew: false, canExport: false }
  }
}

class RejectingDraftAdapter extends FakeAdapter {
  validateDraft() {
    return false
  }
}

function seedDraft(lessonId: string, script: unknown) {
  window.localStorage.setItem(
    `kidscoding-draft:${lessonId}`,
    JSON.stringify({ lessonId, savedAt: '2026-11-04T00:00:00.000Z', script }),
  )
}

describe('LessonWorkspace shell: slots + R1–R8 regressions', () => {
  it('drops a late finished event after stop (R3 generation guard)', () => {
    const late = new LateFakeAdapter()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={late}
        initialScript={DEMO_A.initialScript}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-run-script'))
    expect(screen.getByTestId('ws-run-script')).toHaveTextContent('停止')
    fireEvent.click(screen.getByTestId('ws-run-script'))
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
    act(() => {
      late.emitLate()
    })
    // The stale run must never display a pass after it was stopped.
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
  })

  it('delivers a late finished event when the run was never stopped', () => {
    const late = new LateFakeAdapter()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={late}
        initialScript={DEMO_A.initialScript}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-run-script'))
    act(() => {
      late.emitLate()
    })
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('已完成，已掌握')
  })

  it('clears the judgment on lesson switch', () => {
    const fake = new FakeAdapter()
    const { rerender } = render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-run-script'))
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('已完成，已掌握')
    rerender(
      <LessonWorkspace
        contract={DEMO_B.contract}
        adapter={fake}
        initialScript={DEMO_B.initialScript}
      />,
    )
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
  })

  it('refuses to move the start hat or anything above it (R1-2)', () => {
    const fake = new FakeAdapter()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
      />,
    )
    expect(screen.getByTestId('ws-script-item-0')).toHaveTextContent('开始时')
    fireEvent.click(screen.getByTestId('ws-script-up-1'))
    expect(screen.getByTestId('ws-script-item-0')).toHaveTextContent('开始时')
    expect(screen.getByTestId('ws-script-item-1')).toHaveTextContent('向右走 30 步')
    fireEvent.click(screen.getByTestId('ws-script-down-0'))
    expect(screen.getByTestId('ws-script-item-0')).toHaveTextContent('开始时')
    // A legal move still works: append, then move the middle block down.
    // The drawer renders twice in the DOM (palette + blocks panel), so scope
    // to the script panel like the palette test does.
    const drawerButton = screen
      .getByTestId('ws-script-panel')
      .querySelector('[data-testid="ws-drawer-move-right"]') as HTMLElement
    fireEvent.click(drawerButton)
    expect(screen.getByTestId('ws-script-item-2')).toHaveTextContent('向右走 50 步')
    fireEvent.click(screen.getByTestId('ws-script-down-1'))
    expect(screen.getByTestId('ws-script-item-1')).toHaveTextContent('向右走 50 步')
    expect(screen.getByTestId('ws-script-item-2')).toHaveTextContent('向右走 30 步')
  })

  it('restores a valid draft with a restore prompt (R4)', () => {
    seedDraft('demo-a', [{ type: 'when_start' }, { type: 'ws_move_right', steps: 99 }])
    const fake = new FakeAdapter()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
      />,
    )
    expect(screen.getByTestId('ws-script-item-1')).toHaveTextContent('向右走 99 步')
    expect(screen.getByTestId('ws-save-message')).toHaveTextContent('已恢复草稿')
    expect(screen.getByTestId('ws-save-chip')).toHaveTextContent('已保存到本机')
  })

  it('falls back to the initial script when the adapter rejects the draft (R4)', () => {
    seedDraft('demo-a', [{ type: 'when_start' }, { type: 'ws_move_right', steps: 99 }])
    const fake = new RejectingDraftAdapter()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
      />,
    )
    expect(screen.getByTestId('ws-script-item-1')).toHaveTextContent('向右走 30 步')
    expect(screen.queryByTestId('ws-save-message')).toBeNull()
  })

  it('never writes judgment fields into the draft (R4)', () => {
    const fake = new FakeAdapter()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-run-script'))
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('已完成，已掌握')
    fireEvent.click(screen.getByTestId('ws-file-menu-button'))
    fireEvent.click(screen.getByTestId('ws-file-save'))
    const draft = window.localStorage.getItem('kidscoding-draft:demo-a') ?? ''
    expect(draft).not.toMatch('passed')
    expect(draft).not.toMatch('conclusion')
    expect(draft).not.toMatch('judgment')
  })

  it('hides file operations the adapter does not support (no fake buttons)', () => {
    const fake = new CappedFakeAdapter()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
      />,
    )
    fireEvent.click(screen.getByTestId('ws-file-menu-button'))
    expect(screen.queryByTestId('ws-file-new')).toBeNull()
    expect(screen.queryByTestId('ws-file-export')).toBeNull()
    expect(screen.getByTestId('ws-file-save')).toBeInTheDocument()
    expect(screen.getByTestId('ws-file-reset')).toBeInTheDocument()
  })

  it('renders structured hints with titles and drawer-only course info', () => {
    const fake = new FakeAdapter()
    const extended: LessonContract = {
      ...DEMO_A.contract,
      structuredHints: [
        { level: 1, title: '先想', text: '先看水果位置再想方向' },
        { level: 2, title: '积木', text: '用移动积木走过去' },
        { level: 3, title: '示范', text: '先走一步看看差多少' },
      ],
      methodSteps: ['观察', '预测', '验证'],
      scopeGap: '仅适用于本演示舞台',
      progress: { label: '演示进度', current: 2, total: 6 },
      activities: [{ level: 1, title: '活动一', text: '做一做' }],
    }
    render(<LessonWorkspace contract={extended} adapter={fake} initialScript={DEMO_A.initialScript} />)
    expect(screen.getByTestId('ws-hint-reveal-2')).toBeDisabled()
    fireEvent.click(screen.getByTestId('ws-hint-reveal-1'))
    expect(screen.getByText(/先看水果位置再想方向/)).toBeInTheDocument()
    expect(screen.getByTestId('ws-method-steps')).toHaveTextContent('预测')
    expect(screen.getByTestId('ws-scope-gap')).toHaveTextContent('仅适用于本演示舞台')
    expect(screen.getByTestId('ws-progress')).toHaveTextContent('2/6')
    expect(screen.getByTestId('ws-activities')).toHaveTextContent('活动一')
  })

  it('mounts a real React summary editor through the slot, with no stage or run button', async () => {
    const { DEMO_S } = await import('./demo-contracts')
    const { DemoSummaryEditor } = await import('./demo-summary-editor')
    const fake = new FakeAdapter()
    const { unmount } = render(
      <LessonWorkspace
        contract={DEMO_S.contract}
        adapter={fake}
        initialScript={DEMO_S.initialScript}
        editorSlot={DemoSummaryEditor}
      />,
    )
    expect(screen.getByTestId('ws-demo-summary-editor')).toBeInTheDocument()
    expect(screen.queryByTestId('ws-stage-panel')).toBeNull()
    expect(screen.queryByTestId('ws-tab-stage')).toBeNull()
    expect(screen.queryByTestId('ws-run-script')).toBeNull()
    expect(screen.queryByTestId('ws-roles-panel')).toBeNull()
    fireEvent.change(screen.getByTestId('ws-summary-textarea'), {
      target: { value: '今天学了循环' },
    })
    expect(screen.getByTestId('ws-summary-count')).toHaveTextContent('1 句')
    fireEvent.click(screen.getByTestId('ws-file-menu-button'))
    fireEvent.click(screen.getByTestId('ws-file-save'))
    expect(window.localStorage.getItem('kidscoding-draft:demo-s')).toMatch('今天学了循环')
    unmount()
    // Fresh mount restores the saved summary text through the slot.
    render(
      <LessonWorkspace
        contract={DEMO_S.contract}
        adapter={new FakeAdapter()}
        initialScript={DEMO_S.initialScript}
        editorSlot={DemoSummaryEditor}
      />,
    )
    expect(screen.getByTestId('ws-summary-textarea')).toHaveValue('今天学了循环')
  })
})
