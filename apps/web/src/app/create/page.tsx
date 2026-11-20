import { connection } from 'next/server'
import { AppShell } from '@/features/ui/app-shell'
import { ScratchCreateHub } from '@/features/scratch-create/scratch-create-hub'

export const metadata = { title: 'KidsCoding 创作中心' }

export default async function CreatePage() {
  await connection()
  return <AppShell><ScratchCreateHub guiAddress={process.env.SCRATCH_CREATE_GUI_URL} /></AppShell>
}
