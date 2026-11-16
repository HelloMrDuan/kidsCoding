import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createForestSessionStore, ForestSessionContext } from './forest-hello-session'
import { ForestRunAdapter } from './forest-hello-run-adapter'
import { emptyForestDraft } from './forest-hello-draft'
import { ForestStageSlot } from './forest-hello-stage'

const START = { type: 'when_start' }
const MOVE = { type: 'move_right' }

function renderStage(initialDraft: ReturnType<typeof emptyForestDraft>) {
  const store = createForestSessionStore()
  store.setState({ draft: initialDraft })
  const runAdapter = new ForestRunAdapter({
    isStepObserved: (stepId) => store.getState().observed.includes(stepId),
  })
  const utils = render(
    <ForestSessionContext.Provider value={{ store, runAdapter }}>
      <ForestStageSlot
        lessonId="lesson-01-forest-hello"
        state={{ x: 0, score: 0, running: false, frames: 0 }}
        running={false}
      />
    </ForestSessionContext.Provider>,
  )
  return { ...utils, store, runAdapter }
}

afterEach(() => {
  cleanup()
})

describe('ForestStageSlot', () => {
  it('renders PlayableStage in external mode: no internal run button, adapter snapshot shown', () => {
    const draft = emptyForestDraft()
    draft.programs['step-1'] = [START]
    const store = createForestSessionStore()
    store.setState({ draft })
    const runAdapter = new ForestRunAdapter({
      isStepObserved: (stepId) => store.getState().observed.includes(stepId),
    })
    // Step-1 has no move frames: the run finishes synchronously, so the
    // snapshot is success before the first render.
    runAdapter.runProgram(draft, () => {})
    render(
      <ForestSessionContext.Provider value={{ store, runAdapter }}>
        <ForestStageSlot
          lessonId="lesson-01-forest-hello"
          state={{ x: 0, score: 1, running: false, frames: 0 }}
          running={false}
        />
      </ForestSessionContext.Provider>,
    )
    expect(screen.queryByTestId('run-code-button')).toBeNull()
    expect(screen.getByTestId('stage-character-main')).toHaveAttribute('data-steps', '0')
    expect(screen.getByTestId('lesson-playable-stage')).toHaveTextContent('运行成功')
  })

  it('step-4: shows the mistake question once observed and records the answer in the store', () => {
    const draft = emptyForestDraft()
    draft.stepIndex = 3
    const { store } = renderStage(draft)
    // Before observing, the setup is shown; the question is not.
    expect(screen.getByTestId('mistake-setup')).toHaveTextContent('只有“向右走 100 步”')
    expect(screen.queryByTestId('mistake-question')).toBeNull()
    act(() => {
      store.setState({ observed: ['step-4'] })
    })
    expect(screen.getByTestId('mistake-question')).toHaveTextContent('按了运行，小狐狸怎么了？')
    fireEvent.click(screen.getByTestId('mistake-answer-stayed'))
    expect(store.getState().mistakeAnswers).toEqual({ 'step-4': 'stayed' })
    expect(screen.getByTestId('mistake-fix')).toHaveTextContent('把“开始时”放到“向右走 100 步”上面')
  })

  it('step-4: “再摆一次错误程序” resets the program through the store, keeping observed', () => {
    const draft = emptyForestDraft()
    draft.stepIndex = 3
    draft.programs['step-4'] = [START, MOVE]
    const { store } = renderStage(draft)
    act(() => {
      store.setState({ observed: ['step-4'], mistakeAnswers: { 'step-4': 'stayed' } })
    })
    fireEvent.click(screen.getByTestId('mistake-reload'))
    expect(store.getState().draft.programs['step-4']).toEqual([MOVE])
    expect(store.getState().observed).toEqual(['step-4'])
  })

  it('step-3: shows the prediction question and records the guess in the store', () => {
    const draft = emptyForestDraft()
    draft.stepIndex = 2
    const { store } = renderStage(draft)
    expect(screen.getByTestId('practice-question')).toHaveTextContent('先猜一猜')
    fireEvent.click(screen.getByTestId('practice-answer-beside-friend'))
    expect(store.getState().practiceAnswers).toEqual({ 'step-3': 'beside-friend' })
  })
})
