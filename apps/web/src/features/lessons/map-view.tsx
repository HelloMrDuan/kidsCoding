'use client'

import { useState } from 'react'

import { foundationUnits } from '@/content/curriculum/foundation-units'
import type { LaunchLessonDefinition } from '@/features/domain/types'
import type { GuestProgress } from '@/features/progress/local-progress'
import type { LessonCardState } from '@/features/ui/lesson-card'

import { AdventureMap } from './adventure-map'
import type { AdventureMapUnit } from './adventure-map'

/**
 * UX-101 map view. Data adapter for AdventureMap: resolves the real
 * 12 foundation lessons into their four real units and derives each
 * lesson node's state from real guest progress.
 *
 * States come only from real progress: completed (in
 * completedLessonIds), current (the recommended lesson), available
 * (everything else, always linked). Nothing is locked by lesson order:
 * locking is UX-102 business, explicitly out of scope for UX-101, so
 * lessons after the current one are NOT forced locked, and no
 * unreleased lesson is faked as open. Missing lessons resolve to
 * fewer real nodes, never to invented lessons.
 *
 * The previous 3D/cartoon track (kc-surface-3d, high-tier upsell
 * card) is gone: it was not V2. The upsell card is removed, not
 * moved; the /learn/map header above this component is unchanged.
 */

type MapViewProps = {
  lessons: LaunchLessonDefinition[]
  progress: GuestProgress
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
}): LessonCardState {
  const { lesson, progress, recommendedLessonId } = args
  if (progress.completedLessonIds.includes(lesson.id)) return 'completed'
  if (lesson.id === recommendedLessonId) return 'current'
  return 'available'
}

export function MapView({ lessons, progress }: MapViewProps) {
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
