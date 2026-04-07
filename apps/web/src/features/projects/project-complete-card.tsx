import Link from 'next/link'

import { PreviewStage } from '@/features/lessons/blockly/preview-stage'

type RewardCard = {
  id: string
  name: string
}

type CompletionCopy = {
  summary: string
  spotlightTag: string | null
  spotlightTitle: string | null
  spotlightBody: string | null
}

type ProjectCompleteCardProps = {
  lessonId: string
  lessonTitle: string
  completionCopy: CompletionCopy
  isFoundationGraduate: boolean
  stars: number
  totalCards: number
  rewardCards: RewardCard[]
  blocks: Array<{ type: string }>
  onReplay: () => void
  primaryHref: string
  primaryLabel: string
}

function RewardPills({
  lessonId,
  rewardCards,
}: {
  lessonId: string
  rewardCards: RewardCard[]
}) {
  return (
    <div
      className="flex flex-wrap justify-center gap-3"
      data-testid="project-complete-rewards"
    >
      <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700">
        获得 3 颗星星
      </span>
      <span className="rounded-full bg-sky-100 px-4 py-2 text-sm font-bold text-sky-700">
        获得徽章：lesson-{lessonId}
      </span>
      {rewardCards.map((card) => (
        <span
          key={card.id}
          className="rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700"
        >
          获得卡片：{card.name}
        </span>
      ))}
    </div>
  )
}

export function ProjectCompleteCard({
  lessonId,
  lessonTitle,
  completionCopy,
  isFoundationGraduate,
  stars,
  totalCards,
  rewardCards,
  blocks,
  onReplay,
  primaryHref,
  primaryLabel,
}: ProjectCompleteCardProps) {
  const isMilestone = Boolean(
    completionCopy.spotlightTag &&
      completionCopy.spotlightTitle &&
      completionCopy.spotlightBody,
  )

  if (!isMilestone) {
    return (
      <section className="mx-auto max-w-4xl rounded-[2rem] bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div
          className="rounded-[1.75rem] border border-[#dceef7] bg-[linear-gradient(180deg,#fff8ef_0%,#ffffff_100%)] p-5"
          data-testid="project-complete-lite-card"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-500">
            完成这一课
          </p>
          <h1
            className="mt-3 text-3xl font-black text-slate-950"
            data-testid="project-complete-heading"
          >
            你完成了《{lessonTitle}》
          </h1>
          <p className="mt-3 text-base leading-8 text-slate-600">
            当前累计 {stars} 颗星星，已收集 {totalCards} 张卡片。{completionCopy.summary}
          </p>

          <div className="mt-5 rounded-[1.5rem] bg-[#f5fbff] p-4" data-testid="project-complete-lite-preview">
            <div className="scale-[0.92] origin-top">
              <PreviewStage blocks={blocks} />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex items-center justify-center rounded-full bg-[#ff8b4e] px-6 py-4 text-lg font-bold text-white shadow-[0_16px_28px_rgba(255,139,78,0.28)] transition hover:bg-[#ff7b38]"
              onClick={onReplay}
              type="button"
            >
              回看我的作品
            </button>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-4 text-lg font-bold text-slate-800 transition hover:bg-slate-50"
              href={primaryHref}
            >
              {primaryLabel}
            </Link>
          </div>

          <div className="mt-6">
            <RewardPills lessonId={lessonId} rewardCards={rewardCards} />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-5xl rounded-[2.5rem] bg-[linear-gradient(180deg,#fff9ef_0%,#ffffff_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.1)] md:p-8">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="space-y-5">
          <p className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-orange-500 shadow-[0_10px_24px_rgba(255,139,78,0.12)]">
            {completionCopy.spotlightTag}
          </p>
          <div
            className="rounded-[2rem] border border-[#dceef7] bg-[radial-gradient(circle_at_top,#fffdf8_0%,#fff0d9_24%,#dff4ff_58%,#ffffff_100%)] p-4 shadow-[0_20px_44px_rgba(56,189,248,0.12)]"
            data-testid="project-complete-stage"
          >
            <div className="rounded-[1.75rem] bg-white/70 p-3 backdrop-blur-sm">
              <PreviewStage blocks={blocks} />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <h1
            className="text-3xl font-black leading-tight text-slate-950 md:text-4xl"
            data-testid="project-complete-heading"
          >
            你完成了《{lessonTitle}》
          </h1>
          <div className="rounded-[1.75rem] bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
              作品完成时刻
            </p>
            <h2 className="mt-3 text-3xl font-black text-slate-950">
              {completionCopy.spotlightTitle}
            </h2>
            <p className="mt-3 text-base leading-8 text-slate-700">
              {completionCopy.summary}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {completionCopy.spotlightBody}
            </p>
          </div>

          <div className="rounded-[1.75rem] bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-slate-500">
              当前累计 {stars} 颗星星，已收集 {totalCards} 张卡片
            </p>
            <div className="mt-4">
              <RewardPills lessonId={lessonId} rewardCards={rewardCards} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              className="inline-flex items-center justify-center rounded-full bg-[#ff8b4e] px-6 py-4 text-lg font-bold text-white shadow-[0_16px_28px_rgba(255,139,78,0.28)] transition hover:bg-[#ff7b38]"
              onClick={onReplay}
              type="button"
            >
              回看我的作品
            </button>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-4 text-lg font-bold text-slate-800 transition hover:bg-slate-50"
              href={primaryHref}
            >
              {primaryLabel}
            </Link>
            {isFoundationGraduate ? (
              <p className="text-center text-sm font-semibold leading-7 text-violet-700">
                你已经完成启蒙毕业作品，准备好再看看高阶创作阶段。
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
