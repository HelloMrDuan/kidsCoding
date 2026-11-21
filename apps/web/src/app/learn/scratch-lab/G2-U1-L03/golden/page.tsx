import { currentCreateOwner } from '@/features/create/create-owner'
import { ForestConcertCourse } from '@/features/lessons/golden-scratch/forest-concert-course'

export const dynamic = 'force-dynamic'

export default async function GoldenForestConcertPage() {
  const owner = await currentCreateOwner()
  if (!owner) return <main className="kc-page-main"><p role="alert">无法确认账号，请重新登录后再打开音乐会。</p></main>
  return <ForestConcertCourse key={owner} owner={owner} host={process.env.SCRATCH_CREATE_GUI_URL} />
}
