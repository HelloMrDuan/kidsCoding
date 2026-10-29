import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { assessmentQuestions } from '@/content/assessment/questions'

import { AssessmentForm } from './assessment-form'

describe('AssessmentForm', () => {
  it('renders a guided assessment layout with short clear progress copy', () => {
    render(
      <AssessmentForm
        ageBand="age_9_12"
        questions={assessmentQuestions.slice(0, 2)}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByTestId('assessment-form')).toBeInTheDocument()
    expect(screen.getByText('轻量判断')).toBeInTheDocument()
    expect(screen.getByText('第 1 / 2 题')).toBeInTheDocument()
  })

  it('restores an in-progress assessment from saved answers', () => {
    const questions = assessmentQuestions.slice(0, 2)
    const first = questions[0].options[0]

    render(
      <AssessmentForm
        ageBand="age_9_12"
        questions={questions}
        initialAnswers={[
          { questionId: questions[0].id, optionId: first.id, score: first.score },
        ]}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByText('第 2 / 2 题')).toBeInTheDocument()
  })

  it('reports each intermediate answer so the page can persist it', () => {
    const onProgress = vi.fn()

    render(
      <AssessmentForm
        ageBand="age_9_12"
        questions={assessmentQuestions.slice(0, 2)}
        onProgress={onProgress}
        onComplete={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '一件一件按顺序排好' }))

    expect(onProgress).toHaveBeenCalledTimes(1)
    expect(onProgress.mock.calls[0][0]).toHaveLength(1)
  })
})
