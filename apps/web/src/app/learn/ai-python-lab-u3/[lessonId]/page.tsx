import { notFound } from 'next/navigation'

import U3LocalLab from '@/features/ai-python/u3-local-lab'
import { U3_PILOT_LESSON_IDS } from '@/features/ai-python/u3-local-engines'

export default async function U3LocalLabPage({
  params,
}: {
  params: Promise<{ lessonId: string }>
}) {
  const { lessonId } = await params
  if (!(U3_PILOT_LESSON_IDS as readonly string[]).includes(lessonId)) {
    notFound()
  }
  return <U3LocalLab lessonId={lessonId} />
}
