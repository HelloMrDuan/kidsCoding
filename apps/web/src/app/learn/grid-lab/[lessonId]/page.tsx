import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'

import { getGridLesson } from '@/content/curriculum/g0-u1-grid-lessons'
import { g0u3LoopLessons } from '@/content/curriculum/g0-u3-loop-lessons'
import { GridLab } from '@/features/lessons/grid/grid-lab'
import { currentLessonDraftOwner } from '@/features/lessons/draft-identity'
import { gridV3Route, isGridV3LessonId } from '@/features/lessons/grid-v3/grid-v3-lessons'

export default async function GridLabPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  // OPS-052/OPS-054：G0-U1 六课与 G0-U3-L01/L02/L03/L05 已迁入 V3 工作台
  // （同一课节、同一份课程数据），旧入口 308 兼容跳转，不让同一课节同时存在
  // 两套页面系统；其余未登记课程继续走本页旧课堂。
  if (isGridV3LessonId(lessonId)) permanentRedirect(gridV3Route(lessonId))
  const lesson = getGridLesson(lessonId) ?? g0u3LoopLessons[lessonId] ?? null
  if (!lesson) notFound()
  if (lesson.layoutMode === 'golden') {
    const owner = await currentLessonDraftOwner()
    return <main><GridLab key={owner} lesson={lesson} draftOwner={owner} /></main>
  }
  return (
    <main className="min-h-screen bg-[var(--kc-canvas)]">
      <section className="kc-page-main">
        <header className="kc-title-row" data-testid="grid-lab-title-row">
          <div className="min-w-0">
            <div className="kc-eyebrow">{lesson.id.startsWith('G0-U3') ? 'G0 循环与规律' : 'G0 森林寻路'} · 实验课</div>
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
