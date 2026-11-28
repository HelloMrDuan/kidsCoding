import { notFound } from 'next/navigation'

import { currentLessonDraftOwner } from '@/features/lessons/draft-identity'
import { getLaunchProjectLesson } from '@/features/lessons/launch-v3/launch-v3-project'
import { LessonDraftBoundary } from '@/features/lessons/lesson-draft-boundary'

import StudioProjectClient from './studio-project-client'

/**
 * OPS-057 Blockly V3 作品编辑路由：/studio/blockly/project/<projectId>（lesson-01～lesson-12）。
 *
 * 与 /studio/blockly/launch/<lessonId> 同一模式：归属人由服务端解析
 * （`currentLessonDraftOwner()`），身份未确认时边界锁写；作品数据走自己的键，
 * 不读写课程草稿。未登记的 id 一律 404。
 */
export default async function StudioProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const lesson = getLaunchProjectLesson(projectId)
  if (!lesson) notFound()
  const owner = await currentLessonDraftOwner()
  return (
    <LessonDraftBoundary key={owner} owner={owner}>
      <StudioProjectClient owner={owner} projectId={lesson.id} />
    </LessonDraftBoundary>
  )
}
