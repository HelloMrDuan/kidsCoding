'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import type { FoundationRemedialMicroScript } from '@/features/domain/types'

import { RemedialLinkCard } from './remedial-link-card'

/**
 * Local (this-device) draft save state. `unsaved` means no save attempt has
 * succeeded yet for the current step — never display it as saved.
 */
export type LessonLocalSaveState = 'unsaved' | 'saved' | 'failed'

/**
 * Cloud snapshot sync state. `idle` hides the cloud chip entirely: no sync
 * has been attempted, so there is nothing truthful to show. `local-only`
 * means the server answered but has no cloud backend configured — the
 * local save is real, but there is no cloud copy, so it must not read as
 * "synced to cloud".
 */
export type LessonCloudSyncState =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'local-only'
  | 'failed'

/** The three classroom zones from the frozen V2 prototype (task / code / stage). */
export type LessonPane = 'task' | 'code' | 'stage'

type GuidedLessonShellProps = {
  lessonTitle: string
  lessonGoal: string
  /** Real "what this lesson builds" copy, shown in the task objective. */
  completionPreview?: string
  isLocked: boolean
  stepTitle?: string
  instruction?: string
  voiceover?: string
  feedback?: string
  hintCopy?: string
  remedialLessonId?: string
  remedialMicroScript?: FoundationRemedialMicroScript
  onCompleteStep?: () => void
  onStartRemedial: (remedialId: string) => void
  /** Real Blockly workspace — the code (blocks) zone. */
  codeSlot?: ReactNode
  /** Real stage (playable / duo / preview) — the stage zone. */
  stageSlot?: ReactNode
  /** 0-based current step, shown as "步骤 X / Y" with a real progress bar. */
  stepIndex?: number
  stepCount?: number
  /** Step the child was actually on when this session restored a saved draft. */
  resumedFromStep?: number | null
  localSaveState?: LessonLocalSaveState
  cloudSyncState?: LessonCloudSyncState
  isCompleting?: boolean
  onRetryLocalSave?: () => void
  onRetryCloudSync?: () => void
  onContinueLocalOnly?: () => void
}

const LOCAL_SAVE_COPY: Record<LessonLocalSaveState, string> = {
  unsaved: '尚未保存',
  saved: '已保存到本机',
  failed: '本机保存失败',
}

const CLOUD_SYNC_COPY: Record<Exclude<LessonCloudSyncState, 'idle'>, string> =
  {
    syncing: '正在同步到云端…',
    synced: '已同步到云端',
    'local-only': '仅保存到本机',
    failed: '云端同步失败',
  }

const PANE_TABS: Array<{ id: LessonPane; label: string }> = [
  { id: 'task', label: '任务' },
  { id: 'code', label: '积木' },
  { id: 'stage', label: '舞台' },
]

export function GuidedLessonShell({
  lessonTitle,
  lessonGoal,
  completionPreview,
  isLocked,
  stepTitle,
  instruction,
  voiceover,
  feedback,
  hintCopy,
  remedialLessonId,
  remedialMicroScript,
  onCompleteStep,
  onStartRemedial,
  codeSlot,
  stageSlot,
  stepIndex,
  stepCount,
  resumedFromStep,
  localSaveState = 'unsaved',
  cloudSyncState = 'idle',
  isCompleting = false,
  onRetryLocalSave,
  onRetryCloudSync,
  onContinueLocalOnly,
}: GuidedLessonShellProps) {
  const [activePane, setActivePane] = useState<LessonPane>('task')

  if (isLocked) {
    return (
      <section className="kc-surface-3d rounded-[2.5rem] p-8">
        <div className="max-w-3xl space-y-5">
          <p className="inline-flex rounded-full bg-[#f2ecff] px-4 py-2 text-sm font-semibold text-[#6b46ff]">
            高阶创作入口
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            {lessonTitle}
          </h1>
          <p className="rounded-[1.5rem] bg-[#fff6ea] px-5 py-4 text-base leading-8 text-amber-800">
            这节高阶内容会在启蒙毕业后开启。先学完 12 节启蒙课，再决定要不要继续升级更复杂的互动故事。
          </p>
          <div className="rounded-[1.5rem] bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-600">
            这节课会继续把能力往这个目标推进：{lessonGoal}
          </div>
          <Link
            className="inline-flex rounded-full bg-[#7c5cff] px-5 py-3 font-bold text-white transition hover:bg-[#6948f2]"
            href="/parent/purchase"
          >
            看看高阶升级内容
          </Link>
        </div>
      </section>
    )
  }

  const showProgress =
    typeof stepIndex === 'number' &&
    typeof stepCount === 'number' &&
    stepCount > 0
  const progressPercent = showProgress
    ? Math.min(100, Math.max(0, ((stepIndex + 1) / stepCount) * 100))
    : 0
  const showCloudChip = cloudSyncState !== 'idle'
  const localChipClass =
    localSaveState === 'failed'
      ? 'kc-chip-warning'
      : localSaveState === 'saved'
        ? 'kc-chip-success'
        : 'kc-chip-neutral'
  const cloudChipClass =
    cloudSyncState === 'failed'
      ? 'kc-chip-warning'
      : cloudSyncState === 'synced'
        ? 'kc-chip-success'
        : 'kc-chip-info'

  const feedbackNode = feedback ? (
    <div
      className="kc-feedback kc-feedback-success"
      data-testid="lesson-feedback-card"
    >
      <p className="kc-feedback-title">刚完成的小结果</p>
      <p className="mt-1" data-testid="lesson-feedback-preview">
        {feedback}
      </p>
    </div>
  ) : null

  const paneVisible = (pane: LessonPane) =>
    activePane === pane ? 'kc-mobile-visible' : ''

  return (
    // lesson-workbench-shell is the legacy testid used by the E2E suite
    // (ux-102/103/104/105/201, trial-lock-purchase) for "classroom shell
    // is visible"; it stays on the shell root so those specs keep passing.
    <section className="space-y-4" data-testid="lesson-workbench-shell">
      {cloudSyncState === 'failed' ? (
        <div
          className="kc-hint mt-0"
          data-testid="lesson-cloud-failure"
          role="alert"
        >
          <p className="font-bold">云端同步失败，进度已保存到本机，还没同步到云端。</p>
          <p className="mt-1">
            可以重试同步；也可以先仅用本机继续，下次完成一节课时会重新同步全部进度。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetryCloudSync ? (
              <button
                className="kc-action-surface kc-btn-sm"
                data-testid="lesson-cloud-retry"
                onClick={onRetryCloudSync}
                type="button"
              >
                重试同步
              </button>
            ) : null}
            {onContinueLocalOnly ? (
              <button
                className="kc-action-surface kc-btn-outline kc-btn-sm"
                data-testid="lesson-cloud-continue-local"
                onClick={onContinueLocalOnly}
                type="button"
              >
                仅用本机继续
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="kc-lesson-shell" data-testid="lesson-shell">
        <div className="kc-lesson-header" data-testid="lesson-progress-strip">
          <div className="min-w-0">
            <h2>{lessonTitle}</h2>
            {stepTitle ? (
              <span className="kc-subtitle">当前任务：{stepTitle}</span>
            ) : null}
          </div>
          <div className="kc-lesson-headright flex-wrap">
            {showProgress ? (
              <>
                <span>
                  步骤 {stepIndex + 1} / {stepCount}
                </span>
                <div
                  aria-label={`课堂进度：第 ${stepIndex + 1} 步，共 ${stepCount} 步`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={Math.round(progressPercent)}
                  className="kc-lesson-progress"
                  data-testid="lesson-progress-bar"
                  role="progressbar"
                >
                  <i style={{ width: `${progressPercent}%` }} />
                </div>
              </>
            ) : null}
            {resumedFromStep !== null && resumedFromStep !== undefined ? (
              <span
                className="kc-text-muted"
                data-testid="lesson-resume-note"
              >
                已回到上次进度：第 {resumedFromStep + 1} 步
              </span>
            ) : null}
            <span
              className={`kc-chip ${localChipClass}`}
              data-testid="lesson-save-local"
            >
              {LOCAL_SAVE_COPY[localSaveState]}
            </span>
            {showCloudChip ? (
              <span
                className={`kc-chip ${cloudChipClass}`}
                data-testid="lesson-save-cloud"
              >
                {CLOUD_SYNC_COPY[cloudSyncState]}
              </span>
            ) : null}
            {localSaveState === 'failed' && onRetryLocalSave ? (
              <button
                className="kc-action-surface kc-btn-outline kc-btn-sm"
                data-testid="lesson-save-retry"
                onClick={onRetryLocalSave}
                type="button"
              >
                重试保存
              </button>
            ) : null}
          </div>
        </div>

        <div
          aria-label="课堂分区"
          className="kc-mobile-tabs"
          data-testid="lesson-mobile-tabs"
          role="tablist"
        >
          {PANE_TABS.map((tab) => (
            <button
              key={tab.id}
              aria-controls={`lesson-pane-${tab.id}`}
              aria-selected={activePane === tab.id}
              data-testid={`lesson-mobile-tab-${tab.id}`}
              onClick={() => setActivePane(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="kc-lesson-grid" data-testid="lesson-three-zone-grid">
          <section
            aria-labelledby="lesson-task-pane-h"
            className={`kc-lesson-col kc-lesson-task ${paneVisible('task')}`}
            data-testid="lesson-task-column"
            id="lesson-pane-task"
            role="tabpanel"
          >
            <div className="kc-pane-h" data-testid="lesson-task-pane-h" id="lesson-task-pane-h">
              <span>学习任务</span>
              {showProgress ? (
                <span className="kc-chip kc-chip-info">
                  STEP {String(stepIndex + 1).padStart(2, '0')}
                </span>
              ) : null}
            </div>
            <div className="kc-task-content">
              <div data-testid="lesson-task-card">
                <span className="kc-task-mark">今天的小任务</span>
                {stepTitle ? <h3>{stepTitle}</h3> : <h3>{lessonTitle}</h3>}
                {instruction ? <p>{instruction}</p> : null}
                {voiceover ? <p>主语音：{voiceover}</p> : null}
              </div>

              <div className="kc-objective">
                <b>完成目标</b>
                <div>{lessonGoal}</div>
                {completionPreview ? (
                  <>
                    <b className="mt-3">做完这节会得到</b>
                    <div>{completionPreview}</div>
                  </>
                ) : null}
              </div>

              {hintCopy ? (
                <div className="kc-hint">卡住时提示：{hintCopy}</div>
              ) : null}

              {hintCopy && (remedialLessonId || remedialMicroScript) ? (
                <div className="mt-3">
                  <RemedialLinkCard
                    copy={hintCopy}
                    onStartRemedial={onStartRemedial}
                    remedialLessonId={remedialLessonId}
                    remedialMicroScript={remedialMicroScript}
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section
            aria-labelledby="lesson-code-pane-h"
            className={`kc-lesson-col ${paneVisible('code')}`}
            data-testid="lesson-code-column"
            id="lesson-pane-code"
            role="tabpanel"
          >
            <div className="kc-pane-h" data-testid="lesson-code-pane-h" id="lesson-code-pane-h">
              <span>编程工作区</span>
              <span className="kc-chip kc-chip-info">BLOCKLY</span>
            </div>
            <div className="flex-1 p-3">{codeSlot}</div>
            {stageSlot ? null : <div className="kc-stage-panel">{feedbackNode}</div>}
          </section>

          {stageSlot ? (
            <section
              aria-labelledby="lesson-stage-pane-h"
              className={`kc-lesson-col ${paneVisible('stage')}`}
              data-testid="lesson-stage-column"
              id="lesson-pane-stage"
              role="tabpanel"
            >
              <div className="kc-pane-h" data-testid="lesson-stage-pane-h" id="lesson-stage-pane-h">
                <span>实时舞台</span>
                <span className="kc-chip kc-chip-success">PREVIEW</span>
              </div>
              {stageSlot}
              {feedbackNode ? <div className="kc-stage-panel pt-0">{feedbackNode}</div> : null}
            </section>
          ) : null}
        </div>

        <div className="kc-lesson-footer" data-testid="lesson-footer">
          <button
            className="kc-action-surface disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="lesson-complete-step"
            disabled={isCompleting}
            onClick={onCompleteStep}
            type="button"
          >
            {isCompleting ? '正在完成…' : '完成这一步'}
            {isCompleting ? null : <span aria-hidden="true">↗</span>}
          </button>
        </div>
      </section>
    </section>
  )
}
