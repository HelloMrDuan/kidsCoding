'use client'

/**
 * UX-003 lesson card. Sole visual baseline: the V2 prototype map page
 * .step lesson node (44px node, title ellipsis, done/current/locked
 * styles). NOT a composition of course-card / task-content / chip /
 * lesson-progress (per the UX-003 ruling).
 *
 * States: completed / current / available come from real progress data.
 * locked / unreleased are display-only: the component renders them, but it
 * never derives them from lesson order — the caller must supply a real
 * permission / publish source. Unreleased reuses the locked
 * (non-interactive) visual; its small label says 未开放.
 *
 * Interactive states render a real <a> (href) or <button> (onSelect).
 * locked / unreleased render a non-focusable <span aria-disabled="true">.
 */
export type LessonCardState =
  | 'completed'
  | 'current'
  | 'available'
  | 'locked'
  | 'unreleased'

export interface LessonCardLesson {
  id: string
  title: string
  sortOrder: number
}

export interface LessonCardProps {
  lesson: LessonCardLesson
  state: LessonCardState
  href?: string
  onSelect?: () => void
}

const stateCopy: Record<LessonCardState, { label: string; className: string }> = {
  completed: { label: '已完成', className: 'kc-step-done' },
  current: { label: '当前练习', className: 'kc-step-current' },
  available: { label: '可以开始', className: '' },
  locked: { label: '已锁定', className: 'kc-step-locked' },
  unreleased: { label: '未开放', className: 'kc-step-locked' },
}

const interactiveStates: LessonCardState[] = ['completed', 'current', 'available']

export function LessonCard({ lesson, state, href, onSelect }: LessonCardProps) {
  const copy = stateCopy[state]
  const interactive = interactiveStates.includes(state)
  const node = state === 'completed' ? '✓' : String(lesson.sortOrder).padStart(2, '0')
  const className = `kc-step ${copy.className}`.trim()
  const testId = `lesson-card-${lesson.id}`
  const content = (
    <>
      <span className="kc-step-node" aria-hidden={state === 'completed'}>
        {node}
      </span>
      <small>{copy.label}</small>
      <b>{lesson.title}</b>
    </>
  )

  if (interactive && href) {
    return (
      <a className={className} href={href} data-testid={testId}>
        {content}
      </a>
    )
  }

  if (interactive && onSelect) {
    return (
      <button type="button" className={className} onClick={onSelect} data-testid={testId}>
        {content}
      </button>
    )
  }

  if (!interactive) {
    return (
      <span className={className} aria-disabled="true" data-testid={testId}>
        {content}
      </span>
    )
  }

  return (
    <span className={className} data-testid={testId}>
      {content}
    </span>
  )
}
