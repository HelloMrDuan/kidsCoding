'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { getFoundationUnitByLessonId } from '@/content/curriculum/foundation-units'
import { resolveCourseAccess } from '@/features/billing/resolve-course-access'
import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { useLaunchCurriculum } from '@/features/curriculum/use-launch-curriculum'
import { BlocklyWorkspace } from '@/features/lessons/blockly/blockly-workspace'
import { evaluateStep } from '@/features/lessons/blockly/evaluate-step'
import { PreviewStage } from '@/features/lessons/blockly/preview-stage'
import { buildHintState } from '@/features/lessons/build-hint-state'
import { completeLaunchLesson } from '@/features/lessons/complete-launch-lesson'
import { getFoundationLessonFeedback } from '@/features/lessons/foundation-lesson-feedback'
import { GuidedLessonShell } from '@/features/lessons/guided-lesson-shell'
import { TemplateStoryBuilder } from '@/features/lessons/template-story-builder'
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
  const curriculum = useLaunchCurriculum()
  const { allLessons } = buildLaunchMap(curriculum.lessons)
  const lesson = allLessons.find((item) => item.id === lessonId)
  const [stepIndex, setStepIndex] = useState(0)
  const [blocks, setBlocks] = useState<Array<{ type: string }>>([])
  const blocksRef = useRef<Array<{ type: string }>>([])
  const [feedback, setFeedback] = useState<string>(() =>
    getFoundationLessonFeedback(lessonId ?? '', 'initial'),
  )
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
    return (
      <main className="p-6 text-lg font-semibold">
        没找到这节课，先回学习地图重新进入试试。
      </main>
    )
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
  const remedialMicroScript =
    failedAttempts > 0 && hintState.showRemedialJump
      ? getFoundationUnitByLessonId(currentLesson.id)?.remedialMicroScript
      : undefined
  const templateName =
    curriculum.templates.find((item) => item.id === currentLesson.templateId)
      ?.name ?? '故事模板'
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
        nextHintState.activeHint?.copy ??
          getFoundationLessonFeedback(currentLesson.id, 'retry'),
      )
      return
    }

    setFailedAttempts(0)

    if (stepIndex < currentLesson.steps.length - 1) {
      setStepIndex(stepIndex + 1)
      setFeedback(getFoundationLessonFeedback(currentLesson.id, 'progress'))
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#fff7ed_100%)] px-4 py-6 md:px-6 md:py-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2.5rem] border border-white/75 bg-[linear-gradient(180deg,#ffffff_0%,#fff6ec_100%)] px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#eef8ff] px-4 py-2 text-sm font-semibold text-sky-700">
              第 {stepIndex + 1} 步 / 共 {currentLesson.steps.length} 步
            </span>
            <span className="rounded-full bg-[#fff1d4] px-4 py-2 text-sm font-semibold text-amber-700">
              {currentLesson.phase === 'trial' ? '启蒙课' : '高阶创作课'}
            </span>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-[3.2rem]">
                {currentLesson.title}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 md:text-lg md:leading-8">
                先完成这个小目标，再看看舞台里的角色马上会发生什么变化。每一步都在把故事往前推进。
              </p>
            </div>
            <div className="rounded-[1.75rem] bg-white/80 px-5 py-4 text-sm leading-7 text-slate-600 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
              当前步骤：<span className="font-bold text-slate-900">{step.title}</span>
            </div>
          </div>
        </header>

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
          remedialMicroScript={remedialMicroScript}
          stepTitle={`第 ${stepIndex + 1} 步：${step.title}`}
          voiceover={step.voiceover}
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
                blocks={blocks}
                onSnapshotChange={handleSnapshotChange}
              />
            </div>
          )}
        </GuidedLessonShell>
      </section>
    </main>
  )
}
