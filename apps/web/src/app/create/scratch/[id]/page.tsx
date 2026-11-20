import { ScratchCreateEditor } from '@/features/scratch-create/scratch-create-editor'

export const metadata = { title: 'Scratch 自由创作 · KidsCoding' }

export default async function ScratchProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ScratchCreateEditor key={id} id={id} guiAddress={process.env.SCRATCH_CREATE_GUI_URL} />
}
