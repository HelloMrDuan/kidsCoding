'use client'

import { useSyncExternalStore } from 'react'

import { cardDefinitions } from '@/content/cards/card-definitions'
import { badgeDefinitions } from '@/content/rewards/badge-definitions'
import { buildGrowthGallery } from '@/features/cards/build-growth-gallery'
import { GrowthGallery } from '@/features/cards/growth-gallery'
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
  const gallery = buildGrowthGallery({
    cardDefinitions,
    badgeDefinitions,
    stars: progress.stars,
    earnedBadgeIds: progress.badgeIds,
    earnedCardIds: progress.cardIds,
  })

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff2dc_0%,#fff8ef_24%,#ffffff_55%,#eef6ff_100%)] px-6 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,#ffd6a8_0%,rgba(255,214,168,0)_72%)]" />
      <div className="pointer-events-none absolute right-0 top-28 h-80 w-80 rounded-full bg-[radial-gradient(circle,#dff2ff_0%,rgba(223,242,255,0)_74%)]" />
      <section className="relative mx-auto max-w-7xl">
        <GrowthGallery gallery={gallery} />
      </section>
    </main>
  )
}
