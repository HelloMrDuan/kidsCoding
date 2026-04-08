'use client'

import { useMemo, useState } from 'react'

import type { CardCategory, CardRarity } from '@/features/domain/types'

const rarityLabels = {
  common: '普通卡',
  fine: '优质卡',
  rare: '稀有卡',
  limited: '限定卡',
} as const

const categoryLabels: Record<CardCategory, string> = {
  theme: '主题收藏卡',
  growth: '成长时刻卡',
  commemorative: '纪念收藏卡',
}

const rarityStyles = {
  common: {
    chip: 'bg-slate-100 text-slate-700 border-slate-200',
    card:
      'border-[#d8e1ee] bg-[linear-gradient(160deg,#ffffff_0%,#eef4fb_46%,#ffffff_100%)] shadow-[0_24px_48px_rgba(148,163,184,0.16)]',
    foil: 'from-white via-[#f3f8ff] to-[#dde7f4]',
    line: 'from-slate-300/20 via-slate-400/40 to-slate-300/20',
  },
  fine: {
    chip: 'bg-[#e8f8ff] text-sky-700 border-[#bfe7fb]',
    card:
      'border-[#bfe7fb] bg-[linear-gradient(160deg,#ffffff_0%,#eafaff_40%,#f5fdff_100%)] shadow-[0_24px_54px_rgba(56,189,248,0.18)]',
    foil: 'from-white via-[#dff6ff] to-[#bfe9ff]',
    line: 'from-sky-200/20 via-sky-400/40 to-sky-200/20',
  },
  rare: {
    chip: 'bg-[#fff2df] text-orange-700 border-[#ffd7a8]',
    card:
      'border-[#ffd2a1] bg-[linear-gradient(160deg,#fffdf7_0%,#fff3df_42%,#fff8f0_100%)] shadow-[0_24px_54px_rgba(249,115,22,0.18)]',
    foil: 'from-[#fffef8] via-[#ffe6bf] to-[#ffd090]',
    line: 'from-orange-200/25 via-orange-400/45 to-orange-200/25',
  },
  limited: {
    chip: 'bg-[#f4ecff] text-violet-700 border-[#ddc8ff]',
    card:
      'border-[#dac5ff] bg-[linear-gradient(160deg,#fcf9ff_0%,#f1e7ff_42%,#fff8ef_100%)] shadow-[0_24px_54px_rgba(139,92,246,0.2)]',
    foil: 'from-[#fffaff] via-[#efe1ff] to-[#d5bbff]',
    line: 'from-violet-200/25 via-violet-500/45 to-violet-200/25',
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

function SectionEyebrow({
  tone,
  children,
}: {
  tone: 'amber' | 'sky'
  children: string
}) {
  const styles =
    tone === 'amber'
      ? 'bg-[#fff0d8] text-[#ff7c26] shadow-[0_12px_26px_rgba(249,115,22,0.14)]'
      : 'bg-[#ebf7ff] text-sky-700 shadow-[0_12px_26px_rgba(56,189,248,0.14)]'

  return (
    <span className={`inline-flex rounded-full px-4 py-2 text-xs font-black tracking-[0.24em] ${styles}`}>
      {children}
    </span>
  )
}

function SummaryTotem({
  icon,
  label,
  value,
  accent,
}: {
  icon: string
  label: string
  value: number
  accent: 'amber' | 'sky' | 'orange'
}) {
  const accentStyles = {
    amber:
      'from-[#fff8e2] via-[#ffe3a3] to-[#ffbd57] text-amber-700 shadow-[0_20px_42px_rgba(245,158,11,0.16)]',
    sky: 'from-[#f2fbff] via-[#d8f3ff] to-[#97dbff] text-sky-700 shadow-[0_20px_42px_rgba(56,189,248,0.16)]',
    orange:
      'from-[#fff6eb] via-[#ffd7b5] to-[#ff9d52] text-orange-700 shadow-[0_20px_42px_rgba(249,115,22,0.16)]',
  } as const

  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/82 p-5 backdrop-blur-sm">
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.8)_0%,rgba(255,255,255,0)_72%)]" />
      <div
        className={`relative flex h-14 w-14 items-center justify-center rounded-[1.3rem] bg-gradient-to-br text-2xl ${accentStyles[accent]}`}
      >
        {icon}
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-black text-slate-950">{value}</p>
      <div className="mt-5 h-2 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.85)_45%,rgba(255,255,255,0)_100%)]" />
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
      className={`relative overflow-hidden rounded-[2rem] border p-5 ${
        isEarned
          ? 'border-[#ffd6a4] bg-[linear-gradient(160deg,#fffdf6_0%,#fff1d9_46%,#ffffff_100%)] shadow-[0_24px_48px_rgba(249,115,22,0.14)]'
          : 'border-[#dae2ef] bg-[linear-gradient(180deg,#f6f8fc_0%,#edf2f8_100%)] shadow-[0_18px_36px_rgba(148,163,184,0.12)]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-slate-400">{group}</p>
          <h3 className="mt-3 text-xl font-black text-slate-950">
            {isEarned ? name : '等待点亮'}
          </h3>
        </div>
        <div className="relative shrink-0">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full border-[6px] text-lg ${
              isEarned
                ? 'border-[#ffd593] bg-[radial-gradient(circle,#fffdf7_0%,#ffefc5_72%,#ffd585_100%)] shadow-[0_18px_30px_rgba(249,115,22,0.14)]'
                : 'border-slate-300 bg-[radial-gradient(circle,#ffffff_0%,#edf2f8_72%,#d9e2ef_100%)] text-slate-400'
            }`}
          >
            {isEarned ? '★' : '☆'}
          </div>
          <div
            className={`absolute left-[1.3rem] top-[4.4rem] h-10 w-4 rounded-b-full ${
              isEarned ? 'bg-[#ffc76e]' : 'bg-slate-300'
            }`}
          />
          <div
            className={`absolute left-[2.5rem] top-[4.4rem] h-10 w-4 rounded-b-full ${
              isEarned ? 'bg-[#ffe2a8]' : 'bg-slate-200'
            }`}
          />
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600">
        {isEarned
          ? description
          : '继续沿着学习路线往前走，就能把这枚勋章正式挂进陈列墙。'}
      </p>
    </article>
  )
}

function renderCardArt(category: CardCategory, isEarned: boolean) {
  const shell = isEarned
    ? 'from-white/95 via-white/70 to-white/25'
    : 'from-white/55 via-white/25 to-white/5'

  if (category === 'growth') {
    return (
      <div className={`relative h-44 overflow-hidden rounded-[1.8rem] bg-gradient-to-br ${shell}`}>
        <div className="absolute inset-x-6 top-7 h-3 rounded-full bg-white/80" />
        <div className="absolute inset-x-10 top-16 h-3 rounded-full bg-white/60" />
        <div className="absolute left-6 top-24 h-16 w-16 rounded-full bg-[radial-gradient(circle,#ffd68d_0%,#ffbb58_62%,#ff8d3a_100%)] shadow-[0_16px_28px_rgba(249,115,22,0.16)]" />
        <div className="absolute right-8 top-20 h-20 w-20 rounded-[1.5rem] bg-[linear-gradient(160deg,#ffffff_0%,#e7f5ff_44%,#cde9ff_100%)] shadow-[0_16px_28px_rgba(56,189,248,0.12)]" />
        <div className="absolute left-8 bottom-6 h-5 w-36 rounded-full bg-[#ffe8bd]" />
      </div>
    )
  }

  if (category === 'commemorative') {
    return (
      <div className={`relative h-44 overflow-hidden rounded-[1.8rem] bg-gradient-to-br ${shell}`}>
        <div className="absolute left-1/2 top-7 h-24 w-24 -translate-x-1/2 rounded-full border-[7px] border-[#ffd893] bg-[radial-gradient(circle,#fffef9_0%,#fff0c7_70%,#ffd279_100%)] shadow-[0_18px_28px_rgba(249,115,22,0.16)]" />
        <div className="absolute left-[calc(50%-1.25rem)] top-[6.4rem] h-12 w-4 rounded-b-full bg-[#ffc66d]" />
        <div className="absolute left-[calc(50%+0.25rem)] top-[6.4rem] h-12 w-4 rounded-b-full bg-[#ffe1a2]" />
        <div className="absolute inset-x-10 bottom-7 h-4 rounded-full bg-white/70" />
      </div>
    )
  }

  return (
    <div className={`relative h-44 overflow-hidden rounded-[1.8rem] bg-gradient-to-br ${shell}`}>
      <div className="absolute left-7 top-8 h-20 w-20 rounded-full bg-[radial-gradient(circle,#ffd980_0%,#ffb12f_100%)] shadow-[0_18px_28px_rgba(249,115,22,0.18)]" />
      <div className="absolute left-[5.6rem] top-4 h-28 w-28 rounded-full bg-[radial-gradient(circle,#ffb35c_0%,#ff7f17_100%)] shadow-[0_20px_30px_rgba(249,115,22,0.18)]" />
      <div className="absolute right-7 bottom-8 h-10 w-24 rounded-full bg-white/75" />
      <div className="absolute left-8 bottom-7 h-5 w-32 rounded-full bg-[#ffe6b2]" />
    </div>
  )
}

function CollectionCard({
  category,
  id,
  isEarned,
  name,
  rarity,
  series,
}: GrowthGalleryData['cardGroups'][number]['cards'][number] & {
  category: CardCategory
}) {
  const style = rarityStyles[rarity]

  return (
    <article
      key={id}
      className={`group relative overflow-hidden rounded-[2.1rem] border p-4 transition duration-300 hover:-translate-y-1 ${style.card}`}
    >
      <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.85)_0%,rgba(255,255,255,0)_72%)]" />
      <div className={`absolute inset-x-5 top-20 h-px bg-gradient-to-r ${style.line}`} />

      <div className="relative flex items-start justify-between gap-3">
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-500 shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
          {series}
        </span>
        <span className={`rounded-full border px-3 py-1 text-xs font-black ${style.chip}`}>
          {rarityLabels[rarity]}
        </span>
      </div>

      <div className={`relative mt-4 rounded-[2rem] bg-gradient-to-br p-3 ${style.foil}`}>
        {renderCardArt(category, isEarned)}
      </div>

      <div className="relative mt-4 rounded-[1.7rem] bg-white/82 p-4 backdrop-blur-sm">
        <p className="text-[11px] font-black tracking-[0.22em] text-slate-400">
          {categoryLabels[category]}
        </p>
        <h4 className="mt-3 text-[2rem] font-black leading-tight text-slate-950">
          {isEarned ? name : '等待解锁'}
        </h4>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {isEarned
            ? `这张${rarityLabels[rarity]}已经点亮，现在可以在收藏馆里反复回看。`
            : '继续沿着学习路线往前走，就能把这张卡片真正收进卡册。'}
        </p>
      </div>
    </article>
  )
}

export function GrowthGallery({ gallery }: { gallery: GrowthGalleryData }) {
  const [rarityFilter, setRarityFilter] = useState<CardRarity | 'all'>('all')
  const [seriesFilter, setSeriesFilter] = useState<string>('all')

  const availableSeries = useMemo(
    () => [
      'all',
      ...new Set(
        gallery.cardGroups.flatMap((group) => group.cards.map((card) => card.series)),
      ),
    ],
    [gallery.cardGroups],
  )

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-[2.8rem] border border-[#f1d7bd] bg-[linear-gradient(160deg,#fff8ef_0%,#fff1dd_16%,#ffffff_42%,#eef6ff_100%)] p-6 shadow-[0_28px_70px_rgba(15,23,42,0.09)] md:p-8">
        <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,#ffd9aa_0%,rgba(255,217,170,0)_72%)]" />
        <div className="absolute -right-16 top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,#d6eeff_0%,rgba(214,238,255,0)_74%)]" />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,#fff3cd_0%,rgba(255,243,205,0)_74%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <SectionEyebrow tone="amber">成长收藏馆</SectionEyebrow>
            <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950 md:text-[3.8rem]">
              把做出来的每一步
              <br />
              好好收进自己的展馆
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              这里不是普通列表页。星星记录努力，勋章挂住重要时刻，卡片把孩子真正做出来的作品能力一张张收藏起来。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
            <SummaryTotem accent="amber" icon="★" label="已获得星星" value={gallery.summary.stars} />
            <SummaryTotem accent="sky" icon="✦" label="已解锁勋章" value={gallery.summary.badgeCount} />
            <SummaryTotem accent="orange" icon="▣" label="已收集卡片" value={gallery.summary.cardCount} />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionEyebrow tone="sky">勋章墙</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-black text-slate-950">把重要时刻挂起来</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-500">
            勋章不只是数字。每完成一次真正重要的作品节点，就把一枚奖章挂进这面陈列墙。
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
            <SectionEyebrow tone="amber">卡册墙</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-black text-slate-950">把成长装进一张张收藏卡</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-500">
            已获得的卡片会用自己的材质、边框和光泽点亮。未解锁卡片保留轮廓和悬念，让孩子看得见前方目标。
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {(['all', 'common', 'fine', 'rare', 'limited'] as const).map((rarity) => (
            <button
              key={rarity}
              className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                rarityFilter === rarity
                  ? 'border-slate-900 bg-slate-900 text-white shadow-[0_14px_24px_rgba(15,23,42,0.16)]'
                  : 'border-white bg-white/86 text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.06)]'
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
              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                seriesFilter === series
                  ? 'bg-[#ff7b26] text-white shadow-[0_14px_24px_rgba(249,115,22,0.22)]'
                  : 'bg-[#fff1e0] text-[#ff7b26]'
              }`}
              onClick={() => setSeriesFilter(series)}
              type="button"
            >
              {series === 'all' ? '全部系列' : series}
            </button>
          ))}
        </div>

        {gallery.cardGroups.map((group) => {
          const visibleCards = group.cards
            .filter((card) => rarityFilter === 'all' || card.rarity === rarityFilter)
            .filter((card) => seriesFilter === 'all' || card.series === seriesFilter)

          if (visibleCards.length === 0) {
            return null
          }

          return (
            <section key={group.category} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-2xl font-black text-slate-950">
                  {categoryLabels[group.category]}
                </h3>
                <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  {visibleCards.length} 张
                </span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {visibleCards.map((card) => (
                  <CollectionCard key={card.id} category={group.category} {...card} />
                ))}
              </div>
            </section>
          )
        })}
      </section>
    </div>
  )
}
