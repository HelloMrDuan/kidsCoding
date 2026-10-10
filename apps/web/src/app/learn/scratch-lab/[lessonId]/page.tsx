import { ScratchVMTrial } from '@/features/scratch-vm/scratch-vm-trial'
import { notFound } from 'next/navigation'
export default async function ScratchVMTrialPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const {lessonId}=await params
  if(lessonId!=='G3-U1-L02')notFound()
  return <ScratchVMTrial/>
}
