import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { launchTemplates } from '@/content/curriculum/launch-lessons'
import { PlayableStage } from './playable-stage'

/** UX-204: the classroom stage must show what actually happened — clicks, moves,
 *  speech, repeats, both actors — and reset / untriggered states must read true. */
const forest = launchTemplates.find((template) => template.id === 'forest-meetup-stage')

function renderStage(blocks: Array<{ type: string }>, requiredBlocks: string[]) {
  render(
    <PlayableStage
      blocks={blocks}
      template={forest}
      requiredBlocks={requiredBlocks}
      stepIndex={0}
      onRunSuccess={vi.fn()}
      onRunFailure={vi.fn()}
    />,
  )
}

describe('PlayableStage observable feedback (UX-204)', () => {
  it('move: main steps, friend at rest, and the run log line are all visible', async () => {
    renderStage(
      [{ type: 'when_start' }, { type: 'move_right' }],
      ['when_start', 'move_right'],
    )
    fireEvent.click(screen.getByTestId('run-code-button'))
    await waitFor(() => expect(screen.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100'))
    expect(screen.getByTestId('stage-walked-distance')).toHaveTextContent('小狐狸已走 100 步')
    expect(screen.getByTestId('stage-character-friend')).toHaveAttribute('data-steps', '0')
    expect(screen.getByTestId('stage-friend-distance')).toHaveTextContent('小兔子已走 0 步')
    expect(screen.getByTestId('stage-friend-action')).toHaveTextContent('等待指令')
    expect(screen.getByTestId('stage-action-log')).toHaveTextContent('向右走 100 步')
  })

  it('repeat: the repeat shows as its own log line, not just a bigger step total', async () => {
    renderStage(
      [{ type: 'when_start' }, { type: 'move_right' }, { type: 'repeat_twice' }],
      ['when_start', 'move_right', 'repeat_twice'],
    )
    fireEvent.click(screen.getByTestId('run-code-button'))
    // Two blocks after the hat take ~1.4s of executor waits: past the 1s default.
    await waitFor(() => expect(screen.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '200'), { timeout: 5000 })
    const log = screen.getByTestId('stage-action-log')
    expect(log).toHaveTextContent('向右走 100 步')
    expect(log).toHaveTextContent('再走 100 步（重复）')
  })

  it('speech: the spoken line shows as a bubble and in the run log', async () => {
    renderStage(
      [{ type: 'when_start' }, { type: 'say_line' }],
      ['when_start', 'say_line'],
    )
    fireEvent.click(screen.getByTestId('run-code-button'))
    await waitFor(() => expect(document.querySelector('.kc-stage-speech')).toHaveTextContent('你好！'))
    expect(screen.getByTestId('stage-action-log')).toHaveTextContent('说：你好！')
  })

  it('scene switch: the scene chip and the log both move to the meadow', async () => {
    renderStage(
      [{ type: 'when_start' }, { type: 'move_right' }, { type: 'switch_scene' }],
      ['when_start', 'move_right', 'switch_scene'],
    )
    fireEvent.click(screen.getByTestId('run-code-button'))
    await waitFor(() => expect(screen.getByTestId('stage-current-scene')).toHaveTextContent('草地'), { timeout: 5000 })
    expect(screen.getByTestId('stage-action-log')).toHaveTextContent('切换场景到草地')
  })

  it('running is not idle: the status text changes while the program runs', () => {
    renderStage(
      [{ type: 'when_start' }, { type: 'move_right' }],
      ['when_start', 'move_right'],
    )
    fireEvent.click(screen.getByTestId('run-code-button'))
    expect(screen.getByText('运行中，看看角色怎么做。')).toBeInTheDocument()
  })

  it('click untriggered: arming shows await-click and never counts as success', async () => {
    renderStage(
      [{ type: 'when_clicked' }, { type: 'move_right' }],
      ['when_clicked', 'move_right'],
    )
    // The run button stays disabled until the click prediction is made.
    fireEvent.click(screen.getByTestId('garden-predict-click'))
    fireEvent.click(screen.getByTestId('run-code-button'))
    await waitFor(() => expect(screen.getByTestId('garden-await-click')).toBeInTheDocument())
    expect(screen.queryByText(/运行成功/)).toBeNull()
    expect(screen.getByTestId('run-code-button')).toHaveTextContent('等待点击蝴蝶…')
  })

  it('reset: every observed state returns to its pre-run value', async () => {
    renderStage(
      [{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line' }],
      ['when_start', 'move_right', 'say_line'],
    )
    fireEvent.click(screen.getByTestId('run-code-button'))
    // Wait for the run to finish: the reset button is disabled while running.
    await waitFor(() => expect(screen.getByText(/运行成功/)).toBeInTheDocument(), { timeout: 5000 })
    expect(screen.getByTestId('stage-action-log')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('reset-code-button'))
    expect(screen.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '0')
    expect(screen.getByTestId('stage-current-scene')).toHaveTextContent('森林')
    expect(document.querySelector('.kc-stage-speech')).toBeNull()
    expect(screen.queryByTestId('stage-action-log')).toBeNull()
    expect(screen.getByTestId('run-code-button')).toHaveTextContent('▶ 运行')
    expect(screen.getByText(/准备就绪/)).toBeInTheDocument()
  })
})
