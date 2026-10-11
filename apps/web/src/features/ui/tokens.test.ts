import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { uiTokens, v2ContrastLimitations } from './tokens'

const root = resolve(process.cwd(), '../..')
const css = readFileSync(resolve(root, 'apps/web/src/app/globals.css'), 'utf8')
const prototype = readFileSync(resolve(root, 'docs/design/kidscoding-v2/prototype.html'), 'utf8')
const inlinePrototype = readFileSync(resolve(root, 'docs/design/kidscoding-v2/KidsCoding-V2-Interactive.html'), 'utf8')
const normalize = (s: string) => s.replace(/\s/g, '').replace(/#ffffff/g, '#fff').replace(/0\.055/g, '.055')

function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const rgb = hex.slice(1).match(/../g)!.map(v => parseInt(v, 16) / 255)
      .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
  }
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

describe('frozen V2 design contract', () => {
  it('keeps both approved prototype styles identical', () => {
    const styles = (s: string) => s.match(/<style>([\s\S]*?)<\/style>/)![1].replace(/url\([^)]*\)/g, 'url(asset)')
    expect(styles(prototype)).toBe(styles(inlinePrototype))
  })
  it('keeps semantic colors aligned with approved prototype, not V1', () => {
    const mapping = { nav: 'nav', navSecondary: 'nav2', action: 'brand', actionDark: 'brand-dark',
      surface: 'surface', canvas: 'canvas', text: 'text', textMuted: 'muted', line: 'line',
      success: 'green', warning: 'warning', danger: 'danger' } as const
    for (const [key, name] of Object.entries(mapping)) {
      expect(normalize(prototype)).toContain(normalize(`--${name}:${uiTokens.color[key as keyof typeof mapping]}`))
    }
  })
  it('keeps all exported values aligned with shipped CSS and approved breakpoints', () => {
    for (const [group, values] of Object.entries(uiTokens)) {
      if (group === 'breakpoint') {
        for (const width of Object.values(values)) expect(prototype).toContain(`max-width:${width}px`)
        continue
      }
      for (const [key, value] of Object.entries(values)) {
        const prefix = group === 'color' || group === 'layout' ? '' : `${group}-`
        const name = key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)
        expect(normalize(css).includes(normalize(`--kc-${prefix}${name}:${value};`)), `CSS token ${group}.${key}`).toBe(true)
      }
    }
  })
  it('verifies AA for primary action, normal text and navy navigation', () => {
    expect(contrast(uiTokens.color.action, uiTokens.color.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(uiTokens.color.text, uiTokens.color.canvas)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(uiTokens.color.navText, uiTokens.color.nav)).toBeGreaterThanOrEqual(4.5)
  })
  it('exposes rather than hides the owner-retained AA exceptions', () => {
    for (const key of v2ContrastLimitations.smallTextOnWhite) {
      expect(contrast(uiTokens.color[key], uiTokens.color.surface)).toBeLessThan(4.5)
      expect(contrast(uiTokens.color[key], uiTokens.color.surface)).toBeGreaterThanOrEqual(3)
    }
    expect(contrast(uiTokens.color.focus, uiTokens.color.surface)).toBeLessThan(3)
  })
  it('retains old aliases for incremental page migration and removes global V1 decoration', () => {
    expect(css).toContain('--kc-accent-warm: var(--kc-action)')
    expect(css).toContain('--kc-surface-cream: var(--kc-canvas)')
    expect(css).not.toMatch(/radial-gradient|backdrop-filter|#fff8ef|#ff8b47|border-radius: 2/)
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
