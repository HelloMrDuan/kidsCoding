import Link from 'next/link'
import type { ReactNode } from 'react'

import type { FoundationRemedialMicroScript } from '@/features/domain/types'

import { RemedialLinkCard } from './remedial-link-card'

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
}: GuidedLessonShellProps) {
  if (isLocked) {
    return (
      <section className="rounded-[2.5rem] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#fff6ec_100%)] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="max-w-3xl space-y-5">
          <p className="inline-flex rounded-full bg-[#f2ecff] px-4 py-2 text-sm font-semibold text-[#6b46ff]">
            高阶创作入口
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            {lessonTitle}
          </h1>
          <p className="rounded-[1.5rem] bg-[#fff6ea] px-5 py-4 text-base leading-8 text-amber-800">
            这节高阶内容会在启蒙毕业后开启。先完成 12 节启蒙课，再决定要不要升级更复杂的互动故事。
          </p>
          <div className="rounded-[1.5rem] bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-600">
            当前这节会继续朝这个目标升级：{lessonGoal}
          </div>
          <Link
            className="inline-flex rounded-full bg-[#7c5cff] px-5 py-3 font-bold text-white transition hover:bg-[#6948f2]"
            href="/parent/purchase"
          >
            查看高阶升级说明
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside
        className="space-y-5 rounded-[2.5rem] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#fff9f2_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
        data-testid="lesson-support-rail"
      >
        <div className="space-y-3 rounded-[2rem] bg-[linear-gradient(180deg,#ffffff_0%,#fff3de_100%)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          <p className="inline-flex rounded-full bg-[#eef8ff] px-4 py-2 text-sm font-semibold text-sky-700">
            今天的小任务
          </p>
          <h1 className="text-[2rem] font-black tracking-tight text-slate-950">
            {lessonTitle}
          </h1>
          <p className="rounded-[1.5rem] bg-white/90 px-4 py-4 text-sm leading-7 text-slate-600">
            本节目标：{lessonGoal}
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
                一步一个小目标
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
              <p className="text-sm font-semibold text-sky-700">刚刚完成</p>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                小结果预览
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
            提示：{hintCopy}
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
          className="w-full rounded-full bg-[#ff8b4e] px-5 py-3.5 font-bold text-white shadow-[0_18px_32px_rgba(255,139,78,0.3)] transition hover:bg-[#ff7b38]"
          data-testid="lesson-complete-step"
          onClick={onCompleteStep}
          type="button"
        >
          完成这一课
        </button>
      </aside>

      <div
        className="space-y-4 rounded-[2.75rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.85)_0%,rgba(255,248,238,0.96)_100%)] p-3 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-4"
        data-testid="lesson-workbench-shell"
      >
        <div className="rounded-[2rem] border border-white/80 bg-white/70 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-sky-700">儿童创作工作台</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">
                先看舞台，再用积木让故事发生
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
  )
}
