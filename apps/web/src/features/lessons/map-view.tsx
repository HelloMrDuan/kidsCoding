import Link from 'next/link'

import type { LaunchLessonDefinition } from '@/features/domain/types'
import type { GuestProgress } from '@/features/progress/local-progress'

type MapViewProps = {
  lessons: LaunchLessonDefinition[]
  progress: GuestProgress
  hasCourseEntitlement: boolean
}

type RouteStage = {
  label: string
  title: string
  description: string
}

const routeSummary: RouteStage[] = [
  {
    label: '启蒙体验',
    title: '先从单步谜题开始',
    description: '第 1-3 节先帮孩子学会动作、对白和点击触发，马上做出第一支小故事。',
  },
  {
    label: '作品成形',
    title: '每 2-3 节汇成一个作品',
    description: '孩子不是在刷题，而是在把每个技能块拼成自己的小剧场。',
  },
  {
    label: '高阶预备',
    title: '启蒙完成后再升级',
    description: '完成 12 节启蒙课和毕业作品后，再进入更复杂的互动故事创作路线。',
  },
]

function getStageChip(lesson: LaunchLessonDefinition) {
  if (lesson.phase === 'trial') {
    return '启蒙体验'
  }

  return lesson.sortOrder >= 9 ? '毕业创作' : '高阶预备'
}

function getStatusCopy(args: {
  isCompleted: boolean
  isCurrent: boolean
  isPaidLocked: boolean
  isLocked: boolean
}) {
  if (args.isPaidLocked) {
    return {
      badge: '升级入口',
      cta: '解锁高阶创作',
      href: '/parent/purchase',
      ctaClass: 'bg-[#7c5cff] text-white',
      badgeClass: 'bg-[#f1ebff] text-[#6b46ff]',
    }
  }

  if (args.isCurrent) {
    return {
      badge: '当前推荐',
      cta: '继续创作',
      href: '',
      ctaClass: 'bg-[#ff8b4e] text-white',
      badgeClass: 'bg-[#e0f4ff] text-sky-700',
    }
  }

  if (args.isCompleted) {
    return {
      badge: '已经完成',
      cta: '再次回看',
      href: '',
      ctaClass: 'bg-slate-900 text-white',
      badgeClass: 'bg-[#eef2f6] text-slate-700',
    }
  }

  if (args.isLocked) {
    return {
      badge: '按路线解锁',
      cta: '稍后开启',
      href: '',
      ctaClass: 'bg-slate-200 text-slate-500',
      badgeClass: 'bg-slate-100 text-slate-500',
    }
  }

  return {
    badge: '下一站',
    cta: '马上开始',
    href: '',
    ctaClass: 'bg-[#ffb457] text-slate-950',
    badgeClass: 'bg-[#fff0cf] text-amber-700',
  }
}

export function MapView({
  lessons,
  progress,
  hasCourseEntitlement,
}: MapViewProps) {
  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] bg-[linear-gradient(135deg,#fff9ef_0%,#ffffff_100%)] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
            Learning route
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">
            沿着成长路线继续创作
          </h2>
          <p className="text-base leading-7 text-slate-600 md:text-lg md:leading-8">
            先解决一个小目标，再把 2-3 节课汇成一个作品。孩子始终知道自己走到哪里，下一步为什么值得继续。
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {routeSummary.map((stage) => (
            <article
              key={stage.label}
              className="rounded-[1.75rem] border border-white bg-white/90 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
            >
              <p className="text-sm font-bold text-slate-500">{stage.label}</p>
              <h3 className="mt-3 text-xl font-black text-slate-950">{stage.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{stage.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        {lessons.map((lesson, index) => {
          const isCompleted = progress.completedLessonIds.includes(lesson.id)
          const isCurrent = progress.currentLessonId === lesson.id
          const isPaidLocked = lesson.phase === 'course' && !hasCourseEntitlement
          const isLocked =
            !isPaidLocked &&
            !isCompleted &&
            !isCurrent &&
            index > progress.completedLessonIds.length
          const status = getStatusCopy({
            isCompleted,
            isCurrent,
            isPaidLocked,
            isLocked,
          })
          const href = status.href || `/learn/lesson/${lesson.id}`
          const isDisabled = isLocked

          return (
            <article
              key={lesson.id}
              className={`relative overflow-hidden rounded-[2rem] border px-5 py-5 shadow-[0_16px_32px_rgba(15,23,42,0.06)] transition ${
                isCurrent
                  ? 'border-sky-200 bg-[linear-gradient(180deg,#ffffff_0%,#eefaff_100%)]'
                  : 'border-white bg-white'
              } ${isLocked ? 'opacity-70' : ''}`}
            >
              <div className="absolute left-7 top-0 bottom-0 w-px bg-[linear-gradient(180deg,transparent_0%,#d7eaf5_18%,#d7eaf5_82%,transparent_100%)]" />
              <div className="relative grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-start">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.3rem] bg-[#fff0ce] text-lg font-black text-amber-700 shadow-sm">
                    {index + 1}
                  </div>
                  <div className={`rounded-full px-3 py-2 text-xs font-bold ${status.badgeClass}`}>
                    {status.badge}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                      {getStageChip(lesson)}
                    </span>
                    <span className="rounded-full bg-[#eef8ff] px-3 py-2 text-xs font-bold text-sky-700">
                      {lesson.phase === 'trial' ? '免费启蒙' : '正式进阶'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-slate-950">{lesson.title}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                      {lesson.goal}
                    </p>
                  </div>

                  <div className="rounded-[1.4rem] bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                    {isCurrent
                      ? '今天继续把这一步做完，完成后会离下一支小作品更近一点。'
                      : isPaidLocked
                        ? '这节课属于启蒙完成后的更复杂创作阶段，先完成当前启蒙路线，再决定要不要升级。'
                        : isCompleted
                          ? '这节课已经完成，可以回看作品，也可以继续沿路线往前走。'
                          : isLocked
                            ? '按当前路线往前完成上一节，这里就会自然解锁。'
                            : '这一节已经准备好了，开始后会继续往你的故事舞台推进。'}
                  </div>
                </div>

                <Link
                  className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition ${status.ctaClass} ${
                    isDisabled ? 'pointer-events-none' : ''
                  }`}
                  data-testid={`lesson-link-${lesson.id}`}
                  href={href}
                >
                  {status.cta}
                </Link>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
