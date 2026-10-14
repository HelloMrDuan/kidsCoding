import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import { Button } from './button'

/**
 * UX-002 feedback panel. Visuals mirror the approved prototype
 * (.stage-feedback in docs/design/kidscoding-v2/prototype.html) via the
 * .kc-feedback-* classes in globals.css; tone tints follow the prototype
 * chip pattern.
 *
 * Real behavior, not a shell:
 * - Error uses role="alert" (assertive); info/success/warning use
 *   role="status" (polite). Screen readers announce the message.
 * - Dismiss renders a real keyboard-accessible button; visibility stays with
 *   the caller through onDismiss.
 * - Retry is a real Button. While a retry is running it is disabled and
 *   shows loading; a failed retry surfaces its message in a nested
 *   role="alert" and leaves the panel on screen. A failure is never
 *   reported as success.
 */
export type FeedbackTone = 'info' | 'success' | 'warning' | 'error'

export interface FeedbackRetry {
  label: string
  onRetry: () => void | Promise<void>
}

export interface FeedbackPanelProps {
  tone?: FeedbackTone
  title?: string
  message: ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  dismissLabel?: string
  retry?: FeedbackRetry
}

type RetryState = 'idle' | 'retrying' | 'failed'

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return String(error)
}

export function FeedbackPanel({
  tone = 'info',
  title,
  message,
  dismissible = false,
  onDismiss,
  dismissLabel = '关闭提示',
  retry,
}: FeedbackPanelProps) {
  const [retryState, setRetryState] = useState<RetryState>('idle')
  const [retryError, setRetryError] = useState<string | null>(null)
  const retryingRef = useRef(false)

  const handleRetry = async () => {
    if (!retry || retryingRef.current) return
    retryingRef.current = true
    setRetryState('retrying')
    setRetryError(null)
    try {
      await retry.onRetry()
      setRetryState('idle')
    } catch (error) {
      // A failed retry stays visible with its real reason. Never fake success.
      setRetryError(errorMessage(error))
      setRetryState('failed')
    } finally {
      retryingRef.current = false
    }
  }

  const role = tone === 'error' ? 'alert' : 'status'

  return (
    <div className={`kc-feedback kc-feedback-${tone}`} role={role}>
      {title ? <div className="kc-feedback-title">{title}</div> : null}
      <div>{message}</div>
      {retryError ? (
        <div className="kc-feedback-retry-error" role="alert">
          重试失败：{retryError}
        </div>
      ) : null}
      {retry ? (
        <div>
          <Button variant="outline" size="sm" loading={retryState === 'retrying'} onClick={handleRetry}>
            {retry.label}
          </Button>
        </div>
      ) : null}
      {dismissible && onDismiss ? (
        <div>
          <button type="button" className="kc-feedback-dismiss" onClick={onDismiss}>
            {dismissLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
}
