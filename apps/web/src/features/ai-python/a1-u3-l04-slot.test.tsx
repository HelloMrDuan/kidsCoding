/**
 * A1-U3-L04 插槽/onJudgment 测试（正式验收，按详案 §4.2/§7.2）。
 *
 * 用真实判定内容测：正确作业点校验 → 上报 passed 判定；编辑后上报 null；
 * 错误作业点校验 → 上报未通过判定与指定失败项；示例按钮载入预填草稿；
 * 无 onJudgment 时插槽照常显示结论；渲染须传齐必填 prop（含 lessonId）。
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { JudgmentResult } from '../lessons/workspace/workspace-slots'
import { RETRIEVAL_EXAMPLES } from './a1-u3-l04'
import { A1U3L04Adapter } from './a1-u3-l04-adapter'
import { emptyDraft } from './a1-u3-l04-draft'
import { A1U3L04EditorSlot } from './a1-u3-l04-slot'

afterEach(cleanup)

function renderSlot(onJudgment?: (judgment: JudgmentResult | null) => void) {
  const onChange = vi.fn()
  render(
    <A1U3L04EditorSlot
      lessonId="A1-U3-L04"
      initial={emptyDraft()}
      onChange={onChange}
      editable
      onJudgment={onJudgment}
    />,
  )
  return { onChange }
}

function goodDraft() {
  const example = RETRIEVAL_EXAMPLES.find((item) => item.id === 'good')
  if (!example) throw new Error('missing good example')
  return { ...emptyDraft(), ...example.draft }
}

describe('A1U3L04EditorSlot onJudgment reporting (Issue #481, course side)', () => {
  it('reports the judgment on check for correct work, identical to the adapter result', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l04-example-good'))
    fireEvent.click(screen.getByTestId('ai-u3-l04-check'))

    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(reported.passed).toBe(true)
    expect(reported.conclusion).toBe('本次检索合格。')
    expect(reported.conclusion).not.toContain('已掌握')
    expect(reported.layers.map((layer) => layer.id)).toEqual(['stage', 'task', 'knowledge'])
    expect(reported.layers[1].detail).toBe('任务判定：合格：五项全部通过。')
    expect(reported.layers[2].detail).toContain('方法证据：提示词 3 个（苹果、颜色、规则）')
    // The slot display and the reported judgment are the same judgment:
    // the verdict line in the slot shows the reported conclusion's wording.
    expect(screen.getByTestId('ai-u3-l04-verdict')).toHaveTextContent('合格：五项全部通过')
    expect(screen.getByTestId('ai-u3-l04-work')).toHaveTextContent('作品总结')
    expect(screen.getByTestId('ai-u3-l04-work')).toHaveTextContent('可用资料：A、B')
    // And it is exactly what the adapter computes for the same draft.
    const expected = new A1U3L04Adapter(goodDraft()).checkRetrieval()
    expect(reported).toEqual(expected)
  })

  it('reports an unpassed judgment for wrong work and names the failing card', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l04-example-bad-source'))
    fireEvent.click(screen.getByTestId('ai-u3-l04-check'))

    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(reported.passed).toBe(false)
    expect(reported.conclusion).toBe('未合格。')
    expect(screen.getByTestId('ai-u3-l04-verdict')).toHaveTextContent('未合格')
    expect(screen.getByTestId('ai-u3-l04-result')).toHaveTextContent('卡 D·来源')
    expect(screen.getByTestId('ai-u3-l04-result')).toHaveTextContent('来源不可信')
  })

  it('reports null when an answer is edited after a check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l04-example-good'))
    fireEvent.click(screen.getByTestId('ai-u3-l04-check'))
    expect(onJudgment).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('ai-u3-l04-q-A-source-no'))
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
    expect(screen.queryByTestId('ai-u3-l04-verdict')).toBeNull()
  })

  it('reports null when another example is loaded after a check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l04-example-good'))
    fireEvent.click(screen.getByTestId('ai-u3-l04-check'))
    expect(onJudgment).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('ai-u3-l04-example-outdated'))
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
    expect(screen.queryByTestId('ai-u3-l04-verdict')).toBeNull()
  })

  it('reports null when the keywords are edited after a check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l04-example-good'))
    fireEvent.click(screen.getByTestId('ai-u3-l04-check'))
    expect(onJudgment).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByTestId('ai-u3-l04-keywords'), {
      target: { value: '苹果 颜色' },
    })
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
  })

  it('reports null when the usable list is toggled after a check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l04-example-good'))
    fireEvent.click(screen.getByTestId('ai-u3-l04-check'))
    expect(onJudgment).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('ai-u3-l04-usable-A'))
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
  })

  it('reports nothing before any check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u3-l04-example-good'))
    expect(onJudgment).not.toHaveBeenCalled()
  })

  it('works with no onJudgment prop: checks run and the slot verdict shows', () => {
    renderSlot()
    fireEvent.click(screen.getByTestId('ai-u3-l04-example-good'))
    fireEvent.click(screen.getByTestId('ai-u3-l04-check'))
    expect(screen.getByTestId('ai-u3-l04-verdict')).toHaveTextContent('合格：五项全部通过')
    expect(screen.getByTestId('ai-u3-l04-work')).toBeInTheDocument()
  })

  it('retrieve shows hit counts after click and dashes before', () => {
    renderSlot()
    expect(screen.getByTestId('ai-u3-l04-hits-A')).toHaveTextContent('—')
    expect(screen.getByTestId('ai-u3-l04-found-A')).toHaveTextContent('—')
    fireEvent.change(screen.getByTestId('ai-u3-l04-keywords'), {
      target: { value: '苹果 颜色 规则' },
    })
    fireEvent.click(screen.getByTestId('ai-u3-l04-retrieve'))
    expect(screen.getByTestId('ai-u3-l04-hits-A')).toHaveTextContent('3')
    expect(screen.getByTestId('ai-u3-l04-hits-B')).toHaveTextContent('2')
    expect(screen.getByTestId('ai-u3-l04-hits-C')).toHaveTextContent('1')
    expect(screen.getByTestId('ai-u3-l04-hits-D')).toHaveTextContent('0')
    expect(screen.getByTestId('ai-u3-l04-found-A')).toHaveTextContent('检索到')
    expect(screen.getByTestId('ai-u3-l04-found-D')).toHaveTextContent('未检索到')
  })

  it('keyword input splits on spaces and 、 and reports the parsed list', () => {
    const { onChange } = renderSlot()
    fireEvent.change(screen.getByTestId('ai-u3-l04-keywords'), {
      target: { value: '苹果、颜色 规则' },
    })
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as ReturnType<
      typeof emptyDraft
    >
    expect(last.keywords).toEqual(['苹果', '颜色', '规则'])
    expect(screen.getByTestId('ai-u3-l04-draft-status')).toHaveTextContent('关键词 3 个')
  })

  it('manual answering works: answering only card A leaves the rest unanswered', () => {
    renderSlot()
    fireEvent.change(screen.getByTestId('ai-u3-l04-keywords'), {
      target: { value: '苹果 颜色 规则' },
    })
    fireEvent.click(screen.getByTestId('ai-u3-l04-retrieve'))
    for (const key of ['source', 'time', 'evidence', 'relevant'] as const) {
      fireEvent.click(screen.getByTestId(`ai-u3-l04-q-A-${key}-yes`))
    }
    fireEvent.click(screen.getByTestId('ai-u3-l04-usable-A'))
    fireEvent.change(screen.getByTestId('ai-u3-l04-rule'), {
      target: { value: '从任务句里挑关键词；来源、时间、证据、相关四问全过才可用。' },
    })
    fireEvent.click(screen.getByTestId('ai-u3-l04-check'))
    const result = screen.getByTestId('ai-u3-l04-result')
    expect(result).toHaveTextContent('四问答完：失败')
    expect(result).toHaveTextContent('卡 B·来源')
    expect(result).toHaveTextContent('清单里少了卡 B')
    expect(screen.getByTestId('ai-u3-l04-draft-status')).toHaveTextContent('四问已答 4/24')
  })

  it('example buttons load prefilled drafts (bad keywords)', () => {
    renderSlot()
    fireEvent.click(screen.getByTestId('ai-u3-l04-example-bad-keywords'))
    expect(screen.getByTestId('ai-u3-l04-keywords')).toHaveValue('恐龙 灭绝')
    fireEvent.click(screen.getByTestId('ai-u3-l04-check'))
    expect(screen.getByTestId('ai-u3-l04-result')).toHaveTextContent('不在任务句中')
  })

  it('read-only preview shows the task and corpus but no check button', () => {
    render(
      <A1U3L04EditorSlot
        lessonId="A1-U3-L04"
        initial={emptyDraft()}
        onChange={() => {}}
        editable={false}
      />,
    )
    expect(screen.getByTestId('ai-u3-l04-task')).toHaveTextContent('颜色规则把黄色判成香蕉')
    expect(screen.getByTestId('ai-u3-l04-corpus')).toBeInTheDocument()
    expect(screen.queryByTestId('ai-u3-l04-check')).toBeNull()
  })
})
