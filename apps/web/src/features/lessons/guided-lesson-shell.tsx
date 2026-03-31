import Link from 'next/link'
import type { ReactNode } from 'react'

import { RemedialLinkCard } from './remedial-link-card'

type GuidedLessonShellProps = {
  lessonTitle: string
  lessonGoal: string
  isLocked: boolean
  stepTitle?: string
  instruction?: string
  feedback?: string
  hintCopy?: string
  remedialLessonId?: string
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
  feedback,
  hintCopy,
  remedialLessonId,
  onCompleteStep,
  onStartRemedial,
  children,
}: GuidedLessonShellProps) {
  if (isLocked) {
    return (
      <section className="rounded-[2rem] bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black text-slate-950">{lessonTitle}</h1>
        <p className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 font-semibold text-orange-700">
          购买整套课程后继续学习
        </p>
        <Link
          className="mt-4 inline-flex rounded-full bg-orange-500 px-5 py-3 font-bold text-white"
          href="/parent/purchase"
        >
          去解锁整套课程
        </Link>
      </section>
    )
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <aside className="space-y-4 rounded-[2rem] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-slate-950">{lessonTitle}</h1>
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
          目标：{lessonGoal}
        </p>
        {stepTitle ? (
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900">{stepTitle}</h2>
            <p className="text-base leading-7 text-slate-600">{instruction}</p>
          </div>
        ) : null}
        {feedback ? (
          <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
            {feedback}
          </p>
        ) : null}
        {hintCopy ? (
          <p className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700">
            提示：{hintCopy}
          </p>
        ) : null}
        {remedialLessonId && hintCopy ? (
          <RemedialLinkCard
            copy={hintCopy}
            onStartRemedial={onStartRemedial}
            remedialLessonId={remedialLessonId}
          />
        ) : null}
        <button
          className="w-full rounded-full bg-orange-500 px-5 py-3 font-bold text-white"
          data-testid="lesson-complete-step"
          onClick={onCompleteStep}
          type="button"
        >
          完成这一步
        </button>
      </aside>
      <div className="space-y-6">{children}</div>
    </section>
  )
}
