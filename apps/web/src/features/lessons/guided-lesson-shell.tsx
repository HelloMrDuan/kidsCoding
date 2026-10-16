import Link from 'next/link'
import type { ReactNode } from 'react'

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

type GuidedLessonShellProps = {
  lessonTitle: string
  lessonGoal: string
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
  children?: ReactNode
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

export function GuidedLessonShell({
  lessonTitle,
  lessonGoal,
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
  children,
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
      ? 'bg-[#fff5e9] text-[#ab711e]'
      : localSaveState === 'saved'
        ? 'bg-[#e8f8f2] text-[#168260]'
        : 'bg-[#eef2f6] text-[#718097]'
  const cloudChipClass =
    cloudSyncState === 'failed'
      ? 'bg-[#fff5e9] text-[#ab711e]'
      : cloudSyncState === 'synced'
        ? 'bg-[#e8f8f2] text-[#168260]'
        : 'bg-[#eef8ff] text-sky-700'

  return (
    <section className="space-y-4">
      <div
        className="kc-surface-3d flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] px-5 py-4"
        data-testid="lesson-progress-strip"
      >
        <div className="flex flex-wrap items-center gap-3">
          {showProgress ? (
            <>
              <span className="text-sm font-bold text-slate-900">
                步骤 {stepIndex + 1} / {stepCount}
              </span>
              <div
                aria-label={`课堂进度：第 ${stepIndex + 1} 步，共 ${stepCount} 步`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={Math.round(progressPercent)}
                className="h-[5px] w-[130px] overflow-hidden rounded-[8px] bg-[#e7eef9]"
                data-testid="lesson-progress-bar"
                role="progressbar"
              >
                <i
                  className="block h-full bg-[#2463eb]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </>
          ) : null}
          {resumedFromStep !== null && resumedFromStep !== undefined ? (
            <span
              className="text-xs font-semibold text-slate-500"
              data-testid="lesson-resume-note"
            >
              已回到上次进度：第 {resumedFromStep + 1} 步
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-[5px] px-[9px] py-1 text-[11px] font-bold ${localChipClass}`}
            data-testid="lesson-save-local"
          >
            {LOCAL_SAVE_COPY[localSaveState]}
          </span>
          {showCloudChip ? (
            <span
              className={`rounded-[5px] px-[9px] py-1 text-[11px] font-bold ${cloudChipClass}`}
              data-testid="lesson-save-cloud"
            >
              {CLOUD_SYNC_COPY[cloudSyncState]}
            </span>
          ) : null}
          {localSaveState === 'failed' && onRetryLocalSave ? (
            <button
              className="rounded-full border border-[#f1e2b0] bg-white px-4 py-1.5 text-xs font-bold text-[#ab711e] transition hover:bg-[#fff9e8]"
              data-testid="lesson-save-retry"
              onClick={onRetryLocalSave}
              type="button"
            >
              重试保存
            </button>
          ) : null}
        </div>
      </div>

      {cloudSyncState === 'failed' ? (
        <div
          className="rounded-[1.5rem] border border-[#f1e2b0] bg-[#fff9e8] px-5 py-4 text-sm leading-7 text-[#6c5a20]"
          data-testid="lesson-cloud-failure"
        >
          <p className="font-bold">云端同步失败，进度已保存到本机，还没同步到云端。</p>
          <p className="mt-1">
            可以重试同步；也可以先仅用本机继续，下次完成一节课时会重新同步全部进度。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetryCloudSync ? (
              <button
                className="rounded-full bg-[#2463eb] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#1d54cb]"
                data-testid="lesson-cloud-retry"
                onClick={onRetryCloudSync}
                type="button"
              >
                重试同步
              </button>
            ) : null}
            {onContinueLocalOnly ? (
              <button
                className="rounded-full border border-[#f1e2b0] bg-white px-4 py-2 text-xs font-bold text-[#6c5a20] transition hover:bg-white/70"
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

    <section className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside
        className="kc-surface-3d space-y-5 rounded-[2.5rem] p-6"
        data-testid="lesson-support-rail"
      >
        <div className="kc-panel-3d space-y-3 rounded-[2rem] px-5 py-5">
          <p className="inline-flex rounded-full bg-[#eef8ff] px-4 py-2 text-sm font-semibold text-sky-700">
            今天的小任务
          </p>
          <h1 className="text-[2rem] font-black tracking-tight text-slate-950">
            {lessonTitle}
          </h1>
          <p className="rounded-[1.5rem] bg-white/90 px-4 py-4 text-sm leading-7 text-slate-600">
            这节课要做到：{lessonGoal}
          </p>
        </div>

        {stepTitle ? (
          <div
            className="rounded-[2rem] bg-[linear-gradient(180deg,#fff8eb_0%,#ffffff_100%)] p-5 shadow-[0_18px_36px_rgba(255,173,92,0.16)]"
            data-testid="lesson-task-card"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-amber-700">当前任务</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-700 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
                一步一步来
              </span>
            </div>
            <h2 className="mt-3 text-[1.75rem] font-black leading-tight text-slate-950">
              {stepTitle}
            </h2>
            <p className="mt-3 text-base leading-8 text-slate-700">{instruction}</p>
            {voiceover ? (
              <p className="mt-4 rounded-[1.5rem] bg-white px-4 py-3 text-sm font-semibold leading-7 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                主语音：{voiceover}
              </p>
            ) : null}
          </div>
        ) : null}

        {feedback ? (
          <div
            className="overflow-hidden rounded-[2rem] border border-[#dbeef8] bg-[linear-gradient(180deg,#f3fbff_0%,#ffffff_100%)] shadow-[0_18px_36px_rgba(56,189,248,0.12)]"
            data-testid="lesson-feedback-card"
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-5">
              <p className="text-sm font-semibold text-sky-700">刚完成的小结果</p>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                马上看到变化
              </span>
            </div>
            <div
              className="mx-4 mb-4 mt-4 rounded-[1.75rem] bg-[linear-gradient(180deg,#d9f1ff_0%,#ffffff_100%)] px-4 py-4"
              data-testid="lesson-feedback-preview"
            >
              <div className="flex items-end gap-3 rounded-[1.5rem] bg-white/75 px-4 py-4">
                <div className="h-8 w-8 rounded-full bg-amber-300 shadow-[0_10px_20px_rgba(252,211,77,0.18)]" />
                <div className="h-16 w-16 rounded-full bg-orange-400 shadow-[0_14px_28px_rgba(251,146,60,0.24)]" />
                <div className="h-10 w-10 rounded-full bg-emerald-300/80 shadow-[0_10px_20px_rgba(16,185,129,0.14)]" />
              </div>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">{feedback}</p>
            </div>
          </div>
        ) : null}

        {hintCopy ? (
          <div className="rounded-[1.75rem] bg-[#f7f2ff] px-4 py-4 text-sm font-semibold leading-7 text-[#6b46ff] shadow-[0_14px_30px_rgba(107,70,255,0.08)]">
            卡住时提示：{hintCopy}
          </div>
        ) : null}

        {hintCopy && (remedialLessonId || remedialMicroScript) ? (
          <RemedialLinkCard
            copy={hintCopy}
            onStartRemedial={onStartRemedial}
            remedialLessonId={remedialLessonId}
            remedialMicroScript={remedialMicroScript}
          />
        ) : null}

        <button
          className="w-full rounded-full bg-[#ff8b4e] px-5 py-3.5 font-bold text-white shadow-[0_18px_32px_rgba(255,139,78,0.3)] transition hover:bg-[#ff7b38] disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="lesson-complete-step"
          disabled={isCompleting}
          onClick={onCompleteStep}
          type="button"
        >
          {isCompleting ? '正在完成…' : '完成这一步'}
        </button>
      </aside>

      <div
        className="kc-scene-shell space-y-4 rounded-[2.75rem] p-3 md:p-4"
        data-testid="lesson-workbench-shell"
      >
        <div className="kc-panel-3d rounded-[2rem] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-sky-700">儿童创作工作台</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">
                先看舞台，再用积木让故事往前走
              </h3>
            </div>
            <span className="rounded-full bg-[#eef8ff] px-3 py-2 text-xs font-bold text-sky-700">
              做一步，看一步
            </span>
          </div>
        </div>
        {children}
      </div>
    </section>
    </section>
  )
}
