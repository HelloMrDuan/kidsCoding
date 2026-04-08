'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { assessmentQuestions } from '@/content/assessment/questions'
import { AssessmentForm } from '@/features/onboarding/assessment-form'
import {
  readOnboardingSession,
  writeOnboardingSession,
} from '@/features/onboarding/onboarding-session'
import { readGuestProgress } from '@/features/progress/local-progress'
import { syncGuestSnapshot } from '@/features/progress/sync-guest-snapshot'

export default function AssessmentPage() {
  const router = useRouter()
  const session = readOnboardingSession()

  useEffect(() => {
    if (!session.ageBand) {
      router.replace('/onboarding/age')
    }
  }, [router, session.ageBand])

  if (!session.ageBand) {
    return null
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-6 md:py-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="kc-scene-shell rounded-[2.8rem] px-6 py-7 shadow-[var(--kc-shadow-soft)] md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">
              第二步
            </span>
            <span className="rounded-full bg-white/85 px-4 py-2 text-sm font-black text-slate-600">
              回答几道小问题，就能开始学
            </span>
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-[var(--kc-text-strong)] md:text-5xl">
            再用几道小题把起点收准
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--kc-text-soft)] md:text-lg">
            这不是考试。每次只选一个最像的答案，做完我们就直接带孩子进入学习地图。
          </p>
        </header>

        <AssessmentForm
          ageBand={session.ageBand}
          questions={assessmentQuestions}
          onComplete={async ({ answers, recommendedLevel }) => {
            const nextSession = {
              ...session,
              answers,
              recommendedLevel,
            }

            writeOnboardingSession(nextSession)
            await syncGuestSnapshot({
              onboarding: nextSession,
              progress: readGuestProgress(),
            })
            router.push('/learn/map')
          }}
        />
      </section>
    </main>
  )
}
