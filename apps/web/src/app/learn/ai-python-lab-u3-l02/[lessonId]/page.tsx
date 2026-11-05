import { notFound } from 'next/navigation'
import { AiPythonU3L02Lab } from '@/features/ai-python/a1-u3-l02-lab'

export default async function AiPythonU3L02Page({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  if (lessonId !== 'A1-U3-L02') notFound()
  return <AiPythonU3L02Lab />
}
