'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { getFoundationUnitByLessonId } from '@/content/curriculum/foundation-units'
import { getMistakeStep, getMistakeStepAt } from '@/content/curriculum/mistake-steps'
import { resolveCourseAccess } from '@/features/billing/resolve-course-access'
import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { useLaunchCurriculum } from '@/features/curriculum/use-launch-curriculum'
import { BlocklyWorkspace } from '@/features/lessons/blockly/blockly-workspace'
import { evaluateStep } from '@/features/lessons/blockly/evaluate-step'
import { evaluateObservable } from '@/features/lessons/blockly/observable-run'
import { motionVerbForTemplate } from '@/features/lessons/blockly/block-labels'
import { explainRunFailure } from '@/features/lessons/blockly/run-feedback'
import { getSayLineChoices, getStepJudgeOptions } from '@/features/lessons/blockly/step-judge-options'
import { PreviewStage } from '@/features/lessons/blockly/preview-stage'
import { PlayableStage } from '@/features/lessons/playable-stage'
import { getMainCharacterLabel } from '@/features/lessons/playable-stage/playable-stage'
import { DuoStage } from '@/features/lessons/playable-stage/duo-stage'
import { buildHintState } from '@/features/lessons/build-hint-state'
import { getRemedialIdForLesson } from '@/features/lessons/remedial-routing'
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
  // TQ-008: the program whose failed run was already counted, so pressing
  // “完成这一关” right after that failed run does not skip a hint tier.
  const countedRunFailureRef = useRef<string | null>(null)
  const currentStepId = lesson?.steps[Math.min(stepIndex, Math.max(0, (lesson?.steps.length ?? 1) - 1))]?.id ?? ''
  const judgeOptions = getStepJudgeOptions(lessonId ?? '', currentStepId)
  // TQ-010: lessons 01–09 each have one designed mistake → observe → fix step.
  const mistakeStep = getMistakeStep(lessonId ?? '', currentStepId)
  const [mistakeObserved, setMistakeObserved] = useState(false)
  const [mistakeAnswer, setMistakeAnswer] = useState<string | null>(null)
  const mistakeObservedRef = useRef(false)
  // Bumped to rebuild the Blockly workspace from `blocks` (e.g. “再摆一次错误程序”).
  const [workspaceVersion, setWorkspaceVersion] = useState(0)

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
        const resumedMistake = getMistakeStepAt(lessonId, lastStep)
        if (draft && draft.blocks.length > 0) {
          blocksRef.current = draft.blocks
          setBlocks(draft.blocks)
        } else if (resumedMistake) {
          blocksRef.current = resumedMistake.wrongProgram
          setBlocks(resumedMistake.wrongProgram)
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
      // TQ-010: a designed mistake step opens on its pre-built wrong program.
      const nextMistake = lessonId ? getMistakeStepAt(lessonId, nextStepIndex) : undefined
      const openMistake = Boolean(nextMistake && !(draft && draft.blocks.length > 0))
      const nextBlocks =
        draft && draft.blocks.length > 0 ? draft.blocks : nextMistake ? nextMistake.wrongProgram : blocksRef.current
      // Save the pre-built program as this step's draft, so a reload resumes at the experiment.
      if (openMistake && lessonId) saveLessonDraft(lessonId, nextStepIndex, nextBlocks)
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
      mistakeObservedRef.current = false
      setMistakeObserved(false)
      setMistakeAnswer(null)
    },
    [lessonId, setHasRunSuccess, setMistakeObserved, setMistakeAnswer],
  )

  const handleRunSuccess=useCallback(() => {
    setHasRunSuccess(true)
    if (['lesson-10-second-friend', 'lesson-11-duo-rehearsal', 'lesson-12-graduation-show'].includes(lessonId)) setFeedback('本关角色结果与学习活动已验证。看看两条轨道，再完成这一关。')
  }, [lessonId, setHasRunSuccess, setFeedback])
  const handleRunFailure = useCallback((failure?: { code: string | null }) => {
    // TQ-010: running the designed wrong program is the experiment, not a failed attempt.
    const design = getMistakeStepAt(lessonId ?? '', stepIndex)
    if (design && !mistakeObservedRef.current && failure?.code === design.expectedCode) {
      mistakeObservedRef.current = true
      setMistakeObserved(true)
      return
    }
    // Every failed real run is one failed attempt: hints escalate 1 → 2 → 3.
    countedRunFailureRef.current = `${stepIndex}|${JSON.stringify(blocksRef.current)}`
    setFailedAttempts((count) => count + 1)
  }, [stepIndex, lessonId, setMistakeObserved])
  const handleReloadMistake = useCallback(() => {
    const design = getMistakeStepAt(lessonId ?? '', stepIndex)
    if (!design) return
    const wrong = design.wrongProgram
    blocksRef.current = wrong
    setBlocks(wrong)
    setHasRunSuccess(false)
    if (lessonId) setLocalSaveState(saveLessonDraft(lessonId, stepIndex, wrong) ? 'saved' : 'failed')
    setWorkspaceVersion((version) => version + 1)
  }, [lessonId, stepIndex, setHasRunSuccess, setWorkspaceVersion])
  const handleRunClear=useCallback(() => {
    setHasRunSuccess(false)
    if (['lesson-10-second-friend', 'lesson-11-duo-rehearsal', 'lesson-12-graduation-show'].includes(lessonId)) setFeedback('先运行积木，观察两个朋友的实际位置，再完成本关学习活动。')
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
  const hintCopy = hintState.activeHint?.copy
  // TQ-008: tier-3 remedial follows the lesson's unit concept, not one fixed page.
  const remedialLessonId = hintState.showRemedialJump
    ? getRemedialIdForLesson(currentLesson.id, hintState.activeHint?.remedialLessonId)
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
    const correct=duoLesson ? hasRunSuccess : evaluateStep(step.requiredBlockTypes,blocksRef.current,judgeOptions)
    if (mistakeStep && !mistakeObserved) {
      // TQ-010: the designed mistake has to be seen on stage before it can be fixed.
      setFeedback(`先按舞台上的运行按钮，看看摆好的这段程序会让${getMainCharacterLabel(currentTemplate)}怎样，再来修好它。`)
      return
    }
    if (mistakeStep && !mistakeStep.choices.some((choice) => choice.id === mistakeAnswer && choice.correct)) {
      setFeedback(`先回答舞台上的问题：${mistakeStep.question}`)
      return
    }
    if (needsRun && correct && !hasRunSuccess) {
      // Not a mistake: the program is right but has not been run yet.
      setFeedback(currentLesson.id.includes('garden-') ? '请先在舞台启动程序，再亲自点击蝴蝶，观察事件触发的结果。' : '积木拼好了，请先点击舞台上的“运行”按钮观察结果，再完成这一关。')
      return
    }
    if (!correct) {
      const programKey = `${stepIndex}|${JSON.stringify(blocksRef.current)}`
      if (countedRunFailureRef.current === programKey) {
        // This exact failed run already raised the hint tier.
        countedRunFailureRef.current = null
      } else {
        setFailedAttempts((count) => count + 1)
      }
      if (duoLesson) {
        setFeedback('请先运行并观察角色结果，完成本关的预测、错误实验或复盘。舞台会告诉你还缺什么。')
      } else {
        const verdict = evaluateObservable(step.requiredBlockTypes, blocksRef.current, judgeOptions)
        setFeedback(explainRunFailure(verdict, getMainCharacterLabel(currentTemplate), motionVerbForTemplate(currentLesson.templateId)) || getFoundationLessonFeedback(currentLesson.id, 'retry'))
      }
      return
    }

    countedRunFailureRef.current = null

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
    <main className="min-h-screen bg-[var(--kc-canvas)]">
      <section className="kc-page-main">
        <header className="kc-title-row" data-testid="lesson-page-title-row">
          <div className="min-w-0">
            <div className="kc-eyebrow">INTERACTIVE CODING LESSON</div>
            <h1>编程课堂 · {currentLesson.title}</h1>
            <p className="kc-subtitle">
              {currentUnit ? `当前单元：${currentUnit.title} · ` : ''}
              {currentLesson.phase === 'trial' ? '启蒙主线' : '高阶创作'}
            </p>
          </div>
          <Link
            className="kc-action-surface kc-btn-outline kc-btn-sm shrink-0"
            href="/learn/map"
          >
            <span aria-hidden="true">↖</span>
            回到学习地图
          </Link>
        </header>

        <GuidedLessonShell
          cloudSyncState={cloudSyncState}
          completionPreview={completionPreview}
          codeSlot={
            currentLesson.mode === 'template' ? (
              <TemplateStoryBuilder
                allowedBlocks={step.allowedBlocks}
                blocks={blocks}
                onSnapshotChange={handleSnapshotChange}
                template={currentTemplate}
                templateName={templateName}
              />
            ) : (
              <BlocklyWorkspace
                key={`workspace-${workspaceVersion}`}
                enableProgramTools={Boolean(mistakeStep) || ['lesson-10-second-friend', 'lesson-11-duo-rehearsal', 'lesson-12-graduation-show'].includes(currentLesson.id)}
                snapStartOnTop={Boolean(mistakeStep)}
                allowedBlocks={step.allowedBlocks}
                blocks={blocks}
                onSnapshotChange={handleSnapshotChange}
                sayLineChoices={getSayLineChoices(currentLesson.id)}
                motionVerb={motionVerbForTemplate(currentLesson.templateId)}
              />
            )
          }
          feedback={feedback}
          hintCopy={hintCopy}
          hintTier={hintState.tier || undefined}
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
          stageSlot={
            currentLesson.mode === 'template' ? null : (
              <>
                {['lesson-10-second-friend', 'lesson-11-duo-rehearsal', 'lesson-12-graduation-show'].includes(currentLesson.id) ? (
                  <DuoStage key={`${currentLesson.id}:${stepIndex}`} blocks={blocks} requiredBlocks={step.requiredBlockTypes}
                    graduation={currentLesson.id === 'lesson-12-graduation-show'} dialogue={currentLesson.id === 'lesson-11-duo-rehearsal'} stepIndex={stepIndex} onRunSuccess={handleRunSuccess} onRunClear={handleRunClear}/>
                ) : ['lesson-01-forest-hello','lesson-02-forest-greeting','lesson-03-forest-story','lesson-04-meadow-scene','lesson-05-meadow-order','lesson-06-meadow-story','lesson-07-garden-click','lesson-08-garden-dialogue','lesson-09-garden-story'].includes(currentLesson.id) ? (
                  <PlayableStage key={`${currentLesson.id}:${stepIndex}`} blocks={blocks} template={currentTemplate}
                    requiredBlocks={step.requiredBlockTypes} stepIndex={stepIndex} judgeOptions={judgeOptions}
                    onRunSuccess={handleRunSuccess} onRunClear={handleRunClear} onRunFailure={handleRunFailure}
                    mistake={mistakeStep} mistakeObserved={mistakeObserved} mistakeAnswer={mistakeAnswer}
                    onMistakeAnswer={setMistakeAnswer} onReloadMistake={mistakeStep ? handleReloadMistake : undefined}/>
                ) : (
                  <PreviewStage blocks={blocks} template={currentTemplate}/>
                )}
              </>
            )
          }
          stepCount={currentLesson.steps.length}
          stepIndex={safeStepIndex}
          stepTitle={`第 ${safeStepIndex + 1} 关：${step.title}`}
          voiceover={step.voiceover}
        />
      </section>
    </main>
  )
}
