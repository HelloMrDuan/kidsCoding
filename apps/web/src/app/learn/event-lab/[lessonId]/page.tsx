import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'

import { getEventLesson } from '@/content/curriculum/g0-u2-event-lessons'
import { g0u3EventLessons } from '@/content/curriculum/g0-u3-event-loop-lessons'
import { EventLab } from '@/features/lessons/event/event-lab'
import { eventV3Route, isEventV3LessonId } from '@/features/lessons/event-v3/event-v3-lessons'

export default async function EventLabPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  // OPS-053/OPS-054：G0-U2 六课与 G0-U3-L04 已迁入 V3 工作台（同一课节、
  // 同一份课程数据），旧入口 308 兼容跳转，不让同一课节同时存在两套页面系统；
  // 其余未登记课程继续走本页旧课堂。
  if (isEventV3LessonId(lessonId)) permanentRedirect(eventV3Route(lessonId))
  const lesson = getEventLesson(lessonId) ?? g0u3EventLessons[lessonId]
  if (!lesson) notFound()
  return (
    <main className="min-h-screen bg-[var(--kc-canvas)]">
      <section className="kc-page-main">
        <header className="kc-title-row" data-testid="grid-lab-title-row">
          <div className="min-w-0">
            <div className="kc-eyebrow">{lesson.id.startsWith('G0-U3') ? 'G0 循环与节奏 · 实验课' : 'G0 事件与角色 · 实验课'}</div>
            <h1>编程课堂 · {lesson.title}</h1>
            <p className="kc-subtitle">{lesson.story}</p>
          </div>
          <Link className="kc-action-surface kc-btn-outline kc-btn-sm shrink-0" href={`/learn/catalog/${lesson.id}`}>
            <span aria-hidden="true">↖</span>
            回到课程介绍
          </Link>
        </header>
        <EventLab lesson={lesson} />
      </section>
    </main>
  )
}
