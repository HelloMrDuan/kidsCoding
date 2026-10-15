'use client'

import { useState } from 'react'

import { foundationUnits } from '@/content/curriculum/foundation-units'
import { resolveCourseAccess } from '@/features/billing/resolve-course-access'
import type { LaunchLessonDefinition } from '@/features/domain/types'
import type { GuestProgress } from '@/features/progress/local-progress'
import type { LessonCardState } from '@/features/ui/lesson-card'

import { AdventureMap } from './adventure-map'
import type { AdventureMapUnit } from './adventure-map'

/**
 * UX-102 map view. Data adapter for AdventureMap: resolves the real
 * 12 foundation lessons into their four real units and derives each
 * lesson node's state from real guest progress AND the real access
 * rule (resolveCourseAccess over the lesson phase + the launch-pack
 * entitlement from /api/course-access, supplied by the page).
 *
 * Precedence is deliberate and keeps the map consistent with the
 * lesson page, which enforces the same rule before rendering the
 * playable workspace:
 *   1. locked — the access gate (course phase without entitlement,
 *      or an unknown phase: fail-closed). Locked wins over completed:
 *      a completed lesson that is no longer entitled cannot be
 *      re-played, and the map must not promise otherwise.
 *   2. completed — re-playable, always linked (UX-102: completed
 *      lessons stay open for re-study while they are entitled).
 *   3. current — the recommended lesson, from real progress.
 *   4. available — everything else entitled, always linked.
 *
 * Nothing is locked by lesson order: lessons after the current one
 * stay available unless the real access rule locks them. No unreleased
 * node is emitted: the learner-facing data has no publish gate (the
 * admin publication rows only override lesson copy, never the phase
 * and never remove a lesson), so there is no real source for an
 * unreleased state. Missing lessons resolve to fewer real nodes,
 * never to invented lessons.
 *
 * The previous 3D/cartoon track (kc-surface-3d, high-tier upsell
 * card) is gone: it was not V2. The upsell card is removed, not
 * moved; the /learn/map header above this component is unchanged.
 */

type MapViewProps = {
  lessons: LaunchLessonDefinition[]
  progress: GuestProgress
  hasLaunchPack: boolean
}

function getRecommendedLesson(
  lessons: LaunchLessonDefinition[],
  progress: GuestProgress,
) {
  return (
    lessons.find((lesson) => lesson.id === progress.currentLessonId) ??
    lessons.find((lesson) => !progress.completedLessonIds.includes(lesson.id)) ??
    lessons.at(-1) ??
    null
  )
}

function getLessonState(args: {
  lesson: LaunchLessonDefinition
  progress: GuestProgress
  recommendedLessonId: string
  hasLaunchPack: boolean
}): LessonCardState {
  const { lesson, progress, recommendedLessonId, hasLaunchPack } = args
  // Access gate first: the same rule the lesson page enforces before
  // rendering the playable workspace. An unknown phase at runtime
  // (abnormal data) resolves to 'locked' inside resolveCourseAccess.
  if (
    resolveCourseAccess({
      lessonPhase: lesson.phase,
      hasLaunchPack,
    }) === 'locked'
  ) {
    return 'locked'
  }
  if (progress.completedLessonIds.includes(lesson.id)) return 'completed'
  if (lesson.id === recommendedLessonId) return 'current'
  return 'available'
}

export function MapView({ lessons, progress, hasLaunchPack }: MapViewProps) {
  const recommendedLesson = getRecommendedLesson(lessons, progress)

  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const units: AdventureMapUnit[] = foundationUnits.map((unit) => ({
    id: unit.id,
    title: unit.title,
    summary: unit.summary,
    lessons: unit.lessonIds
      .map((lessonId) => lessonsById.get(lessonId))
      .filter((lesson): lesson is LaunchLessonDefinition => Boolean(lesson))
      .map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        sortOrder: lesson.sortOrder,
        state: recommendedLesson
          ? getLessonState({
              lesson,
              progress,
              recommendedLessonId: recommendedLesson.id,
              hasLaunchPack,
            })
          : 'available',
        href: `/learn/lesson/${lesson.id}`,
      })),
  }))

  const defaultUnitId =
    (recommendedLesson
      ? units.find((unit) =>
          unit.lessons.some((lesson) => lesson.id === recommendedLesson.id),
        )?.id
      : undefined) ??
    units[0]?.id ??
    ''
  // The user's explicit choice, when present. Null means "no choice yet":
  // the selection follows the current recommended unit. This matters
  // because the curriculum can arrive after the first render — a
  // useState(defaultUnitId) initializer would freeze the first render's
  // (possibly empty) default and stick on the first unit forever.
  const [userSelectedUnitId, setUserSelectedUnitId] = useState<string | null>(null)
  const selectedUnitId =
    userSelectedUnitId && units.some((unit) => unit.id === userSelectedUnitId)
      ? userSelectedUnitId
      : defaultUnitId

  if (lessons.length === 0) {
    return (
      <section data-testid="learning-map-empty">
        <p>暂无课程数据，请稍后再来。</p>
      </section>
    )
  }

  return (
    <AdventureMap
      units={units}
      selectedUnitId={selectedUnitId}
      onSelectUnit={setUserSelectedUnitId}
    />
  )
}
