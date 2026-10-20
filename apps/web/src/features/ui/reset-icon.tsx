/**
 * TQ-010: the “↺” glyph renders as a stray character with some CJK fallback fonts,
 * so reset-style buttons use this inline icon instead. Decorative only: the button
 * text stays the accessible name.
 */
export function ResetIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      data-testid="reset-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M4 12a8 8 0 1 0 2.6-5.9L4 8.5" />
      <path d="M4 3.5v5h5" />
    </svg>
  )
}
