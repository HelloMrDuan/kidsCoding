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
    <main className="min-h-screen bg-[#f7f2ff] px-6 py-10">
      <section className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">
            第二步
          </p>
          <h1 className="text-4xl font-black text-slate-950">轻松小测试</h1>
          <p className="text-base leading-7 text-slate-600">
            回答几道小题，我们会帮你找到更合适的学习起点。
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
