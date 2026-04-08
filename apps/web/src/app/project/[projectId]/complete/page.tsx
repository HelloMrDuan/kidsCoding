'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState, useSyncExternalStore } from 'react'

import { cardDefinitions } from '@/content/cards/card-definitions'
import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { useLaunchCurriculum } from '@/features/curriculum/use-launch-curriculum'
import { buildProjectCompletionCopy } from '@/features/projects/build-project-completion-copy'
import { ProjectCompleteCard } from '@/features/projects/project-complete-card'
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
  const [replayCount, setReplayCount] = useState(0)
  const snapshotBlocks =
    progress.projectSnapshots.find((snapshot) => snapshot.lessonId === projectId)
      ?.blocks ?? []

  if (!lesson) {
    return <main className="p-6 text-lg font-semibold">没有找到这个作品。</main>
  }

  const isFoundationGraduate = lesson.id === 'lesson-12-graduation-show'
  const completionCopy = buildProjectCompletionCopy(lesson.id)
  const visibleRewardIds = new Set([
    lesson.rewardCardId,
    'growth-first-project',
    'growth-three-day-streak',
    'commemorative-foundation-graduate',
  ])
  const rewardCards = cardDefinitions.filter(
    (card) => progress.cardIds.includes(card.id) && visibleRewardIds.has(card.id),
  )
  const primaryLabel = isFoundationGraduate
    ? '看看高阶创作阶段'
    : lesson.sortOrder % 3 === 0
      ? '继续下一单元'
      : '继续下一课'
  const primaryHref = isFoundationGraduate ? '/parent/purchase' : '/learn/map'

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fffdf8_0%,#fff4e2_38%,#eef8ff_100%)] px-6 py-10">
      <ProjectCompleteCard
        key={`${lesson.id}-${replayCount}`}
        blocks={snapshotBlocks}
        completionCopy={completionCopy}
        isFoundationGraduate={isFoundationGraduate}
        lessonTitle={lesson.title}
        onReplay={() => setReplayCount((count) => count + 1)}
        primaryHref={primaryHref}
        primaryLabel={primaryLabel}
        rewardCards={rewardCards}
        stars={progress.stars}
        totalCards={progress.cardIds.length}
      />

      <div className="mx-auto mt-5 flex max-w-5xl flex-wrap justify-center gap-3">
        <Link
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-[0_12px_24px_rgba(15,23,42,0.06)] transition hover:bg-slate-50"
          href="/auth/bind"
        >
          保存我的进度
        </Link>
        <Link
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-[0_12px_24px_rgba(15,23,42,0.06)] transition hover:bg-slate-50"
          href="/learn/map"
        >
          回到学习地图
        </Link>
      </div>
    </main>
  )
}
