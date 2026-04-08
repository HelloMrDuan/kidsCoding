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
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7eb_0%,#ffffff_100%)] px-6 py-10">
      <section className="mx-auto max-w-7xl">
        <GrowthGallery gallery={gallery} />
      </section>
    </main>
  )
}
