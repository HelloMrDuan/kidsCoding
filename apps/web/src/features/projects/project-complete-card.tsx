import Link from 'next/link'
import type { ReactNode } from 'react'

import type { ProjectTemplateDefinition } from '@/features/domain/types'
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
  lessonTitle: string
  completionCopy: CompletionCopy
  isFoundationGraduate: boolean
  stars: number
  totalCards: number
  rewardCards: RewardCard[]
  blocks: Array<{ type: string; line?: string }>
  template?: ProjectTemplateDefinition
  onReplay: () => void
  primaryHref: string
  primaryLabel: string
  playableProject?: ReactNode
}

function RewardPills({
  lessonTitle,
  rewardCards,
}: {
  lessonTitle: string
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
        获得徽章：{lessonTitle}完成徽章
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
  lessonTitle,
  completionCopy,
  isFoundationGraduate,
  stars,
  totalCards,
  rewardCards,
  blocks,
  template,
  onReplay,
  primaryHref,
  primaryLabel,
  playableProject,
}: ProjectCompleteCardProps) {
  const isMilestone = Boolean(
    completionCopy.spotlightTag &&
      completionCopy.spotlightTitle &&
      completionCopy.spotlightBody,
  )

  if (!isMilestone) {
    return (
      <section className="kc-panel mx-auto max-w-4xl p-8">
        <div
          className="kc-panel-3d p-5"
          data-testid="project-complete-lite-card"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--kc-action)]">
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

          {/* TQ-012: a playable project is not scaled (Blockly drag coordinates must stay true). */}
          {playableProject ? (
            <div className="mt-5" data-testid="project-complete-lite-preview">{playableProject}</div>
          ) : (
            <div
              className="kc-stage-3d mt-5 bg-[var(--kc-canvas)] p-4"
              data-testid="project-complete-lite-preview"
            >
              <div className="scale-[0.92] origin-top">
                <PreviewStage blocks={blocks} template={template} />
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              className="kc-action-surface min-h-12 text-lg"
              onClick={onReplay}
              type="button"
            >
              回看我的作品
            </button>
            <Link
              className="kc-action-surface kc-btn-outline min-h-12 text-lg"
              href={primaryHref}
            >
              {primaryLabel}
            </Link>
          </div>

          <div className="mt-6">
            <RewardPills lessonTitle={lessonTitle} rewardCards={rewardCards} />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={`kc-panel mx-auto max-w-5xl ${playableProject ? 'p-3 md:p-8' : 'p-6 md:p-8'}`}>
      <div className={`grid gap-6 ${playableProject ? '' : 'lg:grid-cols-[1.15fr_0.85fr]'} lg:items-start`}>
        <div className="space-y-5">
          <p className="inline-flex rounded-full border border-[var(--kc-line)] bg-[var(--kc-canvas)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-[var(--kc-action)]">
            {completionCopy.spotlightTag}
          </p>
          {playableProject ? <div data-testid="project-complete-stage">{playableProject}</div> : <div
            className="kc-stage-3d border border-[var(--kc-line)] bg-[var(--kc-canvas)] p-4"
            data-testid="project-complete-stage"
          >
            <div className="rounded-[var(--kc-radius-pane)] bg-[var(--kc-surface)] p-3">
              <PreviewStage blocks={blocks} template={template} />
            </div>
          </div>}
        </div>

        <div className="space-y-5">
          <h1
            className="text-3xl font-black leading-tight text-slate-950 md:text-4xl"
            data-testid="project-complete-heading"
          >
            你完成了《{lessonTitle}》
          </h1>
          <div className="kc-panel-3d rounded-[1.75rem] bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
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

          <div className="kc-panel-3d rounded-[1.75rem] bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-slate-500">
              当前累计 {stars} 颗星星，已收集 {totalCards} 张卡片
            </p>
            <div className="mt-4">
              <RewardPills lessonTitle={lessonTitle} rewardCards={rewardCards} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              className="kc-action-surface min-h-12 text-lg"
              onClick={onReplay}
              type="button"
            >
              回看我的作品
            </button>
            <Link
              className="kc-action-surface kc-btn-outline min-h-12 text-lg"
              href={primaryHref}
            >
              {primaryLabel}
            </Link>
            {isFoundationGraduate ? (
              <p className="text-center text-sm font-semibold leading-7 text-violet-700">
                你已经完成启蒙毕业作品，准备好再看看高阶创作阶段。星星只在首次完成时增加，重学、回看和修改作品不会重复领奖。
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
