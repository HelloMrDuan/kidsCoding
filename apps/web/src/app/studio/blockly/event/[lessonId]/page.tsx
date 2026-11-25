import { notFound } from 'next/navigation'

import { currentLessonDraftOwner } from '@/features/lessons/draft-identity'
import { getEventV3Lesson } from '@/features/lessons/event-v3/event-v3-lessons'
import { LessonDraftBoundary } from '@/features/lessons/lesson-draft-boundary'

import StudioEventClient from './studio-event-client'

/**
 * OPS-053 G0-U2 route: /studio/blockly/event/<lessonId>（本批仅六个 G0-U2 id）。
 *
 * 草稿/进度归属人由服务端解析（与 /learn 各路由、OPS-052 grid 路由同一个
 * `currentLessonDraftOwner()`），身份未确认时边界锁写；六个课节共用同一
 * 套 event-v3 插槽与外壳，不为每节课复制工作台。本批之外的 id 一律 404，
 * 旧 `/learn/event-lab/<id>` 继续服务 G0-U3。
 */
export default async function StudioEventPage({
  params,
}: {
  params: Promise<{ lessonId: string }>
}) {
  const { lessonId } = await params
  const lesson = getEventV3Lesson(lessonId)
  if (!lesson) notFound()
  const owner = await currentLessonDraftOwner()
  return (
    <LessonDraftBoundary key={owner} owner={owner}>
      <StudioEventClient lessonId={lesson.id} />
    </LessonDraftBoundary>
  )
}
