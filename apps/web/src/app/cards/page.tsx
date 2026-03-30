'use client'

import { useSyncExternalStore } from 'react'

import { cardDefinitions } from '@/content/cards/card-definitions'
import { CardBook } from '@/features/cards/card-book'
import {
  defaultGuestProgress,
  readGuestProgress,
  subscribeGuestProgress,
} from '@/features/progress/local-progress'

export default function CardsPage() {
  const progress = useSyncExternalStore(
    subscribeGuestProgress,
    readGuestProgress,
    () => defaultGuestProgress,
  )

  return (
    <main className="min-h-screen bg-[#fff8ef] px-6 py-10">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
            我的卡册
          </p>
          <h1
            className="text-4xl font-black text-slate-950"
            data-testid="cards-heading"
          >
            收集你学会的每一步
          </h1>
        </header>
        <CardBook
          definitions={cardDefinitions}
          earnedCardIds={progress.cardIds}
        />
      </section>
    </main>
  )
}
