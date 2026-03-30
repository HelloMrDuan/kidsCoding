'use client'

import { useRouter } from 'next/navigation'

import type { AgeBand } from '@/features/domain/types'

import {
  readOnboardingSession,
  writeOnboardingSession,
} from './onboarding-session'

const options: Array<{ id: AgeBand; title: string; subtitle: string }> = [
  { id: 'age_6_8', title: '6-8 岁', subtitle: '更少文字，更强引导，更像闯关游戏。' },
  { id: 'age_9_12', title: '9-12 岁', subtitle: '最适合第一期，边玩边学编程逻辑。' },
  { id: 'age_13_plus', title: '13 岁以上', subtitle: '节奏更快，后续可继续进入进阶路线。' },
]

export function AgeBandForm() {
  const router = useRouter()

  function chooseAgeBand(ageBand: AgeBand) {
    const current = readOnboardingSession()

    writeOnboardingSession({
      ...current,
      ageBand,
      answers: [],
      recommendedLevel: null,
    })

    router.push('/onboarding/check')
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {options.map((option) => (
        <button
          key={option.id}
          className="rounded-[1.75rem] border border-amber-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-orange-300"
          data-testid={`age-band-${option.id}`}
          onClick={() => chooseAgeBand(option.id)}
          type="button"
        >
          <p className="text-2xl font-black text-slate-950">{option.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {option.subtitle}
          </p>
        </button>
      ))}
    </div>
  )
}
