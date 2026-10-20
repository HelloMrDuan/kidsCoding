'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'

import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { RemedialPractice } from '@/features/lessons/remedial-practice'

export default function RemedialLessonPage() {
  const params = useParams<{ remedialId: string }>()
  const searchParams = useSearchParams()
  const remedialId = Array.isArray(params.remedialId)
    ? params.remedialId[0]
    : params.remedialId
  const { remedials } = buildLaunchMap()
  const lesson = remedials.find((item) => item.id === remedialId)

  if (!lesson) {
    return <main className="p-6 text-lg font-semibold">没有找到补课小课。</main>
  }

  const returnLessonId = searchParams.get('from') ?? lesson.returnToLessonId

  return (
    <main className="min-h-screen bg-[#fff9ec] px-6 py-10">
      <section className="mx-auto max-w-3xl space-y-6 rounded-[2rem] bg-white p-8 shadow-sm">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-500">
            补课小课
          </p>
          <h1 className="text-4xl font-black text-slate-950">{lesson.title}</h1>
          <p className="text-base leading-7 text-slate-600">{lesson.focus}</p>
        </header>
        <div className="rounded-[1.5rem] bg-amber-50 p-5 text-base leading-7 text-amber-900">
          先花 1 分钟复习这一点，再回到刚才卡住的那一关继续，不用从头开始。
        </div>
        {lesson.keyPoints && lesson.keyPoints.length > 0 ? (
          <ol className={`grid gap-4 ${lesson.keyPoints.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`} data-testid="remedial-key-points">
            {lesson.keyPoints.map((point, index) => (
              <li className="rounded-[1.5rem] bg-slate-50 p-5" key={point}>
                <p className="text-sm font-semibold text-slate-500">第 {index + 1} 点</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{point}</p>
              </li>
            ))}
          </ol>
        ) : null}
        {lesson.practice ? <RemedialPractice practice={lesson.practice} /> : null}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-amber-500 px-6 py-4 text-lg font-bold text-white"
            href={`/learn/lesson/${returnLessonId}`}
          >
            回到刚才的课程
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-4 text-lg font-bold text-slate-800"
            href="/learn/map"
          >
            返回学习地图
          </Link>
        </div>
      </section>
    </main>
  )
}
