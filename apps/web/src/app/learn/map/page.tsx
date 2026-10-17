'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'

import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { useLaunchCurriculum } from '@/features/curriculum/use-launch-curriculum'
import { resolveCourseAccess } from '@/features/billing/resolve-course-access'
import { useCourseAccess } from '@/features/billing/use-course-access'
import { MapView } from '@/features/lessons/map-view'
import { CharacterArt } from '@/features/lessons/playable-stage/character-art'
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
  const { hasLaunchPack } = useCourseAccess()
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
  // UX-102: the "next lesson" CTA must point at a lesson the child can
  // actually play. Prefer the first incomplete lesson the real access
  // rule allows; only when every remaining lesson is locked does the
  // CTA fall back to the first incomplete lesson, whose destination is
  // the lesson page's lock screen (never the playable workspace).
  // The all-complete fallback (recorded current lesson) is unchanged.
  const isPlayable = (phase: 'trial' | 'course') =>
    resolveCourseAccess({ lessonPhase: phase, hasLaunchPack }) === 'allowed'
  const nextLesson =
    allLessons.find(
      (lesson) =>
        !progress.completedLessonIds.includes(lesson.id) &&
        isPlayable(lesson.phase),
    ) ??
    allLessons.find((lesson) => !progress.completedLessonIds.includes(lesson.id)) ??
    allLessons.find((lesson) => lesson.id === progress.currentLessonId) ??
    allLessons.at(-1)
  const currentUnit =
    foundationUnits.find((unit) => unit.lessonIds.includes(nextLesson?.id ?? '')) ??
    foundationUnits[0]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef9ff_0%,#fffaf0_100%)] px-4 py-6 md:px-6 md:py-8">
      <section className="kc-map-page mx-auto max-w-6xl space-y-6">
        <header className="kc-surface-3d kc-map-hero">
          <div className="kc-map-hero-art" aria-hidden="true">
            <CharacterArt id="fox" className="kc-map-hero-fox" />
            <span className="kc-map-hero-bubble">今天去哪里冒险？</span>
          </div>
          <div className="kc-map-hero-text">
            <div className="kc-map-hero-chips">
              <span className="kc-kid-chip kc-kid-chip-sky">
                推荐起点：{startLevelLabels[recommendedLevel]}
              </span>
              <span className="kc-kid-chip kc-kid-chip-sun">
                当前单元：{currentUnit?.title ?? '启蒙主线'}
              </span>
            </div>
            <h1>从这里继续学</h1>
            <p>沿着彩色小路一关一关闯过去，和动物朋友一起做出会动的小故事！</p>
            <div className="kc-map-hero-meta">
              <span className="kc-kid-stars" aria-label={`已完成 ${progress.completedLessonIds.length} / ${allLessons.length} 节`}>
                ⭐ 已完成 {progress.completedLessonIds.length} / {allLessons.length} 节
              </span>
              <Link className="kc-kid-link" href="/cards">
                🎁 打开我的卡册
              </Link>
            </div>
          </div>
          <div className="kc-map-next" data-testid="learning-map-focus-preview">
            <p className="kc-map-next-kicker">下一步去这里</p>
            <h2>{nextLesson?.title ?? '继续当前作品'}</h2>
            <p className="kc-map-next-goal">{nextLesson?.goal ?? '继续把今天的作品往前推进。'}</p>
            {nextLesson ? (
              <Link
                className="kc-button-3d kc-map-next-cta"
                data-testid="learning-map-primary-cta"
                href={`/learn/lesson/${nextLesson.id}`}
              >
                开始第 {nextLesson.sortOrder} 节 ▶
              </Link>
            ) : null}
          </div>
        </header>

        <Link href="/learn/catalog" className="kc-map-catalog-link" data-testid="learning-map-catalog-link">
          🗺️ 浏览完整学习路线：Scratch、Python、C++、AI、机器人等18条路径（规划目录，未开放的课程不会直接闯关） →
        </Link>

        <MapView lessons={allLessons} progress={progress} hasLaunchPack={hasLaunchPack} />
      </section>
    </main>
  )
}
