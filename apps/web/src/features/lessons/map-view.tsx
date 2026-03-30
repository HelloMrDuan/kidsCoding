import Link from 'next/link'

import type { LessonDefinition } from '@/features/domain/types'
import type { GuestProgress } from '@/features/progress/local-progress'

type MapViewProps = {
  lessons: LessonDefinition[]
  progress: GuestProgress
}

export function MapView({ lessons, progress }: MapViewProps) {
  return (
    <div className="grid gap-4">
      {lessons.map((lesson, index) => {
        const isCompleted = progress.completedLessonIds.includes(lesson.id)
        const isCurrent = progress.currentLessonId === lesson.id
        const isLocked =
          !isCompleted && !isCurrent && index > progress.completedLessonIds.length

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
                  第 {index + 1} 关
                </p>
                <h2 className="text-2xl font-black text-slate-950">
                  {lesson.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {lesson.goal}
                </p>
              </div>
              <Link
                className={`rounded-full px-5 py-3 text-sm font-bold ${
                  isLocked
                    ? 'pointer-events-none bg-slate-200 text-slate-500'
                    : 'bg-orange-500 text-white'
                }`}
                data-testid={`lesson-link-${lesson.id}`}
                href={`/learn/lesson/${lesson.id}`}
              >
                {isCompleted ? '再玩一次' : isCurrent ? '继续挑战' : '尚未解锁'}
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
