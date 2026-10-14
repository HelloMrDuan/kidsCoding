import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { useRef, useState } from 'react'

/**
 * UX-002 shared button. Visuals mirror the approved prototype
 * (docs/design/kidscoding-v2/prototype.html: .button, .button-outline,
 * .button-dark, .button-invert, .button-sm) via .kc-action-surface and the
 * .kc-btn-* classes in globals.css. No new layout or palette is introduced.
 *
 * Real behavior, not a shell:
 * - Native <button>, so the browser provides Enter/Space activation and tab
 *   order. `type` defaults to "button" so it never submits a form by accident.
 * - `disabled` uses the native attribute: no click, no focus, no activation.
 * - `loading` disables interaction (prevents double-submit), shows a spinner,
 *   and sets aria-busy. An async onClick also drives the loading state until
 *   it settles; a rejection is reported via onError when provided and never
 *   presented as success.
 */
export type ButtonVariant = 'primary' | 'outline' | 'dark' | 'invert'
export type ButtonSize = 'md' | 'sm'

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick' | 'disabled'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>
  /** Called when an async onClick rejects. Without it the rejection surfaces. */
  onError?: (error: unknown) => void
  children: ReactNode
}

const variantClass: Record<ButtonVariant, string> = {
  primary: '',
  outline: 'kc-btn-outline',
  dark: 'kc-btn-dark',
  invert: 'kc-btn-invert',
}

function isThenable(value: unknown): value is PromiseLike<void> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then: unknown }).then === 'function'
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  onError,
  children,
  className,
  ...rest
}: ButtonProps) {
  const [pending, setPending] = useState(false)
  // Guards programmatic clicks while an async handler is still running.
  const pendingRef = useRef(false)
  const busy = loading || pending
  const inactive = disabled || busy

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (inactive || pendingRef.current) return
    const result = onClick?.(event)
    if (!isThenable(result)) return
    pendingRef.current = true
    setPending(true)
    result.then(
      () => {
        pendingRef.current = false
        setPending(false)
      },
      (error: unknown) => {
        pendingRef.current = false
        setPending(false)
        if (onError) {
          onError(error)
          return
        }
        throw error
      },
    )
  }

  const classes = [
    'kc-action-surface',
    variantClass[variant],
    size === 'sm' ? 'kc-btn-sm' : '',
    inactive ? 'kc-btn-disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={inactive}
      aria-busy={busy || undefined}
      onClick={handleClick}
    >
      {busy ? <span className="kc-btn-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  )
}
