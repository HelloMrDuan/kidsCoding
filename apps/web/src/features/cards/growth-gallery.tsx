'use client'

import { useState } from 'react'

import type { CardCategory, CardRarity } from '@/features/domain/types'

const rarityLabels = {
  common: '普通卡',
  fine: '优质卡',
  rare: '稀有卡',
  limited: '限定卡',
} as const

const categoryLabels: Record<CardCategory, string> = {
  theme: '主题收藏卡',
  growth: '成长成就卡',
  commemorative: '纪念收藏卡',
}

const raritySurface = {
  common: {
    badge: 'bg-slate-100 text-slate-700',
    border: 'border-[#d9e3f1]',
    shell:
      'bg-[linear-gradient(160deg,#ffffff_0%,#eef5ff_42%,#ffffff_100%)]',
    glow: 'shadow-[0_18px_40px_rgba(148,163,184,0.14)]',
  },
  fine: {
    badge: 'bg-[#e7f7ff] text-sky-700',
    border: 'border-[#bde7ff]',
    shell:
      'bg-[linear-gradient(155deg,#ffffff_0%,#edf9ff_38%,#e6f3ff_100%)]',
    glow: 'shadow-[0_20px_44px_rgba(56,189,248,0.18)]',
  },
  rare: {
    badge: 'bg-[#fff0de] text-orange-700',
    border: 'border-[#ffd3a0]',
    shell:
      'bg-[linear-gradient(150deg,#fffaf2_0%,#fff1dc_42%,#ffffff_100%)]',
    glow: 'shadow-[0_20px_46px_rgba(249,115,22,0.18)]',
  },
  limited: {
    badge: 'bg-[#efe7ff] text-violet-700',
    border: 'border-[#d8c4ff]',
    shell:
      'bg-[linear-gradient(150deg,#fbf7ff_0%,#efe5ff_40%,#fff8ef_100%)]',
    glow: 'shadow-[0_22px_50px_rgba(139,92,246,0.2)]',
  },
} as const

type GrowthGalleryData = {
  summary: {
    stars: number
    badgeCount: number
    cardCount: number
  }
  badges: Array<{
    id: string
    name: string
    description: string
    group: string
    isEarned: boolean
  }>
  cardGroups: Array<{
    category: CardCategory
    cards: Array<{
      id: string
      name: string
      rarity: CardRarity
      series: string
      isEarned: boolean
    }>
  }>
}

function renderCardArt(category: CardCategory, isEarned: boolean) {
  const surface = isEarned
    ? 'from-white/95 via-white/75 to-white/30'
    : 'from-white/60 via-white/30 to-white/10'

  if (category === 'growth') {
    return (
      <div
        className={`relative h-36 overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${surface}`}
      >
        <div className="absolute left-5 top-5 h-20 w-20 rounded-full bg-[radial-gradient(circle,#ffd58a_0%,#ffb649_60%,#ff8b4e_100%)] shadow-[0_14px_24px_rgba(255,139,78,0.24)]" />
        <div className="absolute right-5 top-8 h-4 w-20 rounded-full bg-white/80" />
        <div className="absolute right-5 top-16 h-4 w-24 rounded-full bg-white/65" />
        <div className="absolute left-5 bottom-5 h-5 w-28 rounded-full bg-white/80" />
      </div>
    )
  }

  if (category === 'commemorative') {
    return (
      <div
        className={`relative h-36 overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${surface}`}
      >
        <div className="absolute left-1/2 top-6 h-20 w-20 -translate-x-1/2 rounded-full border-[6px] border-[#ffe0a8] bg-[radial-gradient(circle,#fffdf8_0%,#fff0c8_72%,#ffd789_100%)] shadow-[0_16px_30px_rgba(249,115,22,0.16)]" />
        <div className="absolute left-[calc(50%-1.15rem)] top-[5.55rem] h-12 w-4 rounded-b-full bg-[#ffc56d]" />
        <div className="absolute left-[calc(50%+0.15rem)] top-[5.55rem] h-12 w-4 rounded-b-full bg-[#ffdca0]" />
      </div>
    )
  }

  return (
    <div
      className={`relative h-36 overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${surface}`}
    >
      <div className="absolute left-5 top-7 h-16 w-16 rounded-full bg-[radial-gradient(circle,#ffd780_0%,#ffab24_100%)] shadow-[0_12px_22px_rgba(249,115,22,0.18)]" />
      <div className="absolute left-20 top-4 h-24 w-24 rounded-full bg-[radial-gradient(circle,#ffa63d_0%,#ff7b14_100%)] shadow-[0_16px_28px_rgba(249,115,22,0.18)]" />
      <div className="absolute right-5 bottom-5 h-9 w-20 rounded-full bg-white/75" />
      <div className="absolute left-5 bottom-5 h-4 w-24 rounded-full bg-[#ffe7b9]" />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'amber' | 'sky' | 'orange'
}) {
  const toneStyles = {
    amber:
      'text-amber-500 shadow-[0_16px_36px_rgba(245,158,11,0.16)] before:bg-[radial-gradient(circle,#ffe39e_0%,rgba(255,227,158,0)_72%)]',
    sky: 'text-sky-600 shadow-[0_16px_36px_rgba(56,189,248,0.16)] before:bg-[radial-gradient(circle,#ccefff_0%,rgba(204,239,255,0)_72%)]',
    orange:
      'text-orange-500 shadow-[0_16px_36px_rgba(249,115,22,0.16)] before:bg-[radial-gradient(circle,#ffd3a8_0%,rgba(255,211,168,0)_72%)]',
  } as const

  return (
    <article
      className={`relative overflow-hidden rounded-[1.85rem] border border-white/60 bg-white/82 p-5 backdrop-blur-sm before:absolute before:right-0 before:top-0 before:h-28 before:w-28 ${toneStyles[tone]}`}
    >
      <p className="relative text-sm font-semibold text-slate-500">{label}</p>
      <p className="relative mt-3 text-4xl font-black">{value}</p>
    </article>
  )
}

function BadgeMedal({
  name,
  description,
  group,
  isEarned,
}: GrowthGalleryData['badges'][number]) {
  return (
    <article
      className={`relative overflow-hidden rounded-[1.9rem] border p-5 ${
        isEarned
          ? 'border-[#ffd39a] bg-[linear-gradient(160deg,#fffaf1_0%,#fff2dd_42%,#ffffff_100%)] shadow-[0_20px_44px_rgba(249,115,22,0.14)]'
          : 'border-slate-200 bg-[linear-gradient(180deg,#f3f6fb_0%,#e8eef7_100%)] text-slate-400 shadow-[0_18px_34px_rgba(148,163,184,0.1)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
            {group}
          </p>
          <h3 className="mt-3 text-xl font-black text-slate-950">
            {isEarned ? name : '等待点亮'}
          </h3>
        </div>
        <div className="relative mt-1 shrink-0">
          <div
            className={`h-16 w-16 rounded-full border-[5px] ${
              isEarned
                ? 'border-[#ffd189] bg-[radial-gradient(circle,#fffdf8_0%,#ffeec8_70%,#ffd588_100%)]'
                : 'border-slate-300 bg-[radial-gradient(circle,#ffffff_0%,#e5ebf4_75%,#cdd7e5_100%)]'
            }`}
          />
          <div
            className={`absolute left-[1.02rem] top-[3.6rem] h-8 w-3 rounded-b-full ${
              isEarned ? 'bg-[#ffc96c]' : 'bg-slate-300'
            }`}
          />
          <div
            className={`absolute left-[2.1rem] top-[3.6rem] h-8 w-3 rounded-b-full ${
              isEarned ? 'bg-[#ffe0a4]' : 'bg-slate-200'
            }`}
          />
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600">
        {isEarned
          ? description
          : '继续沿着学习路线往前走，就能把这枚勋章挂起来。'}
      </p>
    </article>
  )
}

export function GrowthGallery({ gallery }: { gallery: GrowthGalleryData }) {
  const [rarityFilter, setRarityFilter] = useState<CardRarity | 'all'>('all')
  const [seriesFilter, setSeriesFilter] = useState<string>('all')
  const availableSeries = [
    'all',
    ...new Set(
      gallery.cardGroups.flatMap((group) => group.cards.map((card) => card.series)),
    ),
  ]

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[2.6rem] border border-[#f3dbc0] bg-[radial-gradient(circle_at_top_left,#fff9f0_0%,#fff5e7_18%,#ffffff_48%,#eef7ff_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
        <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,#ffd8a5_0%,rgba(255,216,165,0)_72%)]" />
        <div className="absolute -right-10 top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,#d7efff_0%,rgba(215,239,255,0)_74%)]" />
        <div className="relative">
          <p className="text-sm font-semibold tracking-[0.24em] text-orange-500">
            成长收藏馆
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950 md:text-5xl">
            把学会的每一步认真收藏起来
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
            星星记录每天的努力，勋章留下重要时刻，卡片把作品和成长都装进你的收藏册。
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <SummaryCard label="已获得星星" tone="amber" value={gallery.summary.stars} />
            <SummaryCard label="已解锁勋章" tone="sky" value={gallery.summary.badgeCount} />
            <SummaryCard label="已收集卡片" tone="orange" value={gallery.summary.cardCount} />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-[0.24em] text-sky-600">勋章墙</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              把重要时刻挂起来
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-500">
            每一枚勋章都对应一段真正做出来的作品时刻。先把作品点亮，再把勋章挂上墙。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {gallery.badges.map((badge) => (
            <BadgeMedal key={badge.id} {...badge} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-[0.24em] text-orange-500">
              高质感收藏卡
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              把每一次成长装进卡册里
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-500">
            已获得的卡片会亮起专属质感，未解锁卡片会保留轮廓和悬念，让孩子看得见接下来的目标。
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {(['all', 'common', 'fine', 'rare', 'limited'] as const).map((rarity) => (
            <button
              key={rarity}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                rarityFilter === rarity
                  ? 'bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]'
                  : 'bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
              }`}
              onClick={() => setRarityFilter(rarity)}
              type="button"
            >
              {rarity === 'all' ? '全部稀有度' : rarityLabels[rarity]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          {availableSeries.map((series) => (
            <button
              key={series}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                seriesFilter === series
                  ? 'bg-orange-500 text-white shadow-[0_12px_24px_rgba(249,115,22,0.2)]'
                  : 'bg-orange-50 text-orange-700'
              }`}
              onClick={() => setSeriesFilter(series)}
              type="button"
            >
              {series === 'all' ? '全部系列' : series}
            </button>
          ))}
        </div>

        {gallery.cardGroups.map((group) => (
          <section key={group.category} className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-2xl font-black text-slate-950">
                {categoryLabels[group.category]}
              </h3>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                {group.cards.length} 张
              </span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {group.cards
                .filter((card) => rarityFilter === 'all' || card.rarity === rarityFilter)
                .filter((card) => seriesFilter === 'all' || card.series === seriesFilter)
                .map((card) => {
                  const surface = raritySurface[card.rarity]

                  return (
                    <article
                      key={card.id}
                      className={`relative overflow-hidden rounded-[2rem] border p-4 ${surface.border} ${surface.shell} ${surface.glow}`}
                    >
                      <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
                        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-600 shadow-[0_8px_16px_rgba(15,23,42,0.06)]">
                          {card.series}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${surface.badge}`}>
                          {rarityLabels[card.rarity]}
                        </span>
                      </div>

                      <div className="pt-11">{renderCardArt(group.category, card.isEarned)}</div>

                      <div className="mt-4 rounded-[1.6rem] bg-white/82 p-4 backdrop-blur-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                          {categoryLabels[group.category]}
                        </p>
                        <h4 className="mt-3 text-3xl font-black leading-tight text-slate-950">
                          {card.isEarned ? card.name : '等待解锁'}
                        </h4>
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          {card.isEarned
                            ? `这张${rarityLabels[card.rarity]}已经点亮，现在可以在收藏馆里反复回看。`
                            : '继续沿着学习路线往前走，就能把这张卡片真正收进卡册。'}
                        </p>
                      </div>
                    </article>
                  )
                })}
            </div>
          </section>
        ))}
      </section>
    </div>
  )
}
