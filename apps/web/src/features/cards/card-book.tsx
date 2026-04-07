'use client'

import { useState } from 'react'

import type { CardDefinition, CardRarity } from '@/features/domain/types'

import { buildCardBook } from './build-card-book'

type CardBookProps = {
  definitions: CardDefinition[]
  earnedCardIds: string[]
}

const categoryLabels = {
  theme: '主题收藏卡',
  growth: '成长成就卡',
  commemorative: '纪念收藏卡',
}

const rarityLabels = {
  common: '普通卡',
  fine: '优质卡',
  rare: '稀有卡',
  limited: '限定卡',
} as const

export function CardBook({ definitions, earnedCardIds }: CardBookProps) {
  const [rarityFilter, setRarityFilter] = useState<CardRarity | 'all'>('all')
  const [seriesFilter, setSeriesFilter] = useState<string>('all')
  const groups = buildCardBook(definitions, earnedCardIds)
  const availableSeries = [...new Set(definitions.map((card) => card.series))]

  return (
    <div className="space-y-8">
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
        {['all', ...availableSeries].map((series) => (
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
      {groups.map((group) => (
        <section key={group.category} className="space-y-4">
          <h2 className="text-2xl font-black text-slate-950">
            {categoryLabels[group.category]}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {group.cards
              .filter((card) => rarityFilter === 'all' || card.rarity === rarityFilter)
              .filter((card) => seriesFilter === 'all' || card.series === seriesFilter)
              .map((card) => (
                <article
                  key={card.id}
                  className={`rounded-[1.5rem] border p-5 shadow-sm ${
                    card.isEarned
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-slate-200 bg-slate-100 text-slate-400'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.25em]">
                    {card.series}
                  </p>
                  <h3 className="mt-3 text-xl font-black">
                    {card.isEarned ? card.name : '等待解锁'}
                  </h3>
                  <p className="mt-2 text-sm">
                    {card.isEarned
                      ? `稀有度：${rarityLabels[card.rarity]}`
                      : '继续沿着学习路线往前走，就能点亮这张卡片。'}
                  </p>
                </article>
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}
