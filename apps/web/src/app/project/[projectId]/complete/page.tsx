'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSyncExternalStore } from 'react'

import { cardDefinitions } from '@/content/cards/card-definitions'
import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { useLaunchCurriculum } from '@/features/curriculum/use-launch-curriculum'
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
  const curriculum = useLaunchCurriculum()
  const { allLessons } = buildLaunchMap(curriculum.lessons)
  const lesson = allLessons.find((item) => item.id === projectId)

  if (!lesson) {
    return <main className="p-6 text-lg font-semibold">没有找到这个作品。</main>
  }

  const isFoundationGraduate = lesson.id === 'lesson-12-graduation-show'
  const visibleRewardIds = new Set([
    lesson.rewardCardId,
    'growth-first-project',
    'growth-three-day-streak',
    'commemorative-foundation-graduate',
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
          当前累计 {progress.stars} 颗星星，已收集 {progress.cardIds.length} 张卡片。
          {isFoundationGraduate
            ? '你已经完成启蒙毕业作品，可以回看自己的双角色互动故事，再决定是否进入更复杂的高阶创作路线。'
            : '现在可以回到学习地图，继续挑战下一课。'}
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
        {isFoundationGraduate ? (
          <div className="mt-8 rounded-[1.5rem] bg-violet-50 px-6 py-5 text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-700">
              启蒙毕业
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              你的第一部双角色互动故事已经完成
            </h2>
            <p className="mt-3 text-base leading-8 text-slate-700">
              接下来可以先回看毕业作品，再看看高阶创作路线能不能帮助孩子做出更长、更有互动感的故事。
            </p>
          </div>
        ) : null}
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
          {isFoundationGraduate ? (
            <Link
              className="rounded-full border border-violet-200 px-6 py-4 text-lg font-bold text-violet-700"
              href="/parent/purchase"
            >
              查看高阶创作路线
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  )
}
