import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { JudgmentResult } from '../lessons/workspace/workspace-slots'
import { L01Adapter } from './a1-u4-l01-adapter'
import { emptyDraft } from './a1-u4-l01-draft'
import { L01EditorSlot } from './a1-u4-l01-slot'

afterEach(cleanup)

function renderSlot(onJudgment?: (judgment: JudgmentResult | null) => void) {
  const onChange = vi.fn()
  render(
    <L01EditorSlot
      lessonId="A1-U4-L01"
      initial={emptyDraft()}
      onChange={onChange}
      editable
      onJudgment={onJudgment}
    />,
  )
  return { onChange }
}

/** 探索 6 条全部分类正确（E1/E2/E3 有效，V1/V2/V3 模糊）。 */
function classifyAllSix() {
  for (const id of ['E1', 'E2', 'E3']) {
    fireEvent.click(screen.getByTestId(`ai-u4-l01-explore-${id}-valid`))
  }
  for (const id of ['V1', 'V2', 'V3']) {
    fireEvent.click(screen.getByTestId(`ai-u4-l01-explore-${id}-vague`))
  }
}

/** 填满问题卡：选 E1、三句话、四问全部答“通过”。 */
function completeProblemCard() {
  fireEvent.click(screen.getByTestId('ai-u4-l01-choose-E1'))
  fireEvent.change(screen.getByTestId('ai-u4-l01-stmt-target'), {
    target: { value: '哪类菜品剩得多' },
  })
  fireEvent.change(screen.getByTestId('ai-u4-l01-stmt-data'), {
    target: { value: '每日各窗口剩菜总重量' },
  })
  fireEvent.change(screen.getByTestId('ai-u4-l01-stmt-success'), {
    target: { value: '剩菜最多的两类菜品报对' },
  })
  for (const id of ['Q1', 'Q2', 'Q3', 'Q4']) {
    fireEvent.click(screen.getByTestId(`ai-u4-l01-feas-${id}-pass`))
  }
}

/** 填满迁移：选 T1、三句话、成绩题答 A。 */
function completeTransfer() {
  fireEvent.click(screen.getByTestId('ai-u4-l01-transfer-T1'))
  fireEvent.change(screen.getByTestId('ai-u4-l01-transfer-target'), {
    target: { value: '哪种器材最常被借空' },
  })
  fireEvent.change(screen.getByTestId('ai-u4-l01-transfer-data'), {
    target: { value: '各器材每日借出次数' },
  })
  fireEvent.change(screen.getByTestId('ai-u4-l01-transfer-success'), {
    target: { value: '最常被借空的两种器材报对' },
  })
  fireEvent.click(screen.getByTestId('ai-u4-l01-grades-A'))
}

/** 走完本课全部三部分：探索 + 问题卡 + 迁移。 */
function completeLesson() {
  classifyAllSix()
  completeProblemCard()
  completeTransfer()
}

describe('L01EditorSlot onJudgment reporting (Issue #481, course side)', () => {
  it('reports the judgment on check, identical to the adapter result', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    completeLesson()
    fireEvent.click(screen.getByTestId('ai-u4-l01-check'))

    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(reported.passed).toBe(true)
    expect(reported.conclusion).toBe('结论：本次课堂练习合格。')
    expect(reported.conclusion).not.toContain('已掌握')
    expect(reported.layers.map((layer) => layer.id)).toEqual(['stage', 'task', 'knowledge'])
    // The slot display and the reported judgment are the same judgment:
    // the verdict line in the slot shows the reported conclusion's wording.
    expect(screen.getByTestId('ai-u4-l01-verdict')).toHaveTextContent('合格：问题卡与迁移均已完成')
    expect(screen.getByTestId('ai-u4-l01-work')).toHaveTextContent('作品总结')
    // And it is exactly what the adapter computes for the same draft.
    const expected = new L01Adapter({
      version: 1,
      explore: {
        E1: '有效',
        E2: '有效',
        E3: '有效',
        V1: '模糊',
        V2: '模糊',
        V3: '模糊',
      },
      chosenExample: 'E1',
      statement: {
        target: '哪类菜品剩得多',
        data: '每日各窗口剩菜总重量',
        success: '剩菜最多的两类菜品报对',
      },
      feasibility: { Q1: '通过', Q2: '通过', Q3: '通过', Q4: '通过' },
      feasibilityNotes: {},
      transferScenario: 'T1',
      transferStatement: {
        target: '哪种器材最常被借空',
        data: '各器材每日借出次数',
        success: '最常被借空的两种器材报对',
      },
      gradesAnswer: 'A',
      hintLevel: 0,
    }).checkL01()
    expect(reported).toEqual(expected)
  })

  it('reports an unpassed judgment when the lesson is not done', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u4-l01-check'))

    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(reported.passed).toBe(false)
    expect(reported.conclusion).toBe('结论：未合格。')
    expect(screen.getByTestId('ai-u4-l01-verdict')).toHaveTextContent('未合格')
  })

  it('reports null when a classification is changed after a check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    completeLesson()
    fireEvent.click(screen.getByTestId('ai-u4-l01-check'))
    expect(onJudgment).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('ai-u4-l01-explore-E1-vague'))
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
    expect(screen.queryByTestId('ai-u4-l01-verdict')).toBeNull()
  })

  it('reports null when a statement is edited after a check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    completeLesson()
    fireEvent.click(screen.getByTestId('ai-u4-l01-check'))
    expect(onJudgment).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByTestId('ai-u4-l01-stmt-target'), {
      target: { value: '改过的一句' },
    })
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
    expect(screen.queryByTestId('ai-u4-l01-verdict')).toBeNull()
  })

  it('reports nothing before any check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    classifyAllSix()
    expect(onJudgment).not.toHaveBeenCalled()
  })

  it('shows the banned-topic reason after classifying V2 and the grades feedback after answering', () => {
    renderSlot()
    fireEvent.click(screen.getByTestId('ai-u4-l01-explore-V2-vague'))
    expect(screen.getByTestId('ai-u4-l01-explore-V2')).toHaveTextContent('禁题')
    fireEvent.click(screen.getByTestId('ai-u4-l01-grades-B'))
    expect(screen.getByText('不对，再想想：成绩数据拿得到，AI 也能算，问题是许可与隐私。')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('ai-u4-l01-grades-A'))
    expect(screen.getByText('答对了：因为它用了个人记录，许可过不了，后果还敏感。')).toBeInTheDocument()
  })

  it('renders a read-only preview when editable is false', () => {
    render(
      <L01EditorSlot
        lessonId="A1-U4-L01"
        initial={emptyDraft()}
        onChange={() => {}}
        editable={false}
      />,
    )
    expect(screen.getByTestId('ai-u4-l01-slot-readonly')).toBeInTheDocument()
    expect(screen.queryByTestId('ai-u4-l01-check')).toBeNull()
  })

  it('works with no onJudgment prop: checks run and the slot verdict shows', () => {
    renderSlot()
    completeLesson()
    fireEvent.click(screen.getByTestId('ai-u4-l01-check'))
    expect(screen.getByTestId('ai-u4-l01-verdict')).toHaveTextContent('合格')
  })
})
