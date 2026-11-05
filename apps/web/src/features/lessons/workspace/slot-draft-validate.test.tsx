import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DEMO_A } from './demo-contracts'
import { LessonWorkspace } from './lesson-workspace'
import type { EngineAdapter, EngineState } from './workspace-adapters'
import type { EditorSlotProps } from './workspace-slots'

/**
 * OPS-022 chief review (first review): slot draft restore must validate
 * the stored draft exactly like the adapter path does (loadIntoAdapter).
 * An invalid draft falls back to the initial script, is never reported as
 * "已恢复草稿", and is never overwritten or deleted. Summary courses never
 * validate against an adapter, and an adapter without validateDraft
 * accepts the draft.
 */

/** Minimal imperative adapter; validateDraft varies per subclass. */
class BaseProbeAdapter implements EngineAdapter {
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

class AcceptingAdapter extends BaseProbeAdapter {
  validateDraft() {
    return true
  }
}

class RejectingAdapter extends BaseProbeAdapter {
  validateDraft() {
    return false
  }
}

class ThrowingAdapter extends BaseProbeAdapter {
  validateDraft(): boolean {
    throw new Error('validator boom')
  }
}

/** Slot probe that renders the initial data it received. */
function DraftProbeSlot(props: EditorSlotProps) {
  return (
    <div data-testid="ws-draft-probe-slot">
      <span data-testid="ws-draft-probe-initial">{JSON.stringify(props.initial ?? null)}</span>
    </div>
  )
}

function seedDraft(lessonId: string, script: unknown) {
  window.localStorage.setItem(
    `kidscoding-draft:${lessonId}`,
    JSON.stringify({ lessonId, savedAt: '2026-11-04T00:00:00.000Z', script }),
  )
}

const DRAFT = { items: ['draft'] }
const INITIAL = { items: ['initial'] }

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('OPS-022 slot draft validation', () => {
  it('accepts a valid draft and reports it as restored', () => {
    seedDraft('demo-a', DRAFT)
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new AcceptingAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
      />,
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent('{"items":["draft"]}')
    expect(screen.getByTestId('ws-save-message')).toHaveTextContent('已恢复草稿')
    expect(screen.getByTestId('ws-save-chip')).toHaveTextContent('已保存到本机')
  })

  it('falls back to the initial script when the adapter rejects the draft, without reporting a restore', () => {
    seedDraft('demo-a', DRAFT)
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new RejectingAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
      />,
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent('{"items":["initial"]}')
    expect(screen.queryByTestId('ws-save-message')).toBeNull()
    expect(screen.getByTestId('ws-save-chip')).not.toHaveTextContent('已保存到本机')
    // The invalid stored draft is left untouched, never overwritten/deleted.
    expect(window.localStorage.getItem('kidscoding-draft:demo-a')).toContain('"draft"')
  })

  it('treats a throwing validator as invalid (fail-closed, no crash)', () => {
    seedDraft('demo-a', DRAFT)
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new ThrowingAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
      />,
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent('{"items":["initial"]}')
    expect(screen.queryByTestId('ws-save-message')).toBeNull()
    expect(window.localStorage.getItem('kidscoding-draft:demo-a')).toContain('"draft"')
  })

  it('accepts the draft when the adapter provides no validateDraft', () => {
    seedDraft('demo-a', DRAFT)
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new BaseProbeAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
      />,
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent('{"items":["draft"]}')
    expect(screen.getByTestId('ws-save-message')).toHaveTextContent('已恢复草稿')
  })

  it('summary slots accept the draft even when the adapter would reject it', () => {
    seedDraft('demo-a', DRAFT)
    render(
      <LessonWorkspace
        contract={{ ...DEMO_A.contract, engine: 'summary' }}
        adapter={new RejectingAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
      />,
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent('{"items":["draft"]}')
    expect(screen.getByTestId('ws-save-message')).toHaveTextContent('已恢复草稿')
  })
})
