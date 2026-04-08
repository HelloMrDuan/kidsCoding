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
      <section className="rounded-[2.4rem] bg-[linear-gradient(135deg,#fff7ec_0%,#ffffff_52%,#eef7ff_100%)] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold tracking-[0.24em] text-orange-500">
          成长收藏馆
        </p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">
          把学会的每一步认真收藏起来
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          星星记录每天的努力，勋章留下重要时刻，卡片把作品和成长都收进你的收藏册。
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.75rem] bg-white/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-slate-500">已获得星星</p>
            <p className="mt-2 text-4xl font-black text-amber-500">
              {gallery.summary.stars}
            </p>
          </article>
          <article className="rounded-[1.75rem] bg-white/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-slate-500">已解锁勋章</p>
            <p className="mt-2 text-4xl font-black text-sky-600">
              {gallery.summary.badgeCount}
            </p>
          </article>
          <article className="rounded-[1.75rem] bg-white/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-slate-500">已收集卡片</p>
            <p className="mt-2 text-4xl font-black text-orange-500">
              {gallery.summary.cardCount}
            </p>
          </article>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.24em] text-sky-600">勋章墙</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">
            把重要时刻挂起来
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {gallery.badges.map((badge) => (
            <article
              key={badge.id}
              className={`rounded-[1.75rem] border p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)] ${
                badge.isEarned
                  ? 'border-[#ffd79c] bg-[linear-gradient(180deg,#fff6e8_0%,#ffffff_100%)]'
                  : 'border-slate-200 bg-[linear-gradient(180deg,#f3f6fb_0%,#e7edf6_100%)] text-slate-400'
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.22em]">
                {badge.group}
              </p>
              <h3 className="mt-3 text-xl font-black">
                {badge.isEarned ? badge.name : '等待点亮'}
              </h3>
              <p className="mt-2 text-sm leading-7">
                {badge.isEarned
                  ? badge.description
                  : '继续沿着学习路线往前走，就能把这枚勋章挂起来。'}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-sm font-semibold tracking-[0.24em] text-orange-500">
            高质感收藏卡
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">
            把每一次成长装进卡册里
          </h2>
        </div>

        <div className="flex flex-wrap gap-3">
          {(['all', 'common', 'fine', 'rare', 'limited'] as const).map((rarity) => (
            <button
              key={rarity}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                rarityFilter === rarity
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700'
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
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                seriesFilter === series
                  ? 'bg-orange-500 text-white'
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
            <h3 className="text-2xl font-black text-slate-950">
              {categoryLabels[group.category]}
            </h3>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {group.cards
                .filter((card) => rarityFilter === 'all' || card.rarity === rarityFilter)
                .filter((card) => seriesFilter === 'all' || card.series === seriesFilter)
                .map((card) => (
                  <article
                    key={card.id}
                    className={`rounded-[1.9rem] border p-5 shadow-[0_20px_40px_rgba(15,23,42,0.08)] ${
                      card.isEarned
                        ? 'border-[#ffd6a0] bg-[linear-gradient(160deg,#fff5e5_0%,#ffffff_58%,#ffe8c6_100%)]'
                        : 'border-slate-200 bg-[linear-gradient(180deg,#f2f5fb_0%,#e5ebf4_100%)] text-slate-400'
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em]">
                      {card.series}
                    </p>
                    <h4 className="mt-4 text-3xl font-black">
                      {card.isEarned ? card.name : '等待解锁'}
                    </h4>
                    <p className="mt-3 text-sm leading-7">
                      {card.isEarned
                        ? `稀有度：${rarityLabels[card.rarity]}`
                        : '继续沿着学习路线往前走，就能点亮这张卡片。'}
                    </p>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </section>
    </div>
  )
}
