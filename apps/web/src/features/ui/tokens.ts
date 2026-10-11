/** Approved V2 values, not a new design. See VISUAL-LOCK.md.
 * Muted/state small text has a recorded AA gap; do not silently darken it.
 * CSS parity is checked against globals.css and the complete approved prototype.
 */
export const uiTokens = {
  color: {
    nav: '#152238', navSecondary: '#1c2c46', navEnd: '#112039', navText: '#bbcadc',
    action: '#2463eb', actionDark: '#1748b2', actionHover: '#1d54cb',
    surface: '#ffffff', canvas: '#f3f6fb', text: '#18243a', textMuted: '#6f7d92',
    line: '#e7edf5', success: '#148767', warning: '#ad6b20', danger: '#d64c4c', focus: '#84afff',
  },
  radius: { button: '8px', panel: '14px', pane: '10px' },
  shadow: { panel: '0 10px 32px rgba(30, 57, 96, 0.055)' },
  font: {
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif",
    code: "Consolas, 'Courier New', monospace",
    sizeBody: '14px', sizeSmall: '12px', sizeTitle: '26px', lineHeightBody: '1.55',
  },
  space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px' },
  layout: {
    sidebarWidth: '222px', sidebarCollapsedWidth: '74px', topbarHeight: '76px',
    topbarTabletHeight: '64px', topbarMobileHeight: '58px', mobileNavHeight: '62px', contentMaxWidth: '1700px',
  },
  breakpoint: { compact: 1180, tablet: 860, mobile: 600 },
  button: { paddingY: '10px', paddingX: '16px' },
} as const

/** Owner instruction 2026-10-11: strictly preserve prototype text colors, record AA gaps. */
export const v2ContrastLimitations = {
  smallTextOnWhite: ['textMuted', 'success', 'warning', 'danger'],
  focusOnWhite: { color: 'focus', minimumNonTextRatio: 3 },
} as const
