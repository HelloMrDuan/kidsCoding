// G2-U3-L02《接住掉落水果》课堂入口。
// 课程尚未发布：台账状态为 in_review，目录仍为 outline_not_playable，不在课程地图中链接。
import type { Metadata } from 'next'
import { LessonPage } from '@/features/lessons/g2-u3-l02/ui/lesson-page'

export const metadata: Metadata = {
  title: '接住掉落水果 · G2-U3-L02',
  robots: { index: false },
}

export default function Page() {
  return <LessonPage />
}
