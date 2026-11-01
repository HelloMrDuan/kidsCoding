import { notFound } from 'next/navigation'
import { AiPythonLab } from '@/features/ai-python/ai-python-lab'
import { AI_PYTHON_PILOT_LESSON_IDS } from '@/features/ai-python/ai-python-engine'

export default async function AiPythonLabPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  if (!(AI_PYTHON_PILOT_LESSON_IDS as readonly string[]).includes(lessonId)) notFound()
  return <AiPythonLab lessonId={lessonId} />
}
