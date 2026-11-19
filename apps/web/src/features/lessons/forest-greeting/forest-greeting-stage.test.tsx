import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getMistakeStep } from '@/content/curriculum/mistake-steps'
import { getPracticeStep } from '@/content/curriculum/practice-steps'

import { createGreetingSessionStore, GreetingSessionContext } from './forest-greeting-session'
import { GreetingRunAdapter } from './forest-greeting-run-adapter'
import { emptyGreetingDraft, type GreetingSlotData } from './forest-greeting-draft'
import { GreetingStageSlot } from './forest-greeting-stage'

const START = { type: 'when_start' }
const MOVE = { type: 'move_right' }
const SAY = { type: 'say_line' }
const SAY_HI_ALL = { type: 'say_line', line: 'hi-all' }

function renderStage(initialDraft: GreetingSlotData) {
  const store = createGreetingSessionStore()
  store.setState({ draft: initialDraft })
  const runAdapter = new GreetingRunAdapter({
    isStepObserved: (stepId) => store.getState().observed.includes(stepId),
  })
  const utils = render(
    <GreetingSessionContext.Provider value={{ store, runAdapter }}>
      <GreetingStageSlot
        lessonId="lesson-02-forest-greeting"
        state={{ x: 0, score: 0, running: false, frames: 0 }}
        running={false}
      />
    </GreetingSessionContext.Provider>,
  )
  return { ...utils, store, runAdapter }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('GreetingStageSlot', () => {
  it('renders PlayableStage in external mode: the fox moves first, then the chosen line shows in the bubble', () => {
    vi.useFakeTimers()
    const draft = emptyGreetingDraft()
    draft.stepIndex = 1
    draft.programs['step-2'] = [START, MOVE, SAY_HI_ALL]
    const store = createGreetingSessionStore()
    store.setState({ draft })
    const runAdapter = new GreetingRunAdapter({
      isStepObserved: (stepId) => store.getState().observed.includes(stepId),
    })
    runAdapter.runProgram(draft, () => {})
    act(() => {
      vi.advanceTimersByTime(330)
    })
    // 第一帧后：已走到 100 步，还没说话。
    expect(runAdapter.getExecutionSnapshot()).toMatchObject({ foxPosition: 100, message: null })
    act(() => {
      vi.advanceTimersByTime(330)
    })
    render(
      <GreetingSessionContext.Provider value={{ store, runAdapter }}>
        <GreetingStageSlot
          lessonId="lesson-02-forest-greeting"
          state={{ x: 100, score: 1, running: false, frames: 2 }}
          running={false}
        />
      </GreetingSessionContext.Provider>,
    )
    expect(screen.queryByTestId('run-code-button')).toBeNull()
    expect(screen.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '100')
    expect(screen.getByTestId('stage-character-main')).toHaveTextContent('大家好呀！')
    expect(screen.getByTestId('lesson-playable-stage')).toHaveTextContent('运行成功')
    expect(screen.getByTestId('stage-action-log')).toHaveTextContent('说：“大家好呀！”')
  })

  it('step-4: shows the mistake question once observed and records the answer in the store', () => {
    const draft = emptyGreetingDraft()
    draft.stepIndex = 3
    const { store } = renderStage(draft)
    // Before observing, the setup is shown; the question is not.
    const design = getMistakeStep('lesson-02-forest-greeting', 'step-4')!
    expect(screen.getByTestId('mistake-setup')).toHaveTextContent(design.setup)
    expect(screen.queryByTestId('mistake-question')).toBeNull()
    act(() => {
      store.setState({ observed: ['step-4'] })
    })
    expect(screen.getByTestId('mistake-question')).toHaveTextContent('小狐狸是什么时候说话的？')
    fireEvent.click(screen.getByTestId('mistake-answer-before-walk'))
    expect(store.getState().mistakeAnswers).toEqual({ 'step-4': 'before-walk' })
    expect(screen.getByTestId('mistake-fix')).toHaveTextContent('把“说一句话”挪到“向右走 100 步”下面')
  })

  it('step-4: “再摆一次错误程序” resets the program through the store, keeping observed', () => {
    const draft = emptyGreetingDraft()
    draft.stepIndex = 3
    draft.programs['step-4'] = [START, MOVE, SAY]
    const { store } = renderStage(draft)
    act(() => {
      store.setState({ observed: ['step-4'], mistakeAnswers: { 'step-4': 'before-walk' } })
    })
    fireEvent.click(screen.getByTestId('mistake-reload'))
    expect(store.getState().draft.programs['step-4']).toEqual([START, SAY, MOVE])
    expect(store.getState().observed).toEqual(['step-4'])
  })

  it('step-3: shows the prediction question and records the guess in the store', () => {
    const draft = emptyGreetingDraft()
    draft.stepIndex = 2
    const { store } = renderStage(draft)
    expect(screen.getByTestId('practice-question')).toHaveTextContent('小狐狸会在哪里说话？')
    fireEvent.click(screen.getByTestId('practice-answer-stay'))
    expect(store.getState().practiceAnswers).toEqual({ 'step-3': 'stay' })
    // predict 模式：选完只确认“猜好啦”，对不对要运行后才揭晓（设计如此）。
    expect(getPracticeStep('lesson-02-forest-greeting', 'step-3')?.mode).toBe('predict')
    expect(screen.getByTestId('practice-answer-reply')).toHaveTextContent('猜好啦！现在让程序动起来，看看你猜得对不对。')
  })

  it('cross-step isolation: changing stepIndex after mount resets the run adapter', () => {
    vi.useFakeTimers()
    const draft = emptyGreetingDraft()
    draft.stepIndex = 1
    draft.programs['step-2'] = [START, MOVE, SAY_HI_ALL]
    const { store, runAdapter } = renderStage(draft)
    runAdapter.runProgram(store.getState().draft, () => {})
    act(() => {
      vi.advanceTimersByTime(660)
    })
    expect(runAdapter.getExecutionSnapshot().executionState).toBe('success')
    expect(runAdapter.getJudgmentResult()).not.toBeNull()
    // 不经过编辑插槽 goToStep 的切关（例如导入旧草稿落到别的关）：
    // 舞台兜底复位，上一关的 success 与对白不得带进新关。
    const next = { ...store.getState().draft, stepIndex: 2 }
    act(() => {
      store.setState({ draft: next })
    })
    expect(runAdapter.getExecutionSnapshot().executionState).toBe('idle')
    expect(runAdapter.getExecutionSnapshot().message).toBeNull()
    expect(runAdapter.getJudgmentResult()).toBeNull()
  })
})
