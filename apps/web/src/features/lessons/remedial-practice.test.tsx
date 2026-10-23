import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { remedialLessons } from '@/content/curriculum/remedial-lessons'

import { RemedialPractice } from './remedial-practice'

const practice = remedialLessons.find((item) => item.id === 'remedial-switch-character')!.practice!

describe('switch remedial practice (TQ-015)', () => {
  it('moves only the current actor: fox, switch, then bear', () => {
    render(<RemedialPractice practice={practice} />)
    expect(screen.getByTestId('remedial-active-actor')).toHaveTextContent('小狐狸')

    fireEvent.click(screen.getByTestId('remedial-card-move_right'))
    expect(screen.getByTestId('remedial-fox-steps')).toHaveTextContent('已走 100 步')
    expect(screen.getByTestId('remedial-bear-steps')).toHaveTextContent('已走 0 步')

    // Moving again before switching is gently corrected, not silently applied to the bear.
    fireEvent.click(screen.getByTestId('remedial-card-move_right'))
    expect(screen.getByTestId('remedial-nudge')).toHaveTextContent('切换')
    expect(screen.getByTestId('remedial-bear-steps')).toHaveTextContent('已走 0 步')

    fireEvent.click(screen.getByTestId('remedial-card-switch_character'))
    expect(screen.getByTestId('remedial-active-actor')).toHaveTextContent('小熊')

    fireEvent.click(screen.getByTestId('remedial-card-move_right'))
    expect(screen.getByTestId('remedial-bear-steps')).toHaveTextContent('已走 100 步')
    expect(screen.getByTestId('remedial-success')).toHaveTextContent('切换之后')
  })

  it('asks for the fox move before the switch', () => {
    render(<RemedialPractice practice={practice} />)
    fireEvent.click(screen.getByTestId('remedial-card-switch_character'))
    expect(screen.getByTestId('remedial-nudge')).toHaveTextContent('先让小狐狸走 100 步')
    expect(screen.getByTestId('remedial-active-actor')).toHaveTextContent('小狐狸')
  })
})
