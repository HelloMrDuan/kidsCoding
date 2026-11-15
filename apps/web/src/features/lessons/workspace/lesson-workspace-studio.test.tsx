import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEMO_A, DEMO_SLOT } from './demo-contracts'
import { LessonWorkspace } from './lesson-workspace'
import type { ShellControl } from './workspace-slots'
import type { EngineAdapter, EngineState, RunEvent } from './workspace-adapters'

/** Minimal fake engine: counts mounts, never touches Blockly. */
class FakeAdapter implements EngineAdapter {
  script: unknown = []
  mountCalled = 0

  mount() {
    this.mountCalled += 1
  }

  unmount() {}

  loadScript(script: unknown) {
    this.script = script
  }

  getScript() {
    return this.script
  }

  run(onEvent: (e: RunEvent) => void) {
    onEvent({ kind: 'finished', state: { x: 150, score: 1, running: false, frames: 3 } satisfies EngineState })
  }

  stop() {}

  getState(): EngineState {
    return { x: 150, score: 1, running: false, frames: 3 }
  }

  addChangeListener() {}

  removeChangeListener() {}
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('LessonWorkspace chrome="studio" (OPS-039)', () => {
  it('hides the topbar / goal strip / task copies but keeps the editor and run', () => {
    const fake = new FakeAdapter()
    render(
      <LessonWorkspace contract={DEMO_A.contract} adapter={fake} initialScript={DEMO_A.initialScript} chrome="studio" />,
    )
    expect(screen.getByTestId('ws-root').classList.contains('ws-studio')).toBe(true)
    expect(screen.queryByTestId('ws-topbar')).toBeNull()
    expect(screen.queryByTestId('ws-task-button')).toBeNull()
    expect(screen.queryByTestId('ws-task-panel')).toBeNull()
    expect(screen.queryByTestId('ws-task-drawer')).toBeNull()
    expect(document.querySelector('.ws-goalstrip')).toBeNull()
    // The editor still mounts and the run button still exists — studio
    // chrome removes duplicated chrome, never the run function.
    expect(fake.mountCalled).toBe(1)
    expect(screen.getByTestId('ws-run-script')).toBeTruthy()
    // The hidden file input survives the topbar removal, so import keeps working.
    expect(screen.getByTestId('ws-file-input')).toBeTruthy()
  })

  it('reports the save state and control surface upward for StudioShell', () => {
    const fake = new FakeAdapter()
    const onSaveStateChange = vi.fn()
    const onShellControl = vi.fn()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
        chrome="studio"
        onSaveStateChange={onSaveStateChange}
        onShellControl={onShellControl}
      />,
    )
    expect(onSaveStateChange).toHaveBeenCalledWith('unsaved', null)
    expect(onShellControl).toHaveBeenCalledTimes(1)
    const control = onShellControl.mock.calls[0][0] as ShellControl
    expect(typeof control.save).toBe('function')
    expect(typeof control.run).toBe('function')
    expect(control.file).toBeDefined()
    expect(typeof control.file?.newLesson).toBe('function')
    expect(typeof control.file?.export).toBe('function')
    expect(typeof control.file?.import).toBe('function')
    expect(typeof control.file?.reset).toBe('function')
    expect(control.file?.capabilities).toBeDefined()
    expect(control.stage).toEqual(
      expect.objectContaining({ visible: true, canToggle: true }),
    )
    expect(typeof control.stage?.toggle).toBe('function')
  })

  it('stage toggle from the reported control hides the stage', () => {
    const fake = new FakeAdapter()
    const onShellControl = vi.fn()
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={fake}
        initialScript={DEMO_A.initialScript}
        chrome="studio"
        onShellControl={onShellControl}
      />,
    )
    const control = onShellControl.mock.calls[0][0] as ShellControl
    expect(screen.getByTestId('ws-root').classList.contains('ws-stage-hidden')).toBe(false)
    act(() => {
      control.stage?.toggle()
    })
    expect(screen.getByTestId('ws-root').classList.contains('ws-stage-hidden')).toBe(true)
  })

  it('studio fallback for a slot lesson without an editor: honest notice, no second title, still reports', () => {
    const fake = new FakeAdapter()
    const onShellControl = vi.fn()
    render(
      <LessonWorkspace
        contract={DEMO_SLOT.contract}
        adapter={fake}
        initialScript={DEMO_SLOT.initialScript}
        chrome="studio"
        onShellControl={onShellControl}
      />,
    )
    expect(screen.getByText('插槽编辑尚未接入：本课程未提供编辑器组件。')).toBeTruthy()
    expect(screen.getByText('本演示不提供虚假编辑器。')).toBeTruthy()
    expect(screen.queryByTestId('ws-topbar')).toBeNull()
    expect(onShellControl).toHaveBeenCalledTimes(1)
  })
})

describe('LessonWorkspace chrome="full" (default, regression guard)', () => {
  it('keeps its own topbar and task entry when chrome is not studio', () => {
    const fake = new FakeAdapter()
    render(
      <LessonWorkspace contract={DEMO_A.contract} adapter={fake} initialScript={DEMO_A.initialScript} />,
    )
    expect(screen.getByTestId('ws-topbar')).toBeTruthy()
    expect(screen.getByTestId('ws-task-button')).toBeTruthy()
    expect(screen.getByTestId('ws-task-panel')).toBeTruthy()
    expect(screen.getByTestId('ws-root').classList.contains('ws-studio')).toBe(false)
    fireEvent.click(screen.getByTestId('ws-task-button'))
    expect(screen.getByTestId('ws-task-drawer')).toBeTruthy()
  })
})
