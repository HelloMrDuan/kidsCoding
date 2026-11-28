import { permanentRedirect } from 'next/navigation'

import { isLaunchV3LessonId, launchV3Route } from '@/features/lessons/launch-v3/launch-v3-lessons'

import LegacyLessonClient from './legacy-lesson-client'

/**
 * 旧三栏课堂入口 /learn/lesson/<lessonId>。
 *
 * OPS-056：lesson-02～lesson-12 已迁到 V3 工作台（同一课节、同一份课程数据），
 * 旧入口 308 兼容跳转到 /studio/blockly/launch/<lessonId>，不让同一课节同时存在两套
 * 页面系统（与 OPS-053 event-lab、OPS-052 grid-lab 同一写法）。
 * 其余未登记的 id 原样交给旧课堂客户端（页面逻辑一字未改，仅改名为 legacy-lesson-client）。
 * lesson-01 有自己的静态路由（307 到 OPS-041 工作台），不经过这里。
 */
export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  if (isLaunchV3LessonId(lessonId)) permanentRedirect(launchV3Route(lessonId))
  return <LegacyLessonClient />
}
