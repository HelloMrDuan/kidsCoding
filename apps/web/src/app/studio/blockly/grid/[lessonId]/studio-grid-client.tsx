/**
 * OPS-052 第一批：G0-U1 六节 grid 课的 V3 studio 路由客户端装配
 * （/studio/blockly/grid/<lessonId>）。
 *
 * 工作台装配在 `features/lessons/grid-v3/grid-studio-workspace`，与作品模式
 * 共用同一组件，只替换草稿读写口与 studio 合同。
 */
'use client'

import { useMemo } from 'react'

import { getGridV3Lesson } from '@/features/lessons/grid-v3/grid-v3-lessons'
import { GridStudioWorkspace } from '@/features/lessons/grid-v3/grid-studio-workspace'

export default function StudioGridClient({ lessonId }: { lessonId: string }) {
  const lesson = useMemo(() => getGridV3Lesson(lessonId), [lessonId])

  // 页面已在服务端 notFound 本批之外的 id；这里兜底不渲染空白外壳。
  if (!lesson) return null

  return <GridStudioWorkspace lesson={lesson} />
}
