'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'

import { storyPathLessons } from '@/content/lessons/story-path'
import {
  defaultOnboardingSession,
  readOnboardingSession,
  subscribeOnboardingSession,
} from '@/features/onboarding/onboarding-session'
import { MapView } from '@/features/lessons/map-view'
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

  return (
    <main className="min-h-screen bg-[#eef8ff] px-6 py-10">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 rounded-[2rem] bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-600">
              推荐起点：{startLevelLabels[recommendedLevel]}
            </p>
            <h1 className="text-3xl font-black text-slate-950">学习地图</h1>
            <p className="mt-2 text-sm text-slate-600">
              已获得 {progress.stars} 颗星星 · 已获得 {progress.badgeIds.length} 枚徽章 ·
              已收集 {progress.cardIds.length} 张卡片
            </p>
          </div>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 font-bold text-slate-800"
            href="/cards"
          >
            打开我的卡册
          </Link>
        </header>
        <MapView lessons={storyPathLessons} progress={progress} />
      </section>
    </main>
  )
}
