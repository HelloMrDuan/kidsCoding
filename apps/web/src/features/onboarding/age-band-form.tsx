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
    subtitle: '更少文字、更多引导，最适合从“先做出来”开始建立兴趣。',
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
      className="kc-surface-3d px-6 py-7 md:px-8"
      data-testid="age-band-form"
    >
      <div className="space-y-2">
        <p className="text-sm font-black tracking-[0.24em] text-[#ff7c26]">
          选择年龄入口
        </p>
        <h2 className="text-3xl font-black text-[var(--kc-text-strong)]">
          选一个最接近的年龄段
        </h2>
        <p className="text-base leading-7 text-[var(--kc-text-soft)]">
          不用想太久，先选最接近的一项。后面的轻量判断会继续帮你把起点收准。
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.id}
            className="kc-panel-3d text-left transition hover:-translate-y-1 hover:shadow-[var(--kc-shadow-deep)]"
            data-testid={`age-band-${option.id}`}
            onClick={() => chooseAgeBand(option.id)}
            type="button"
          >
            <div className="p-6">
              <p className="text-2xl font-black text-[var(--kc-text-strong)]">{option.title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{option.subtitle}</p>
              <span className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-sm">
                选这个开始
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
