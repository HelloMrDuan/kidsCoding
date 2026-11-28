import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { getMistakeStep } from '@/content/curriculum/mistake-steps'

import { emptyLaunchDraft } from './launch-v3-draft'
import { launchV3StepIds } from './launch-v3-lessons'
import { LaunchRunAdapter } from './launch-v3-run-adapter'
import { createLaunchSessionStore, LaunchSessionContext } from './launch-v3-session'
import { launchDuoStepReady, LaunchStageSlot } from './launch-v3-stage'

function renderStage(lessonId: string, stepIndex: number) {
  const store = createLaunchSessionStore(lessonId)
  const draft = emptyLaunchDraft(lessonId)
  store.setState({ draft: { ...draft, stepIndex } })
  const runAdapter = new LaunchRunAdapter(lessonId, {
    isStepObserved: (stepId) => store.getState().observed.includes(stepId),
  })
  const utils = render(
    <LaunchSessionContext.Provider value={{ lessonId, store, runAdapter }}>
      <LaunchStageSlot lessonId={lessonId} state={{ x: 0, score: 0, running: false, frames: 0 }} running={false} />
    </LaunchSessionContext.Provider>,
  )
  return { ...utils, store, runAdapter }
}

afterEach(() => {
  cleanup()
})

describe('LaunchStageSlot', () => {
  it('renders PlayableStage in external mode: no internal run button, lesson id on the root', () => {
    renderStage('lesson-02-forest-greeting', 0)
    expect(screen.getByTestId('launch-v3-stage')).toHaveAttribute('data-lesson-id', 'lesson-02-forest-greeting')
    expect(screen.getByTestId('lesson-playable-stage')).toBeInTheDocument()
    expect(screen.getByTestId('stage-character-main')).toBeInTheDocument()
    expect(screen.queryByTestId('run-code-button')).toBeNull()
    // 单角色课不渲染双角色活动块。
    expect(screen.queryByTestId('launch-v3-duo-panel')).toBeNull()
  })

  it('lesson-02 step-4: shows the mistake question only after observing and records the answer in the store', () => {
    const mistake = getMistakeStep('lesson-02-forest-greeting', 'step-4')
    expect(mistake).toBeDefined()
    const { store } = renderStage('lesson-02-forest-greeting', 3)
    expect(screen.getByTestId('mistake-setup')).toHaveTextContent(mistake!.setup)
    expect(screen.queryByTestId('mistake-question')).toBeNull()
    act(() => {
      store.setState({ observed: ['step-4'] })
    })
    expect(screen.getByTestId('mistake-question')).toHaveTextContent(mistake!.question)
    fireEvent.click(screen.getByTestId('mistake-answer-before-walk'))
    expect(store.getState().mistakeAnswers).toEqual({ 'step-4': 'before-walk' })
    expect(screen.getByTestId('mistake-fix')).toBeInTheDocument()
  })

  it('lesson-02 step-4: “再摆一次错误程序” re-lays the wrong program through the store, keeping observed', () => {
    const mistake = getMistakeStep('lesson-02-forest-greeting', 'step-4')!
    const { store } = renderStage('lesson-02-forest-greeting', 3)
    act(() => {
      const current = store.getState().draft
      store.setState({
        draft: { ...current, programs: { ...current.programs, 'step-4': [{ type: 'when_start' }] } },
        observed: ['step-4'],
        mistakeAnswers: { 'step-4': 'before-walk' },
      })
    })
    fireEvent.click(screen.getByTestId('mistake-reload'))
    expect(store.getState().draft.programs['step-4']).toEqual(mistake.wrongProgram)
    expect(store.getState().observed).toEqual(['step-4'])
  })

  it('duo lesson-10 step 1: shows the prediction activity and records the guess in the store', () => {
    const firstStepId = launchV3StepIds('lesson-10-second-friend')[0]
    const { store } = renderStage('lesson-10-second-friend', 0)
    expect(screen.getByTestId('launch-v3-duo-panel')).toBeInTheDocument()
    expect(screen.getByTestId('duo-active-actor')).toHaveTextContent('小狐狸')
    fireEvent.click(screen.getByTestId('duo-predict-bear'))
    expect(store.getState().duoPredictions).toEqual({ [firstStepId]: 'bear' })
    expect(screen.getByTestId('duo-predict-bear')).toHaveAttribute('aria-pressed', 'true')
  })

  it('duo lesson-10 step 2 (independent mode) has no activity block', () => {
    renderStage('lesson-10-second-friend', 1)
    expect(screen.queryByTestId('launch-v3-duo-panel')).toBeNull()
    // 复审 HOLD P1：没有活动的关也保留旧课堂 DuoStage 的“当前操作”角色反馈。
    expect(screen.getByTestId('launch-v3-duo-actor')).toBeInTheDocument()
    expect(screen.getByTestId('duo-active-actor')).toHaveTextContent('当前操作：')
  })

  it('duo lesson-10 step 5: records the reflection and explains it', () => {
    const stepId = launchV3StepIds('lesson-10-second-friend')[4]
    const { store } = renderStage('lesson-10-second-friend', 4)
    fireEvent.click(screen.getByTestId('duo-reflect-own'))
    expect(store.getState().duoReflections).toEqual({ [stepId]: 'own' })
    expect(screen.getByTestId('duo-reflection')).toHaveTextContent('切换只改变后面动作的目标')
  })

  it('lesson-11 (dialogue) shows the dialogue board with empty speech records before any run', () => {
    renderStage('lesson-11-duo-rehearsal', 1)
    expect(screen.getByTestId('duo-dialogue-board')).toBeInTheDocument()
    expect(screen.getByTestId('duo-fox-speech-record')).toHaveTextContent('还没有说话')
    expect(screen.getByTestId('duo-bear-speech-record')).toHaveTextContent('还没有说话')
  })

  it('lesson-12 (graduation) shows the gift as not yet found before any run', () => {
    renderStage('lesson-12-graduation-show', 1)
    expect(screen.getByTestId('graduation-gift')).toHaveAttribute('data-found', 'false')
    expect(screen.getByTestId('graduation-gift')).toHaveTextContent('礼物等待两位朋友到位')
  })
})

describe('LaunchStageSlot 花园课受控预测（OPS-056 复审 HOLD P1）', () => {
  it('lesson-07 step-2: the guess is written to the session store and shown as pressed', () => {
    const { store } = renderStage('lesson-07-garden-click', 1)
    expect(screen.getByTestId('garden-prediction')).toBeInTheDocument()
    expect(screen.getByTestId('garden-predict-click')).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByTestId('garden-predict-click'))
    expect(store.getState().clickPredictions).toEqual({ 'step-2': 'needs-click' })
    expect(screen.getByTestId('garden-predict-click')).toHaveAttribute('aria-pressed', 'true')
  })

  it('lesson-07 step-1 does not ask for a guess', () => {
    renderStage('lesson-07-garden-click', 0)
    expect(screen.queryByTestId('garden-prediction')).toBeNull()
  })
})

describe('launchDuoStepReady', () => {
  const base = { prediction: null, observedMistake: false, reflection: null } as const

  it('step 1 needs a prediction', () => {
    expect(launchDuoStepReady(0, base)).toBe(false)
    expect(launchDuoStepReady(0, { ...base, prediction: 'both' })).toBe(true)
  })

  it('step 4 needs the real mistake observed', () => {
    expect(launchDuoStepReady(3, base)).toBe(false)
    expect(launchDuoStepReady(3, { ...base, observedMistake: true })).toBe(true)
  })

  it('step 5 needs the “own” reflection, not “together”', () => {
    expect(launchDuoStepReady(4, base)).toBe(false)
    expect(launchDuoStepReady(4, { ...base, reflection: 'together' })).toBe(false)
    expect(launchDuoStepReady(4, { ...base, reflection: 'own' })).toBe(true)
  })

  it('other steps have no extra gate', () => {
    expect(launchDuoStepReady(1, base)).toBe(true)
    expect(launchDuoStepReady(2, base)).toBe(true)
  })
})
