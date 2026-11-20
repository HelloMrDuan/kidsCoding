import { connection } from 'next/server'
import { AppShell } from '@/features/ui/app-shell'
import { CreateHub } from '@/features/create/create-hub'
import { currentCreateOwner } from '@/features/create/create-owner'

export const metadata = { title: 'KidsCoding 创作中心' }

export default async function CreatePage() {
  await connection()
  const owner = await currentCreateOwner()
  return <AppShell>{owner ? <CreateHub key={owner} guiAddress={process.env.SCRATCH_CREATE_GUI_URL} owner={owner} /> :
    <main className="kc-page-main"><h1>创作中心</h1><p role="alert">暂时无法核对账号。刷新页面后再打开作品。</p></main>}</AppShell>
}
