// G2-U3-L05《倒计时游戏结束》课堂入口。
// 课程尚未发布：教学参数仍是提议值，目录仍为 outline_not_playable，不在课程地图中链接。
import type { Metadata } from 'next'
import { LessonPage } from '@/features/lessons/g2-u3-l05/ui/lesson-page'

export const metadata: Metadata = {
  title: '倒计时游戏结束 · G2-U3-L05',
  robots: { index: false },
}

export default function Page() {
  return <LessonPage />
}
