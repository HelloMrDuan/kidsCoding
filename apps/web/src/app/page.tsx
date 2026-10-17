import { HomeLearningCenter } from '@/features/marketing/home-learning-center'
import { AppShell } from '@/features/ui/app-shell'

/** UX-601: home is the V2 学习中心 inside the global shell, kid-cartoon content. */
export default function HomePage() {
  return (
    <AppShell>
      <HomeLearningCenter />
    </AppShell>
  )
}
