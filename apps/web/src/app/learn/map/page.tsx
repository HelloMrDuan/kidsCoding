'use client'

import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore } from 'react'

import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { useLaunchCurriculum } from '@/features/curriculum/use-launch-curriculum'
import { MapView } from '@/features/lessons/map-view'
import {
  defaultOnboardingSession,
  readOnboardingSession,
  subscribeOnboardingSession,
} from '@/features/onboarding/onboarding-session'
import {
  defaultGuestProgress,
  readGuestProgress,
  subscribeGuestProgress,
} from '@/features/progress/local-progress'

const startLevelLabels = {
  starter: '启蒙起点',
  foundation: '基础起点',
  advanced: '进阶起点',
} as const

export default function LearnMapPage() {
  const curriculum = useLaunchCurriculum()
  const { allLessons } = buildLaunchMap(curriculum.lessons)
  const [hasCourseEntitlement, setHasCourseEntitlement] = useState(false)
  const progress = useSyncExternalStore(
    subscribeGuestProgress,
    readGuestProgress,
    () => defaultGuestProgress,
  )
  const onboarding = useSyncExternalStore(
    subscribeOnboardingSession,
    readOnboardingSession,
    () => defaultOnboardingSession,
  )
  const recommendedLevel = onboarding.recommendedLevel ?? 'starter'

  useEffect(() => {
    let isActive = true

    fetch('/api/course-access')
      .then(async (response) => {
        if (!response.ok) {
          return { hasLaunchPack: false }
        }

        return (await response.json()) as { hasLaunchPack?: boolean }
      })
      .then((payload) => {
        if (isActive) {
          setHasCourseEntitlement(Boolean(payload.hasLaunchPack))
        }
      })
      .catch(() => {})

    return () => {
      isActive = false
    }
  }, [])

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef9ff_0%,#fffaf0_100%)] px-4 py-6 md:px-6 md:py-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="grid gap-6 rounded-[2.25rem] bg-white px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:px-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-4">
            <p className="inline-flex rounded-full bg-[#eef8ff] px-4 py-2 text-sm font-semibold text-sky-700">
              推荐起点：{startLevelLabels[recommendedLevel]}
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                学习地图
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600 md:text-lg md:leading-8">
                先沿着启蒙路线做出第一支故事，再把一个个小作品拼成完整毕业作品。孩子知道下一步做什么，家长也看得懂为什么值得继续。
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.75rem] bg-[linear-gradient(180deg,#fff7eb_0%,#ffffff_100%)] p-5 text-sm font-semibold text-slate-700 shadow-[0_12px_30px_rgba(255,162,84,0.12)]">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[1.25rem] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">星星</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{progress.stars}</p>
              </div>
              <div className="rounded-[1.25rem] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">徽章</p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {progress.badgeIds.length}
                </p>
              </div>
              <div className="rounded-[1.25rem] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">卡片</p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {progress.cardIds.length}
                </p>
              </div>
            </div>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
              href="/cards"
            >
              打开我的卡册
            </Link>
          </div>
        </header>

        <MapView
          hasCourseEntitlement={hasCourseEntitlement}
          lessons={allLessons}
          progress={progress}
        />
      </section>
    </main>
  )
}
