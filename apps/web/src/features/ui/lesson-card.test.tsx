import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LessonCard } from './lesson-card'

// UX-003: LessonCard = the V2 prototype map .step node. Positive tests
// cover all five states and real interactivity; negative tests prove locked
// / unreleased are never focusable or activatable.

const lesson = { id: 'lesson-03-story', title: '第 3 课 第一个故事', sortOrder: 3 }
const longLesson = {
  id: 'lesson-long',
  title: '这是一个非常非常非常非常非常非常非常非常非常非常长的课程标题应该被省略而不是溢出',
  sortOrder: 12,
}

describe('LessonCard states', () => {
  it('completed renders the done node (✓) and 已完成', () => {
    render(<LessonCard lesson={lesson} state="completed" href="/learn/lesson/lesson-03-story" />)
    const card = screen.getByTestId('lesson-card-lesson-03-story')
    expect(card).toHaveClass('kc-step-done')
    expect(card.tagName).toBe('A')
    expect(card).toHaveTextContent('✓')
    expect(card).toHaveTextContent('已完成')
  })

  it('current renders the current node and 当前练习', () => {
    render(<LessonCard lesson={lesson} state="current" href="/learn/lesson/lesson-03-story" />)
    const card = screen.getByTestId('lesson-card-lesson-03-story')
    expect(card).toHaveClass('kc-step-current')
    expect(card).toHaveTextContent('03')
    expect(card).toHaveTextContent('当前练习')
  })

  it('available renders the plain node and 可以开始', () => {
    render(<LessonCard lesson={lesson} state="available" href="/learn/lesson/lesson-03-story" />)
    const card = screen.getByTestId('lesson-card-lesson-03-story')
    expect(card).not.toHaveClass('kc-step-done')
    expect(card).not.toHaveClass('kc-step-current')
    expect(card).not.toHaveClass('kc-step-locked')
    expect(card).toHaveTextContent('可以开始')
  })

  it('locked renders a non-focusable span with 已锁定 and aria-disabled', () => {
    render(<LessonCard lesson={lesson} state="locked" />)
    const card = screen.getByTestId('lesson-card-lesson-03-story')
    expect(card.tagName).toBe('SPAN')
    expect(card).toHaveClass('kc-step-locked')
    expect(card).toHaveAttribute('aria-disabled', 'true')
    expect(card).toHaveTextContent('已锁定')
  })

  it('unreleased reuses the locked visual with 未开放 and aria-disabled', () => {
    render(<LessonCard lesson={lesson} state="unreleased" />)
    const card = screen.getByTestId('lesson-card-lesson-03-story')
    expect(card.tagName).toBe('SPAN')
    expect(card).toHaveClass('kc-step-locked')
    expect(card).toHaveAttribute('aria-disabled', 'true')
    expect(card).toHaveTextContent('未开放')
  })

  it('never invents a locked state: the caller supplies the state explicitly', () => {
    // A later lesson with an available state stays interactive; the
    // component does not auto-lock by sortOrder.
    render(<LessonCard lesson={longLesson} state="available" href="/learn/lesson/lesson-long" />)
    const card = screen.getByTestId('lesson-card-lesson-long')
    expect(card.tagName).toBe('A')
    expect(card).not.toHaveClass('kc-step-locked')
  })
})

describe('LessonCard interactivity', () => {
  it('href renders a real anchor with the real lesson URL', () => {
    render(<LessonCard lesson={lesson} state="current" href="/learn/lesson/lesson-03-story" />)
    expect(screen.getByTestId('lesson-card-lesson-03-story')).toHaveAttribute(
      'href',
      '/learn/lesson/lesson-03-story',
    )
  })

  it('onSelect renders a button that fires on click', () => {
    const onSelect = vi.fn()
    render(<LessonCard lesson={lesson} state="current" onSelect={onSelect} />)
    const card = screen.getByTestId('lesson-card-lesson-03-story')
    expect(card.tagName).toBe('BUTTON')
    fireEvent.click(card)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('interactive cards are focusable by keyboard', () => {
    const onSelect = vi.fn()
    render(<LessonCard lesson={lesson} state="current" onSelect={onSelect} />)
    const card = screen.getByTestId('lesson-card-lesson-03-story')
    ;(card as HTMLElement).focus()
    expect(document.activeElement).toBe(card)
  })

  it('locked cards are NOT focusable and cannot be activated', () => {
    render(<LessonCard lesson={lesson} state="locked" />)
    const card = screen.getByTestId('lesson-card-lesson-03-story')
    ;(card as HTMLElement).focus()
    expect(document.activeElement).not.toBe(card)
    fireEvent.click(card)
    // No handler exists: a click on the span does nothing.
    expect(document.activeElement).not.toBe(card)
  })

  it('unreleased cards are NOT focusable', () => {
    render(<LessonCard lesson={lesson} state="unreleased" />)
    const card = screen.getByTestId('lesson-card-lesson-03-story')
    ;(card as HTMLElement).focus()
    expect(document.activeElement).not.toBe(card)
  })
})

describe('LessonCard long titles', () => {
  it('renders the full long title in the DOM (ellipsis is visual, via .kc-step b)', () => {
    render(<LessonCard lesson={longLesson} state="available" href="/learn/lesson/lesson-long" />)
    const title = screen.getByTestId('lesson-card-lesson-long').querySelector('b')
    expect(title).toHaveTextContent(longLesson.title)
  })
})
