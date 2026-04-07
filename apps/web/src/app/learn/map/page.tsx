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
  const { allLessons, foundationUnits } = buildLaunchMap(curriculum.lessons)
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
  const nextLesson =
    allLessons.find((lesson) => !progress.completedLessonIds.includes(lesson.id)) ??
    allLessons.find((lesson) => lesson.id === progress.currentLessonId) ??
    allLessons.at(-1)
  const currentUnit =
    foundationUnits.find((unit) => unit.lessonIds.includes(nextLesson?.id ?? '')) ??
    foundationUnits[0]

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
        <header className="grid gap-6 rounded-[2.25rem] bg-white px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:px-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="inline-flex rounded-full bg-[#eef8ff] px-4 py-2 text-sm font-semibold text-sky-700">
              推荐起点：{startLevelLabels[recommendedLevel]}
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                学习地图
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600 md:text-lg md:leading-8">
                先沿着启蒙路线做出完整小故事，再自然走向高阶创作。这里先告诉孩子现在在哪一段，也告诉家长下一步为什么值得继续。
              </p>
            </div>
          </div>

          <div className="grid gap-4 rounded-[1.9rem] bg-[linear-gradient(180deg,#fff9ef_0%,#f6fbff_100%)] p-5 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
            <div className="rounded-[1.4rem] bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                当前单元
              </p>
              <h2 className="mt-3 text-2xl font-black text-slate-950">
                {currentUnit?.title ?? '启蒙路线'}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {currentUnit?.summary ?? '先沿着成长路线继续往前走。'}
              </p>
            </div>

            <div className="rounded-[1.4rem] bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                下一步去哪
              </p>
              <h3 className="mt-3 text-xl font-black text-slate-950">
                {nextLesson?.title ?? '继续当前作品'}
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {nextLesson?.goal ?? '继续把今天的小作品往前推进。'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
                星星 {progress.stars}
              </span>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
                徽章 {progress.badgeIds.length}
              </span>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
                卡片 {progress.cardIds.length}
              </span>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
                href="/cards"
              >
                打开我的卡册
              </Link>
            </div>
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
