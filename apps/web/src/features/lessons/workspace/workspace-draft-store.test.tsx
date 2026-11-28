import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEMO_A } from './demo-contracts'
import { LessonWorkspace, type WorkspaceDraftStore } from './lesson-workspace'
import type { EngineAdapter, EngineState } from './workspace-adapters'
import type { EditorSlotProps } from './workspace-slots'

/**
 * OPS-057: LessonWorkspace.draftStore injection.
 *
 * Project mode passes its own store so a work edit can never read or write the
 * lesson draft key. These tests prove the shell routes BOTH restore and save
 * through the injected store, and that the lesson key stays untouched. The
 * default (no draftStore) path is covered by the existing workspace tests.
 */

class ProbeAdapter implements EngineAdapter {
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

function ProbeSlot(props: EditorSlotProps) {
  return (
    <div data-testid="probe-slot">
      <span data-testid="probe-initial">{JSON.stringify(props.initial ?? null)}</span>
      <button type="button" data-testid="probe-edit" onClick={() => props.onChange({ items: ['edited'] })}>
        edit
      </button>
    </div>
  )
}

const LESSON_KEY = 'kidscoding-draft:demo-a'
const STORED = { items: ['stored'] }

let store: WorkspaceDraftStore

beforeEach(() => {
  window.localStorage.clear()
  store = {
    load: vi.fn(() => ({ data: STORED, reason: null })),
    save: vi.fn(() => ({ ok: true as const })),
  }
})

afterEach(() => {
  cleanup()
})

describe('OPS-057 injectable draft store', () => {
  it('restores through the injected load and never reads the lesson draft key', () => {
    window.localStorage.setItem(
      LESSON_KEY,
      JSON.stringify({ lessonId: 'demo-a', savedAt: '2026-11-27T00:00:00.000Z', script: { items: ['lesson'] } }),
    )
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new ProbeAdapter()}
        initialScript={{ items: ['initial'] }}
        editorSlot={ProbeSlot}
        draftStore={store}
      />,
    )
    expect(screen.getByTestId('probe-initial')).toHaveTextContent('{"items":["stored"]}')
    expect(store.load).toHaveBeenCalledWith('demo-a', undefined)
    expect(screen.getByTestId('ws-save-message')).toHaveTextContent('已恢复草稿')
  })

  it('saves through the injected save and leaves the lesson draft key untouched', () => {
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new ProbeAdapter()}
        initialScript={{ items: ['initial'] }}
        editorSlot={ProbeSlot}
        draftStore={store}
      />,
    )
    fireEvent.click(screen.getByTestId('probe-edit'))
    fireEvent.click(screen.getByTestId('ws-file-menu-button'))
    fireEvent.click(screen.getByTestId('ws-file-save'))
    expect(store.save).toHaveBeenCalledWith('demo-a', { items: ['edited'] }, undefined)
    expect(window.localStorage.getItem(LESSON_KEY)).toBeNull()
    expect(screen.getByTestId('ws-save-message')).toHaveTextContent('已保存到本机')
  })

  it('reports the injected store failure honestly instead of a fake success', () => {
    store.save = vi.fn(() => ({ ok: false as const, reason: '作品归属未确认，未能保存' }))
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new ProbeAdapter()}
        initialScript={{ items: ['initial'] }}
        editorSlot={ProbeSlot}
        draftStore={store}
      />,
    )
    fireEvent.click(screen.getByTestId('probe-edit'))
    fireEvent.click(screen.getByTestId('ws-file-menu-button'))
    fireEvent.click(screen.getByTestId('ws-file-save'))
    expect(screen.getByTestId('ws-save-message')).toHaveTextContent('作品归属未确认，未能保存')
  })
})
