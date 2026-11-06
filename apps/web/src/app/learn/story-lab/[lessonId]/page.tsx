import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getStoryLesson } from '@/content/curriculum/g1-u1-story-lessons'
import { StoryLab } from '@/features/lessons/story/story-lab'

export default async function StoryLabPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  const lesson = getStoryLesson(lessonId)
  if (!lesson) notFound()
  return (
    <main className="min-h-screen bg-[var(--kc-canvas)]">
      <section className="kc-page-main">
        <header className="kc-title-row" data-testid="story-lab-title-row">
          <div className="min-w-0">
            <div className="kc-eyebrow">G1 会说话的故事 · 实验课</div>
            <h1>编程课堂 · {lesson.title}</h1>
            <p className="kc-subtitle">{lesson.story}</p>
          </div>
          <Link className="kc-action-surface kc-btn-outline kc-btn-sm shrink-0" href={`/learn/catalog/${lesson.id}`}>
            <span aria-hidden="true">↖</span>
            回到课程介绍
          </Link>
        </header>
        <StoryLab lesson={lesson} />
      </section>
    </main>
  )
}
