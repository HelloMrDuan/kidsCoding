import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { computeLessonProgress, ProgressTrack } from './progress-track'

// UX-003: ProgressTrack = the V2 prototype classroom .lesson-progress bar +
// "步骤 X / Y". Position (current step) and completion (completed count)
// are different numbers and must never be conflated.

const steps = [
  { id: 'step-1' },
  { id: 'step-2' },
  { id: 'step-3' },
  { id: 'step-4' },
  { id: 'step-5' },
]

describe('computeLessonProgress', () => {
  it('counts only deduped, valid completed ids within the real step set', () => {
    const result = computeLessonProgress({
      steps,
      completedStepIds: ['step-1', 'step-1', 'step-2', 'not-a-real-step'],
    })
    expect(result.total).toBe(5)
    expect(result.completedCount).toBe(2)
    expect(result.completedIds).toEqual(['step-1', 'step-2'])
  })

  it('empty steps produce total 0 and no fake progress', () => {
    const result = computeLessonProgress({ steps: [], completedStepIds: ['step-1'] })
    expect(result.total).toBe(0)
    expect(result.completedCount).toBe(0)
    expect(result.completedIds).toEqual([])
  })

  it('re-validates when the lesson set changes (count change)', () => {
    const before = computeLessonProgress({
      steps: steps.slice(0, 3),
      completedStepIds: ['step-1', 'step-2', 'step-4'],
    })
    expect(before.total).toBe(3)
    expect(before.completedCount).toBe(2)
    const after = computeLessonProgress({ steps, completedStepIds: ['step-1', 'step-2', 'step-4'] })
    expect(after.total).toBe(5)
    expect(after.completedCount).toBe(3)
  })

  it('does not count completedLessonIds.length blindly', () => {
    // 4 raw ids, but only 2 are valid + unique for this lesson set.
    const result = computeLessonProgress({
      steps,
      completedStepIds: ['step-1', 'step-1', 'step-2', 'ghost'],
    })
    expect(result.completedCount).toBe(2)
    expect(result.completedCount).not.toBe(4)
  })
})

describe('ProgressTrack rendering', () => {
  it('distinguishes position from completion: on step 3, completed 2 of 5', () => {
    render(
      <ProgressTrack
        steps={steps}
        currentStepId="step-3"
        completedStepIds={['step-1', 'step-2']}
      />,
    )
    expect(screen.getByTestId('progress-track-text')).toHaveTextContent('步骤 3 / 5')
    const bar = screen.getByTestId('progress-track-bar')
    expect(bar).toHaveAttribute('role', 'progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '2')
    expect(bar).toHaveAttribute('aria-valuemax', '5')
    expect(bar.querySelector('i')).toHaveStyle({ width: '40%' })
  })

  it('not started shows the total only, with a 0% bar', () => {
    render(<ProgressTrack steps={steps} currentStepId={null} completedStepIds={[]} />)
    expect(screen.getByTestId('progress-track-text')).toHaveTextContent('共 5 步')
    expect(screen.getByTestId('progress-track-bar').querySelector('i')).toHaveStyle({ width: '0%' })
  })

  it('an unknown current step falls back to the total', () => {
    render(
      <ProgressTrack steps={steps} currentStepId="no-such-step" completedStepIds={['step-1']} />,
    )
    expect(screen.getByTestId('progress-track-text')).toHaveTextContent('共 5 步')
  })

  it('all steps completed fills 100%', () => {
    render(
      <ProgressTrack
        steps={steps}
        currentStepId="step-5"
        completedStepIds={steps.map((step) => step.id)}
      />,
    )
    expect(screen.getByTestId('progress-track-bar').querySelector('i')).toHaveStyle({
      width: '100%',
    })
  })

  it('empty steps render a real empty state, never a fake bar', () => {
    render(<ProgressTrack steps={[]} currentStepId={null} completedStepIds={[]} />)
    expect(screen.getByTestId('progress-track')).toHaveTextContent('暂无步骤')
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('a load failure renders the error panel, never a fake bar', () => {
    render(
      <ProgressTrack
        steps={steps}
        currentStepId="step-1"
        completedStepIds={[]}
        error="无法读取进度"
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('无法读取进度')
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('never hardcodes a step count: total follows the real steps array', () => {
    const three = steps.slice(0, 3)
    render(<ProgressTrack steps={three} currentStepId="step-2" completedStepIds={['step-1']} />)
    expect(screen.getByTestId('progress-track-text')).toHaveTextContent('步骤 2 / 3')
    expect(screen.getByTestId('progress-track-bar')).toHaveAttribute('aria-valuemax', '3')
  })
})
