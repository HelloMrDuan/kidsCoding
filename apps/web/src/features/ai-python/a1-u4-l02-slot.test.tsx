import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { JudgmentResult } from '../lessons/workspace/workspace-slots'
import { L02Adapter } from './a1-u4-l02-adapter'
import { emptyDraft } from './a1-u4-l02-draft'
import { L02EditorSlot } from './a1-u4-l02-slot'

afterEach(cleanup)

function renderSlot(onJudgment?: (judgment: JudgmentResult | null) => void) {
  const onChange = vi.fn()
  render(
    <L02EditorSlot
      lessonId="A1-U4-L02"
      initial={emptyDraft()}
      onChange={onChange}
      editable
      onJudgment={onJudgment}
    />,
  )
  return { onChange }
}

/** 探索 6 项全部分类正确（A1/A2/A3 聚合可用，P1/P2/P3 缺许可即停）。 */
function classifyAllSix() {
  for (const id of ['A1', 'A2', 'A3']) {
    fireEvent.click(screen.getByTestId(`ai-u4-l02-explore-${id}-aggregate`))
  }
  for (const id of ['P1', 'P2', 'P3']) {
    fireEvent.click(screen.getByTestId(`ai-u4-l02-explore-${id}-stop`))
  }
}

/** 填满许可清单：3 行五列齐全，默认处置与许可状态一致。 */
function completeChecklist() {
  fireEvent.change(screen.getByTestId('ai-u4-l02-checklist-0-item'), {
    target: { value: '每日各窗口剩菜总重量' },
  })
  fireEvent.click(screen.getByTestId('ai-u4-l02-checklist-0-pii-no'))
  fireEvent.change(screen.getByTestId('ai-u4-l02-checklist-0-permission'), {
    target: { value: '聚合数据可用，仍须教师确认来源' },
  })
  fireEvent.click(screen.getByTestId('ai-u4-l02-checklist-0-status-na'))
  fireEvent.click(screen.getByTestId('ai-u4-l02-checklist-0-disposition-usable'))

  fireEvent.change(screen.getByTestId('ai-u4-l02-checklist-1-item'), {
    target: { value: '各排每日借出册数' },
  })
  fireEvent.click(screen.getByTestId('ai-u4-l02-checklist-1-pii-no'))
  fireEvent.change(screen.getByTestId('ai-u4-l02-checklist-1-permission'), {
    target: { value: '聚合数据可用，仍须教师确认来源' },
  })
  fireEvent.click(screen.getByTestId('ai-u4-l02-checklist-1-status-na'))
  fireEvent.click(screen.getByTestId('ai-u4-l02-checklist-1-disposition-usable'))

  fireEvent.change(screen.getByTestId('ai-u4-l02-checklist-2-item'), {
    target: { value: '全班同学姓名与班级名单' },
  })
  fireEvent.click(screen.getByTestId('ai-u4-l02-checklist-2-pii-yes'))
  fireEvent.change(screen.getByTestId('ai-u4-l02-checklist-2-permission'), {
    target: { value: '监护人同意' },
  })
  fireEvent.click(screen.getByTestId('ai-u4-l02-checklist-2-status-missing'))
  fireEvent.click(screen.getByTestId('ai-u4-l02-checklist-2-disposition-stop'))
}

/** 填满迁移：否决题 4 项全对、scope 答 A、不覆盖事项 5 项全选。 */
function completeTransfer() {
  fireEvent.click(screen.getByTestId('ai-u4-l02-veto-W1-usable'))
  fireEvent.click(screen.getByTestId('ai-u4-l02-veto-W2-usable'))
  fireEvent.click(screen.getByTestId('ai-u4-l02-veto-W3-stop'))
  fireEvent.click(screen.getByTestId('ai-u4-l02-veto-W4-stop'))
  fireEvent.click(screen.getByTestId('ai-u4-l02-scope-A'))
  for (const id of ['N1', 'N2', 'N3', 'N4', 'N5']) {
    fireEvent.click(screen.getByTestId(`ai-u4-l02-noncoverage-${id}`))
  }
}

/** 走完本课全部三部分：探索 + 许可清单 + 迁移。 */
function completeLesson() {
  classifyAllSix()
  completeChecklist()
  completeTransfer()
}

describe('L02EditorSlot onJudgment reporting (Issue #481, course side)', () => {
  it('reports the judgment on check, identical to the adapter result', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    completeLesson()
    fireEvent.click(screen.getByTestId('ai-u4-l02-check'))

    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(reported.passed).toBe(true)
    expect(reported.conclusion).toBe('结论：本次课堂练习合格。')
    expect(reported.conclusion).not.toContain('已掌握')
    expect(reported.layers.map((layer) => layer.id)).toEqual(['stage', 'task', 'knowledge'])
    // The slot display and the reported judgment are the same judgment:
    // the verdict line in the slot shows the reported conclusion's wording.
    expect(screen.getByTestId('ai-u4-l02-verdict')).toHaveTextContent('合格：许可清单与迁移均已完成')
    expect(screen.getByTestId('ai-u4-l02-work')).toHaveTextContent('作品总结')
    // And it is exactly what the adapter computes for the same draft.
    const expected = new L02Adapter({
      version: 1,
      explore: {
        A1: '聚合可用',
        A2: '聚合可用',
        A3: '聚合可用',
        P1: '缺许可即停',
        P2: '缺许可即停',
        P3: '缺许可即停',
      },
      checklist: [
        {
          item: '每日各窗口剩菜总重量',
          containsPii: '否',
          permissionNeeded: '聚合数据可用，仍须教师确认来源',
          status: '不适用',
          disposition: '可用',
        },
        {
          item: '各排每日借出册数',
          containsPii: '否',
          permissionNeeded: '聚合数据可用，仍须教师确认来源',
          status: '不适用',
          disposition: '可用',
        },
        {
          item: '全班同学姓名与班级名单',
          containsPii: '是',
          permissionNeeded: '监护人同意',
          status: '未授予',
          disposition: '停',
        },
      ],
      veto: { W1: '可用', W2: '可用', W3: '停', W4: '停' },
      scopeAnswer: 'A',
      nonCoverage: ['N1', 'N2', 'N3', 'N4', 'N5'],
      hintLevel: 0,
    }).checkL02()
    expect(reported).toEqual(expected)
  })

  it('reports an unpassed judgment when the lesson is not done', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    fireEvent.click(screen.getByTestId('ai-u4-l02-check'))

    expect(onJudgment).toHaveBeenCalledTimes(1)
    const reported = onJudgment.mock.calls[0][0] as JudgmentResult
    expect(reported.passed).toBe(false)
    expect(reported.conclusion).toBe('结论：未合格。')
    expect(screen.getByTestId('ai-u4-l02-verdict')).toHaveTextContent('未合格')
  })

  it('reports null when a classification is changed after a check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    completeLesson()
    fireEvent.click(screen.getByTestId('ai-u4-l02-check'))
    expect(onJudgment).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('ai-u4-l02-explore-A1-stop'))
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
    expect(screen.queryByTestId('ai-u4-l02-verdict')).toBeNull()
  })

  it('reports null when a checklist item is edited after a check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    completeLesson()
    fireEvent.click(screen.getByTestId('ai-u4-l02-check'))
    expect(onJudgment).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByTestId('ai-u4-l02-checklist-0-item'), {
      target: { value: '改过的一句' },
    })
    expect(onJudgment).toHaveBeenCalledTimes(2)
    expect(onJudgment.mock.calls[1][0]).toBeNull()
    expect(screen.queryByTestId('ai-u4-l02-verdict')).toBeNull()
  })

  it('reports nothing before any check', () => {
    const onJudgment = vi.fn()
    renderSlot(onJudgment)
    classifyAllSix()
    expect(onJudgment).not.toHaveBeenCalled()
  })

  it('shows the anonymization reason after classifying P1 and the scope feedback after answering', () => {
    renderSlot()
    fireEvent.click(screen.getByTestId('ai-u4-l02-explore-P1-stop'))
    expect(screen.getByTestId('ai-u4-l02-explore-P1')).toHaveTextContent('匿名化')
    fireEvent.click(screen.getByTestId('ai-u4-l02-scope-B'))
    expect(screen.getByText('不对，再想想：不是过期、也不是格式问题，是两种同意互不通用。')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('ai-u4-l02-scope-A'))
    expect(screen.getByText('答对了：scope 分离，两种同意互不通用，须分别授予、分别撤销、分别记录。')).toBeInTheDocument()
  })

  it('renders a read-only preview when editable is false', () => {
    render(
      <L02EditorSlot
        lessonId="A1-U4-L02"
        initial={emptyDraft()}
        onChange={() => {}}
        editable={false}
      />,
    )
    expect(screen.getByTestId('ai-u4-l02-slot-readonly')).toBeInTheDocument()
    expect(screen.queryByTestId('ai-u4-l02-check')).toBeNull()
  })

  it('works with no onJudgment prop: checks run and the slot verdict shows', () => {
    renderSlot()
    completeLesson()
    fireEvent.click(screen.getByTestId('ai-u4-l02-check'))
    expect(screen.getByTestId('ai-u4-l02-verdict')).toHaveTextContent('合格')
  })
})
