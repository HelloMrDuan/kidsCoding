// Old deep link (/studio/scratch/free/<id>): migrate the work into the unified
// library under the current owner, then open it in the unified editor.
import type { Metadata } from 'next'

import { LegacyFreeCreateHandoff } from '@/features/create/legacy-free-create-handoff'

export const metadata: Metadata = {
  title: '打开旧作品 · KidsCoding',
  robots: { index: false },
}

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  return <LegacyFreeCreateHandoff legacyId={projectId} />
}
