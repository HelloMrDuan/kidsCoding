import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getGridLesson } from '@/content/curriculum/g0-u1-grid-lessons'
import { GridLab } from '@/features/lessons/grid/grid-lab'

export default async function GridLabPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  const lesson = getGridLesson(lessonId)
  if (!lesson) notFound()
  return (
    <main className="min-h-screen bg-[var(--kc-canvas)]">
      <section className="kc-page-main">
        <header className="kc-title-row" data-testid="grid-lab-title-row">
          <div className="min-w-0">
            <div className="kc-eyebrow">G0 森林寻路 · 实验课</div>
            <h1>编程课堂 · {lesson.title}</h1>
            <p className="kc-subtitle">{lesson.story}</p>
          </div>
          <Link className="kc-action-surface kc-btn-outline kc-btn-sm shrink-0" href={`/learn/catalog/${lesson.id}`}>
            <span aria-hidden="true">↖</span>
            回到课程介绍
          </Link>
        </header>
        <GridLab lesson={lesson} />
      </section>
    </main>
  )
}
