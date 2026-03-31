'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSyncExternalStore } from 'react'

import { cardDefinitions } from '@/content/cards/card-definitions'
import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import {
  defaultGuestProgress,
  readGuestProgress,
  subscribeGuestProgress,
} from '@/features/progress/local-progress'

export default function ProjectCompletePage() {
  const params = useParams<{ projectId: string }>()
  const projectId = Array.isArray(params.projectId)
    ? params.projectId[0]
    : params.projectId
  const progress = useSyncExternalStore(
    subscribeGuestProgress,
    readGuestProgress,
    () => defaultGuestProgress,
  )
  const { allLessons } = buildLaunchMap()
  const lesson = allLessons.find((item) => item.id === projectId)

  if (!lesson) {
    return <main className="p-6 text-lg font-semibold">没有找到这个作品。</main>
  }

  const visibleRewardIds = new Set([
    lesson.rewardCardId,
    'growth-first-project',
    'growth-three-day-streak',
  ])
  const rewardCards = cardDefinitions.filter(
    (card) => progress.cardIds.includes(card.id) && visibleRewardIds.has(card.id),
  )

  return (
    <main className="min-h-screen bg-[#fff9ec] px-6 py-10">
      <section className="mx-auto max-w-4xl rounded-[2rem] bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">
          作品完成
        </p>
        <h1
          className="mt-4 text-4xl font-black text-slate-950"
          data-testid="project-complete-heading"
        >
          你完成了《{lesson.title}》
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          当前累计 {progress.stars} 颗星星，已收集 {progress.cardIds.length}{' '}
          张卡片。现在可以回到学习地图，继续挑战下一课。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700">
            获得 3 颗星星
          </span>
          <span className="rounded-full bg-sky-100 px-4 py-2 text-sm font-bold text-sky-700">
            获得徽章：lesson-{projectId}
          </span>
          {rewardCards.map((card) => (
            <span
              key={card.id}
              className="rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700"
            >
              获得卡片：{card.name}
            </span>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            className="rounded-full bg-orange-500 px-6 py-4 text-lg font-bold text-white"
            href="/auth/bind"
          >
            保存我的进度
          </Link>
          <Link
            className="rounded-full border border-slate-200 px-6 py-4 text-lg font-bold text-slate-800"
            href="/learn/map"
          >
            回到学习地图
          </Link>
        </div>
      </section>
    </main>
  )
}
