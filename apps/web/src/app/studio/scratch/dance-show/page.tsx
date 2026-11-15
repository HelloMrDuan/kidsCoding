// 《我的舞蹈秀》全屏课堂正式入口（OPS-040）。
// 外壳只有 StudioShell（/studio layout 不继承 AppShell）：本页只是
// 路由包装，全部界面在 DanceShowStudioPage 里。课程尚未发布：
// 本页不在课程地图中链接，仅供全屏课堂验证。
import type { Metadata } from 'next'
import DanceShowStudioPage from '@/features/lessons/dance-show/ui/dance-show-studio-page'

export const metadata: Metadata = {
  title: '我的舞蹈秀 · 全屏课堂',
  robots: { index: false },
}

export default function Page() {
  return <DanceShowStudioPage />
}
