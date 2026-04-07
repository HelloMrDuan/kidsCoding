import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { assessmentQuestions } from '@/content/assessment/questions'

import { AssessmentForm } from './assessment-form'

describe('AssessmentForm', () => {
  it('renders a guided assessment layout with progress copy', () => {
    render(
      <AssessmentForm
        ageBand="age_9_12"
        questions={assessmentQuestions.slice(0, 2)}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByTestId('assessment-form')).toBeInTheDocument()
    expect(screen.getByText('轻量小测评')).toBeInTheDocument()
    expect(screen.getByText('第 1 / 2 题')).toBeInTheDocument()
  })

  it('walks through questions and emits a recommended level', () => {
    const onComplete = vi.fn()

    render(
      <AssessmentForm
        ageBand="age_9_12"
        questions={assessmentQuestions.slice(0, 2)}
        onComplete={onComplete}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '一个一个排好顺序' }))
    fireEvent.click(screen.getByRole('button', { name: '让它重复同一个动作' }))

    expect(onComplete).toHaveBeenCalled()
  })
})
