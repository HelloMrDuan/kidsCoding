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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f7ff_0%,#fff9ff_40%,#eef8ff_100%)] px-4 py-6 md:px-6 md:py-8">
      <section className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="rounded-[2.5rem] bg-[linear-gradient(180deg,#fcf8ff_0%,#f3efff_100%)] px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:px-8">
          <p className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
            第二步
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl md:leading-[1.05]">
            再用几道小题把起点收准一点
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            这不是考试。每次只选一个最像的答案，做完我们就直接把孩子送进学习地图。
          </p>

          <div className="mt-6 space-y-3">
            <div className="rounded-[1.5rem] bg-white/90 px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-semibold text-slate-500">现在要做什么</p>
              <p className="mt-2 text-base font-bold leading-7 text-slate-900">
                选一个最接近孩子真实情况的答案。
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white/90 px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-semibold text-slate-500">做完会去哪</p>
              <p className="mt-2 text-base font-bold leading-7 text-slate-900">
                系统会推荐一个开始位置，然后直接进入 12 节启蒙课的学习地图。
              </p>
            </div>
          </div>
        </aside>

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
