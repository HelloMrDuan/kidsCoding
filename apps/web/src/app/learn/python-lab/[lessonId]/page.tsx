import { PythonTrialLab } from '@/features/python-lab/python-trial-lab'
import { PythonMultiLab } from '@/features/python-lab/python-multi-lab'
import { isMultiPythonLessonId } from '@/features/python-lab/python-multi-grade'
import { PYTHON_TRIAL_LESSON_ID } from '@/features/python-lab/python-lab-grade'
import { notFound } from 'next/navigation'

export default async function PythonLabPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  if (lessonId === PYTHON_TRIAL_LESSON_ID) return <PythonTrialLab />
  if (isMultiPythonLessonId(lessonId)) return <PythonMultiLab lessonId={lessonId} />
  notFound()
}
