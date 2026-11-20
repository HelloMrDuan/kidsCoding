import { ScratchCreateEditor } from '@/features/scratch-create/scratch-create-editor'
import { currentCreateOwner } from '@/features/create/create-owner'
import { Workspace } from '@/features/create/workspace'

export const metadata = { title: 'Scratch 自由创作 · KidsCoding' }

export default async function ScratchProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const owner = await currentCreateOwner()
  return owner ? <ScratchCreateEditor key={`${owner}/${id}`} id={id} owner={owner} guiAddress={process.env.SCRATCH_CREATE_GUI_URL} /> :
    <Workspace title="Scratch 创作"><p role="alert">暂时无法核对账号。刷新页面后再打开作品。</p></Workspace>
}
