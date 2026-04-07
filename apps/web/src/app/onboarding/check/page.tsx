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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f6f7ff_0%,#fdf7ff_42%,#eef9ff_100%)] px-4 py-6 md:px-6 md:py-8">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.88fr_1.12fr]">
        <aside className="rounded-[2.4rem] bg-[linear-gradient(180deg,#fbf7ff_0%,#f4efff_100%)] px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:px-8">
          <p className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
            第二步
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl md:leading-[1.05]">
            用几道轻量小题把起点再收准一点
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            这不是考试，也不会把孩子拦在门外。它只是在帮我们判断，孩子更适合从哪里开始学，才能更快做出第一个作品。
          </p>

          <div className="mt-6 grid gap-3">
            <article className="rounded-[1.4rem] bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-semibold text-slate-500">你会看到什么</p>
              <p className="mt-2 text-base font-bold leading-7 text-slate-900">
                每次只回答一小题，题目短、选项少，不会让孩子有压力。
              </p>
            </article>
            <article className="rounded-[1.4rem] bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-semibold text-slate-500">完成后会去哪里</p>
              <p className="mt-2 text-base font-bold leading-7 text-slate-900">
                我们会直接把孩子放到对应的学习地图里，马上进入启蒙主线。
              </p>
            </article>
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
