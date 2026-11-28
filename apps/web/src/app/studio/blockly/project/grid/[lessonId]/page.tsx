import { notFound } from 'next/navigation'

import { currentLessonDraftOwner } from '@/features/lessons/draft-identity'
import { getGridPortfolioProject } from '@/features/lessons/grid-v3/grid-project'
import { LessonDraftBoundary } from '@/features/lessons/lesson-draft-boundary'

import GridProjectClient from './grid-project-client'

/**
 * OPS-057：网格作品的独立作品模式路由
 * `/studio/blockly/project/grid/<lessonId>`。
 *
 * 只登记课程数据里 `project.showInPortfolio` 的网格课；其它 id 404，没有作品
 * 的课程不强行造作品。归属人由服务端解析，数据只读写作品信封。
 */
export default async function GridProjectPage({
  params,
}: {
  params: Promise<{ lessonId: string }>
}) {
  const { lessonId } = await params
  const project = getGridPortfolioProject(lessonId)
  if (!project) notFound()
  const owner = await currentLessonDraftOwner()
  return (
    <LessonDraftBoundary key={owner} owner={owner}>
      <GridProjectClient owner={owner} projectId={project.lesson.id} />
    </LessonDraftBoundary>
  )
}
