'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { getFoundationUnitByLessonId } from '@/content/curriculum/foundation-units'
import { resolveCourseAccess } from '@/features/billing/resolve-course-access'
import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { useLaunchCurriculum } from '@/features/curriculum/use-launch-curriculum'
import { BlocklyWorkspace } from '@/features/lessons/blockly/blockly-workspace'
import { evaluateStep } from '@/features/lessons/blockly/evaluate-step'
import { PreviewStage } from '@/features/lessons/blockly/preview-stage'
import { PlayableStage } from '@/features/lessons/playable-stage'
import { DuoStage } from '@/features/lessons/playable-stage/duo-stage'
import { buildHintState } from '@/features/lessons/build-hint-state'
import { completeLaunchLesson } from '@/features/lessons/complete-launch-lesson'
import { getFoundationLessonFeedback } from '@/features/lessons/foundation-lesson-feedback'
import { GuidedLessonShell } from '@/features/lessons/guided-lesson-shell'
import type {
  LessonCloudSyncState,
  LessonLocalSaveState,
} from '@/features/lessons/guided-lesson-shell'
import { TemplateStoryBuilder } from '@/features/lessons/template-story-builder'
import { readOnboardingSession } from '@/features/onboarding/onboarding-session'
import {
  clearLessonDraft,
  clearLessonDraftsForLesson,
  loadLessonDraft,
  readLastLessonStep,
  saveLessonDraft,
} from '@/features/progress/lesson-draft'
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
  // Hydration-safe: the first render must not read browser storage. The
  // server renders step 0 / unsaved, and the client must render the exact
  // same HTML during hydration. Reading sessionStorage in a useState
  // initializer made the client render a different step / save chip after
  // a reload with a saved draft (React hydration error #418, caught by the
  // blockly-duo E2E which reloads after saving). The real last step is
  // restored in the mount effect below, which only runs on the client
  // after hydration. (The blocks initializer below still reads the step-0
  // draft during render, as before: blocks never reach the rendered HTML —
  // they only feed the Blockly effect — so it cannot mismatch hydration.)
  const [stepIndex, setStepIndex] = useState(0)
  const [resumedFromStep, setResumedFromStep] = useState<number | null>(null)
  const [blocks, setBlocks] = useState<Array<{ type: string }>>(() => {
    if (!lessonId) {
      return []
    }
    const draft = loadLessonDraft(lessonId, 0)
    return draft && draft.blocks.length > 0 ? draft.blocks : []
  })
  const [localSaveState, setLocalSaveState] =
    useState<LessonLocalSaveState>('unsaved')
  const restoredForRef = useRef<string | null>(null)
  const [cloudSyncState, setCloudSyncState] =
    useState<LessonCloudSyncState>('idle')
  const [isCompleting, setIsCompleting] = useState(false)
  const pendingProgressRef = useRef<ReturnType<typeof readGuestProgress> | null>(
    null,
  )
  const blocksRef = useRef<Array<{ type: string }>>(blocks)
  const [feedback, setFeedback] = useState<string>(() =>
    getFoundationLessonFeedback(lessonId ?? '', 'initial'),
  )
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [hasCourseEntitlement, setHasCourseEntitlement] = useState(false)
  const [hasRunSuccess,setHasRunSuccess] = useState(false)

  // Restore the real last step after hydration (client-only). The restore
  // is deferred to a microtask so it runs after the hydration commit:
  // calling setState synchronously in the effect body would re-render
  // against new state during hydration and trip the set-state-in-effect
  // lint. Runs once per lesson.
  useEffect(() => {
    if (!lessonId || restoredForRef.current === lessonId) {
      return
    }
    restoredForRef.current = lessonId

    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) {
        return
      }

      const lastStep = readLastLessonStep(lessonId) ?? 0
      if (lastStep > 0) {
        setResumedFromStep(lastStep)
        setStepIndex(lastStep)
        const draft = loadLessonDraft(lessonId, lastStep)
        if (draft && draft.blocks.length > 0) {
          blocksRef.current = draft.blocks
          setBlocks(draft.blocks)
        }
        setLocalSaveState(draft ? 'saved' : 'unsaved')
        return
      }

      const draft = loadLessonDraft(lessonId, 0)
      setLocalSaveState(draft ? 'saved' : 'unsaved')
    })
    return () => {
      cancelled = true
    }
  }, [lessonId])

  const handleSnapshotChange = useCallback(
    (nextBlocks: Array<{ type: string }>) => {
      blocksRef.current = nextBlocks
      setBlocks(nextBlocks)
      setHasRunSuccess(false)

      if (lessonId) {
        // The boolean result is the save truth: a failed write must show
        // as failed, never as saved.
        setLocalSaveState(
          saveLessonDraft(lessonId, stepIndex, nextBlocks)
            ? 'saved'
            : 'failed',
        )
      }
    },
    [lessonId, stepIndex, setHasRunSuccess],
  )

  const handleRetryLocalSave = useCallback(() => {
    if (!lessonId) {
      return
    }

    setLocalSaveState(
      saveLessonDraft(lessonId, stepIndex, blocksRef.current)
        ? 'saved'
        : 'failed',
    )
  }, [lessonId, stepIndex])

  const goToStep = useCallback(
    (nextStepIndex: number) => {
      const draft = lessonId
        ? loadLessonDraft(lessonId, nextStepIndex)
        : null
      // Carry the current blocks forward when there is no saved draft for the
      // next step. Only a saved draft should override the in-progress blocks.
      const nextBlocks =
        draft && draft.blocks.length > 0 ? draft.blocks : blocksRef.current
      blocksRef.current = nextBlocks
      setBlocks(nextBlocks)
      setStepIndex(nextStepIndex)
      setResumedFromStep(null)
      setLocalSaveState(
        lessonId && loadLessonDraft(lessonId, nextStepIndex)
          ? 'saved'
          : 'unsaved',
      )
      setHasRunSuccess(false)
    },
    [lessonId, setHasRunSuccess],
  )

  const handleRunSuccess=useCallback(() => {
    setHasRunSuccess(true)
    if (['lesson-10-second-friend', 'lesson-11-duo-rehearsal', 'lesson-12-graduation-show'].includes(lessonId)) setFeedback('本步角色结果与学习活动已验证。看看两条轨道，再完成这一步。')
  }, [lessonId, setHasRunSuccess, setFeedback])
  const handleRunClear=useCallback(() => {
    setHasRunSuccess(false)
    if (['lesson-10-second-friend', 'lesson-11-duo-rehearsal', 'lesson-12-graduation-show'].includes(lessonId)) setFeedback('先运行积木，观察两个朋友的实际位置，再完成本步学习活动。')
  }, [lessonId, setHasRunSuccess, setFeedback])

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
        没找到这一节课，先回学习地图再重新进入试试。
      </main>
    )
  }

  const currentLesson = lesson
  // Guard against a saved step index that no longer exists if the
  // curriculum shrank: never render an out-of-range step.
  const safeStepIndex = Math.min(stepIndex, currentLesson.steps.length - 1)
  const step = currentLesson.steps[safeStepIndex]
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
  const currentTemplate = curriculum.templates.find(
    (item) => item.id === currentLesson.templateId,
  )
  const courseAccess = resolveCourseAccess({
    lessonPhase: currentLesson.phase,
    hasLaunchPack: hasCourseEntitlement,
  })
  const currentUnit = getFoundationUnitByLessonId(currentLesson.id)
  const completionPreview = getFoundationLessonFeedback(currentLesson.id, 'progress')

  function handleStartRemedial(remedialId: string) {
    router.push(
      `/learn/remedial/${remedialId}?from=${currentLesson.id}&step=${step.id}`,
    )
  }

  async function handleNext() {
    const needsRun=['lesson-01-forest-hello','lesson-02-forest-greeting','lesson-03-forest-story','lesson-04-meadow-scene','lesson-05-meadow-order','lesson-06-meadow-story','lesson-07-garden-click','lesson-08-garden-dialogue','lesson-09-garden-story'].includes(currentLesson.id)
    const duoLesson = ['lesson-10-second-friend', 'lesson-11-duo-rehearsal', 'lesson-12-graduation-show'].includes(currentLesson.id)
    const correct=duoLesson ? hasRunSuccess : evaluateStep(step.requiredBlockTypes,blocksRef.current) && (!needsRun || blocksRef.current.length===step.requiredBlockTypes.length)
    if (!correct || (needsRun && !hasRunSuccess)) {
      const nextFailedAttempts = failedAttempts + 1
      const nextHintState = buildHintState({
        failedAttempts: nextFailedAttempts,
        hintLayers: currentLesson.hintLayers,
      })

      setFailedAttempts(nextFailedAttempts)
      setFeedback(
        needsRun && correct && !hasRunSuccess
          ? (currentLesson.id.includes('garden-') ? '请先在舞台启动程序，再亲自点击蝴蝶，观察事件触发的结果。' : '积木拼好了，请先点击舞台上的“运行”按钮观察结果，再完成这一步。')
          : duoLesson ? '请先运行并观察角色结果，完成本步的预测、错误实验或复盘。舞台会告诉你还缺什么。' : nextHintState.activeHint?.copy ?? getFoundationLessonFeedback(currentLesson.id, 'retry'),
      )
      return
    }

    setFailedAttempts(0)
    setHasRunSuccess(false)

    if (stepIndex < currentLesson.steps.length - 1) {
      clearLessonDraft(currentLesson.id, stepIndex)
      goToStep(stepIndex + 1)
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

    if (isCompleting) {
      return
    }
    setIsCompleting(true)

    try {
      writeGuestProgress(nextProgress)
    } catch {
      setHasRunSuccess(true)
      setFeedback('本机存储失败，作品和奖励尚未保存。请检查浏览器存储空间后重试完成。')
      setIsCompleting(false)
      return
    }

    // Cloud sync is a separate truth from the local save: a failed sync
    // must stay visible as failed with a retry, never as success.
    setCloudSyncState('syncing')
    const syncResult = await syncGuestSnapshot({
      onboarding: readOnboardingSession(),
      progress: nextProgress,
    })
    if (!syncResult.ok) {
      pendingProgressRef.current = nextProgress
      setCloudSyncState('failed')
      setIsCompleting(false)
      return
    }
    setCloudSyncState(syncResult.synced ? 'synced' : 'local-only')
    pendingProgressRef.current = null
    clearLessonDraftsForLesson(currentLesson.id)
    router.push(`/project/${currentLesson.id}/complete`)
  }

  async function handleRetryCloudSync() {
    const pending = pendingProgressRef.current
    if (!pending || isCompleting) {
      return
    }
    setIsCompleting(true)
    setCloudSyncState('syncing')

    const syncResult = await syncGuestSnapshot({
      onboarding: readOnboardingSession(),
      progress: pending,
    })
    if (!syncResult.ok) {
      setCloudSyncState('failed')
      setIsCompleting(false)
      return
    }

    setCloudSyncState(syncResult.synced ? 'synced' : 'local-only')
    pendingProgressRef.current = null
    clearLessonDraftsForLesson(currentLesson.id)
    router.push(`/project/${currentLesson.id}/complete`)
  }

  function handleContinueLocalOnly() {
    // Explicit choice: the local save is real, the cloud copy is missing,
    // and the next lesson completion re-syncs the full snapshot.
    pendingProgressRef.current = null
    clearLessonDraftsForLesson(currentLesson.id)
    router.push(`/project/${currentLesson.id}/complete`)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#fff7ed_100%)] px-4 py-6 md:px-6 md:py-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="kc-surface-3d rounded-[2.5rem] px-6 py-6 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
                href="/learn/map"
              >
                回到学习地图
              </Link>
              {currentUnit ? (
                <span className="rounded-full bg-[#eef8ff] px-4 py-2 text-sm font-semibold text-sky-700">
                  当前单元：{currentUnit.title}
                </span>
              ) : null}
            </div>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm">
              {currentLesson.phase === 'trial' ? '启蒙主线' : '高阶创作'}
            </span>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-[3.2rem]">
                {currentLesson.title}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 md:text-lg md:leading-8">
                先完成当前这一步，再看看舞台里的角色会发生什么变化。每一步都在把故事往前推进。
              </p>
            </div>
            <div
              className="kc-panel-3d grid gap-3 rounded-[1.75rem] px-5 py-4 text-sm leading-7 text-slate-600"
              data-testid="lesson-entry-summary"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                  当前任务
                </p>
                <p className="mt-2 text-base font-bold text-slate-900">{step.title}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                  做完这节会得到
                </p>
                <p className="mt-2 text-base font-bold text-slate-900">
                  {completionPreview}
                </p>
              </div>
            </div>
          </div>
        </header>

        <GuidedLessonShell
          cloudSyncState={cloudSyncState}
          feedback={feedback}
          hintCopy={hintCopy}
          instruction={step.instruction}
          isCompleting={isCompleting}
          isLocked={courseAccess === 'locked'}
          lessonGoal={currentLesson.goal}
          lessonTitle={currentLesson.title}
          localSaveState={localSaveState}
          onCompleteStep={handleNext}
          onContinueLocalOnly={handleContinueLocalOnly}
          onRetryCloudSync={handleRetryCloudSync}
          onRetryLocalSave={handleRetryLocalSave}
          onStartRemedial={handleStartRemedial}
          remedialLessonId={remedialLessonId}
          remedialMicroScript={remedialMicroScript}
          resumedFromStep={resumedFromStep}
          stepCount={currentLesson.steps.length}
          stepIndex={safeStepIndex}
          stepTitle={`第 ${safeStepIndex + 1} 步：${step.title}`}
          voiceover={step.voiceover}
        >
          {currentLesson.mode === 'template' ? (
            <TemplateStoryBuilder
              allowedBlocks={step.allowedBlocks}
              blocks={blocks}
              onSnapshotChange={handleSnapshotChange}
              template={currentTemplate}
              templateName={templateName}
            />
          ) : (
            <div className="space-y-6">
              {['lesson-10-second-friend', 'lesson-11-duo-rehearsal', 'lesson-12-graduation-show'].includes(currentLesson.id) ? (
                <DuoStage key={`${currentLesson.id}:${stepIndex}`} blocks={blocks} requiredBlocks={step.requiredBlockTypes}
                  graduation={currentLesson.id === 'lesson-12-graduation-show'} dialogue={currentLesson.id === 'lesson-11-duo-rehearsal'} stepIndex={stepIndex} onRunSuccess={handleRunSuccess} onRunClear={handleRunClear}/>
              ) : ['lesson-01-forest-hello','lesson-02-forest-greeting','lesson-03-forest-story','lesson-04-meadow-scene','lesson-05-meadow-order','lesson-06-meadow-story','lesson-07-garden-click','lesson-08-garden-dialogue','lesson-09-garden-story'].includes(currentLesson.id) ? (
                <PlayableStage key={`${currentLesson.id}:${stepIndex}`} blocks={blocks} template={currentTemplate}
                  requiredBlocks={step.requiredBlockTypes} stepIndex={stepIndex}
                  onRunSuccess={handleRunSuccess} onRunClear={handleRunClear}/>
              ) : (
                <PreviewStage blocks={blocks} template={currentTemplate}/>
              )}
              <BlocklyWorkspace
                enableProgramTools={['lesson-10-second-friend', 'lesson-11-duo-rehearsal', 'lesson-12-graduation-show'].includes(currentLesson.id)}
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
