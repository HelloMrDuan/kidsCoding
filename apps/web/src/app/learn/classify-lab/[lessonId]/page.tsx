import { notFound } from 'next/navigation'
import { ClassifyLab } from '@/features/classify/classify-lab'

export default async function ClassifyLabPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  if (lessonId !== 'A0-U1-L01') notFound()
  return <ClassifyLab />
}
