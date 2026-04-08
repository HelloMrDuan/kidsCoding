'use client'

import { useRouter } from 'next/navigation'

import type { AgeBand } from '@/features/domain/types'

import {
  readOnboardingSession,
  writeOnboardingSession,
} from './onboarding-session'

const options: Array<{ id: AgeBand; title: string; subtitle: string }> = [
  {
    id: 'age_6_8',
    title: '6-8 岁',
    subtitle: '更少文字、更多引导，适合先从做出来开始建立兴趣。',
  },
  {
    id: 'age_9_12',
    title: '9-12 岁',
    subtitle: '理解力更强，可以更快进入故事搭建和互动逻辑。',
  },
  {
    id: 'age_13_plus',
    title: '13 岁以上',
    subtitle: '节奏更快，后面更适合继续进入更复杂一点的创作升级。',
  },
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
    <section
      className="rounded-[2.5rem] bg-white px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:px-8"
      data-testid="age-band-form"
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
          选择年龄入口
        </p>
        <h2 className="text-3xl font-black text-slate-950">选一个最接近的年龄段</h2>
        <p className="text-base leading-7 text-slate-600">
          不用想太久，先选最接近的一项。后面的轻量判断会继续帮你把起点收准。
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.id}
            className="rounded-[1.9rem] border border-amber-200 bg-[linear-gradient(180deg,#fffdf8_0%,#fff6ea_100%)] p-6 text-left shadow-[0_14px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_18px_32px_rgba(255,153,83,0.12)]"
            data-testid={`age-band-${option.id}`}
            onClick={() => chooseAgeBand(option.id)}
            type="button"
          >
            <p className="text-2xl font-black text-slate-950">{option.title}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{option.subtitle}</p>
            <span className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm">
              选这个开始
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
