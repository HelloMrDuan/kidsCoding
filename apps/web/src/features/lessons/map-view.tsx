import Link from 'next/link'

import type { LaunchLessonDefinition } from '@/features/domain/types'
import type { GuestProgress } from '@/features/progress/local-progress'

type MapViewProps = {
  lessons: LaunchLessonDefinition[]
  progress: GuestProgress
  hasCourseEntitlement: boolean
}

export function MapView({
  lessons,
  progress,
  hasCourseEntitlement,
}: MapViewProps) {
  return (
    <div className="grid gap-4">
      {lessons.map((lesson, index) => {
        const isCompleted = progress.completedLessonIds.includes(lesson.id)
        const isCurrent = progress.currentLessonId === lesson.id
        const isPaidLocked = lesson.phase === 'course' && !hasCourseEntitlement
        const isLocked =
          !isPaidLocked &&
          !isCompleted &&
          !isCurrent &&
          index > progress.completedLessonIds.length
        const href = isPaidLocked
          ? '/parent/purchase'
          : `/learn/lesson/${lesson.id}`
        const ctaLabel = isPaidLocked
          ? '购买解锁'
          : isCompleted
            ? '再玩一次'
            : isCurrent
              ? '继续挑战'
              : '尚未解锁'

        return (
          <div
            key={lesson.id}
            className={`rounded-[1.5rem] border p-5 ${
              isCurrent ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'
            } ${isLocked ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  第 {index + 1} 课
                </p>
                <h2 className="text-2xl font-black text-slate-950">
                  {lesson.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {lesson.goal}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {lesson.phase === 'trial' ? '试听课' : '正式课'}
                </p>
              </div>
              <Link
                className={`rounded-full px-5 py-3 text-sm font-bold ${
                  isLocked
                    ? 'pointer-events-none bg-slate-200 text-slate-500'
                    : isPaidLocked
                      ? 'bg-violet-500 text-white'
                      : 'bg-orange-500 text-white'
                }`}
                data-testid={`lesson-link-${lesson.id}`}
                href={href}
              >
                {ctaLabel}
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
