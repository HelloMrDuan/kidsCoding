import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { emptyStoryDraft } from './g1-u1-l02-draft'
import { buildTurnTakingJudgment, judgeTurnTakingProgram } from './g1-u1-l02-judging'
import { TurnTakingEditorSlot } from './g1-u1-l02-slot'
import type { EditorSlotProps } from '@/features/lessons/workspace/workspace-slots'

/**
 * 插槽单测：BlocklyWorkspace 在 jsdom 里无法 inject（见 route-adapter
 * 实例测试的同款说明），此处只 mock 编辑面本身——mock 按 props.blocks
 * 展示当前程序，并提供两个按钮模拟快照变化；判定、完成门控、复盘、
 * 错误实验流转等插槽逻辑保持真实。
 */
vi.mock('@/features/lessons/blockly/blockly-workspace', () => ({
  BlocklyWorkspace: ({
    blocks,
    onSnapshotChange,
  }: {
    blocks: unknown[]
    onSnapshotChange: (blocks: unknown[]) => void
  }) => (
    <div data-testid="mock-blockly" data-blocks={JSON.stringify(blocks)}>
      <button
        type="button"
        data-testid="mock-snapshot-pass"
        onClick={() =>
          onSnapshotChange([
            { type: 'when_start' },
            { type: 'say_line', line: 'hello' },
            { type: 'switch_character' },
            { type: 'say_line', line: 'glad' },
          ])
        }
      >
        模拟通过程序
      </button>
      <button
        type="button"
        data-testid="mock-snapshot-reversed"
        onClick={() =>
          onSnapshotChange([
            { type: 'when_start' },
            { type: 'switch_character' },
            { type: 'say_line', line: 'glad' },
            { type: 'switch_character' },
            { type: 'say_line', line: 'hello' },
          ])
        }
      >
        模拟顺序颠倒
      </button>
    </div>
  ),
}))

afterEach(() => {
  cleanup()
})

function fakeShell(overrides: Partial<EditorSlotProps['shell']> = {}): EditorSlotProps['shell'] {
  return {
    run: vi.fn(),
    stop: vi.fn(),
    save: vi.fn(),
    running: false,
    saveState: 'unsaved',
    judgment: null,
    ...overrides,
  }
}

function renderSlot(shell = fakeShell()) {
  const onChange = vi.fn()
  const utils = render(
    <TurnTakingEditorSlot lessonId="G1-U1-L02" initial={emptyStoryDraft()} onChange={onChange} editable shell={shell} />,
  )
  return { ...utils, onChange, shell }
}

const CORRECT = [
  { type: 'when_start' },
  { type: 'say_line', line: 'hello' },
  { type: 'switch_character' },
  { type: 'say_line', line: 'glad' },
]
const REVERSED = [
  { type: 'when_start' },
  { type: 'switch_character' },
  { type: 'say_line', line: 'glad' },
  { type: 'switch_character' },
  { type: 'say_line', line: 'hello' },
]

describe('TurnTakingEditorSlot (mocked Blockly surface)', () => {
  it('shows step 1 and completes thinking steps without a run', async () => {
    const { onChange } = renderSlot()
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('g1-u1-l02-step-progress')).toHaveTextContent('第 1 / 7 关')
    expect(screen.getByTestId('g1-u1-l02-step-title')).toHaveTextContent('引导：观察与预测')
    expect(screen.getByTestId('g1-u1-l02-predict-choice-0')).toHaveTextContent('狐狸先说“你好”，兔子再回应“很高兴见到你”')
    fireEvent.click(screen.getByTestId('g1-u1-l02-predict-choice-0'))
    expect(screen.getByTestId('g1-u1-l02-predict-choice-0')).toHaveAttribute('data-chosen', 'true')
    fireEvent.click(screen.getByTestId('g1-u1-l02-complete-step'))
    const last = onChange.mock.calls.at(-1)?.[0] as { stepIndex: number }
    expect(last.stepIndex).toBe(1)
    expect(screen.getByTestId('g1-u1-l02-step-title')).toHaveTextContent('设计：拆解与设计')
  })

  it('records a pass from the shell judgment and shows the run log', async () => {
    const onJudgment = vi.fn()
    const { onChange, rerender } = renderSlot()
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('g1-u1-l02-goto-build-turn-taking'))
    fireEvent.click(screen.getByTestId('mock-snapshot-pass'))
    const afterEdit = onChange.mock.calls.at(-1)?.[0] as { programs: Record<string, unknown[]> }
    expect(afterEdit.programs['build-turn-taking']).toHaveLength(4)
    const judgment = buildTurnTakingJudgment(judgeTurnTakingProgram(CORRECT))
    rerender(
      <TurnTakingEditorSlot
        lessonId="G1-U1-L02"
        initial={emptyStoryDraft()}
        onChange={onChange}
        editable
        onJudgment={onJudgment}
        shell={fakeShell({ judgment })}
      />,
    )
    const afterJudgment = onChange.mock.calls.at(-1)?.[0] as { passed: string[] }
    expect(afterJudgment.passed).toContain('build-turn-taking')
    // E1 实测竞态：persist 经外壳 onChange 会清掉正显示的判定，插槽须经
    // OPS-025 的 onJudgment 把同一判定对象原样再上报一次，外壳才留得住结论。
    expect(onJudgment).toHaveBeenCalledWith(judgment)
    expect(screen.getByTestId('g1-u1-l02-run-log')).toHaveTextContent('狐狸说：你好')
    expect(screen.getByTestId('g1-u1-l02-run-log')).toHaveTextContent('兔子说：很高兴见到你')
  })

  it('runs the error lab: reversed order is observed first, then the fix passes', async () => {
    const { onChange, rerender } = renderSlot()
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('g1-u1-l02-goto-error-lab'))
    expect(screen.getByTestId('g1-u1-l02-step-title')).toHaveTextContent('错误实验：边界与修复')
    fireEvent.click(screen.getByTestId('mock-snapshot-reversed'))
    const failJudgment = buildTurnTakingJudgment(judgeTurnTakingProgram(REVERSED))
    rerender(
      <TurnTakingEditorSlot
        lessonId="G1-U1-L02"
        initial={emptyStoryDraft()}
        onChange={onChange}
        editable
        shell={fakeShell({ judgment: failJudgment })}
      />,
    )
    const afterFail = onChange.mock.calls.at(-1)?.[0] as { observed: string[]; mistakes: string[] }
    expect(afterFail.observed).toContain('error-lab')
    expect(afterFail.mistakes).toContain('reversed_order')
    // Completing the error lab before observing is blocked; after observing,
    // a pass (not yet recorded) still blocks completion.
    fireEvent.click(screen.getByTestId('g1-u1-l02-complete-step'))
    expect(screen.getByTestId('g1-u1-l02-notice')).toHaveTextContent('先按“运行”')
    fireEvent.click(screen.getByTestId('mock-snapshot-pass'))
    const passJudgment = buildTurnTakingJudgment(judgeTurnTakingProgram(CORRECT))
    rerender(
      <TurnTakingEditorSlot
        lessonId="G1-U1-L02"
        initial={emptyStoryDraft()}
        onChange={onChange}
        editable
        shell={fakeShell({ judgment: passJudgment })}
      />,
    )
    const afterPass = onChange.mock.calls.at(-1)?.[0] as { passed: string[] }
    expect(afterPass.passed).toContain('error-lab')
  })

  it('review step records the reflection answer and finishes the lesson', async () => {
    const { onChange } = renderSlot()
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('g1-u1-l02-goto-review'))
    fireEvent.click(screen.getByTestId('g1-u1-l02-reflection-option-0'))
    expect(screen.getByTestId('g1-u1-l02-reflection-result')).toHaveAttribute('data-correct', 'true')
    const afterReflection = onChange.mock.calls.at(-1)?.[0] as { reflection?: number }
    expect(afterReflection.reflection).toBe(0)
    fireEvent.click(screen.getByTestId('g1-u1-l02-complete-step'))
    expect(await screen.findByTestId('g1-u1-l02-finished')).toHaveTextContent('只保存在本机')
    fireEvent.click(screen.getByTestId('g1-u1-l02-replay-build-turn-taking'))
    expect(screen.getByTestId('g1-u1-l02-step-title')).toHaveTextContent('搭建：编码与搭建')
  })

  it('rejects a foreign-lesson import on mount and echoes back a G1 draft', async () => {
    const onChange = vi.fn()
    render(
      <TurnTakingEditorSlot
        lessonId="G1-U1-L02"
        initial={{ version: 1, lessonId: 'G1-U1-L01', stepIndex: 0, programs: {}, passed: [], mistakes: [], observed: [] }}
        onChange={onChange}
        editable
        shell={fakeShell()}
      />,
    )
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('g1-u1-l02-notice')).toHaveTextContent('属于其他课节，已拒绝')
    expect(onChange).toHaveBeenCalled()
    const echoed = onChange.mock.calls.at(-1)?.[0] as { lessonId?: string; version?: number }
    expect(echoed.lessonId).toBe('G1-U1-L02')
    expect(echoed.version).toBe(1)
  })

  it('keeps only a compact step header above the canvas (Gate 1 layout lock)', async () => {
    // 画布 Gate 1（平板 ≥300px、手机 ≥220px）：画布上方只留一行紧凑步骤行，
    // 指导、预测、关间导航移到画布下方。DOM 顺序即渲染顺序，锁住它，
    // 防止后人把指导区搬回画布上方导致首屏画布不足。
    renderSlot()
    await screen.findByTestId('mock-blockly')
    const header = screen.getByTestId('g1-u1-l02-step-header')
    const canvas = screen.getByTestId('mock-blockly')
    const guide = screen.getByTestId('g1-u1-l02-step-guide')
    expect(header.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(canvas.compareDocumentPosition(guide) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(header).toContainElement(screen.getByTestId('g1-u1-l02-complete-step'))
    expect(guide).toContainElement(screen.getByTestId('g1-u1-l02-instruction'))
    expect(guide).toContainElement(screen.getByTestId('g1-u1-l02-goto-review'))
  })
})
