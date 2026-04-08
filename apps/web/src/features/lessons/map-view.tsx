import Link from 'next/link'

import { foundationUnits } from '@/content/curriculum/foundation-units'
import type { LaunchLessonDefinition } from '@/features/domain/types'
import type { GuestProgress } from '@/features/progress/local-progress'

type MapViewProps = {
  lessons: LaunchLessonDefinition[]
  progress: GuestProgress
  hasCourseEntitlement: boolean
}

type LessonStationState =
  | 'completed'
  | 'current'
  | 'next'
  | 'available'
  | 'upcoming'

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

function getLessonStationState(args: {
  lesson: LaunchLessonDefinition
  lessons: LaunchLessonDefinition[]
  progress: GuestProgress
  recommendedLessonId: string
}) {
  const { lesson, lessons, progress, recommendedLessonId } = args
  const lessonIndex = lessons.findIndex((item) => item.id === lesson.id)
  const recommendedIndex = lessons.findIndex(
    (item) => item.id === recommendedLessonId,
  )

  if (progress.completedLessonIds.includes(lesson.id)) return 'completed'
  if (lesson.id === recommendedLessonId) return 'current'
  if (lessonIndex === recommendedIndex + 1) return 'next'
  if (lessonIndex < recommendedIndex) return 'available'
  return 'upcoming'
}

function getStationCopy(state: LessonStationState) {
  switch (state) {
    case 'completed':
      return {
        badge: '已完成',
        cta: '重新做这一节',
        badgeClass: 'bg-slate-100 text-slate-600',
        nodeClass: 'border-slate-200 bg-white text-slate-500',
        cardClass: 'border-white bg-white/90',
      }
    case 'current':
      return {
        badge: '现在就学',
        cta: '开始这一节',
        badgeClass: 'bg-sky-100 text-sky-700',
        nodeClass: 'border-[#ffcf8a] bg-[#ffb458] text-slate-950',
        cardClass:
          'border-sky-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef9ff_100%)]',
      }
    case 'next':
      return {
        badge: '下一节',
        cta: '看看下一节',
        badgeClass: 'bg-amber-100 text-amber-700',
        nodeClass: 'border-[#ffd89c] bg-[#fff4de] text-amber-700',
        cardClass:
          'border-[#ffe3b6] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7eb_100%)]',
      }
    case 'available':
      return {
        badge: '可以再学',
        cta: '重新做这一节',
        badgeClass: 'bg-sky-50 text-sky-700',
        nodeClass: 'border-sky-200 bg-white text-sky-700',
        cardClass: 'border-white bg-white/85',
      }
    default:
      return {
        badge: '后面会学',
        cta: '看看这一节',
        badgeClass: 'bg-slate-100 text-slate-500',
        nodeClass: 'border-slate-200 bg-white/80 text-slate-400',
        cardClass: 'border-white/80 bg-white/70',
      }
  }
}

export function MapView({
  lessons,
  progress,
  hasCourseEntitlement,
}: MapViewProps) {
  const recommendedLesson = getRecommendedLesson(lessons, progress)

  if (!recommendedLesson) return null

  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const completedCount = progress.completedLessonIds.length
  const foundationComplete = completedCount >= lessons.length

  return (
    <section
      className="overflow-hidden rounded-[2.25rem] bg-[linear-gradient(180deg,#ffffff_0%,#f8fcff_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
      data-testid="learning-map-track"
    >
      <div className="relative">
        <div className="absolute bottom-8 left-[1.35rem] top-6 w-[3px] rounded-full bg-[linear-gradient(180deg,#ffcc8b_0%,#bfe4ff_55%,#dbe7f5_100%)]" />

        <div className="space-y-8">
          {foundationUnits.map((unit, unitIndex) => {
            const unitLessons = unit.lessonIds
              .map((lessonId) => lessonsById.get(lessonId))
              .filter((lesson): lesson is LaunchLessonDefinition => Boolean(lesson))
            const unitCurrent = unit.lessonIds.includes(recommendedLesson.id)
            const unitCompleted = unit.lessonIds.every((lessonId) =>
              progress.completedLessonIds.includes(lessonId),
            )

            return (
              <section
                key={unit.id}
                className="relative pl-12"
                data-testid={`map-unit-${unit.id}`}
              >
                <div className="mb-4 rounded-[1.75rem] border border-white bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#fff0cf] text-sm font-black text-amber-700">
                      {unitIndex + 1}
                    </span>
                    <span
                      className={`rounded-full px-3 py-2 text-xs font-bold ${
                        unitCurrent
                          ? 'bg-[#dff3ff] text-sky-700'
                          : unitCompleted
                            ? 'bg-[#eef3f8] text-slate-600'
                            : 'bg-[#fff7e6] text-amber-700'
                      }`}
                    >
                      {unitCurrent
                        ? '现在正在这个单元'
                        : unitCompleted
                          ? '这个单元已经完成'
                          : '后面会走到这里'}
                    </span>
                  </div>
                  <h3 className="mt-4 text-2xl font-black text-slate-950">
                    {unit.title}
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                    {unit.summary}
                  </p>
                </div>

                <div className="space-y-3">
                  {unitLessons.map((lesson) => {
                    const state = getLessonStationState({
                      lesson,
                      lessons,
                      progress,
                      recommendedLessonId: recommendedLesson.id,
                    })
                    const copy = getStationCopy(state)

                    return (
                      <article
                        key={lesson.id}
                        className={`relative rounded-[1.6rem] border p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition ${copy.cardClass}`}
                        data-testid={`map-node-${lesson.id}`}
                      >
                        <div className="absolute -left-[2.45rem] top-7 flex flex-col items-center">
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black shadow-sm ${copy.nodeClass}`}
                          >
                            {lesson.sortOrder}
                          </span>
                        </div>

                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <span
                                className={`rounded-full px-3 py-2 text-xs font-bold ${copy.badgeClass}`}
                              >
                                {copy.badge}
                              </span>
                              <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-500">
                                第 {lesson.sortOrder} 节
                              </span>
                            </div>

                            <div>
                              <h4 className="text-xl font-black text-slate-950">
                                {lesson.title}
                              </h4>
                              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                                {lesson.goal}
                              </p>
                            </div>
                          </div>

                          <Link
                            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                            data-testid={`lesson-link-${lesson.id}`}
                            href={`/learn/lesson/${lesson.id}`}
                          >
                            {copy.cta}
                          </Link>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}

          <aside className="relative pl-12" data-testid="learning-map-high-tier">
            <div className="rounded-[1.85rem] border border-[#e5ddff] bg-[radial-gradient(circle_at_top,#fff8d6_0%,#f7f4ff_44%,#eef9ff_100%)] p-6 shadow-[0_18px_42px_rgba(107,70,255,0.12)]">
              <p className="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#6b46ff]">
                高阶创作阶段
              </p>
              <h3 className="mt-4 text-2xl font-black text-slate-950">
                启蒙走完后，后面还有更长的创作路线
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                完成 12 节启蒙课后，孩子会继续进入更复杂的互动故事创作。这里先告诉你方向，不打断现在的启蒙主线。
              </p>

              <div className="mt-5">
                {foundationComplete ? (
                  hasCourseEntitlement ? (
                    <Link
                      className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                      href="/parent/overview"
                    >
                      查看高阶创作
                    </Link>
                  ) : (
                    <Link
                      className="inline-flex items-center justify-center rounded-full bg-[#6b46ff] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#5935e6]"
                      href="/parent/purchase"
                    >
                      解锁高阶创作
                    </Link>
                  )
                ) : (
                  <span className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-500 shadow-sm">
                    启蒙毕业后开启
                  </span>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
