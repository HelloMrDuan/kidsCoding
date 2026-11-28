import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mistakeSteps } from '@/content/curriculum/mistake-steps'
import type { ProgramBlock } from '@/features/lessons/blockly/observable-run'
import type { RunEvent } from '@/features/lessons/workspace/workspace-adapters'

import { emptyLaunchDraft } from './launch-v3-draft'
import { GIFT_FOUND_LOG } from './launch-v3-judging'
import { launchV3StepIds } from './launch-v3-lessons'
import {
  LAUNCH_FRAME_MS,
  LaunchAdapter,
  LaunchRunAdapter,
  launchExternalState,
} from './launch-v3-run-adapter'

/**
 * OPS-056: LaunchRunAdapter（与 OPS-041 ForestRunAdapter 同语义）。
 * 用假计时器逐帧推进：330ms 一帧、播完才写判定、点击课 armed 期间不排计时器、
 * stop 保留舞台并取消等待、reset 清空、重复运行不叠加、不能运行时立即报错。
 */
const b = (...types: string[]): ProgramBlock[] => types.map((type) => ({ type }))

function draftAt(lessonId: string, stepIndex: number, program?: ProgramBlock[]) {
  const draft = emptyLaunchDraft(lessonId)
  const stepId = launchV3StepIds(lessonId)[stepIndex]
  return {
    ...draft,
    stepIndex,
    programs: program ? { ...draft.programs, [stepId]: program } : draft.programs,
  }
}

const kinds = (fn: ReturnType<typeof vi.fn>) =>
  fn.mock.calls.map((call) => (call[0] as RunEvent).kind)

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('OPS-056 LaunchRunAdapter', () => {
  it('plays one frame every 330ms and writes the judgment only when playback ends', () => {
    const adapter = new LaunchRunAdapter('lesson-03-forest-story')
    const onEvent = vi.fn()
    adapter.runProgram(draftAt('lesson-03-forest-story', 0, b('when_start', 'move_right', 'move_right')), onEvent)

    expect(adapter.getExecutionSnapshot().executionState).toBe('running')
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(onEvent).not.toHaveBeenCalled()

    vi.advanceTimersByTime(LAUNCH_FRAME_MS)
    expect(adapter.getExecutionSnapshot().frame.mainPosition).toBe(100)
    expect(adapter.getExecutionSnapshot().actionLog).toEqual(['向右走 100 步'])
    expect(adapter.getJudgmentResult()).toBeNull()

    vi.advanceTimersByTime(LAUNCH_FRAME_MS)
    const snapshot = adapter.getExecutionSnapshot()
    expect(snapshot.executionState).toBe('success')
    expect(snapshot.frame.mainPosition).toBe(200)
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
    expect(kinds(onEvent)).toEqual(['frame', 'frame', 'finished'])
    expect(adapter.getState()).toMatchObject({ x: 200, running: false, frames: 2 })
  })

  it('a click program arms without a timer and only plays after the character is clicked', () => {
    const id = 'lesson-07-garden-click'
    const adapter = new LaunchRunAdapter(id)
    const onEvent = vi.fn()
    expect(adapter.clickCharacter()).toBe(false)

    adapter.runProgram(draftAt(id, 1, b('when_clicked', 'move_right')), onEvent)
    expect(adapter.getExecutionSnapshot().executionState).toBe('armed')
    expect(adapter.getExecutionSnapshot().trigger).toBe('click')
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(LAUNCH_FRAME_MS * 10)
    expect(adapter.getExecutionSnapshot().frame.mainPosition).toBe(0)
    expect(adapter.getJudgmentResult()).toBeNull()

    expect(adapter.clickCharacter()).toBe(true)
    expect(adapter.getExecutionSnapshot().executionState).toBe('running')
    expect(adapter.clickCharacter()).toBe(false)
    vi.advanceTimersByTime(LAUNCH_FRAME_MS)
    expect(adapter.getExecutionSnapshot().executionState).toBe('success')
    expect(adapter.getExecutionSnapshot().frame.mainPosition).toBe(100)
    expect(adapter.getJudgmentResult()?.passed).toBe(true)
    expect(kinds(onEvent)[kinds(onEvent).length - 1]).toBe('finished')
  })

  it('stop keeps the stage where it is, cancels an armed click and never reports finished', () => {
    const adapter = new LaunchRunAdapter('lesson-03-forest-story')
    const onEvent = vi.fn()
    adapter.runProgram(draftAt('lesson-03-forest-story', 0, b('when_start', 'move_right', 'move_right')), onEvent)
    vi.advanceTimersByTime(LAUNCH_FRAME_MS)
    adapter.stop()
    expect(adapter.getExecutionSnapshot().executionState).toBe('idle')
    expect(adapter.getExecutionSnapshot().frame.mainPosition).toBe(100)
    vi.advanceTimersByTime(LAUNCH_FRAME_MS * 10)
    expect(adapter.getExecutionSnapshot().frame.mainPosition).toBe(100)
    expect(kinds(onEvent)).not.toContain('finished')
    expect(adapter.getJudgmentResult()).toBeNull()

    const click = new LaunchRunAdapter('lesson-07-garden-click')
    const onClickEvent = vi.fn()
    click.runProgram(draftAt('lesson-07-garden-click', 1, b('when_clicked', 'move_right')), onClickEvent)
    click.stop()
    expect(click.getExecutionSnapshot().executionState).toBe('idle')
    expect(click.clickCharacter()).toBe(false)
    vi.advanceTimersByTime(LAUNCH_FRAME_MS * 10)
    expect(kinds(onClickEvent)).not.toContain('finished')
  })

  it('reset clears the snapshot, the judgment and every pending timer', () => {
    const adapter = new LaunchRunAdapter('lesson-03-forest-story')
    adapter.runProgram(draftAt('lesson-03-forest-story', 0, b('when_start', 'move_right', 'move_right')), vi.fn())
    vi.advanceTimersByTime(LAUNCH_FRAME_MS * 5)
    expect(adapter.getJudgmentResult()).not.toBeNull()
    adapter.reset()
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.getExecutionSnapshot()).toMatchObject({ executionState: 'idle', actionLog: [], frameIndex: 0 })
    expect(adapter.getExecutionSnapshot().frame.mainPosition).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('a rerun replaces the old run: the first run never finishes and frames do not stack', () => {
    const adapter = new LaunchRunAdapter('lesson-03-forest-story')
    const first = vi.fn()
    const second = vi.fn()
    const draft = draftAt('lesson-03-forest-story', 0, b('when_start', 'move_right', 'move_right'))
    adapter.runProgram(draft, first)
    vi.advanceTimersByTime(LAUNCH_FRAME_MS)
    adapter.runProgram(draft, second)
    expect(adapter.getExecutionSnapshot().actionLog).toEqual([])
    vi.advanceTimersByTime(LAUNCH_FRAME_MS * 10)
    expect(kinds(first)).not.toContain('finished')
    expect(kinds(second)).toEqual(['frame', 'frame', 'finished'])
    expect(adapter.getExecutionSnapshot().actionLog).toHaveLength(2)
    expect(adapter.getExecutionSnapshot().frame.mainPosition).toBe(200)
  })

  it('a program that cannot run finishes at once as an error, with no fake playback', () => {
    const adapter = new LaunchRunAdapter('lesson-03-forest-story')
    const onEvent = vi.fn()
    adapter.runProgram(draftAt('lesson-03-forest-story', 0, b('move_right', 'move_right')), onEvent)
    expect(kinds(onEvent)).toEqual(['finished'])
    expect(adapter.getExecutionSnapshot().executionState).toBe('error')
    expect(adapter.getJudgmentResult()?.passed).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('marks the first run of the designed wrong program as the experiment, not after it was observed', () => {
    const m = mistakeSteps.find((item) => item.lessonId === 'lesson-02-forest-greeting')!
    const fresh = new LaunchRunAdapter(m.lessonId)
    fresh.runProgram(draftAt(m.lessonId, m.stepIndex), vi.fn())
    vi.advanceTimersByTime(LAUNCH_FRAME_MS * 20)
    expect(fresh.getExecutionSnapshot().designedMistake).toBe(true)
    expect(fresh.getExecutionSnapshot().executionState).toBe('error')

    const observed = new LaunchRunAdapter(m.lessonId, { isStepObserved: (stepId) => stepId === m.stepId })
    observed.runProgram(draftAt(m.lessonId, m.stepIndex), vi.fn())
    vi.advanceTimersByTime(LAUNCH_FRAME_MS * 20)
    expect(observed.getExecutionSnapshot().designedMistake).toBe(false)
    expect(observed.getExecutionSnapshot().executionState).toBe('error')
  })

  it('lesson-12: the gift log is added only when both goals are reached', () => {
    const id = 'lesson-12-graduation-show'
    const adapter = new LaunchRunAdapter(id)
    adapter.runProgram(
      draftAt(id, 2, b('when_start', 'move_right', 'switch_character', 'move_right', 'repeat_twice')),
      vi.fn(),
    )
    vi.advanceTimersByTime(LAUNCH_FRAME_MS * 20)
    const done = adapter.getExecutionSnapshot()
    expect(done.executionState).toBe('success')
    expect(done.giftFound).toBe(true)
    expect(done.actionLog[done.actionLog.length - 1]).toBe(GIFT_FOUND_LOG)
    expect([done.frame.mainPosition, done.frame.partnerPosition]).toEqual([100, 200])

    adapter.runProgram(draftAt(id, 3, b('when_start', 'move_right', 'switch_character', 'move_right')), vi.fn())
    vi.advanceTimersByTime(LAUNCH_FRAME_MS * 20)
    expect(adapter.getExecutionSnapshot().giftFound).toBe(false)
    expect(adapter.getExecutionSnapshot().actionLog).not.toContain(GIFT_FOUND_LOG)
  })

  it('maps the snapshot to the PlayableStage external fields and notifies subscribers', () => {
    const id = 'lesson-11-duo-rehearsal'
    const adapter = new LaunchRunAdapter(id)
    const listener = vi.fn()
    const unsubscribe = adapter.subscribe(listener)
    adapter.runProgram(
      draftAt(id, 2, b('when_start', 'move_right', 'switch_character', 'move_right', 'say_line')),
      vi.fn(),
    )
    vi.advanceTimersByTime(LAUNCH_FRAME_MS * 20)
    expect(listener).toHaveBeenCalled()
    const external = launchExternalState(adapter.getExecutionSnapshot())
    expect(external).toMatchObject({
      executionState: 'success',
      characterPosition: 100,
      partnerPosition: 100,
      partnerMessage: '我们一起出发吧！',
      activeActor: 'partner',
      mainAction: 'idle',
      partnerAction: 'idle',
      scene: 'forest',
    })
    unsubscribe()
    listener.mockClear()
    adapter.reset()
    expect(listener).not.toHaveBeenCalled()
  })

  it('duo lessons hand the stage the duo judge reason on failure (the stage judge cannot read duo goals)', () => {
    const id = 'lesson-10-second-friend'
    const adapter = new LaunchRunAdapter(id)
    adapter.runProgram(draftAt(id, 2, b('when_start', 'switch_character', 'move_right')), vi.fn())
    vi.advanceTimersByTime(LAUNCH_FRAME_MS * 20)
    expect(adapter.getExecutionSnapshot().executionState).toBe('error')
    expect(launchExternalState(adapter.getExecutionSnapshot()).failureReason).toBe('先让小狐狸走 100 步，再切换。')

    adapter.runProgram(draftAt(id, 2, b('when_start', 'move_right', 'move_right')), vi.fn())
    vi.advanceTimersByTime(LAUNCH_FRAME_MS * 20)
    expect(launchExternalState(adapter.getExecutionSnapshot()).failureReason).toBe('还没切换角色，小熊还没动。')

    adapter.runProgram(draftAt(id, 2, b('when_start', 'move_right', 'switch_character', 'move_right')), vi.fn())
    vi.advanceTimersByTime(LAUNCH_FRAME_MS * 20)
    expect(adapter.getExecutionSnapshot().executionState).toBe('success')
    expect(launchExternalState(adapter.getExecutionSnapshot()).failureReason).toBeNull()

    // Single-role lessons keep the stage's own explanation (no adapter reason).
    const single = new LaunchRunAdapter('lesson-03-forest-story')
    single.runProgram(draftAt('lesson-03-forest-story', 0, b('when_start', 'move_right')), vi.fn())
    vi.advanceTimersByTime(LAUNCH_FRAME_MS * 20)
    expect(single.getExecutionSnapshot().executionState).toBe('error')
    expect(launchExternalState(single.getExecutionSnapshot()).failureReason).toBeNull()

    adapter.reset()
    expect(adapter.getExecutionSnapshot().failureReason).toBeNull()
  })

  it('validates drafts for its own lesson only; LaunchAdapter carries an empty draft and never judges', () => {
    const adapter = new LaunchRunAdapter('lesson-05-meadow-order')
    expect(adapter.validateDraft(emptyLaunchDraft('lesson-05-meadow-order'))).toBe(true)
    expect(adapter.validateDraft(emptyLaunchDraft('lesson-06-meadow-story'))).toBe(false)
    expect(adapter.getLastRunError()).toBeNull()

    const shell = new LaunchAdapter('lesson-05-meadow-order')
    expect(shell.getScript()).toEqual(emptyLaunchDraft('lesson-05-meadow-order'))
    expect(shell.getJudgmentResult()).toBeNull()
    expect(shell.validateDraft(emptyLaunchDraft('lesson-06-meadow-story'))).toBe(false)
  })

  it('validateDraft works when the shell calls it detached (runAdapter?.validateDraft ?? adapter.validateDraft)', () => {
    // lesson-workspace.tsx loadEditorSlotData pulls the validator off the
    // adapter and calls it bare; a prototype method would lose `this`, throw,
    // and the shell would fail-closed on every valid saved draft.
    const resumed = {
      version: 1,
      lessonId: 'lesson-05-meadow-order',
      stepIndex: 2,
      programs: { 'step-3': [{ type: 'when_start' }, { type: 'move_right' }, { type: 'repeat_twice' }] },
      passed: [],
      failures: 0,
    }
    const runAdapter: { validateDraft?: (data: unknown) => boolean } = new LaunchRunAdapter('lesson-05-meadow-order')
    const shell: { validateDraft?: (data: unknown) => boolean } = new LaunchAdapter('lesson-05-meadow-order')
    const validator = runAdapter.validateDraft ?? shell.validateDraft
    expect(validator?.(resumed)).toBe(true)
    expect(validator?.({ ...resumed, programs: { 'step-9': [] } })).toBe(false)
    const fallback = shell.validateDraft
    expect(fallback?.(resumed)).toBe(true)
    expect(fallback?.({ ...resumed, lessonId: 'lesson-06-meadow-story' })).toBe(false)
  })
})
