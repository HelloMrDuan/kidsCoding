'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState, useSyncExternalStore } from 'react'

import { cardDefinitions } from '@/content/cards/card-definitions'
import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { useLaunchCurriculum } from '@/features/curriculum/use-launch-curriculum'
import { buildProjectCompletionCopy } from '@/features/projects/build-project-completion-copy'
import { ProjectCompleteCard } from '@/features/projects/project-complete-card'
import { DuoProject } from '@/features/lessons/playable-stage/duo-project'
import { UnitProject } from '@/features/lessons/playable-stage/unit-project'
import { getUnitProject } from '@/content/curriculum/unit-projects'
import { resolveProjectContinueAction } from '@/features/projects/resolve-project-continue-action'
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
  if (isFoundationGraduate && (!progress.completedLessonIds.includes(lesson.id) || snapshotBlocks.length === 0)) {
    return <main className="min-h-screen bg-amber-50 p-6"><section className="mx-auto max-w-xl rounded-3xl bg-white p-6">
      <h1 className="text-2xl font-bold">毕业作品还未完成</h1><p className="my-4 leading-7">请回课堂实际运行、完成错误实验并保存作品，再领取毕业奖励。</p>
      <Link className="inline-flex min-h-11 items-center rounded-full bg-emerald-800 px-5 text-white" href={`/learn/lesson/${lesson.id}`}>回课堂继续寻宝</Link>
    </section></main>
  }
  // TQ-012: lessons 01–09 reopen the child's own saved program — only after the lesson was
  // really completed on this device (same gate as the graduation show).
  const unitProject = getUnitProject(lesson.id)
  if (unitProject && (!progress.completedLessonIds.includes(lesson.id) || snapshotBlocks.length === 0)) {
    // V2 surface: kc-panel card + kc-action-surface button (same as the unit project itself).
    return <main className="min-h-screen p-6"><section className="kc-panel mx-auto max-w-xl p-6" data-testid="unit-project-locked">
      <span className="kc-task-mark">我的单元作品</span>
      <h1 className="mt-3 text-2xl font-bold">《{unitProject.title}》还没有做好</h1><p className="kc-text-muted my-4 leading-7">这台电脑上还没有这节课的作品。先回课堂学完这节课，作品就会出现在这里。</p>
      <Link className="kc-action-surface inline-flex min-h-11 items-center" href={`/learn/lesson/${lesson.id}`}>回课堂完成这节课</Link>
    </section></main>
  }
  const completionCopy = buildProjectCompletionCopy(lesson.id)
  const currentTemplate = curriculum.templates.find(
    (item) => item.id === lesson.templateId,
  )
  const visibleRewardIds = new Set([
    lesson.rewardCardId,
    'growth-first-project',
    'growth-three-day-streak',
    'commemorative-foundation-graduate',
  ])
  const rewardCards = cardDefinitions.filter(
    (card) => progress.cardIds.includes(card.id) && visibleRewardIds.has(card.id),
  )
  const continueAction = resolveProjectContinueAction(allLessons, lesson.id)

  return (
    <main className={`min-h-screen bg-[radial-gradient(circle_at_top,#fffdf8_0%,#fff4e2_38%,#eef8ff_100%)] ${isFoundationGraduate ? 'px-3 py-6 md:px-6 md:py-10' : 'px-6 py-10'}`}>
      <ProjectCompleteCard
        key={`${lesson.id}-${replayCount}`}
        blocks={snapshotBlocks}
        playableProject={unitProject
          ? <UnitProject lessonId={lesson.id} key={lesson.id} initialBlocks={snapshotBlocks}/>
          : ['lesson-10-second-friend', 'lesson-11-duo-rehearsal', 'lesson-12-graduation-show'].includes(lesson.id) ? <DuoProject lessonId={lesson.id} key={`${lesson.id}:${snapshotBlocks.length > 0}`} initialBlocks={snapshotBlocks}/> : undefined}
        completionCopy={completionCopy}
        isFoundationGraduate={isFoundationGraduate}
        lessonTitle={lesson.title}
        onReplay={() => setReplayCount((count) => count + 1)}
        primaryHref={continueAction.href}
        primaryLabel={continueAction.label}
        rewardCards={rewardCards}
        stars={progress.stars}
        template={currentTemplate}
        totalCards={progress.cardIds.length}
      />

      <div className="mx-auto mt-5 flex max-w-5xl flex-wrap justify-center gap-3">
        <Link
          className="kc-button-3d rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-[0_12px_24px_rgba(15,23,42,0.06)] transition hover:bg-slate-50"
          href="/auth/bind"
        >
          保存我的进度
        </Link>
        <Link
          className="kc-button-3d rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-[0_12px_24px_rgba(15,23,42,0.06)] transition hover:bg-slate-50"
          href="/learn/map"
        >
          回到学习地图
        </Link>
      </div>
    </main>
  )
}
