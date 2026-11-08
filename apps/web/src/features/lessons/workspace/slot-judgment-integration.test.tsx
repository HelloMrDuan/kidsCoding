import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DEMO_S, DEMO_SLOT } from './demo-contracts'
import { DemoSlotEditor } from './demo-slot-editor'
import { SlotDemoAdapter } from './demo-slot-adapter'
import { LessonWorkspace } from './lesson-workspace'
import type { EngineAdapter, EngineState } from './workspace-adapters'

/**
 * Premerge joint regression tests: OPS-026 slot engine (#491) + OPS-025
 * onJudgment channel (#490) enabled at the same time.
 *
 * The demo slot editor reports its own real check result through
 * onJudgment and reports null on edit; the shell displays the reported
 * judgment verbatim, invalidates it on edit, and never conjures a run
 * button from the report alone. Judgment results are never written into
 * drafts, so a restore never resurrects a stale pass. Copy is
 * engine-specific: the summary placeholder never says 本演示, and each
 * engine's fallback page carries only its own wording.
 */

function seedDraft(lessonId: string, script: unknown) {
  window.localStorage.setItem(
    `kidscoding-draft:${lessonId}`,
    JSON.stringify({ lessonId, savedAt: '2026-11-06T00:00:00.000Z', script }),
  )
}

/** Minimal imperative adapter: never mounted for slot/summary courses. */
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

/** Minimal summary probe slot: mounts, never reports a judgment. */
function SummaryProbe() {
  return (
    <div data-testid="ws-summary-probe">
      <p>摘要演示插槽</p>
    </div>
  )
}

const SLOT_INITIAL = { version: 1, items: [false, false, false] } as const

function renderSlotLesson() {
  render(
    <LessonWorkspace
      contract={DEMO_SLOT.contract}
      adapter={new SlotDemoAdapter()}
      initialScript={SLOT_INITIAL}
      editorSlot={DemoSlotEditor}
    />,
  )
}

function checkAllThree() {
  fireEvent.click(screen.getByTestId('ws-demo-slot-item-0'))
  fireEvent.click(screen.getByTestId('ws-demo-slot-item-1'))
  fireEvent.click(screen.getByTestId('ws-demo-slot-item-2'))
  fireEvent.click(screen.getByTestId('ws-demo-slot-check'))
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('slot engine + onJudgment joint (premerge #490 into #491)', () => {
  it('(a) a check result shows in the shell feedback card via onJudgment', () => {
    renderSlotLesson()
    checkAllThree()
    expect(screen.getByTestId('ws-demo-slot-conclusion')).toHaveTextContent('三项全部通过。')
    expect(screen.getByTestId('ws-feedback-task')).toHaveTextContent('任务判定：三项全部通过。')
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('三项全部通过。')
    expect(screen.queryByTestId('ws-judgment-stale')).toBeNull()
  })

  it('(a) a failing check reports the real failing count, not a pass', () => {
    renderSlotLesson()
    fireEvent.click(screen.getByTestId('ws-demo-slot-item-0'))
    fireEvent.click(screen.getByTestId('ws-demo-slot-check'))
    expect(screen.getByTestId('ws-demo-slot-conclusion')).toHaveTextContent('还有 2 项未通过。')
    expect(screen.getByTestId('ws-feedback-task')).toHaveTextContent('任务判定：还有 2 项未通过。')
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('还有 2 项未通过。')
  })

  it('(b) editing after a check invalidates the shown judgment (null report)', () => {
    renderSlotLesson()
    checkAllThree()
    expect(screen.getByTestId('ws-feedback-conclusion')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('ws-demo-slot-item-1'))
    expect(screen.queryByTestId('ws-demo-slot-check-result')).toBeNull()
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
    expect(screen.getByTestId('ws-judgment-stale')).toHaveTextContent(
      '旧判定已失效，修改后请重新检查',
    )
    expect(screen.getByTestId('ws-feedback')).toHaveTextContent('旧判定已失效')
    expect(screen.getByTestId('ws-feedback')).not.toHaveTextContent('暂无检查结果')
  })

  it('(c) restore brings back the draft, never a stale judgment; re-check works', () => {
    seedDraft('demo-slot', { version: 1, items: [true, true, true] })
    renderSlotLesson()
    expect(
      (screen.getByTestId('ws-demo-slot-item-0') as HTMLInputElement).checked,
    ).toBe(true)
    expect(
      (screen.getByTestId('ws-demo-slot-item-1') as HTMLInputElement).checked,
    ).toBe(true)
    expect(
      (screen.getByTestId('ws-demo-slot-item-2') as HTMLInputElement).checked,
    ).toBe(true)
    expect(screen.getByTestId('ws-save-message')).toHaveTextContent('已恢复草稿')
    // Judgment is never written into drafts: no stale pass is resurrected.
    expect(screen.queryByTestId('ws-demo-slot-check-result')).toBeNull()
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
    expect(screen.getByTestId('ws-feedback')).toHaveTextContent('暂无检查结果')
    // A fresh check after restore reports normally.
    fireEvent.click(screen.getByTestId('ws-demo-slot-check'))
    expect(screen.getByTestId('ws-feedback-task')).toHaveTextContent('任务判定：三项全部通过。')
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent('三项全部通过。')
  })

  it('(d) no run button appears without a run target, even while a judgment is shown', () => {
    renderSlotLesson()
    checkAllThree()
    expect(screen.getByTestId('ws-feedback-conclusion')).toBeInTheDocument()
    expect(screen.queryByTestId('ws-run-script')).toBeNull()
    expect(screen.queryByTestId('ws-run-toggle')).toBeNull()
    expect(screen.queryByTestId('ws-sticky-run')).toBeNull()
  })

  it('(e) fallback copy is engine-specific: slot vs summary do not leak into each other', () => {
    render(
      <LessonWorkspace
        contract={DEMO_SLOT.contract}
        adapter={new SlotDemoAdapter()}
        initialScript={SLOT_INITIAL}
      />,
    )
    expect(screen.getByTestId('ws-root')).toHaveTextContent('插槽编辑尚未接入')
    expect(screen.getByTestId('ws-root')).not.toHaveTextContent('摘要编辑尚未接入')
    cleanup()
    render(
      <LessonWorkspace
        contract={DEMO_S.contract}
        adapter={new DummyAdapter()}
        initialScript={DEMO_S.initialScript}
      />,
    )
    expect(screen.getByTestId('ws-root')).toHaveTextContent('摘要编辑尚未接入')
    expect(screen.getByTestId('ws-root')).not.toHaveTextContent('插槽编辑尚未接入')
  })

  it('(e) neither engine ever shows the 本演示 placeholder', () => {
    renderSlotLesson()
    expect(screen.getByTestId('ws-feedback')).toHaveTextContent('暂无检查结果')
    expect(screen.getByTestId('ws-feedback')).not.toHaveTextContent('本演示')
    cleanup()
    render(
      <LessonWorkspace
        contract={DEMO_S.contract}
        adapter={new DummyAdapter()}
        initialScript={DEMO_S.initialScript}
        editorSlot={SummaryProbe}
      />,
    )
    expect(screen.getByTestId('ws-feedback')).toHaveTextContent('暂无检查结果')
    expect(screen.getByTestId('ws-feedback')).not.toHaveTextContent('本演示')
  })
})
