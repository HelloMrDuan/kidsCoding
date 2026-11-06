import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { JudgmentResult } from '../lessons/workspace/workspace-slots'
import { SummaryAdapter } from './a1-u3-l02-adapter'
import { emptyDraft } from './a1-u3-l02-draft'
import { SummaryEditorSlot } from './a1-u3-l02-slot'

afterEach(cleanup)

function renderSlot(onJudgment?: (judgment: JudgmentResult | null) => void) {
  const onChange = vi.fn()
  render(
    <SummaryEditorSlot
      initial={emptyDraft()}
      onChange={onChange}
      editable
      onJudgment={onJudgment}
    />,
  )
  return { onChange }
}

function goIndependent() {
  fireEvent.click(screen.getByTestId('ai-u3-l02-tab-independent'))
}

function goTransfer() {
  fireEvent.click(screen.getByTestId('ai-u3-l02-tab-transfer'))
}

describe('SummaryEditorSlot onJudgment reporting (Issue #481, course side)', () => {
  it('reports the independent judgment on check, identical to the adapter result', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    goIndependent()
    for (const id of ['P1-1', 'P3-1', 'P4-1']) {
      fireEvent.click(screen.getByTestId(`ai-u3-l02-pick-${id}`))
    }
    fireEvent.click(screen.getByTestId('ai-u3-l02-check-summary'))

    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(reported.passed).toBe(true)
    expect(reported.conclusion).toBe('结论：本次摘要合格。')
    expect(reported.conclusion).not.toContain('已掌握')
    expect(reported.layers.map((layer) => layer.id)).toEqual(['stage', 'task', 'knowledge'])
    // The slot display and the reported judgment are the same judgment:
    // the verdict line in the slot shows the reported conclusion's wording.
    expect(screen.getByTestId('ai-u3-l02-summary-verdict')).toHaveTextContent(
      '合格：五项全部通过',
    )
    // And it is exactly what the adapter computes for the same draft.
    const expected = new SummaryAdapter({
      ...emptyDraft(),
      selected: ['P1-1', 'P3-1', 'P4-1'],
    }).checkIndependent()
    expect(reported).toEqual(expected)
  })

  it('reports an unpassed judgment when the draft fails the checks', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    goIndependent()
    fireEvent.click(screen.getByTestId('ai-u3-l02-check-summary'))

    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(reported.passed).toBe(false)
    expect(reported.conclusion).toBe('结论：未合格。')
    expect(screen.getByTestId('ai-u3-l02-summary-verdict')).toHaveTextContent('未合格')
  })

  it('reports null when the checked independent activity is edited', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    goIndependent()
    for (const id of ['P1-1', 'P3-1', 'P4-1']) {
      fireEvent.click(screen.getByTestId(`ai-u3-l02-pick-${id}`))
    }
    fireEvent.click(screen.getByTestId('ai-u3-l02-check-summary'))
    expect(onJudgment).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('ai-u3-l02-pick-P1-1'))
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
    expect(screen.queryByTestId('ai-u3-l02-summary-verdict')).toBeNull()
  })

  it('transfer check reports its own judgment and clears on transfer edit', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    goTransfer()
    for (const id of ['T1-1', 'T2-1', 'T3-1']) {
      fireEvent.click(screen.getByTestId(`ai-u3-l02-transfer-pick-${id}`))
    }
    fireEvent.click(screen.getByTestId('ai-u3-l02-transfer-check'))

    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(reported.passed).toBe(true)
    expect(reported.conclusion).toBe('结论：本次摘要合格。')
    expect(screen.getByTestId('ai-u3-l02-transfer-verdict')).toHaveTextContent(
      '合格：五项全部通过',
    )
    const expected = new SummaryAdapter({
      ...emptyDraft(),
      transferSelected: ['T1-1', 'T2-1', 'T3-1'],
    }).checkTransfer()
    expect(reported).toEqual(expected)

    fireEvent.click(screen.getByTestId('ai-u3-l02-transfer-pick-T1-1'))
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
  })

  it('editing the other activity does not clear the reported judgment', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    goIndependent()
    for (const id of ['P1-1', 'P3-1', 'P4-1']) {
      fireEvent.click(screen.getByTestId(`ai-u3-l02-pick-${id}`))
    }
    fireEvent.click(screen.getByTestId('ai-u3-l02-check-summary'))
    expect(onJudgment).toHaveBeenCalledTimes(1)

    goTransfer()
    fireEvent.click(screen.getByTestId('ai-u3-l02-transfer-pick-T1-1'))
    // The transfer draft changed, but the reported independent judgment is
    // still valid: no null report, and the last report is unchanged.
    expect(onJudgment).toHaveBeenCalledTimes(1)
    expect((onJudgment.mock.calls[0][0] as JudgmentResult).passed).toBe(true)
  })

  it('works with no onJudgment prop: checks run and the slot verdict shows', () => {
    renderSlot()
    goIndependent()
    for (const id of ['P1-1', 'P3-1', 'P4-1']) {
      fireEvent.click(screen.getByTestId(`ai-u3-l02-pick-${id}`))
    }
    fireEvent.click(screen.getByTestId('ai-u3-l02-check-summary'))
    expect(screen.getByTestId('ai-u3-l02-summary-verdict')).toHaveTextContent(
      '合格：五项全部通过',
    )
  })
})
