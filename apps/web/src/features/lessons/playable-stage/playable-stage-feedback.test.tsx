import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { launchTemplates } from '@/content/curriculum/launch-lessons'
import { getStepJudgeOptions } from '../blockly/step-judge-options'
import { PlayableStage } from './playable-stage'

const forest = launchTemplates.find((template) => template.id === 'forest-meetup-stage')
const garden = launchTemplates.find((template) => template.id === 'garden-interaction-stage')

describe('PlayableStage failure feedback (TQ-008)', () => {
  it('shows the specific kid reason instead of the generic copy and reports the failure once', async () => {
    const onRunFailure = vi.fn()
    render(
      <PlayableStage
        blocks={[{ type: 'move_right' }]}
        onRunFailure={onRunFailure}
        onRunSuccess={vi.fn()}
        requiredBlocks={['when_start', 'move_right']}
        stepIndex={3}
        template={forest}
      />,
    )
    fireEvent.click(screen.getByTestId('run-code-button'))
    const reason = await screen.findByTestId('stage-run-reason')
    expect(reason).toHaveTextContent('小狐狸还没听到出发口令哦！把“开始时”放在最上面。')
    expect(screen.getByTestId('stage-run-error')).toHaveAttribute('data-failure-code', 'missing-start')
    expect(screen.getByTestId('lesson-playable-stage')).not.toHaveTextContent('需要和任务要求的积木一样')
    expect(onRunFailure).toHaveBeenCalledTimes(1)
    expect(onRunFailure).toHaveBeenCalledWith({ code: 'missing-start', message: expect.stringContaining('开始时') })
  })

  it('reports every failed run, even two in a row on the same program (drives hint escalation)', async () => {
    const onRunFailure = vi.fn()
    render(
      <PlayableStage
        blocks={[]}
        onRunFailure={onRunFailure}
        onRunSuccess={vi.fn()}
        requiredBlocks={['when_start']}
        stepIndex={0}
        template={forest}
      />,
    )
    fireEvent.click(screen.getByTestId('run-code-button'))
    await screen.findByTestId('stage-run-reason')
    fireEvent.click(screen.getByTestId('run-code-button'))
    fireEvent.click(screen.getByTestId('run-code-button'))
    await waitFor(() => expect(onRunFailure).toHaveBeenCalledTimes(3))
    expect(onRunFailure).toHaveBeenLastCalledWith({ code: 'empty', message: '舞台上还空空的～先放一块“开始时”吧！' })
  })

  it('explains a runnable wrong order after it plays out (say too early)', async () => {
    const onRunFailure = vi.fn()
    render(
      <PlayableStage
        blocks={[{ type: 'when_start' }, { type: 'say_line' }, { type: 'move_right' }]}
        onRunFailure={onRunFailure}
        onRunSuccess={vi.fn()}
        requiredBlocks={['when_start', 'move_right', 'say_line']}
        stepIndex={2}
        template={forest}
      />,
    )
    fireEvent.click(screen.getByTestId('run-code-button'))
    await waitFor(() => expect(screen.getByTestId('stage-run-reason')).toHaveTextContent('说话说早啦'), { timeout: 5000 })
    await waitFor(() => expect(onRunFailure).toHaveBeenCalledWith({ code: 'say-too-early', message: expect.stringContaining('小狐狸') }))
  })

  it('uses the lesson character name on the garden stage', async () => {
    render(
      <PlayableStage
        blocks={[{ type: 'move_right' }]}
        onRunSuccess={vi.fn()}
        requiredBlocks={['when_clicked', 'move_right']}
        stepIndex={1}
        template={garden}
      />,
    )
    fireEvent.click(screen.getByTestId('garden-predict-click'))
    fireEvent.click(screen.getByTestId('run-code-button'))
    expect(await screen.findByTestId('stage-run-reason')).toHaveTextContent('小蝴蝶还没听到出发口令哦！把“被点击时”放在最上面。')
  })

  it('lesson-02: the chosen preset line is what the fox says, and it passes', async () => {
    const onRunSuccess = vi.fn()
    render(
      <PlayableStage
        blocks={[{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line: 'lets-play' }]}
        judgeOptions={getStepJudgeOptions('lesson-02-forest-greeting', 'step-2')}
        onRunSuccess={onRunSuccess}
        requiredBlocks={['when_start', 'move_right', 'say_line']}
        stepIndex={4}
        template={forest}
      />,
    )
    fireEvent.click(screen.getByTestId('run-code-button'))
    await waitFor(() => expect(onRunSuccess).toHaveBeenCalled(), { timeout: 5000 })
    expect(screen.getByTestId('stage-character-main')).toHaveTextContent('一起来玩吧！')
    expect(screen.queryByTestId('stage-run-error')).toBeNull()
  })
})
