import { ScratchVMTrial } from '@/features/scratch-vm/scratch-vm-trial'
import { ScratchPenLab } from '@/features/scratch-pen/scratch-pen-lab'
import { ScratchG2Lab } from '@/features/scratch-g2/scratch-g2-lab'
import { getG2ScratchLesson } from '@/content/curriculum/g2-u1-scratch-lessons'
import { notFound } from 'next/navigation'
export default async function ScratchVMTrialPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const {lessonId}=await params
  if(lessonId==='G3-U1-L02')return <ScratchVMTrial/>
  if(lessonId==='G3-U1-L01')return <ScratchPenLab/>
  const g2=getG2ScratchLesson(lessonId)
  if(g2)return <ScratchG2Lab lesson={g2}/>
  notFound()
}
