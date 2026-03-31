'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { launchTemplates } from '@/content/curriculum/launch-lessons'
import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { resolveCourseAccess } from '@/features/billing/resolve-course-access'
import { BlocklyWorkspace } from '@/features/lessons/blockly/blockly-workspace'
import { evaluateStep } from '@/features/lessons/blockly/evaluate-step'
import { PreviewStage } from '@/features/lessons/blockly/preview-stage'
import { buildHintState } from '@/features/lessons/build-hint-state'
import { completeLaunchLesson } from '@/features/lessons/complete-launch-lesson'
import { GuidedLessonShell } from '@/features/lessons/guided-lesson-shell'
import { TemplateStoryBuilder } from '@/features/lessons/template-story-builder'
import { readOnboardingSession } from '@/features/onboarding/onboarding-session'
import {
  readGuestProgress,
  writeGuestProgress,
} from '@/features/progress/local-progress'
import { syncGuestSnapshot } from '@/features/progress/sync-guest-snapshot'
import { awardLessonCompletion } from '@/features/rewards/award-lesson-completion'

const DEFAULT_FEEDBACK = '先按提示完成这一小步。'

export default function LessonPage() {
  const params = useParams<{ lessonId: string }>()
  const router = useRouter()
  const lessonId = Array.isArray(params.lessonId)
    ? params.lessonId[0]
    : params.lessonId
  const { allLessons } = buildLaunchMap()
  const lesson = allLessons.find((item) => item.id === lessonId)
  const [stepIndex, setStepIndex] = useState(0)
  const [blocks, setBlocks] = useState<Array<{ type: string }>>([])
  const blocksRef = useRef<Array<{ type: string }>>([])
  const [feedback, setFeedback] = useState(DEFAULT_FEEDBACK)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [hasCourseEntitlement, setHasCourseEntitlement] = useState(false)

  const handleSnapshotChange = useCallback((nextBlocks: Array<{ type: string }>) => {
    blocksRef.current = nextBlocks
    setBlocks(nextBlocks)
  }, [])

  useEffect(() => {
    let isActive = true

    fetch('/api/course-access')
      .then(async (response) => {
        if (!response.ok) {
          return { hasLaunchPack: false }
        }

        return (await response.json()) as { hasLaunchPack?: boolean }
      })
      .then((payload) => {
        if (isActive) {
          setHasCourseEntitlement(Boolean(payload.hasLaunchPack))
        }
      })
      .catch(() => {})

    return () => {
      isActive = false
    }
  }, [])

  if (!lesson) {
    return <main className="p-6 text-lg font-semibold">没有找到这一课。</main>
  }

  const currentLesson = lesson
  const step = currentLesson.steps[stepIndex]
  const hintState = buildHintState({
    failedAttempts,
    hintLayers: currentLesson.hintLayers,
  })
  const hintCopy = failedAttempts > 0 ? hintState.activeHint?.copy : undefined
  const remedialLessonId =
    failedAttempts > 0 && hintState.showRemedialJump
      ? hintState.activeHint?.remedialLessonId
      : undefined
  const templateName =
    launchTemplates.find((item) => item.id === currentLesson.templateId)?.name ??
    '故事模板'
  const courseAccess = resolveCourseAccess({
    lessonPhase: currentLesson.phase,
    hasLaunchPack: hasCourseEntitlement,
  })

  function handleStartRemedial(remedialId: string) {
    router.push(
      `/learn/remedial/${remedialId}?from=${currentLesson.id}&step=${step.id}`,
    )
  }

  async function handleNext() {
    if (!evaluateStep(step.requiredBlockTypes, blocksRef.current)) {
      const nextFailedAttempts = failedAttempts + 1
      const nextHintState = buildHintState({
        failedAttempts: nextFailedAttempts,
        hintLayers: currentLesson.hintLayers,
      })

      setFailedAttempts(nextFailedAttempts)
      setFeedback(
        nextHintState.activeHint?.copy ?? '再检查一下积木顺序，然后继续试试。',
      )
      return
    }

    setFailedAttempts(0)

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
    const nextProgress = completeLaunchLesson({
      blocks: blocksRef.current,
      lesson: currentLesson,
      lessons: allLessons,
      progress,
      reward,
      updatedAt: new Date().toISOString(),
    })

    writeGuestProgress(nextProgress)
    await syncGuestSnapshot({
      onboarding: readOnboardingSession(),
      progress: nextProgress,
    })
    router.push(`/project/${currentLesson.id}/complete`)
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] px-6 py-8">
      <section className="mx-auto max-w-6xl">
        <GuidedLessonShell
          feedback={feedback}
          hintCopy={hintCopy}
          instruction={step.instruction}
          isLocked={courseAccess === 'locked'}
          lessonGoal={currentLesson.goal}
          lessonTitle={currentLesson.title}
          onCompleteStep={handleNext}
          onStartRemedial={handleStartRemedial}
          remedialLessonId={remedialLessonId}
          stepTitle={`第 ${stepIndex + 1} 步 · ${step.title}`}
        >
          {currentLesson.mode === 'template' ? (
            <TemplateStoryBuilder
              allowedBlocks={step.allowedBlocks}
              blocks={blocks}
              onSnapshotChange={handleSnapshotChange}
              templateName={templateName}
            />
          ) : (
            <div className="space-y-6">
              <PreviewStage blocks={blocks} />
              <BlocklyWorkspace
                allowedBlocks={step.allowedBlocks}
                onSnapshotChange={handleSnapshotChange}
              />
            </div>
          )}
        </GuidedLessonShell>
      </section>
    </main>
  )
}
