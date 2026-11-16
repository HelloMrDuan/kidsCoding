import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { launchLessons, launchTemplates } from '@/content/curriculum/launch-lessons'
import { getMistakeStep } from '@/content/curriculum/mistake-steps'
import { getPracticeStep } from '@/content/curriculum/practice-steps'
import { PlayableStage, type PlayableStageExternalState } from './playable-stage'

/**
 * OPS-041: PlayableStage external 模式（studio 路由专用）——舞台只渲染
 * 适配器的执行快照，不跑自己的执行器、不渲染运行/重置按钮、不回调
 * onRunSuccess / onRunFailure（适配器经外壳上报判定）。默认 internal
 * 模式不受影响（由既有 114 个测试覆盖）。
 */
const forest = launchTemplates.find((template) => template.id === 'forest-meetup-stage')
const l01 = launchLessons[0]
const mistake = getMistakeStep('lesson-01-forest-hello', 'step-4')!
const practice = getPracticeStep('lesson-01-forest-hello', 'step-3')!

function externalState(overrides: Partial<PlayableStageExternalState> = {}): PlayableStageExternalState {
  return {
    executionState: 'idle',
    characterPosition: 0,
    message: '',
    actionLog: [],
    frameIndex: 0,
    designedMistake: false,
    ...overrides,
  }
}

describe('PlayableStage external mode (OPS-041)', () => {
  it('hides the internal run/reset buttons and renders the adapter snapshot', () => {
    render(
      <PlayableStage
        blocks={[{ type: 'when_start' }, { type: 'move_right' }, { type: 'move_right' }]}
        onRunSuccess={vi.fn()}
        requiredBlocks={l01.steps[2].requiredBlockTypes}
        runControls="external"
        externalState={externalState({ executionState: 'success', characterPosition: 200, actionLog: ['向右走 100 步', '向右走 100 步'], frameIndex: 2 })}
        stepIndex={2}
        template={forest}
      />,
    )
    expect(screen.queryByTestId('run-code-button')).toBeNull()
    expect(screen.queryByTestId('reset-code-button')).toBeNull()
    expect(screen.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '200')
    expect(screen.getByTestId('stage-walked-distance')).toHaveTextContent('小狐狸已走 200 步')
    expect(screen.getByTestId('stage-character-friend')).toHaveAttribute('data-steps', '0')
    expect(screen.getByTestId('stage-action-log')).toHaveTextContent('向右走 100 步')
    expect(screen.getByTestId('lesson-playable-stage')).toHaveTextContent('运行成功')
  })

  it('never calls onRunSuccess / onRunFailure from an external snapshot', () => {
    const onRunSuccess = vi.fn()
    const onRunFailure = vi.fn()
    const { rerender } = render(
      <PlayableStage
        blocks={[{ type: 'when_start' }, { type: 'move_right' }]}
        onRunFailure={onRunFailure}
        onRunSuccess={onRunSuccess}
        requiredBlocks={l01.steps[1].requiredBlockTypes}
        runControls="external"
        externalState={externalState({ executionState: 'idle' })}
        stepIndex={1}
        template={forest}
      />,
    )
    rerender(
      <PlayableStage
        blocks={[{ type: 'when_start' }, { type: 'move_right' }]}
        onRunFailure={onRunFailure}
        onRunSuccess={onRunSuccess}
        requiredBlocks={l01.steps[1].requiredBlockTypes}
        runControls="external"
        externalState={externalState({ executionState: 'success', characterPosition: 100, frameIndex: 1 })}
        stepIndex={1}
        template={forest}
      />,
    )
    expect(onRunSuccess).not.toHaveBeenCalled()
    expect(onRunFailure).not.toHaveBeenCalled()
  })

  it('external designed-mistake run shows the neutral experiment note, not the failure box', () => {
    render(
      <PlayableStage
        blocks={mistake.wrongProgram}
        mistake={mistake}
        onRunSuccess={vi.fn()}
        requiredBlocks={l01.steps[3].requiredBlockTypes}
        runControls="external"
        externalState={externalState({ executionState: 'error', designedMistake: true })}
        stepIndex={3}
        template={forest}
      />,
    )
    expect(screen.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code', 'missing-start')
    expect(screen.getByTestId('mistake-run-result')).toHaveTextContent('这就是错误程序运行的样子')
    expect(screen.queryByTestId('stage-run-error')).toBeNull()
    expect(screen.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '0')
  })

  it('external real failure (observed mistake re-run) shows the failure box with the same judge reason', () => {
    render(
      <PlayableStage
        blocks={mistake.wrongProgram}
        mistake={mistake}
        mistakeObserved
        onRunSuccess={vi.fn()}
        requiredBlocks={l01.steps[3].requiredBlockTypes}
        runControls="external"
        externalState={externalState({ executionState: 'error', designedMistake: false })}
        stepIndex={3}
        template={forest}
      />,
    )
    expect(screen.getByTestId('stage-run-error')).toHaveTextContent('哎呀')
    expect(screen.getByTestId('stage-run-reason')).toHaveTextContent('开始')
    expect(screen.queryByTestId('mistake-run-result')).toBeNull()
  })

  it('external practice panel shows the prediction question and the guess nudge', () => {
    render(
      <PlayableStage
        blocks={[{ type: 'when_start' }, { type: 'move_right' }]}
        onRunSuccess={vi.fn()}
        practice={practice}
        requiredBlocks={l01.steps[2].requiredBlockTypes}
        runControls="external"
        externalState={externalState({ executionState: 'idle' })}
        stepIndex={2}
        template={forest}
      />,
    )
    expect(screen.getByTestId('practice-question')).toHaveTextContent('先猜一猜')
    expect(screen.getByTestId('practice-need-guess')).toHaveTextContent('先选一个你的猜测')
  })

  it('internal mode still renders its own run button (default unchanged)', () => {
    render(
      <PlayableStage
        blocks={[{ type: 'when_start' }]}
        onRunSuccess={vi.fn()}
        requiredBlocks={l01.steps[0].requiredBlockTypes}
        stepIndex={0}
        template={forest}
      />,
    )
    expect(screen.getByTestId('run-code-button')).toBeInTheDocument()
    expect(screen.getByTestId('reset-code-button')).toBeInTheDocument()
  })
})
