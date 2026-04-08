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
    <section
      className="kc-surface-3d px-6 py-7 md:px-8"
      data-testid="assessment-form"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-black tracking-[0.24em] text-violet-700">
            轻量判断
          </p>
          <p className="text-sm font-black text-slate-500">
            第 {index + 1} / {questions.length} 题
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#a78bfa_0%,#7dd3fc_100%)]"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="kc-panel-3d mt-6 p-5">
        <p className="text-sm font-semibold text-slate-500">当前问题</p>
        <h1 className="mt-3 text-2xl font-black text-[var(--kc-text-strong)]">{question.prompt}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          选一个最接近孩子真实情况的答案就可以，不需要想太久。
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        {question.options.map((option) => (
          <button
            key={option.id}
            className="kc-panel-3d px-5 py-4 text-left text-base font-black text-slate-800 transition hover:border-sky-300 hover:bg-sky-50"
            data-testid={`assessment-option-${question.id}-${option.id}`}
            onClick={() => choose(option)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}
