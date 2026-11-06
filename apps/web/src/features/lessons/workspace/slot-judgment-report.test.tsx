import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DEMO_S } from './demo-contracts'
import { LessonWorkspace } from './lesson-workspace'
import type { EngineAdapter, EngineState } from './workspace-adapters'
import type { EditorSlotProps, JudgmentResult } from './workspace-slots'

/**
 * OPS-025 slot judgment report tests (#481): a slot lesson's own check
 * reports its judgment to the shell, and the shell displays it verbatim
 * in the feedback card — never recomputed, never invented. Reporting
 * null, or editing afterwards, invalidates the shown judgment.
 *
 * The probe slot stands in for a real course slot (e.g. 4 号的
 * SummaryEditorSlot): its check button reports a three-layer judgment,
 * its clear button reports null, its edit button goes through onChange.
 * Defined at module level so re-renders never remount it.
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

const REPORTED_JUDGMENT: JudgmentResult = {
  layers: [
    { id: 'stage', label: '舞台结果', passed: true, detail: '舞台结果：通过' },
    { id: 'task', label: '任务判定', passed: true, detail: '任务判定：合格：五项全部通过。' },
    { id: 'knowledge', label: '知识证据', passed: true, detail: '知识证据：通过' },
  ],
  passed: true,
  conclusion: '结论：已完成，已掌握',
}

function ProbeSlot(props: EditorSlotProps) {
  return (
    <div data-testid="ws-probe-slot">
      <button
        type="button"
        data-testid="ws-probe-check"
        onClick={() => props.onJudgment?.(REPORTED_JUDGMENT)}
      >
        槽位检查
      </button>
      <button
        type="button"
        data-testid="ws-probe-clear"
        onClick={() => props.onJudgment?.(null)}
      >
        清除判定
      </button>
      <button
        type="button"
        data-testid="ws-probe-edit"
        onClick={() => props.onChange({ text: 'edited' })}
      >
        槽位编辑
      </button>
    </div>
  )
}

function renderSummarySlot() {
  render(
    <LessonWorkspace
      contract={DEMO_S.contract}
      adapter={new DummyAdapter()}
      initialScript={DEMO_S.initialScript}
      editorSlot={ProbeSlot}
    />,
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('OPS-025 slot judgment report (#481)', () => {
  it('targetless slot lesson shows the neutral placeholder, no 本演示, no run button', () => {
    renderSummarySlot()
    expect(screen.getByTestId('ws-feedback')).toHaveTextContent('暂无检查结果')
    expect(screen.getByTestId('ws-feedback')).not.toHaveTextContent('本演示')
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
    // No run target: neither run entry renders for a targetless slot.
    expect(screen.queryByTestId('ws-run-toggle')).toBeNull()
    expect(screen.queryByTestId('ws-sticky-run')).toBeNull()
  })

  it('a reported judgment renders in the feedback card verbatim', () => {
    renderSummarySlot()
    fireEvent.click(screen.getByTestId('ws-probe-check'))
    expect(screen.getByTestId('ws-feedback-task')).toHaveTextContent(
      '任务判定：合格：五项全部通过。',
    )
    expect(screen.getByTestId('ws-feedback-stage')).toHaveTextContent('舞台结果：通过')
    expect(screen.getByTestId('ws-feedback-knowledge')).toHaveTextContent('知识证据：通过')
    expect(screen.getByTestId('ws-feedback-conclusion')).toHaveTextContent(
      '结论：已完成，已掌握',
    )
    expect(screen.queryByTestId('ws-judgment-stale')).toBeNull()
  })

  it('edit after a report invalidates the judgment with the re-check wording', () => {
    renderSummarySlot()
    fireEvent.click(screen.getByTestId('ws-probe-check'))
    expect(screen.getByTestId('ws-feedback-conclusion')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('ws-probe-edit'))
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
    expect(screen.getByTestId('ws-judgment-stale')).toHaveTextContent(
      '旧判定已失效，修改后请重新检查',
    )
  })

  it('reporting null invalidates a shown judgment', () => {
    renderSummarySlot()
    fireEvent.click(screen.getByTestId('ws-probe-check'))
    expect(screen.getByTestId('ws-feedback-conclusion')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('ws-probe-clear'))
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
    expect(screen.getByTestId('ws-judgment-stale')).toHaveTextContent(
      '旧判定已失效，修改后请重新检查',
    )
  })

  it('reporting null with nothing shown is a no-op: no stale notice, no invented result', () => {
    renderSummarySlot()
    fireEvent.click(screen.getByTestId('ws-probe-clear'))
    expect(screen.queryByTestId('ws-judgment-stale')).toBeNull()
    expect(screen.queryByTestId('ws-feedback-conclusion')).toBeNull()
    expect(screen.getByTestId('ws-feedback')).toHaveTextContent('暂无检查结果')
  })
})
