import { notFound } from 'next/navigation'

import { currentLessonDraftOwner } from '@/features/lessons/draft-identity'
import { getLaunchV3Lesson } from '@/features/lessons/launch-v3/launch-v3-lessons'
import { LessonDraftBoundary } from '@/features/lessons/lesson-draft-boundary'

import StudioLaunchClient from './studio-launch-client'

/**
 * OPS-056 启蒙课 V3 路由：/studio/blockly/launch/<lessonId>（lesson-02～lesson-12 十一节课）。
 *
 * 与 OPS-053 event 路由同一模式：草稿/进度归属人由服务端解析（`currentLessonDraftOwner()`），
 * 身份未确认时边界锁写；十一节课共用同一套 launch-v3 插槽与外壳，不为每节课复制工作台。
 * 未登记的 id 一律 404；lesson-01 仍由 OPS-041 的 /studio/blockly/lesson-01-forest-hello 负责。
 * 已登记 id 的旧 `/learn/lesson/<id>` 308 到这里。
 */
export default async function StudioLaunchPage({
  params,
}: {
  params: Promise<{ lessonId: string }>
}) {
  const { lessonId } = await params
  const lesson = getLaunchV3Lesson(lessonId)
  if (!lesson) notFound()
  const owner = await currentLessonDraftOwner()
  return (
    <LessonDraftBoundary key={owner} owner={owner}>
      <StudioLaunchClient lessonId={lesson.id} />
    </LessonDraftBoundary>
  )
}
