import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DEMO_A } from './demo-contracts'
import { draftKeyFor, type LessonContract } from './lesson-contract'
import { LessonWorkspace } from './lesson-workspace'
import type { EngineAdapter, EngineState, RunEvent } from './workspace-adapters'

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

  getLastTrace() {
    return this.trace
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
