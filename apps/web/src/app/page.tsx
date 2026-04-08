import { GrowthPath } from '@/features/marketing/growth-path'
import { ParentConfidence } from '@/features/marketing/parent-confidence'
import { StoryStage } from '@/features/marketing/story-stage'
import { TrialCta } from '@/features/marketing/trial-cta'

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 md:px-6 md:py-8">
      <div className="mx-auto grid max-w-7xl gap-6 md:gap-8">
        <StoryStage />
        <GrowthPath />
        <ParentConfidence />
        <TrialCta />
      </div>
    </main>
  )
}
