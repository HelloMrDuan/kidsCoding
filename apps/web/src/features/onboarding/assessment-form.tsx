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
    <div
      className="rounded-[2.5rem] bg-white px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:px-8"
      data-testid="assessment-form"
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-700">
          轻量小测
        </p>
        <div className="flex items-center justify-between gap-4">
          <p className="text-base font-bold text-slate-600">
            第 {index + 1} / {questions.length} 题
          </p>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#a78bfa_0%,#7dd3fc_100%)]"
              style={{ width: `${((index + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[1.9rem] bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        <p className="text-sm font-semibold text-slate-500">当前问题</p>
        <h1 className="mt-3 text-2xl font-black text-slate-950">{question.prompt}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          选一个最接近孩子真实情况的答案就可以，不需要想太久。
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        {question.options.map((option) => (
          <button
            key={option.id}
            className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-5 py-4 text-left text-base font-semibold text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:border-sky-300 hover:bg-sky-50"
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
