/**
 * A1-U3-L04 插槽/onJudgment 测试骨架（脚手架 OPS-030 生成）。
 *
 * 只测上报通道骨架：校验后上报判定、编辑后上报 null 使旧判定失效、
 * 无 onJudgment 时插槽照常工作。课程独有的判定内容由作者另补真实用例。
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { JudgmentResult } from '../lessons/workspace/workspace-slots'
import { A1U3L04EditorSlot } from './a1-u3-l04-slot'

afterEach(() => {
  cleanup()
})

function renderSlot(onJudgment?: (judgment: JudgmentResult | null) => void) {
  render(
    <A1U3L04EditorSlot
      initial={{ text: '' }}
      onChange={() => {}}
      editable
      onJudgment={onJudgment}
    />,
  )
}

describe('A1-U3-L04 slot onJudgment (scaffold)', () => {
  it('reports a judgment on check (never fabricates a pass)', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ws-a1-u3-l04-check'))
    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(typeof reported.passed).toBe('boolean')
  })

  it('reports null on edit so the shell invalidates the old judgment', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ws-a1-u3-l04-check'))
    expect(onJudgment).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByTestId('ws-a1-u3-l04-input'), {
      target: { value: 'edited' },
    })
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
  })

  it('works with no onJudgment prop: checks run and the slot verdict shows', () => {
    renderSlot()
    fireEvent.click(screen.getByTestId('ws-a1-u3-l04-check'))
    expect(screen.getByTestId('ws-a1-u3-l04-check-result')).toBeInTheDocument()
  })
})
