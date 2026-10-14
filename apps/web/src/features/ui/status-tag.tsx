import type { HTMLAttributes, ReactNode } from 'react'

/**
 * UX-002 status tag. Visuals mirror the approved prototype chip
 * (docs/design/kidscoding-v2/prototype.html: .chip and its green/amber/gray
 * variants) via the .kc-chip-* classes in globals.css.
 *
 * The tag is a static label, deliberately not a live region: it must not
 * announce itself to screen readers on every render. Real status changes
 * belong in FeedbackPanel (role="alert"/"status") or in the acting control.
 */
export type StatusTagTone = 'info' | 'success' | 'warning' | 'error' | 'neutral'

export interface StatusTagProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  tone?: StatusTagTone
  children: ReactNode
}

const toneClass: Record<StatusTagTone, string> = {
  info: 'kc-chip-info',
  success: 'kc-chip-success',
  warning: 'kc-chip-warning',
  error: 'kc-chip-error',
  neutral: 'kc-chip-neutral',
}

export function StatusTag({ tone = 'info', children, className, ...rest }: StatusTagProps) {
  const classes = ['kc-chip', toneClass[tone], className ?? ''].filter(Boolean).join(' ')
  return (
    <span {...rest} className={classes}>
      {children}
    </span>
  )
}
