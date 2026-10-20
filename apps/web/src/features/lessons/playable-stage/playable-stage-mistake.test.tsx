import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { launchLessons, launchTemplates } from '@/content/curriculum/launch-lessons'
import { getMistakeStep } from '@/content/curriculum/mistake-steps'
import { PlayableStage } from './playable-stage'

/** TQ-010: the designed mistake → observe → fix panel on the lessons 01–09 stage. */
const forest = launchTemplates.find((template) => template.id === 'forest-meetup-stage')
const garden = launchTemplates.find((template) => template.id === 'garden-interaction-stage')
const l01 = getMistakeStep('lesson-01-forest-hello', 'step-5')!
const l07 = getMistakeStep('lesson-07-garden-click', 'step-3')!
const l01Step = launchLessons[0].steps[4]
const l07Step = launchLessons[6].steps[2]

describe('PlayableStage designed mistake step (TQ-010)', () => {
  it('L01: the wrong program (no “开始时”) leaves the fox at 0 steps and reports the designed failure', async () => {
    const onRunFailure = vi.fn()
    render(
      <PlayableStage blocks={l01.wrongProgram} mistake={l01} onReloadMistake={vi.fn()} onRunFailure={onRunFailure}
        onRunSuccess={vi.fn()} requiredBlocks={l01Step.requiredBlockTypes} stepIndex={4} template={forest} />,
    )
    expect(screen.getByTestId('mistake-task')).toHaveTextContent('纠错实验：少了“开始时”')
    expect(screen.getByTestId('mistake-setup')).toHaveTextContent('只有“向右走 100 步”')
    expect(screen.queryByTestId('mistake-question')).toBeNull()
    fireEvent.click(screen.getByTestId('run-code-button'))
    expect(await screen.findByTestId('stage-run-error')).toHaveAttribute('data-failure-code', 'missing-start')
    expect(screen.getByTestId('stage-run-error')).toHaveTextContent('出错啦！看看舞台上发生了什么。')
    expect(screen.getByTestId('stage-run-reason')).toHaveTextContent('小狐狸还没听到出发口令哦')
    expect(screen.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '0')
    expect(onRunFailure).toHaveBeenCalledWith({ code: 'missing-start', message: expect.any(String) })
  })

  it('after observing, asks what they saw; a wrong answer nudges, the right one shows how to fix', () => {
    const onMistakeAnswer = vi.fn()
    const { rerender } = render(
      <PlayableStage blocks={l01.wrongProgram} mistake={l01} mistakeObserved onMistakeAnswer={onMistakeAnswer}
        onRunSuccess={vi.fn()} requiredBlocks={l01Step.requiredBlockTypes} stepIndex={4} template={forest} />,
    )
    expect(screen.getByTestId('mistake-question')).toHaveTextContent('按了运行，小狐狸怎么了？')
    fireEvent.click(screen.getByTestId('mistake-answer-walked'))
    expect(onMistakeAnswer).toHaveBeenCalledWith('walked')
    rerender(
      <PlayableStage blocks={l01.wrongProgram} mistake={l01} mistakeObserved mistakeAnswer="walked" onMistakeAnswer={onMistakeAnswer}
        onRunSuccess={vi.fn()} requiredBlocks={l01Step.requiredBlockTypes} stepIndex={4} template={forest} />,
    )
    expect(screen.getByTestId('mistake-answer-reply')).toHaveTextContent('再看看舞台')
    expect(screen.queryByTestId('mistake-fix')).toBeNull()
    rerender(
      <PlayableStage blocks={l01.wrongProgram} mistake={l01} mistakeObserved mistakeAnswer="stayed" onMistakeAnswer={onMistakeAnswer}
        onRunSuccess={vi.fn()} requiredBlocks={l01Step.requiredBlockTypes} stepIndex={4} template={forest} />,
    )
    expect(screen.getByTestId('mistake-answer-stayed')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('mistake-fix')).toHaveTextContent('把“开始时”放到“向右走 100 步”上面')
  })

  it('the fixed program runs correctly and the panel confirms the fix', async () => {
    const onRunSuccess = vi.fn()
    render(
      <PlayableStage blocks={l01.fixedProgram} mistake={l01} mistakeObserved mistakeAnswer="stayed"
        onRunSuccess={onRunSuccess} requiredBlocks={l01Step.requiredBlockTypes} stepIndex={4} template={forest} />,
    )
    fireEvent.click(screen.getByTestId('run-code-button'))
    await waitFor(() => expect(onRunSuccess).toHaveBeenCalled(), { timeout: 5000 })
    expect(screen.getByTestId('mistake-fixed')).toHaveTextContent('修好啦')
    expect(screen.getByTestId('lesson-playable-stage')).toHaveTextContent('运行成功')
    expect(screen.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100')
  })

  it('a correct program without observing the mistake does not say “完成这一关” yet', async () => {
    const onReloadMistake = vi.fn()
    render(
      <PlayableStage blocks={l01.fixedProgram} mistake={l01} onReloadMistake={onReloadMistake}
        onRunSuccess={vi.fn()} requiredBlocks={l01Step.requiredBlockTypes} stepIndex={4} template={forest} />,
    )
    fireEvent.click(screen.getByTestId('run-code-button'))
    expect(await screen.findByTestId('mistake-need-observe', {}, { timeout: 5000 })).toHaveTextContent('再摆一次错误程序')
    expect(screen.getByTestId('lesson-playable-stage')).not.toHaveTextContent('点击“完成这一关”继续')
    fireEvent.click(screen.getByTestId('mistake-reload'))
    expect(onReloadMistake).toHaveBeenCalledTimes(1)
  })

  it('L07: “开始时” makes the butterfly fly 100 steps without any click, then explains the click trigger', async () => {
    const onRunFailure = vi.fn()
    render(
      <PlayableStage blocks={l07.wrongProgram} mistake={l07} onRunFailure={onRunFailure}
        onRunSuccess={vi.fn()} requiredBlocks={l07Step.requiredBlockTypes} stepIndex={2} template={garden} />,
    )
    fireEvent.click(screen.getByTestId('garden-predict-click'))
    fireEvent.click(screen.getByTestId('run-code-button'))
    expect(screen.queryByTestId('garden-await-click')).toBeNull()
    await waitFor(() => expect(screen.getByTestId('stage-run-error')).toHaveAttribute('data-failure-code', 'needs-click-trigger'), { timeout: 5000 })
    expect(screen.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100')
    expect(screen.getByTestId('stage-walked-distance')).toHaveTextContent('小蝴蝶已飞 100 步')
    expect(screen.getByTestId('stage-run-reason')).toHaveTextContent('换成“被点击时”开头')
    expect(onRunFailure).toHaveBeenCalledWith({ code: 'needs-click-trigger', message: expect.any(String) })
  })
})
