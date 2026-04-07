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

  if (progress.completedLessonIds.includes(lesson.id)) {
    return 'completed' satisfies LessonStationState
  }

  if (lesson.id === recommendedLessonId) {
    return 'current' satisfies LessonStationState
  }

  if (lessonIndex === recommendedIndex + 1) {
    return 'next' satisfies LessonStationState
  }

  if (lessonIndex < recommendedIndex) {
    return 'available' satisfies LessonStationState
  }

  return 'upcoming' satisfies LessonStationState
}

function getStationCopy(state: LessonStationState) {
  switch (state) {
    case 'completed':
      return {
        badge: '已走过',
        cta: '回看作品',
        badgeClass: 'bg-[#eef3f8] text-slate-600',
        nodeClass: 'bg-white text-slate-500 border-slate-200',
        cardClass: 'border-white bg-white/90',
      }
    case 'current':
      return {
        badge: '当前一步',
        cta: '继续创作',
        badgeClass: 'bg-[#dff3ff] text-sky-700',
        nodeClass: 'bg-[#ffb458] text-slate-950 border-[#ffcf8a]',
        cardClass:
          'border-sky-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef9ff_100%)]',
      }
    case 'next':
      return {
        badge: '下一站',
        cta: '看看这一课',
        badgeClass: 'bg-[#fff0cf] text-amber-700',
        nodeClass: 'bg-[#fff4de] text-amber-700 border-[#ffd89c]',
        cardClass:
          'border-[#ffe3b6] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7eb_100%)]',
      }
    case 'available':
      return {
        badge: '可继续前进',
        cta: '进入这一课',
        badgeClass: 'bg-[#eef7ff] text-sky-700',
        nodeClass: 'bg-white text-sky-700 border-sky-200',
        cardClass: 'border-white bg-white/85',
      }
    case 'upcoming':
    default:
      return {
        badge: '前方站点',
        cta: '看看这一课',
        badgeClass: 'bg-slate-100 text-slate-500',
        nodeClass: 'bg-white/80 text-slate-400 border-slate-200',
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

  if (!recommendedLesson) {
    return null
  }

  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const completedCount = progress.completedLessonIds.length
  const currentUnit =
    foundationUnits.find((unit) =>
      unit.lessonIds.includes(recommendedLesson.id),
    ) ?? foundationUnits[0]
  const nextLesson =
    lessons.find((lesson) => !progress.completedLessonIds.includes(lesson.id)) ??
    lessons.at(-1) ??
    recommendedLesson
  const foundationComplete = completedCount >= lessons.length

  return (
    <div className="grid gap-6">
      <section
        className="grid gap-4 rounded-[2rem] bg-[linear-gradient(135deg,#fff8ef_0%,#f5fbff_100%)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] lg:grid-cols-[1.2fr_0.8fr]"
        data-testid="learning-map-current-focus"
      >
        <div className="space-y-4">
          <p className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-amber-700 shadow-sm">
            当前成长路线
          </p>
          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              {currentUnit.title}
            </h2>
            <p className="max-w-3xl text-base leading-7 text-slate-600 md:text-lg md:leading-8">
              {currentUnit.summary}
            </p>
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-white/90 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold text-slate-500">下一步去哪</p>
          <h3 className="mt-3 text-2xl font-black text-slate-950">
            {nextLesson.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {nextLesson.goal}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full bg-[#eef8ff] px-3 py-2 text-xs font-bold text-sky-700">
              第 {nextLesson.sortOrder} 节
            </span>
            <span className="rounded-full bg-[#fff0cf] px-3 py-2 text-xs font-bold text-amber-700">
              {foundationComplete ? '启蒙已完成' : '继续启蒙主线'}
            </span>
          </div>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-[2.25rem] bg-[linear-gradient(180deg,#ffffff_0%,#f8fcff_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
        data-testid="learning-map-track"
      >
        <div className="relative">
          <div className="absolute left-[1.4rem] top-6 bottom-8 w-[3px] rounded-full bg-[linear-gradient(180deg,#ffcc8b_0%,#bfe4ff_55%,#dbe7f5_100%)]" />

          <div className="space-y-8">
            {foundationUnits.map((unit) => {
              const unitLessons = unit.lessonIds
                .map((lessonId) => lessonsById.get(lessonId))
                .filter((lesson): lesson is LaunchLessonDefinition =>
                  Boolean(lesson),
                )
              const unitCompleted = unit.lessonIds.every((lessonId) =>
                progress.completedLessonIds.includes(lessonId),
              )
              const unitCurrent = unit.lessonIds.includes(recommendedLesson.id)

              return (
                <section
                  key={unit.id}
                  className="relative pl-12"
                  data-testid={`map-unit-${unit.id}`}
                >
                  <div className="mb-4 rounded-[1.75rem] border border-white bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#fff0cf] text-sm font-black text-amber-700">
                        {foundationUnits.indexOf(unit) + 1}
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
                          ? '正在这一单元'
                          : unitCompleted
                            ? '这一单元已完成'
                            : '接下来会走到这里'}
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

            <aside
              className="relative pl-12"
              data-testid="learning-map-high-tier"
            >
              <div className="rounded-[1.85rem] border border-[#e5ddff] bg-[radial-gradient(circle_at_top,#fff8d6_0%,#f7f4ff_44%,#eef9ff_100%)] p-6 shadow-[0_18px_42px_rgba(107,70,255,0.12)]">
                <p className="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#6b46ff]">
                  高阶创作阶段
                </p>
                <h3 className="mt-4 text-2xl font-black text-slate-950">
                  启蒙走完后，下一段成长会继续发光
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                  完成 12 节启蒙课后，孩子会继续进入更复杂的互动故事创作。这里先留出方向感，不打断现在的启蒙主线。
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
    </div>
  )
}
