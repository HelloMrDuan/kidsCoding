'use client'

import { useState } from 'react'

import type {
  AgeBand,
  AssessmentAnswer,
  AssessmentQuestion,
} from '@/features/domain/types'

import { recommendStartLevel } from './recommend-start-level'

type AssessmentFormProps = {
  ageBand: AgeBand
  questions: AssessmentQuestion[]
  onComplete: (payload: {
    answers: AssessmentAnswer[]
    recommendedLevel: 'starter' | 'foundation' | 'advanced'
  }) => void
}

export function AssessmentForm({
  ageBand,
  questions,
  onComplete,
}: AssessmentFormProps) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([])

  const question = questions[index]

  function choose(option: AssessmentQuestion['options'][number]) {
    const nextAnswers = [
      ...answers,
      { questionId: question.id, optionId: option.id, score: option.score },
    ]

    if (index === questions.length - 1) {
      onComplete({
        answers: nextAnswers,
        recommendedLevel: recommendStartLevel(ageBand, nextAnswers),
      })
      return
    }

    setAnswers(nextAnswers)
    setIndex(index + 1)
  }

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-orange-500">
        第 {index + 1} / {questions.length} 题
      </p>
      <h1 className="mt-3 text-2xl font-black text-slate-950">
        {question.prompt}
      </h1>
      <div className="mt-6 grid gap-3">
        {question.options.map((option) => (
          <button
            key={option.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left text-base font-semibold text-slate-800 transition hover:border-sky-300 hover:bg-sky-50"
            data-testid={`assessment-option-${question.id}-${option.id}`}
            onClick={() => choose(option)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
