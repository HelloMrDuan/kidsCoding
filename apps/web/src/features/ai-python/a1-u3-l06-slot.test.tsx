import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { JudgmentResult } from '../lessons/workspace/workspace-slots'
import { QaAdapter } from './a1-u3-l06-adapter'
import { emptyDraft } from './a1-u3-l06-draft'
import { QaEditorSlot } from './a1-u3-l06-slot'

afterEach(cleanup)

function renderSlot(onJudgment?: (judgment: JudgmentResult | null) => void) {
  const onChange = vi.fn()
  render(
    <QaEditorSlot
      lessonId="A1-U3-L06"
      initial={emptyDraft()}
      onChange={onChange}
      editable
      onJudgment={onJudgment}
    />,
  )
  return { onChange }
}

/** 八问全部预测正确并逐个提问（事实类/方法类猜能答，超范围类猜拒答）。 */
function predictAndAskAllEight() {
  for (const id of ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6']) {
    fireEvent.click(screen.getByTestId(`ai-u3-l06-predict-${id}-answer`))
    fireEvent.click(screen.getByTestId(`ai-u3-l06-ask-${id}`))
  }
  for (const id of ['Q7', 'Q8']) {
    fireEvent.click(screen.getByTestId(`ai-u3-l06-predict-${id}-refuse`))
    fireEvent.click(screen.getByTestId(`ai-u3-l06-ask-${id}`))
  }
}

describe('QaEditorSlot onJudgment reporting (Issue #481, course side)', () => {
  it('reports the judgment on check, identical to the adapter result', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    predictAndAskAllEight()
    fireEvent.click(screen.getByTestId('ai-u3-l06-check'))

    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(reported.passed).toBe(true)
    expect(reported.conclusion).toBe('结论：本次问答合格。')
    expect(reported.conclusion).not.toContain('已掌握')
    expect(reported.layers.map((layer) => layer.id)).toEqual(['stage', 'task', 'knowledge'])
    // The slot display and the reported judgment are the same judgment:
    // the verdict line in the slot shows the reported conclusion's wording.
    expect(screen.getByTestId('ai-u3-l06-verdict')).toHaveTextContent('合格：八问全部通过')
    // And it is exactly what the adapter computes for the same draft.
    const expected = new QaAdapter({
      version: 1,
      predictions: {
        Q1: '能答',
        Q2: '能答',
        Q3: '能答',
        Q4: '能答',
        Q5: '能答',
        Q6: '能答',
        Q7: '拒答',
        Q8: '拒答',
      },
      asked: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'],
      custom: [],
      errorChecks: {},
      hintLevel: 0,
    }).checkQa()
    expect(reported).toEqual(expected)
  })

  it('reports an unpassed judgment when the drill is not done', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l06-check'))

    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(reported.passed).toBe(false)
    expect(reported.conclusion).toBe('结论：未合格。')
    expect(screen.getByTestId('ai-u3-l06-verdict')).toHaveTextContent('未合格')
  })

  it('reports null when a prediction is changed after a check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    predictAndAskAllEight()
    fireEvent.click(screen.getByTestId('ai-u3-l06-check'))
    expect(onJudgment).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('ai-u3-l06-predict-Q1-refuse'))
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
    expect(screen.queryByTestId('ai-u3-l06-verdict')).toBeNull()
  })

  it('reports null when an error example is picked after a check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    predictAndAskAllEight()
    fireEvent.click(screen.getByTestId('ai-u3-l06-check'))
    expect(onJudgment).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('ai-u3-l06-error-ans2-digit'))
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
    expect(screen.queryByTestId('ai-u3-l06-verdict')).toBeNull()
  })

  it('reports nothing before any check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l06-predict-Q1-answer'))
    fireEvent.click(screen.getByTestId('ai-u3-l06-ask-Q1'))
    expect(onJudgment).not.toHaveBeenCalled()
  })
})
