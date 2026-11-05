// G2-U3-L02 槽位验证页：按共享壳的调用方式（slot props + EngineAdapter + workspace-draft）使用本课的三个槽位。
// 不是产品页面，不在课程地图中链接；共享壳修复后由 LessonWorkspace 替代，届时删除本页。
import type { Metadata } from 'next'
import { EmbedClassroom } from '@/features/lessons/g2-u3-l02/ui/embed-classroom'

export const metadata: Metadata = {
  title: '接住掉落水果 · 槽位验证 · G2-U3-L02',
  robots: { index: false },
}

export default function Page() {
  return <EmbedClassroom />
}
