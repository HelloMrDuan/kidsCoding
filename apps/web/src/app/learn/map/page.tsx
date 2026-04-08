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
        <header className="rounded-[2.25rem] bg-white px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-sky-100 px-4 py-2 text-sm font-bold text-sky-700">
              推荐起点：{startLevelLabels[recommendedLevel]}
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              当前单元：{currentUnit?.title ?? '启蒙主线'}
            </span>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                从这里继续学
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
                你现在只需要看两件事：当前在哪个单元，下一步点哪一课。先把启蒙 12 节走完，再去解锁后面的高阶创作。
              </p>
            </div>

            <div
              className="rounded-[1.75rem] bg-[linear-gradient(180deg,#fff9ed_0%,#eef8ff_100%)] p-5 shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
              data-testid="learning-map-focus-preview"
            >
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                下一步去这里
              </p>
              <h2 className="mt-3 text-2xl font-black text-slate-950">
                {nextLesson?.title ?? '继续当前作品'}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {nextLesson?.goal ?? '继续把今天的作品往前推进。'}
              </p>
              {nextLesson ? (
                <Link
                  className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"
                  data-testid="learning-map-primary-cta"
                  href={`/learn/lesson/${nextLesson.id}`}
                >
                  开始第 {nextLesson.sortOrder} 节
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
              已完成 {progress.completedLessonIds.length} / {allLessons.length} 节
            </span>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
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
