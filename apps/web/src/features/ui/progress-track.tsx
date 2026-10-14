'use client'

import { FeedbackPanel } from './feedback-panel'

/**
 * UX-003 progress track. Visual: the V2 prototype classroom
 * .lesson-progress bar + "步骤 X / Y" text. NOT the home progress ring,
 * NOT the route cards.
 *
 * Data rules (UX-003 ruling):
 * - total = real steps.length from LaunchLessonDefinition.steps.
 *   Never hardcoded.
 * - fill = deduped VALID completed ids / total. Invalid ids and
 *   duplicates are ignored (see computeLessonProgress).
 * - "步骤 X / Y" shows the CURRENT step POSITION (X = current index + 1),
 *   which is NOT the completed count. Being on step 3 != having
 *   completed 3 steps.
 * - error renders the UX-002 FeedbackPanel (error tone), never a fake bar.
 */
export interface ProgressTrackStep {
  id: string
}

export function computeLessonProgress(args: {
  steps: ProgressTrackStep[]
  completedStepIds: string[]
}) {
  const stepIds = new Set(args.steps.map((step) => step.id))
  const completedIds = [...new Set(args.completedStepIds)].filter((id) => stepIds.has(id))
  return {
    total: args.steps.length,
    completedCount: completedIds.length,
    completedIds,
  }
}

export interface ProgressTrackProps {
  steps: ProgressTrackStep[]
  currentStepId?: string | null
  completedStepIds: string[]
  error?: string | null
}

export function ProgressTrack({
  steps,
  currentStepId = null,
  completedStepIds,
  error = null,
}: ProgressTrackProps) {
  if (error) {
    return (
      <div data-testid="progress-track">
        <FeedbackPanel tone="error" title="进度加载失败" message={error} />
      </div>
    )
  }

  const { total, completedCount } = computeLessonProgress({ steps, completedStepIds })

  if (total === 0) {
    return (
      <div className="kc-lesson-headright" data-testid="progress-track">
        <span>暂无步骤</span>
      </div>
    )
  }

  const currentIndex = currentStepId
    ? steps.findIndex((step) => step.id === currentStepId)
    : -1
  const positionText =
    currentIndex >= 0 ? `步骤 ${currentIndex + 1} / ${total}` : `共 ${total} 步`
  const fillPct = (completedCount / total) * 100

  return (
    <div className="kc-lesson-headright" data-testid="progress-track">
      <span data-testid="progress-track-text">{positionText}</span>
      <div
        className="kc-lesson-progress"
        data-testid="progress-track-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completedCount}
        aria-label={`已完成 ${completedCount} / ${total} 步`}
      >
        <i style={{ width: `${fillPct}%` }} />
      </div>
    </div>
  )
}
