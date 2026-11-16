import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

import { getMistakeStep } from '@/content/curriculum/mistake-steps'
import { getPracticeStep } from '@/content/curriculum/practice-steps'
import { launchLessons } from '@/content/curriculum/launch-lessons'
import { launchStepGate, useLaunchLessonCompletion } from './launch-lesson-session'

const LESSON_ID = 'lesson-01-forest-hello'
const LESSON = launchLessons.find((lesson) => lesson.id === LESSON_ID)!
const MISTAKE = getMistakeStep(LESSON_ID, 'step-4')!
const PRACTICE = getPracticeStep(LESSON_ID, 'step-3')!
const GOOD_PROGRAM = [{ type: 'when_start' }, { type: 'move_right' }]

describe('launchStepGate (old handleNext gate sequence, single-role path)', () => {
  const base = {
    mistakeStep: null,
    mistakeObserved: false,
    mistakeAnswer: null,
    practiceStep: null,
    practiceAnswer: null,
    needsRun: true,
    correct: true,
    hasRunSuccess: true,
  }

  it('passes when the program is right and has run', () => {
    expect(launchStepGate(base)).toEqual({ outcome: 'pass' })
  })

  it('step-4: unobserved mistake blocks before anything else', () => {
    const result = launchStepGate({ ...base, mistakeStep: MISTAKE, correct: false })
    expect(result).toEqual({
      outcome: 'blocked',
      feedback: '先按舞台上的运行按钮，看看摆好的这段程序会让小狐狸怎样，再来修好它。',
      countFailedAttempt: false,
    })
  })

  it('step-4: observed but wrong answer blocks with the question', () => {
    const result = launchStepGate({
      ...base,
      mistakeStep: MISTAKE,
      mistakeObserved: true,
      mistakeAnswer: 'walked',
    })
    expect(result).toEqual({
      outcome: 'blocked',
      feedback: `先回答舞台上的问题：${MISTAKE.question}`,
      countFailedAttempt: false,
    })
    expect(
      launchStepGate({ ...base, mistakeStep: MISTAKE, mistakeObserved: true, mistakeAnswer: 'stayed' }),
    ).toEqual({ outcome: 'pass' })
  })

  it('step-3: unanswered prediction blocks before the run gate', () => {
    const result = launchStepGate({ ...base, practiceStep: PRACTICE, hasRunSuccess: false })
    expect(result).toEqual({
      outcome: 'blocked',
      feedback: `先在舞台上猜一猜：${PRACTICE.question}`,
      countFailedAttempt: false,
    })
  })

  it('right program but not run yet blocks without counting a failed attempt', () => {
    expect(launchStepGate({ ...base, hasRunSuccess: false })).toEqual({
      outcome: 'blocked',
      feedback: '积木拼好了，请先点击舞台上的“运行”按钮观察结果，再完成这一关。',
      countFailedAttempt: false,
    })
  })

  it('wrong program blocks and counts one failed attempt (unless already counted)', () => {
    expect(launchStepGate({ ...base, correct: false, failureFeedback: '少了开始积木。' })).toEqual({
      outcome: 'blocked',
      feedback: '少了开始积木。',
      countFailedAttempt: true,
    })
    expect(
      launchStepGate({ ...base, correct: false, alreadyCounted: true }),
    ).toMatchObject({ outcome: 'blocked', countFailedAttempt: false })
  })

  it('step-3: compare/predict answered wrongly after a good run still blocks', () => {
    // predict mode: any guess counts as answered, so a wrong guess passes
    // the final gate (the old route only re-checks compare-mode answers).
    expect(
      launchStepGate({ ...base, practiceStep: PRACTICE, practiceAnswer: 'half-way' }),
    ).toEqual({ outcome: 'pass' })
  })
})

describe('useLaunchLessonCompletion', () => {
  const onClearDrafts = vi.fn()

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ synced: true }),
      }),
    )
    window.localStorage.clear()
    push.mockClear()
    onClearDrafts.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function renderCompletion() {
    return renderHook(() =>
      useLaunchLessonCompletion({
        lessonId: LESSON_ID,
        onClearDrafts,
      }),
    )
  }

  it('completes: awards, writes local progress, syncs, clears drafts, navigates', async () => {
    const { result } = renderCompletion()
    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.completeLesson({
        blocks: GOOD_PROGRAM,
        lesson: LESSON,
        lessons: launchLessons,
      })
    })
    expect(outcome).toBe('completed')
    expect(result.current.cloudSyncState).toBe('synced')
    expect(onClearDrafts).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith(`/project/${LESSON_ID}/complete`)
    expect(fetch).toHaveBeenCalledWith('/api/guest', expect.objectContaining({ method: 'POST' }))
  })

  it('cloud failure keeps failed visible, does not navigate, and retry succeeds', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response)
    const { result } = renderCompletion()
    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.completeLesson({
        blocks: GOOD_PROGRAM,
        lesson: LESSON,
        lessons: launchLessons,
      })
    })
    expect(outcome).toBe('cloud-failed')
    expect(result.current.cloudSyncState).toBe('failed')
    expect(push).not.toHaveBeenCalled()
    expect(onClearDrafts).not.toHaveBeenCalled()
    // Retry with the cloud back: clears drafts and navigates.
    await act(async () => {
      await result.current.retryCloudSync()
    })
    expect(result.current.cloudSyncState).toBe('synced')
    expect(push).toHaveBeenCalledWith(`/project/${LESSON_ID}/complete`)
    expect(onClearDrafts).toHaveBeenCalledTimes(1)
  })

  it('continueLocalOnly clears drafts and navigates without syncing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response)
    const { result } = renderCompletion()
    await act(async () => {
      await result.current.completeLesson({
        blocks: GOOD_PROGRAM,
        lesson: LESSON,
        lessons: launchLessons,
      })
    })
    expect(result.current.cloudSyncState).toBe('failed')
    act(() => {
      result.current.continueLocalOnly()
    })
    expect(push).toHaveBeenCalledWith(`/project/${LESSON_ID}/complete`)
    expect(onClearDrafts).toHaveBeenCalledTimes(1)
  })

  it('local save failure reports local-save-failed and does not navigate', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    const { result } = renderCompletion()
    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.completeLesson({
        blocks: GOOD_PROGRAM,
        lesson: LESSON,
        lessons: launchLessons,
      })
    })
    expect(outcome).toBe('local-save-failed')
    expect(push).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })
})
