import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { JudgmentResult } from '../lessons/workspace/workspace-slots'
import { RECORD_EXAMPLES } from './a1-u3-l03'
import { JsonAdapter } from './a1-u3-l03-adapter'
import { emptyDraft } from './a1-u3-l03-draft'
import { JsonEditorSlot } from './a1-u3-l03-slot'

afterEach(cleanup)

function renderSlot(onJudgment?: (judgment: JudgmentResult | null) => void) {
  const onChange = vi.fn()
  render(
    <JsonEditorSlot
      lessonId="A1-U3-L03"
      initial={emptyDraft()}
      onChange={onChange}
      editable
      onJudgment={onJudgment}
    />,
  )
  return { onChange }
}

function goodJson(): string {
  const example = RECORD_EXAMPLES.find((item) => item.id === 'good')
  if (!example) throw new Error('missing good example')
  return example.json
}

describe('JsonEditorSlot onJudgment reporting (Issue #481, course side)', () => {
  it('reports the judgment on check, identical to the adapter result', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l03-example-good'))
    fireEvent.click(screen.getByTestId('ai-u3-l03-validate'))

    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(reported.passed).toBe(true)
    expect(reported.conclusion).toBe('结论：本次记录合格。')
    expect(reported.conclusion).not.toContain('已掌握')
    expect(reported.layers.map((layer) => layer.id)).toEqual(['stage', 'task', 'knowledge'])
    // The slot display and the reported judgment are the same judgment:
    // the verdict line in the slot shows the reported conclusion's wording.
    expect(screen.getByTestId('ai-u3-l03-verdict')).toHaveTextContent('合格：五项全部通过')
    // And it is exactly what the adapter computes for the same draft.
    const expected = new JsonAdapter({ ...emptyDraft(), jsonText: goodJson() }).checkRecord()
    expect(reported).toEqual(expected)
  })

  it('reports an unpassed judgment when the draft fails the checks', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l03-validate'))

    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(reported.passed).toBe(false)
    expect(reported.conclusion).toBe('结论：未合格。')
    expect(screen.getByTestId('ai-u3-l03-verdict')).toHaveTextContent('未合格')
  })

  it('reports null when the checked record is edited', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l03-example-good'))
    fireEvent.click(screen.getByTestId('ai-u3-l03-validate'))
    expect(onJudgment).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByTestId('ai-u3-l03-json-input'), {
      target: { value: '{"名称": "苹果"}' },
    })
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
    expect(screen.queryByTestId('ai-u3-l03-verdict')).toBeNull()
  })

  it('reports null when another example is loaded after a check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l03-example-good'))
    fireEvent.click(screen.getByTestId('ai-u3-l03-validate'))
    expect(onJudgment).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('ai-u3-l03-example-type-error'))
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
    expect(screen.queryByTestId('ai-u3-l03-verdict')).toBeNull()
  })

  it('reports nothing before any check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l03-example-good'))
    expect(onJudgment).not.toHaveBeenCalled()
  })
})
