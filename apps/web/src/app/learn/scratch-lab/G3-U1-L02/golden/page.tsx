import { currentCreateOwner } from '@/features/create/create-owner'
import { MeteorCourse } from '@/features/lessons/golden-scratch/meteor-course'

export const dynamic = 'force-dynamic'

export default async function GoldenMeteorPage() {
  const owner = await currentCreateOwner()
  if (!owner) return <main className="kc-page-main"><p role="alert">无法确认账号，请重新登录后打开流星雨项目。</p></main>
  return <MeteorCourse key={owner} owner={owner} host={process.env.SCRATCH_CREATE_GUI_URL} />
}
