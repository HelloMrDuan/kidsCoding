import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { launchLessons, launchTemplates } from '@/content/curriculum/launch-lessons'
import { PlayableStage, type PlayableStageExternalState } from './playable-stage'

/**
 * OPS-056: PlayableStage external 模式的可选扩展字段（armed / scene / 伙伴 /
 * 当前角色 / 本帧动作 / onExternalCharacterClick）。不传这些字段时与
 * OPS-041 完全一致（由 playable-stage-external.test.tsx 覆盖）。
 */
const garden = launchTemplates.find((template) => template.id === 'garden-interaction-stage')
const meadow = launchTemplates.find((template) => template.id === 'meadow-journey-stage')
const duo = launchTemplates.find((template) => template.id === 'forest-graduation-show')
const lesson = (id: string) => launchLessons.find((item) => item.id === id)!

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

describe('PlayableStage external mode extensions (OPS-056)', () => {
  it('armed: clicking the main character calls onExternalCharacterClick only', () => {
    const onClick = vi.fn()
    render(
      <PlayableStage
        blocks={[{ type: 'when_clicked' }, { type: 'move_right' }]}
        onRunSuccess={vi.fn()}
        requiredBlocks={lesson('lesson-07-garden-click').steps[1].requiredBlockTypes}
        runControls="external"
        externalState={externalState({ executionState: 'armed' })}
        onExternalCharacterClick={onClick}
        askClickPrediction={false}
        stepIndex={1}
        template={garden}
      />,
    )
    expect(screen.getByTestId('garden-await-click')).toBeInTheDocument()
    const main = screen.getByTestId('stage-character-main')
    expect(main).not.toBeDisabled()
    fireEvent.click(main)
    expect(onClick).toHaveBeenCalledTimes(1)
    // 外部快照未变：舞台不会自己执行（仍为 0 步、无动作日志）。
    expect(main).toHaveAttribute('data-steps', '0')
    expect(screen.queryByTestId('stage-action-log')).toBeNull()
  })

  it('not armed: the main character stays disabled and never calls back', () => {
    const onClick = vi.fn()
    render(
      <PlayableStage
        blocks={[{ type: 'when_clicked' }, { type: 'move_right' }]}
        onRunSuccess={vi.fn()}
        requiredBlocks={lesson('lesson-07-garden-click').steps[1].requiredBlockTypes}
        runControls="external"
        externalState={externalState({ executionState: 'idle' })}
        onExternalCharacterClick={onClick}
        askClickPrediction={false}
        stepIndex={1}
        template={garden}
      />,
    )
    const main = screen.getByTestId('stage-character-main')
    expect(main).toBeDisabled()
    fireEvent.click(main)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders the adapter scene (meadow after switch_scene)', () => {
    render(
      <PlayableStage
        blocks={[{ type: 'when_start' }, { type: 'move_right' }, { type: 'switch_scene' }]}
        onRunSuccess={vi.fn()}
        requiredBlocks={lesson('lesson-04-meadow-scene').steps[1].requiredBlockTypes}
        runControls="external"
        externalState={externalState({ executionState: 'success', characterPosition: 100, scene: 'meadow', actionLog: ['向右走 100 步', '切换场景到草地'] })}
        stepIndex={1}
        template={meadow}
      />,
    )
    expect(screen.getByTestId('stage-current-scene')).toHaveTextContent('草地')
  })

  it('defaults to the forest scene when the snapshot carries no scene', () => {
    render(
      <PlayableStage
        blocks={[{ type: 'when_start' }, { type: 'move_right' }]}
        onRunSuccess={vi.fn()}
        requiredBlocks={lesson('lesson-04-meadow-scene').steps[0].requiredBlockTypes}
        runControls="external"
        externalState={externalState({ executionState: 'success', characterPosition: 100 })}
        stepIndex={0}
        template={meadow}
      />,
    )
    expect(screen.getByTestId('stage-current-scene')).toHaveTextContent('森林')
  })

  it('renders partner position, partner bubble and the active actor', () => {
    render(
      <PlayableStage
        blocks={[{ type: 'when_start' }, { type: 'move_right' }, { type: 'switch_character' }, { type: 'move_right' }, { type: 'say_line' }]}
        onRunSuccess={vi.fn()}
        requiredBlocks={lesson('lesson-11-duo-rehearsal').steps[2].requiredBlockTypes}
        runControls="external"
        externalState={externalState({
          executionState: 'success',
          characterPosition: 100,
          partnerPosition: 100,
          partnerMessage: '我们一起出发吧！',
          activeActor: 'partner',
          partnerAction: 'speaking',
        })}
        stepIndex={2}
        template={duo}
      />,
    )
    expect(screen.getByTestId('lesson-playable-stage')).toHaveAttribute('data-active-actor', 'partner')
    expect(screen.getByTestId('stage-character-friend')).toHaveAttribute('data-steps', '100')
    expect(screen.getByTestId('stage-friend-distance')).toHaveTextContent('100 步')
    expect(screen.getByTestId('lesson-playable-stage')).toHaveTextContent('我们一起出发吧！')
  })
})

describe('PlayableStage garden click prediction: controlled vs uncontrolled (OPS-056)', () => {
  it('uncontrolled (no clickPrediction prop): keeps its own state as before', () => {
    render(
      <PlayableStage
        blocks={[{ type: 'when_clicked' }, { type: 'move_right' }]}
        onRunSuccess={vi.fn()}
        requiredBlocks={lesson('lesson-07-garden-click').steps[1].requiredBlockTypes}
        runControls="external"
        externalState={externalState()}
        askClickPrediction
        stepIndex={1}
        template={garden}
      />,
    )
    fireEvent.click(screen.getByTestId('garden-predict-auto'))
    expect(screen.getByTestId('garden-predict-auto')).toHaveAttribute('aria-pressed', 'true')
  })

  it('controlled: reports the guess and renders only the value it is given', () => {
    const onClickPrediction = vi.fn()
    const { rerender } = render(
      <PlayableStage
        blocks={[{ type: 'when_clicked' }, { type: 'move_right' }]}
        onRunSuccess={vi.fn()}
        requiredBlocks={lesson('lesson-07-garden-click').steps[1].requiredBlockTypes}
        runControls="external"
        externalState={externalState()}
        askClickPrediction
        stepIndex={1}
        template={garden}
        clickPrediction={null}
        onClickPrediction={onClickPrediction}
      />,
    )
    fireEvent.click(screen.getByTestId('garden-predict-click'))
    expect(onClickPrediction).toHaveBeenCalledWith('needs-click')
    expect(screen.getByTestId('garden-predict-click')).toHaveAttribute('aria-pressed', 'false')
    rerender(
      <PlayableStage
        blocks={[{ type: 'when_clicked' }, { type: 'move_right' }]}
        onRunSuccess={vi.fn()}
        requiredBlocks={lesson('lesson-07-garden-click').steps[1].requiredBlockTypes}
        runControls="external"
        externalState={externalState()}
        askClickPrediction
        stepIndex={1}
        template={garden}
        clickPrediction="needs-click"
        onClickPrediction={onClickPrediction}
      />,
    )
    expect(screen.getByTestId('garden-predict-click')).toHaveAttribute('aria-pressed', 'true')
  })
})
