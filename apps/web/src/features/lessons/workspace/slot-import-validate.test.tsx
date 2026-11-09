import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DEMO_A } from './demo-contracts'
import { LessonWorkspace } from './lesson-workspace'
import type { EngineAdapter, EngineState, RunEvent, SlotRunAdapter } from './workspace-adapters'
import type { EditorSlotProps } from './workspace-slots'

/**
 * OPS-028 (3d + JSON import): validation authority follows the real data
 * owner. A SlotRunAdapter that owns independent program data may provide
 * an optional validateDraft; the shell must consult it BEFORE the mounted
 * adapter, so a mounted adapter that does not own the slot data can never
 * veto a draft the owner accepts. The same owner validator must gate the
 * JSON import path: an illegal payload is rejected before any state
 * change, never silently saved as a legal draft, never reported as
 * imported/saved.
 *
 * Reproduction-first: tests 1–4, 7 and the throwing-import test MUST FAIL
 * before the fix (the shell never reads runAdapter.validateDraft, and
 * the editorSlot import branch validates nothing) and pass after it. The
 * remaining tests pin the preserved behaviour (fallback, ?? true,
 * Summary never validates, malformed JSON already rejected).
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

/** Slot data shape owned by the run adapter: strict version + string items. */
function isStrictSlotData(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false
  const d = data as { version?: unknown; items?: unknown }
  return (
    d.version === 1 &&
    Array.isArray(d.items) &&
    (d.items as unknown[]).every((item) => typeof item === 'string')
  )
}

/** Minimal run adapter; validateDraft varies per subclass. */
class BaseSlotRun implements SlotRunAdapter {
  runProgram(_program: unknown, onEvent: (e: RunEvent) => void) {
    onEvent({ kind: 'finished', state: { x: 0, score: 0, running: false, frames: 0 } })
  }
  stop() {}
  getState(): EngineState {
    return { x: 0, score: 0, running: false, frames: 0 }
  }
}

class StrictSlotRun extends BaseSlotRun {
  validateDraft(data: unknown): boolean {
    return isStrictSlotData(data)
  }
}

class AcceptingSlotRun extends BaseSlotRun {
  validateDraft() {
    return true
  }
}

class RejectingSlotRun extends BaseSlotRun {
  validateDraft() {
    return false
  }
}

class ThrowingSlotRun extends BaseSlotRun {
  validateDraft(): boolean {
    throw new Error('run validator boom')
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

function importFile(jsonText: string) {
  const file = new File([jsonText], 'import.json', { type: 'application/json' })
  fireEvent.change(screen.getByTestId('ws-file-input'), { target: { files: [file] } })
}

const DRAFT = { version: 1, items: ['draft'] }
const INITIAL = { version: 1, items: ['initial'] }
const ILLEGAL = { text: '今天学到了循环' }

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('OPS-028 runAdapter-owned draft validation (3d)', () => {
  it('a validator only on runAdapter rejects an illegal Summary-shaped draft', () => {
    seedDraft('demo-a', ILLEGAL)
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new BaseProbeAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
        runAdapter={new StrictSlotRun()}
      />,
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent(
      '{"version":1,"items":["initial"]}',
    )
    expect(screen.queryByTestId('ws-save-message')).toBeNull()
    expect(screen.getByTestId('ws-save-chip')).not.toHaveTextContent('已保存到本机')
    expect(window.localStorage.getItem('kidscoding-draft:demo-a')).toContain('今天学到了循环')
  })

  it('runAdapter acceptance wins over a rejecting mounted adapter (no wrongful veto)', () => {
    seedDraft('demo-a', DRAFT)
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new RejectingAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
        runAdapter={new AcceptingSlotRun()}
      />,
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent(
      '{"version":1,"items":["draft"]}',
    )
    expect(screen.getByTestId('ws-save-message')).toHaveTextContent('已恢复草稿')
  })

  it('runAdapter rejection wins over an accepting mounted adapter (data owner decides)', () => {
    seedDraft('demo-a', ILLEGAL)
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new AcceptingAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
        runAdapter={new RejectingSlotRun()}
      />,
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent(
      '{"version":1,"items":["initial"]}',
    )
    expect(screen.queryByTestId('ws-save-message')).toBeNull()
    expect(window.localStorage.getItem('kidscoding-draft:demo-a')).toContain('今天学到了循环')
  })

  it('a throwing runAdapter validator is invalid (fail-closed, no crash)', () => {
    seedDraft('demo-a', ILLEGAL)
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new BaseProbeAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
        runAdapter={new ThrowingSlotRun()}
      />,
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent(
      '{"version":1,"items":["initial"]}',
    )
    expect(screen.queryByTestId('ws-save-message')).toBeNull()
    expect(window.localStorage.getItem('kidscoding-draft:demo-a')).toContain('今天学到了循环')
  })

  it('fallback preserved: a runAdapter without a validator defers to the mounted adapter', () => {
    seedDraft('demo-a', ILLEGAL)
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new RejectingAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
        runAdapter={new BaseSlotRun()}
      />,
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent(
      '{"version":1,"items":["initial"]}',
    )
    expect(screen.queryByTestId('ws-save-message')).toBeNull()
  })

  it('summary never validates, even with a strict runAdapter validator', () => {
    seedDraft('demo-a', ILLEGAL)
    render(
      <LessonWorkspace
        contract={{ ...DEMO_A.contract, engine: 'summary' }}
        adapter={new RejectingAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
        runAdapter={new StrictSlotRun()}
      />,
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent(
      '{"text":"今天学到了循环"}',
    )
    expect(screen.getByTestId('ws-save-message')).toHaveTextContent('已恢复草稿')
  })
})

describe('OPS-028 JSON import legitimacy validation', () => {
  it('importing an illegal JSON payload into an editorSlot is rejected, nothing saved', async () => {
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new BaseProbeAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
        runAdapter={new StrictSlotRun()}
      />,
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent(
      '{"version":1,"items":["initial"]}',
    )
    importFile(JSON.stringify(ILLEGAL))
    await waitFor(() =>
      expect(screen.getByTestId('ws-notice')).toHaveTextContent('导入文件数据无效'),
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent(
      '{"version":1,"items":["initial"]}',
    )
    expect(screen.getByTestId('ws-notice')).not.toHaveTextContent('已导入作品数据')
    // No autosave of the rejected payload, even after the debounce window.
    await new Promise((resolve) => setTimeout(resolve, 1300))
    expect(window.localStorage.getItem('kidscoding-draft:demo-a')).toBeNull()
  })

  it('importing a valid JSON payload into an editorSlot is accepted', async () => {
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new BaseProbeAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
        runAdapter={new StrictSlotRun()}
      />,
    )
    importFile(JSON.stringify({ version: 1, items: ['imported'] }))
    await waitFor(() =>
      expect(screen.getByTestId('ws-notice')).toHaveTextContent('已导入作品数据'),
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent(
      '{"version":1,"items":["imported"]}',
    )
  })

  it('importing malformed JSON is rejected, program unchanged', async () => {
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new BaseProbeAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
        runAdapter={new StrictSlotRun()}
      />,
    )
    importFile('{not json')
    await waitFor(() => expect(screen.getByTestId('ws-notice')).not.toBeNull())
    expect(screen.getByTestId('ws-notice')).not.toHaveTextContent('已导入作品数据')
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent(
      '{"version":1,"items":["initial"]}',
    )
    expect(window.localStorage.getItem('kidscoding-draft:demo-a')).toBeNull()
  })

  it('importing with a throwing validator is rejected (fail-closed, no crash)', async () => {
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new BaseProbeAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
        runAdapter={new ThrowingSlotRun()}
      />,
    )
    // The payload itself is strictly valid; only the throwing validator
    // makes it invalid, so rejection proves the fail-closed path.
    importFile(JSON.stringify({ version: 1, items: ['imported'] }))
    await waitFor(() =>
      expect(screen.getByTestId('ws-notice')).toHaveTextContent('导入文件数据无效'),
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent(
      '{"version":1,"items":["initial"]}',
    )
    expect(screen.getByTestId('ws-notice')).not.toHaveTextContent('已导入作品数据')
    await new Promise((resolve) => setTimeout(resolve, 1300))
    expect(window.localStorage.getItem('kidscoding-draft:demo-a')).toBeNull()
  })

  it('importing illegal JSON with no validator anywhere is accepted (?? true)', async () => {
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new BaseProbeAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
      />,
    )
    importFile(JSON.stringify(ILLEGAL))
    await waitFor(() =>
      expect(screen.getByTestId('ws-notice')).toHaveTextContent('已导入作品数据'),
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent(
      '{"text":"今天学到了循环"}',
    )
  })

  it('importing illegal JSON into a summary slot is accepted (summary never validates)', async () => {
    render(
      <LessonWorkspace
        contract={{ ...DEMO_A.contract, engine: 'summary' }}
        adapter={new BaseProbeAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
        runAdapter={new StrictSlotRun()}
      />,
    )
    importFile(JSON.stringify(ILLEGAL))
    await waitFor(() =>
      expect(screen.getByTestId('ws-notice')).toHaveTextContent('已导入作品数据'),
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent(
      '{"text":"今天学到了循环"}',
    )
  })

  it('importing a payload that claims another lesson bypasses shell validation (slot owns the wrong-lesson error)', async () => {
    // G2 contract (#493 CI): the shell cannot judge another lesson's
    // data, so a foreign-lesson payload is handed to the slot, which
    // rejects it with its own lesson-specific error. The mounted
    // adapter here rejects everything, so without the bypass the shell
    // would throw first and the slot would never see the file.
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new RejectingAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
      />,
    )
    importFile(JSON.stringify({ lessonId: 'demo-b', version: 1, items: ['foreign'] }))
    await waitFor(() =>
      expect(screen.getByTestId('ws-notice')).toHaveTextContent('已导入作品数据'),
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent(
      '{"lessonId":"demo-b","version":1,"items":["foreign"]}',
    )
  })

  it('importing an own-lesson payload is still shell-validated (bypass is foreign-lesson only)', async () => {
    render(
      <LessonWorkspace
        contract={DEMO_A.contract}
        adapter={new RejectingAdapter()}
        initialScript={INITIAL}
        editorSlot={DraftProbeSlot}
      />,
    )
    importFile(JSON.stringify({ lessonId: 'demo-a', version: 1, items: ['own'] }))
    await waitFor(() =>
      expect(screen.getByTestId('ws-notice')).toHaveTextContent('导入文件数据无效'),
    )
    expect(screen.getByTestId('ws-draft-probe-initial')).toHaveTextContent(
      '{"version":1,"items":["initial"]}',
    )
    expect(screen.getByTestId('ws-notice')).not.toHaveTextContent('已导入作品数据')
    await new Promise((resolve) => setTimeout(resolve, 1300))
    expect(window.localStorage.getItem('kidscoding-draft:demo-a')).toBeNull()
  })
})
