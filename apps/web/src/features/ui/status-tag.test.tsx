import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusTag } from './status-tag'

describe('StatusTag', () => {
  it('renders the label with the info tone by default', () => {
    render(<StatusTag>进行中</StatusTag>)
    const tag = screen.getByText('进行中')
    expect(tag.tagName).toBe('SPAN')
    expect(tag).toHaveClass('kc-chip', 'kc-chip-info')
  })

  it('renders each tone class', () => {
    const cases = [
      ['success', 'kc-chip-success'],
      ['warning', 'kc-chip-warning'],
      ['error', 'kc-chip-error'],
      ['neutral', 'kc-chip-neutral'],
    ] as const
    for (const [tone, cls] of cases) {
      const { unmount } = render(<StatusTag tone={tone}>标签</StatusTag>)
      expect(screen.getByText('标签')).toHaveClass('kc-chip', cls)
      unmount()
    }
  })

  it('is a static label, not a live region (no repeated announcements)', () => {
    render(<StatusTag tone="error">运行失败</StatusTag>)
    const tag = screen.getByText('运行失败')
    expect(tag).not.toHaveAttribute('role')
    expect(tag).not.toHaveAttribute('aria-live')
  })
})
