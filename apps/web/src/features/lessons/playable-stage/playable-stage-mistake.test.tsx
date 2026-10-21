import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { launchLessons, launchTemplates } from '@/content/curriculum/launch-lessons'
import { getMistakeStep } from '@/content/curriculum/mistake-steps'
import { PlayableStage } from './playable-stage'

/** TQ-010: the designed mistake → observe → fix panel on the lessons 01–09 stage. */
const forest = launchTemplates.find((template) => template.id === 'forest-meetup-stage')
const garden = launchTemplates.find((template) => template.id === 'garden-interaction-stage')
const l01 = getMistakeStep('lesson-01-forest-hello', 'step-4')!
const l07 = getMistakeStep('lesson-07-garden-click', 'step-4')!
const l01Step = launchLessons[0].steps[3]
const l07Step = launchLessons[6].steps[3]

describe('PlayableStage designed mistake step (TQ-010)', () => {
  it('L01: the wrong program (no “开始时”) leaves the fox at 0 steps and reports the designed failure', async () => {
    const onRunFailure = vi.fn()
    render(
      <PlayableStage blocks={l01.wrongProgram} mistake={l01} onReloadMistake={vi.fn()} onRunFailure={onRunFailure}
        onRunSuccess={vi.fn()} requiredBlocks={l01Step.requiredBlockTypes} stepIndex={3} template={forest} />,
    )
    expect(screen.getByTestId('mistake-task')).toHaveTextContent('纠错实验：少了“开始时”')
    expect(screen.getByTestId('mistake-setup')).toHaveTextContent('只有“向右走 100 步”')
    expect(screen.queryByTestId('mistake-question')).toBeNull()
    fireEvent.click(screen.getByTestId('run-code-button'))
    // The designed wrong run is the experiment: a neutral note, never the failure-style “哎呀” box.
    expect(await screen.findByTestId('mistake-run-result')).toHaveAttribute('data-failure-code', 'missing-start')
    expect(screen.getByTestId('mistake-run-result')).toHaveTextContent('这就是错误程序运行的样子')
    expect(screen.queryByTestId('stage-run-error')).toBeNull()
    expect(screen.getByTestId('lesson-playable-stage')).not.toHaveTextContent('哎呀')
    expect(screen.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '0')
    expect(onRunFailure).toHaveBeenCalledWith({ code: 'missing-start', message: expect.any(String), designedMistake: true })
  })

  it('after observing, asks what they saw; a wrong answer nudges, the right one shows how to fix', () => {
    const onMistakeAnswer = vi.fn()
    const { rerender } = render(
      <PlayableStage blocks={l01.wrongProgram} mistake={l01} mistakeObserved onMistakeAnswer={onMistakeAnswer}
        onRunSuccess={vi.fn()} requiredBlocks={l01Step.requiredBlockTypes} stepIndex={3} template={forest} />,
    )
    expect(screen.getByTestId('mistake-question')).toHaveTextContent('按了运行，小狐狸怎么了？')
    fireEvent.click(screen.getByTestId('mistake-answer-walked'))
    expect(onMistakeAnswer).toHaveBeenCalledWith('walked')
    rerender(
      <PlayableStage blocks={l01.wrongProgram} mistake={l01} mistakeObserved mistakeAnswer="walked" onMistakeAnswer={onMistakeAnswer}
        onRunSuccess={vi.fn()} requiredBlocks={l01Step.requiredBlockTypes} stepIndex={3} template={forest} />,
    )
    expect(screen.getByTestId('mistake-answer-reply')).toHaveTextContent('再看看舞台')
    expect(screen.queryByTestId('mistake-fix')).toBeNull()
    rerender(
      <PlayableStage blocks={l01.wrongProgram} mistake={l01} mistakeObserved mistakeAnswer="stayed" onMistakeAnswer={onMistakeAnswer}
        onRunSuccess={vi.fn()} requiredBlocks={l01Step.requiredBlockTypes} stepIndex={3} template={forest} />,
    )
    expect(screen.getByTestId('mistake-answer-stayed')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('mistake-fix')).toHaveTextContent('把“开始时”放到“向右走 100 步”上面')
  })

  it('the fixed program runs correctly and the panel confirms the fix', async () => {
    const onRunSuccess = vi.fn()
    render(
      <PlayableStage blocks={l01.fixedProgram} mistake={l01} mistakeObserved mistakeAnswer="stayed"
        onRunSuccess={onRunSuccess} requiredBlocks={l01Step.requiredBlockTypes} stepIndex={3} template={forest} />,
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
        onRunSuccess={vi.fn()} requiredBlocks={l01Step.requiredBlockTypes} stepIndex={3} template={forest} />,
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
        onRunSuccess={vi.fn()} requiredBlocks={l07Step.requiredBlockTypes} stepIndex={3} template={garden} />,
    )
    fireEvent.click(screen.getByTestId('garden-predict-click'))
    fireEvent.click(screen.getByTestId('run-code-button'))
    expect(screen.queryByTestId('garden-await-click')).toBeNull()
    await waitFor(() => expect(screen.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code', 'needs-click-trigger'), { timeout: 5000 })
    expect(screen.queryByTestId('stage-run-error')).toBeNull()
    expect(screen.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100')
    expect(screen.getByTestId('stage-walked-distance')).toHaveTextContent('小蝴蝶已飞 100 步')
    expect(onRunFailure).toHaveBeenCalledWith({ code: 'needs-click-trigger', message: expect.any(String), designedMistake: true })
  })

  it('after the right answer, the designed wrong run still shows no “哎呀” box (the child was right)', async () => {
    const props = { blocks: l01.wrongProgram, mistake: l01, onRunFailure: vi.fn(), onRunSuccess: vi.fn(),
      requiredBlocks: l01Step.requiredBlockTypes, stepIndex: 3, template: forest }
    const { rerender } = render(<PlayableStage {...props} />)
    fireEvent.click(screen.getByTestId('run-code-button'))
    expect(await screen.findByTestId('mistake-run-result')).toBeInTheDocument()
    rerender(<PlayableStage {...props} mistakeObserved mistakeAnswer="stayed" />)
    expect(screen.getByTestId('mistake-answer-reply')).toHaveTextContent('对！')
    expect(screen.getByTestId('mistake-run-result')).toHaveTextContent('你看懂啦')
    expect(screen.queryByTestId('stage-run-error')).toBeNull()
    expect(screen.getByTestId('lesson-playable-stage')).not.toHaveTextContent('哎呀')
  })

  it('after observing, running the wrong program again is a real failed run (normal feedback)', async () => {
    const onRunFailure = vi.fn()
    render(
      <PlayableStage blocks={l01.wrongProgram} mistake={l01} mistakeObserved mistakeAnswer="stayed" onRunFailure={onRunFailure}
        onRunSuccess={vi.fn()} requiredBlocks={l01Step.requiredBlockTypes} stepIndex={3} template={forest} />,
    )
    fireEvent.click(screen.getByTestId('run-code-button'))
    expect(await screen.findByTestId('stage-run-error')).toHaveTextContent('哎呀，差一点点！')
    expect(screen.queryByTestId('mistake-run-result')).toBeNull()
    expect(onRunFailure).toHaveBeenCalledWith(expect.objectContaining({ designedMistake: false }))
  })

  it('a later real failed run (not the designed program) gets the normal failure feedback', async () => {
    const onRunFailure = vi.fn()
    render(
      <PlayableStage blocks={[{ type: 'move_right' }, { type: 'move_right' }]} mistake={l01} mistakeObserved mistakeAnswer="stayed"
        onRunFailure={onRunFailure} onRunSuccess={vi.fn()} requiredBlocks={l01Step.requiredBlockTypes} stepIndex={3} template={forest} />,
    )
    fireEvent.click(screen.getByTestId('run-code-button'))
    expect(await screen.findByTestId('stage-run-error')).toHaveAttribute('data-failure-code', 'missing-start')
    expect(screen.getByTestId('stage-run-error')).toHaveTextContent('哎呀，差一点点！')
    expect(screen.getByTestId('stage-run-reason')).toHaveTextContent('小狐狸还没听到出发口令哦')
    expect(screen.queryByTestId('mistake-run-result')).toBeNull()
    expect(onRunFailure).toHaveBeenCalledWith(expect.objectContaining({ code: 'missing-start', designedMistake: false }))
  })

  it('both reset-style buttons use the same decorative SVG icon, not the “↺” glyph', () => {
    render(
      <PlayableStage blocks={l01.wrongProgram} mistake={l01} onReloadMistake={vi.fn()}
        onRunSuccess={vi.fn()} requiredBlocks={l01Step.requiredBlockTypes} stepIndex={3} template={forest} />,
    )
    for (const id of ['mistake-reload', 'reset-code-button']) {
      const button = screen.getByTestId(id)
      expect(button).not.toHaveTextContent('↺')
      const icon = button.querySelector('svg[data-testid="reset-icon"]')
      expect(icon).not.toBeNull()
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    }
    expect(screen.getByRole('button', { name: '再摆一次错误程序' })).toBe(screen.getByTestId('mistake-reload'))
    expect(screen.getByRole('button', { name: '重置' })).toBe(screen.getByTestId('reset-code-button'))
  })

  it('L07: after the fix, the guess made about the wrong “开始时” program is not graded as wrong', async () => {
    const onRunSuccess = vi.fn()
    render(
      <PlayableStage blocks={l07.fixedProgram} mistake={l07} mistakeObserved mistakeAnswer="flew-alone"
        onRunSuccess={onRunSuccess} requiredBlocks={l07Step.requiredBlockTypes} stepIndex={3} template={garden} />,
    )
    fireEvent.click(screen.getByTestId('garden-predict-auto'))
    fireEvent.click(screen.getByTestId('run-code-button'))
    fireEvent.click(await screen.findByTestId('stage-character-main'))
    await waitFor(() => expect(onRunSuccess).toHaveBeenCalled(), { timeout: 5000 })
    expect(screen.getByTestId('garden-reflection')).toHaveTextContent('你亲眼看到了')
    expect(screen.getByTestId('garden-reflection')).not.toHaveTextContent('再想想')
  })
})
