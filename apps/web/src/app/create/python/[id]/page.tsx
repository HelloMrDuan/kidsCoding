import { currentCreateOwner } from '@/features/create/create-owner'
import { PythonCreateEditor } from '@/features/create/python-create-editor'
import { Workspace } from '@/features/create/workspace'

export const metadata = { title: 'Python 代码创作 · KidsCoding' }

export default async function PythonProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const owner = await currentCreateOwner()
  return owner ? <PythonCreateEditor key={`${owner}/${id}`} id={id} owner={owner} /> :
    <Workspace title="Python 创作"><p role="alert">暂时无法核对账号。刷新页面后再打开作品。</p></Workspace>
}
