// Scratch 自由创作工坊 · 单份作品的创作页。
// 作品从本机作品库读取；编辑环境为部署时配置的 Scratch GUI（桥接受控通信）。
import type { Metadata } from 'next'

import { FreeCreateEditor } from '@/features/lessons/studio/free-create/free-create-editor'

export const metadata: Metadata = {
  title: '我的 Scratch 作品 · KidsCoding',
  robots: { index: false },
}

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  return <FreeCreateEditor projectId={projectId} />
}
