// 《我的舞蹈秀》桌面样板入口（OPS-038 第三阶段：学习模式层）。
// 课程尚未发布：样板页不在课程地图中链接，仅供桌面样板验证。
import type { Metadata } from 'next'
import DanceShowPage from '@/features/lessons/dance-show/ui/dance-show-page'

export const metadata: Metadata = {
  title: '我的舞蹈秀 · Scratch GUI 桌面样板',
  robots: { index: false },
}

export default function Page() {
  return <DanceShowPage />
}
