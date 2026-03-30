'use client'

import { useCallback, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { storyPathLessons } from '@/content/lessons/story-path'
import { BlocklyWorkspace } from '@/features/lessons/blockly/blockly-workspace'
import { evaluateStep } from '@/features/lessons/blockly/evaluate-step'
import { PreviewStage } from '@/features/lessons/blockly/preview-stage'
import { getKidsBlockLabel } from '@/features/lessons/blockly/register-kids-blocks'
import { readOnboardingSession } from '@/features/onboarding/onboarding-session'
import {
  readGuestProgress,
  writeGuestProgress,
} from '@/features/progress/local-progress'
import { syncGuestSnapshot } from '@/features/progress/sync-guest-snapshot'
import { awardLessonCompletion } from '@/features/rewards/award-lesson-completion'

export default function LessonPage() {
  const params = useParams<{ lessonId: string }>()
  const router = useRouter()
  const lessonId = Array.isArray(params.lessonId)
    ? params.lessonId[0]
    : params.lessonId
  const lesson = storyPathLessons.find((item) => item.id === lessonId)
  const [stepIndex, setStepIndex] = useState(0)
  const [blocks, setBlocks] = useState<Array<{ type: string }>>([])
  const blocksRef = useRef<Array<{ type: string }>>([])
  const [feedback, setFeedback] = useState('先按提示摆好第一个积木。')

  const handleSnapshotChange = useCallback((nextBlocks: Array<{ type: string }>) => {
    blocksRef.current = nextBlocks
    setBlocks(nextBlocks)
  }, [])

  if (!lesson) {
    return <main className="p-6 text-lg font-semibold">没有找到这一关。</main>
  }

  const currentLesson = lesson
  const step = currentLesson.steps[stepIndex]

  async function handleNext() {
    if (!evaluateStep(step.requiredBlockTypes, blocksRef.current)) {
      setFeedback('再检查一下积木顺序，把它们按提示排好。')
      return
    }

    if (stepIndex < currentLesson.steps.length - 1) {
      setStepIndex(stepIndex + 1)
      setFeedback('太好了，继续下一步。')
      return
    }

    const progress = readGuestProgress()
    const reward = awardLessonCompletion({
      lessonId: currentLesson.id,
      rewardCardId: currentLesson.rewardCardId,
      isFirstProject: progress.completedProjectIds.length === 0,
      streakDays: progress.streakDays,
    })

    const nextProgress = {
      ...progress,
      completedLessonIds: [
        ...new Set([...progress.completedLessonIds, currentLesson.id]),
      ],
      currentLessonId: currentLesson.id,
      stars: progress.stars + reward.stars,
      badgeIds: [...new Set([...progress.badgeIds, ...reward.badgeIds])],
      cardIds: [...new Set([...progress.cardIds, ...reward.cardIds])],
      completedProjectIds: [
        ...new Set([...progress.completedProjectIds, currentLesson.id]),
      ],
    }

    writeGuestProgress(nextProgress)
    await syncGuestSnapshot({
      onboarding: readOnboardingSession(),
      progress: nextProgress,
    })
    router.push(`/project/${currentLesson.id}/complete`)
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] px-6 py-8">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4 rounded-[2rem] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-sky-600">
            步骤 {stepIndex + 1} / {currentLesson.steps.length}
          </p>
          <h1 className="text-3xl font-black text-slate-950">
            {currentLesson.title}
          </h1>
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            目标：{currentLesson.goal}
          </p>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900">{step.title}</h2>
            <p className="text-base leading-7 text-slate-600">
              {step.instruction}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {step.allowedBlocks.map((type) => (
              <span
                key={type}
                className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700"
              >
                {getKidsBlockLabel(type)}
              </span>
            ))}
          </div>
          <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
            {feedback}
          </p>
          <button
            className="w-full rounded-full bg-orange-500 px-5 py-3 font-bold text-white"
            data-testid="lesson-complete-step"
            onClick={handleNext}
            type="button"
          >
            完成这一步
          </button>
        </aside>
        <div className="space-y-6">
          <PreviewStage blocks={blocks} />
          <BlocklyWorkspace
            allowedBlocks={step.allowedBlocks}
            onSnapshotChange={handleSnapshotChange}
          />
        </div>
      </section>
    </main>
  )
}
