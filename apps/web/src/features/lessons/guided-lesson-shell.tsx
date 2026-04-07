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
      <section className="rounded-[2.25rem] bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
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
    <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <aside className="space-y-5 rounded-[2.25rem] bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div className="space-y-3">
          <p className="inline-flex rounded-full bg-[#eef8ff] px-4 py-2 text-sm font-semibold text-sky-700">
            今天的小步骤
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{lessonTitle}</h1>
          <p className="rounded-[1.5rem] bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
            本节目标：{lessonGoal}
          </p>
        </div>

        {stepTitle ? (
          <div className="rounded-[1.75rem] bg-[linear-gradient(180deg,#fff8eb_0%,#ffffff_100%)] p-4 shadow-[0_12px_28px_rgba(255,173,92,0.12)]">
            <p className="text-sm font-semibold text-amber-700">当前任务</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{stepTitle}</h2>
            <p className="mt-3 text-base leading-8 text-slate-700">{instruction}</p>
            {voiceover ? (
              <p className="mt-3 rounded-[1.25rem] bg-white px-4 py-3 text-sm font-semibold leading-7 text-slate-700">
                主语音：{voiceover}
              </p>
            ) : null}
          </div>
        ) : null}

        {feedback ? (
          <div className="rounded-[1.5rem] bg-[#eff8ff] px-4 py-4 text-sm font-semibold leading-7 text-sky-800">
            刚刚完成：{feedback}
          </div>
        ) : null}

        {hintCopy ? (
          <div className="rounded-[1.5rem] bg-[#f7f2ff] px-4 py-4 text-sm font-semibold leading-7 text-[#6b46ff]">
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
          className="w-full rounded-full bg-[#ff8b4e] px-5 py-3 font-bold text-white shadow-[0_16px_28px_rgba(255,139,78,0.28)] transition hover:bg-[#ff7b38]"
          data-testid="lesson-complete-step"
          onClick={onCompleteStep}
          type="button"
        >
          完成这一课
        </button>
      </aside>

      <div className="space-y-6 rounded-[2.25rem] bg-white/65 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-4">
        {children}
      </div>
    </section>
  )
}
