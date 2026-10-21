import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { launchLessons, launchTemplates } from '@/content/curriculum/launch-lessons'
import { getPracticeStep, type PracticeStepDesign } from '@/content/curriculum/practice-steps'
import type { ProgramBlock } from '../blockly/observable-run'
import { PlayableStage } from './playable-stage'

/** TQ-011: the second-practice panel on the lessons 01–09 stage. */
const template = (id: string) => launchTemplates.find((item) => item.id === id)
const forest = template('forest-meetup-stage')
const meadow = template('meadow-journey-stage')
const garden = template('garden-interaction-stage')
const l01 = getPracticeStep('lesson-01-forest-hello', 'step-3')!
const l06 = getPracticeStep('lesson-06-meadow-story', 'step-3')!
const l08 = getPracticeStep('lesson-08-garden-dialogue', 'step-3')!
const required = (lessonId: string, stepId: string) => launchLessons.find((lesson) => lesson.id === lessonId)!.steps.find((step) => step.id === stepId)!.requiredBlockTypes
const b = (...types: string[]): ProgramBlock[] => types.map((type) => ({ type }))

/** Holds the answer like the classroom page does. */
function Harness({ design, blocks, stepTemplate, onRunSuccess = vi.fn(), askClickPrediction }: {
  design: PracticeStepDesign
  blocks: ProgramBlock[]
  stepTemplate: typeof forest
  onRunSuccess?: () => void
  askClickPrediction?: boolean
}) {
  const [answer, setAnswer] = useState<string | null>(null)
  return (
    <PlayableStage blocks={blocks} practice={design} practiceAnswer={answer} onPracticeAnswer={setAnswer}
      onRunSuccess={onRunSuccess} requiredBlocks={required(design.lessonId, design.stepId)} stepIndex={design.stepIndex}
      template={stepTemplate} askClickPrediction={askClickPrediction} />
  )
}

describe('PlayableStage second practice (TQ-011)', () => {
  it('predict (L01): the guess comes first, then the run shows the real stop at 200 steps beside the rabbit', async () => {
    render(<Harness design={l01} blocks={b('when_start', 'move_right', 'move_right')} stepTemplate={forest} />)
    const panel = screen.getByTestId('practice-task')
    expect(panel).toHaveAttribute('data-goal-type', 'change-distance')
    expect(panel).toHaveTextContent('新练习：走到小兔子身边')
    expect(screen.getByTestId('practice-question')).toHaveTextContent('先猜一猜：接两块“向右走 100 步”，小狐狸会停在哪里？')
    // No guess yet: the run button waits.
    expect(screen.getByTestId('practice-need-guess')).toBeInTheDocument()
    expect(screen.getByTestId('run-code-button')).toBeDisabled()
    fireEvent.click(screen.getByTestId('practice-answer-half-way'))
    expect(screen.getByTestId('practice-answer-half-way')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('practice-answer-reply')).toHaveTextContent('猜好啦')
    expect(screen.queryByTestId('practice-need-guess')).toBeNull()
    fireEvent.click(screen.getByTestId('run-code-button'))
    expect(await screen.findByTestId('practice-done', {}, { timeout: 5000 })).toHaveTextContent('小狐狸走了 200 步')
    // The honest result for the wrong guess, in the stage's own words.
    expect(screen.getByTestId('practice-answer-reply')).toHaveTextContent('小狐狸已走 200 步')
    expect(screen.getByTestId('stage-walked-distance')).toHaveTextContent('小狐狸已走 200 步')
    expect(screen.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '200')
    expect(screen.getByTestId('lesson-playable-stage')).toHaveTextContent('点击“完成这一关”继续')
    // The guess is locked once the result is shown.
    expect(screen.getByTestId('practice-answer-beside-friend')).toBeDisabled()
  })

  it('predict (L01): a program that stops short is a real failed run with the specific reason', async () => {
    render(<Harness design={l01} blocks={b('when_start', 'move_right')} stepTemplate={forest} />)
    fireEvent.click(screen.getByTestId('practice-answer-beside-friend'))
    fireEvent.click(screen.getByTestId('run-code-button'))
    expect(await screen.findByTestId('stage-run-reason', {}, { timeout: 5000 })).toHaveTextContent('小狐狸只走了 100 步，要走 200 步哦')
    expect(screen.queryByTestId('practice-done')).toBeNull()
  })

  it('compare (L06): the question appears after the run; only the right comparison completes the step', async () => {
    const onRunSuccess = vi.fn()
    render(<Harness design={l06} blocks={b('when_start', 'move_right', 'say_line', 'switch_scene', 'repeat_twice')} stepTemplate={meadow} onRunSuccess={onRunSuccess} />)
    expect(screen.getByTestId('practice-task')).toHaveAttribute('data-goal-type', 'compare-orders')
    expect(screen.queryByTestId('practice-question')).toBeNull()
    expect(screen.getByTestId('run-code-button')).toBeEnabled()
    fireEvent.click(screen.getByTestId('run-code-button'))
    // Spoken in the forest: the fox says the forest line while the stage is still the forest …
    await waitFor(() => expect(screen.getByTestId('stage-character-main')).toHaveTextContent('你好！'), { timeout: 4000, interval: 20 })
    expect(screen.getByTestId('stage-current-scene')).toHaveTextContent('森林')
    await waitFor(() => expect(onRunSuccess).toHaveBeenCalled(), { timeout: 6000 })
    // … and the story ends in the meadow without the old forest bubble (TQ-011).
    expect(screen.getByTestId('stage-current-scene')).toHaveTextContent('草地')
    expect(screen.getByTestId('stage-character-main')).not.toHaveTextContent('你好！')
    expect(screen.getByTestId('practice-question')).toHaveTextContent('比一比：和上一关比，小狐狸说的话一样吗？')
    expect(screen.getByTestId('practice-need-answer')).toHaveTextContent('运行成功了！先回答上面的问题')
    fireEvent.click(screen.getByTestId('practice-answer-same-line'))
    expect(screen.getByTestId('practice-answer-reply')).toHaveTextContent('再看看舞台')
    expect(screen.queryByTestId('practice-done')).toBeNull()
    fireEvent.click(screen.getByTestId('practice-answer-different-line'))
    expect(screen.getByTestId('practice-answer-reply')).toHaveTextContent('对！')
    expect(screen.getByTestId('practice-done')).toHaveTextContent('同一块“说一句话”')
    expect(screen.getByTestId('lesson-playable-stage')).toHaveTextContent('点击“完成这一关”继续')
  })

  it('compare-events (L08): with “开始时” the butterfly flies and says “你好！” without any click', async () => {
    const onRunSuccess = vi.fn()
    render(<Harness design={l08} blocks={b('when_start', 'move_right', 'say_line')} stepTemplate={garden} onRunSuccess={onRunSuccess} />)
    expect(screen.getByTestId('practice-task')).toHaveAttribute('data-goal-type', 'compare-events')
    // This step starts with “开始时”: a plain run button, no click prediction.
    expect(screen.queryByTestId('garden-prediction')).toBeNull()
    expect(screen.getByTestId('run-code-button')).toHaveTextContent('▶ 运行')
    fireEvent.click(screen.getByTestId('run-code-button'))
    await waitFor(() => expect(onRunSuccess).toHaveBeenCalled(), { timeout: 5000 })
    expect(screen.getByTestId('stage-walked-distance')).toHaveTextContent('小蝴蝶已飞 100 步')
    expect(screen.getByTestId('stage-character-main')).toHaveTextContent('你好！')
    fireEvent.click(screen.getByTestId('practice-answer-no-wait'))
    expect(screen.getByTestId('practice-done')).toBeInTheDocument()
  })

  it('compare-events (L08): keeping “被点击时” still waits for a click, then explains the start event', async () => {
    render(<Harness design={l08} blocks={b('when_clicked', 'move_right', 'say_line')} stepTemplate={garden} />)
    fireEvent.click(screen.getByTestId('run-code-button'))
    expect(await screen.findByTestId('garden-await-click')).toBeInTheDocument()
    const butterfly = screen.getByTestId('stage-character-main')
    expect(butterfly).toBeEnabled()
    fireEvent.click(butterfly)
    expect(await screen.findByTestId('stage-run-reason', {}, { timeout: 5000 })).toHaveTextContent('这次一按“运行”就要开始，换成“开始时”开头吧！')
    expect(screen.queryByTestId('practice-done')).toBeNull()
  })

  it('a click step without the click prediction (07–09 after lesson 07) starts right away', () => {
    render(
      <PlayableStage blocks={b('when_clicked', 'move_right')} onRunSuccess={vi.fn()} requiredBlocks={['when_clicked', 'move_right']}
        stepIndex={0} template={garden} askClickPrediction={false} />,
    )
    expect(screen.queryByTestId('garden-prediction')).toBeNull()
    expect(screen.getByTestId('run-code-button')).toBeEnabled()
    expect(screen.getByTestId('run-code-button')).toHaveTextContent('▶ 启动点击程序')
  })
})
