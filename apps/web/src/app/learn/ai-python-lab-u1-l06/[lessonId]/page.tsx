import { notFound } from 'next/navigation'
import { AiPythonU1L06Lab } from '@/features/ai-python/a1-u1-l06-lab'

export default async function AiPythonU1L06Page({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  if (lessonId !== 'A1-U1-L06') notFound()
  return <AiPythonU1L06Lab />
}
