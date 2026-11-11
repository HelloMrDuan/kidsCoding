import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { JudgmentResult } from '../lessons/workspace/workspace-slots'
import { CitationAdapter } from './a1-u3-l05-adapter'
import { emptyDraft } from './a1-u3-l05-draft'
import { CitationEditorSlot } from './a1-u3-l05-slot'

afterEach(cleanup)

function renderSlot(
  onJudgment?: (judgment: JudgmentResult | null) => void,
  initial: unknown = emptyDraft(),
) {
  const onChange = vi.fn()
  render(
    <CitationEditorSlot
      lessonId="A1-U3-L05"
      initial={initial}
      onChange={onChange}
      editable
      onJudgment={onJudgment}
    />,
  )
  return { onChange }
}

/** 八项全部选对（E1 可信、E2 编造数字、P1 编造来源、P2/P4/T1 证据不足、P3 编造数字、T2 可信）。 */
function pickAllEightCorrect() {
  fireEvent.click(screen.getByTestId('ai-u3-l05-verdict-E1-trusted'))
  fireEvent.click(screen.getByTestId('ai-u3-l05-verdict-E2-digit'))
  fireEvent.click(screen.getByTestId('ai-u3-l05-verdict-P1-source'))
  fireEvent.click(screen.getByTestId('ai-u3-l05-verdict-P2-insufficient'))
  fireEvent.click(screen.getByTestId('ai-u3-l05-verdict-P3-digit'))
  fireEvent.click(screen.getByTestId('ai-u3-l05-verdict-P4-insufficient'))
  fireEvent.click(screen.getByTestId('ai-u3-l05-verdict-T1-insufficient'))
  fireEvent.click(screen.getByTestId('ai-u3-l05-verdict-T2-trusted'))
}

describe('CitationEditorSlot onJudgment reporting (Issue #481, course side)', () => {
  it('reports the judgment on check, identical to the adapter result', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    pickAllEightCorrect()
    fireEvent.click(screen.getByTestId('ai-u3-l05-check'))

    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(reported.passed).toBe(true)
    expect(reported.conclusion).toBe('结论：本次核对合格。')
    expect(reported.conclusion).not.toContain('已掌握')
    expect(reported.layers.map((layer) => layer.id)).toEqual(['stage', 'task', 'knowledge'])
    // The slot display and the reported judgment are the same judgment:
    // the verdict line in the slot shows the reported conclusion's wording.
    expect(screen.getByTestId('ai-u3-l05-verdict')).toHaveTextContent('合格：八项全部通过')
    // And it is exactly what the adapter computes for the same draft.
    const expected = new CitationAdapter({
      version: 1,
      lessonId: 'A1-U3-L05',
      verdicts: {
        E1: '可信',
        E2: '编造数字',
        P1: '编造来源',
        P2: '证据不足',
        P3: '编造数字',
        P4: '证据不足',
        T1: '证据不足',
        T2: '可信',
      },
    }).checkItems()
    expect(reported).toEqual(expected)
  })

  it('reports an unpassed judgment when nothing is picked, and shows the unpicked notice', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l05-check'))

    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(reported.passed).toBe(false)
    expect(reported.conclusion).toBe('结论：未合格。')
    expect(screen.getByTestId('ai-u3-l05-verdict')).toHaveTextContent('未合格')
    expect(screen.getByTestId('ai-u3-l05-notice')).toHaveTextContent('还有 8 项没选')
  })

  it('the unpicked notice counts only the unpicked items', () => {
    renderSlot()
    fireEvent.click(screen.getByTestId('ai-u3-l05-verdict-E1-trusted'))
    fireEvent.click(screen.getByTestId('ai-u3-l05-check'))
    expect(screen.getByTestId('ai-u3-l05-notice')).toHaveTextContent('还有 7 项没选')
    expect(screen.getByTestId('ai-u3-l05-notice')).toHaveTextContent('E2')
    fireEvent.click(screen.getByTestId('ai-u3-l05-verdict-E2-digit'))
    expect(screen.queryByTestId('ai-u3-l05-notice')).toBeNull()
  })

  it('reports null when a verdict is changed after a check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    pickAllEightCorrect()
    fireEvent.click(screen.getByTestId('ai-u3-l05-check'))
    expect(onJudgment).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('ai-u3-l05-verdict-E1-digit'))
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
    expect(screen.queryByTestId('ai-u3-l05-verdict')).toBeNull()
  })

  it('reports nothing before any check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l05-verdict-E1-trusted'))
    expect(onJudgment).not.toHaveBeenCalled()
  })

  it('an illegal initial draft is coerced to empty: nothing is picked', () => {
    renderSlot(undefined, {
      version: 1,
      lessonId: 'A1-U3-L06',
      verdicts: { E1: '可信' },
    })
    expect(screen.getByTestId('ai-u3-l05-draft-status')).toHaveTextContent('已选 0/8')
    expect(
      screen.getByTestId('ai-u3-l05-verdict-E1-trusted').getAttribute('aria-pressed'),
    ).toBe('false')
    fireEvent.click(screen.getByTestId('ai-u3-l05-check'))
    expect(screen.getByTestId('ai-u3-l05-notice')).toHaveTextContent('还有 8 项没选')
  })

  it('the honest note says the source book is classroom examples, not live search', () => {
    renderSlot()
    expect(screen.getByText(/课堂示例资料，不是真实联网搜索结果/)).toBeInTheDocument()
    expect(screen.getByTestId('ai-u3-l05-source-A')).toHaveTextContent('森林图书馆借阅单')
    expect(screen.getByTestId('ai-u3-l05-item-P4')).toHaveTextContent('（无引用）')
  })
})
