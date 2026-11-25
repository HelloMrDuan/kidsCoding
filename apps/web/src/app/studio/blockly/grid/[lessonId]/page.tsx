import { notFound } from 'next/navigation'

import { currentLessonDraftOwner } from '@/features/lessons/draft-identity'
import { getGridV3Lesson } from '@/features/lessons/grid-v3/grid-v3-lessons'
import { LessonDraftBoundary } from '@/features/lessons/lesson-draft-boundary'

import StudioGridClient from './studio-grid-client'

/**
 * OPS-052 G0-U1 route: /studio/blockly/grid/<lessonId>（本批仅六个 G0-U1 id）。
 *
 * 草稿/进度归属人由服务端解析（与 /learn 各路由同一个
 * `currentLessonDraftOwner()`），身份未确认时边界锁写；六个课节共用同一
 * 套 V3 插槽与外壳，不为每节课复制工作台。本批之外的 id 一律 404，旧
 * `/learn/grid-lab/<id>` 继续服务 G0-U2 / G0-U3 等未迁移课程。
 */
export default async function StudioGridPage({
  params,
}: {
  params: Promise<{ lessonId: string }>
}) {
  const { lessonId } = await params
  const lesson = getGridV3Lesson(lessonId)
  if (!lesson) notFound()
  const owner = await currentLessonDraftOwner()
  return (
    <LessonDraftBoundary key={owner} owner={owner}>
      <StudioGridClient lessonId={lesson.id} />
    </LessonDraftBoundary>
  )
}
