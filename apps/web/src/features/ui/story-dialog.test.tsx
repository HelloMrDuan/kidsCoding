import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StoryDialog } from './story-dialog'

// UX-003: StoryDialog is an INLINE story guide, not a modal. Negative
// tests prove it carries no dialog semantics, no focus trap, no Esc logic.

const base = {
  title: '如何让两个角色依次说话？',
  paragraphs: ['你已经能让第一个角色移动。现在请给第二个角色添加对白。'],
  dialogue: [
    { speaker: '小熊', text: '你好！' },
    { speaker: '小兔', text: '你好呀，一起玩吧！' },
  ],
  objectives: [
    { text: '第一个角色向右移动', done: true },
    { text: '第二个角色说出“你好！”', done: false },
  ],
}

describe('StoryDialog content', () => {
  it('renders the pane header, task mark, title, paragraphs, dialogue and objectives', () => {
    render(<StoryDialog {...base} stepLabel="STEP 03" />)
    const dialog = screen.getByTestId('story-dialog')
    expect(dialog).toHaveTextContent('故事引导')
    expect(dialog).toHaveTextContent('STEP 03')
    expect(dialog).toHaveTextContent('STORY / 故事引导')
    expect(dialog).toHaveTextContent('如何让两个角色依次说话？')
    expect(dialog).toHaveTextContent('你已经能让第一个角色移动。')
    expect(dialog).toHaveTextContent('小熊')
    expect(dialog).toHaveTextContent('你好！')
    expect(dialog).toHaveTextContent('小兔')
    expect(dialog).toHaveTextContent('完成目标')
    expect(dialog).toHaveTextContent('✓ 第一个角色向右移动')
    expect(dialog).toHaveTextContent('○ 第二个角色说出“你好！”')
  })

  it('omits the dialogue and objective sections when they are empty', () => {
    render(<StoryDialog title={base.title} paragraphs={base.paragraphs} />)
    const dialog = screen.getByTestId('story-dialog')
    expect(dialog.querySelector('.kc-story-lines')).toBeNull()
    expect(dialog.querySelector('.kc-objective')).toBeNull()
  })

  it('omits the step chip when no step label is given', () => {
    render(<StoryDialog {...base} />)
    expect(screen.getByTestId('story-dialog').querySelector('.kc-chip')).toBeNull()
  })

  it('renders a long title in full in the DOM', () => {
    const longTitle = '这是一个非常非常非常非常非常非常非常非常非常长的故事标题应该正常显示'
    render(<StoryDialog title={longTitle} paragraphs={[]} />)
    expect(screen.getByTestId('story-dialog').querySelector('h3')).toHaveTextContent(longTitle)
  })
})

describe('StoryDialog is NOT a modal (negative)', () => {
  it('uses no dialog element, no dialog role, no modal attributes', () => {
    const { container } = render(<StoryDialog {...base} />)
    expect(container.querySelector('dialog')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('story-dialog')).not.toHaveAttribute('aria-modal')
    expect(screen.getByTestId('story-dialog').tagName).toBe('SECTION')
  })

  it('has no focus trap or Esc-close wiring: no tabIndex -1, no inert', () => {
    render(<StoryDialog {...base} />)
    const dialog = screen.getByTestId('story-dialog')
    expect(dialog.querySelector('[tabindex="-1"]')).toBeNull()
    expect(dialog.querySelector('[inert]')).toBeNull()
    expect(dialog).not.toHaveAttribute('inert')
  })
})
