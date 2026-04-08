# Growth Collection Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the cards page into a domestic-style growth gallery that clearly shows stars, badges, and collectible cards in one polished page.

**Architecture:** Add a dedicated badge definition source and a small gallery builder that maps local progress into three display sections: summary stats, badge gallery, and premium card wall. Then replace the current flat card book page with a new page composition and upgraded visual components while keeping reward issuance logic unchanged.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest, Playwright

---

### Task 1: Add badge definitions and gallery builder

**Files:**
- Create: `D:\pyprograms\kidsCoding\apps\web\src\content\rewards\badge-definitions.ts`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\cards\build-growth-gallery.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\cards\build-growth-gallery.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { cardDefinitions } from '@/content/cards/card-definitions'
import { badgeDefinitions } from '@/content/rewards/badge-definitions'

import { buildGrowthGallery } from './build-growth-gallery'

describe('buildGrowthGallery', () => {
  it('builds summary stats, badge gallery, and card groups from progress', () => {
    const result = buildGrowthGallery({
      cardDefinitions,
      badgeDefinitions,
      stars: 18,
      earnedBadgeIds: ['lesson-lesson-03-forest-story', 'lesson-lesson-06-meadow-story'],
      earnedCardIds: ['growth-first-project', 'theme-meadow-story'],
    })

    expect(result.summary).toEqual({
      stars: 18,
      badgeCount: 2,
      cardCount: 2,
    })
    expect(result.badges.find((badge) => badge.id === 'lesson-lesson-03-forest-story')?.isEarned).toBe(true)
    expect(result.badges.find((badge) => badge.id === 'lesson-lesson-09-garden-story')?.isEarned).toBe(false)
    expect(result.cardGroups.find((group) => group.category === 'growth')?.cards[0]).toHaveProperty('isEarned')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd D:\pyprograms\kidsCoding\apps\web
npm run test:run -- src\features\cards\build-growth-gallery.test.ts --maxWorkers=1
```

Expected: FAIL because `badge-definitions.ts` and `build-growth-gallery.ts` do not exist.

- [ ] **Step 3: Write minimal implementation**

`D:\pyprograms\kidsCoding\apps\web\src\content\rewards\badge-definitions.ts`

```ts
export type BadgeDefinition = {
  id: string
  name: string
  description: string
  group: string
}

export const badgeDefinitions: BadgeDefinition[] = [
  {
    id: 'lesson-lesson-03-forest-story',
    name: '森林里的第一次见面完成徽章',
    description: '完成第一个完整小故事时获得。',
    group: '完整作品',
  },
  {
    id: 'lesson-lesson-06-meadow-story',
    name: '草地旅行记完成徽章',
    description: '完成第二个完整小故事时获得。',
    group: '完整作品',
  },
  {
    id: 'lesson-lesson-09-garden-story',
    name: '花园互动表演完成徽章',
    description: '完成会回应点击的互动故事时获得。',
    group: '互动成长',
  },
  {
    id: 'lesson-lesson-12-graduation-show',
    name: '启蒙毕业作品徽章',
    description: '完成启蒙毕业作品时获得。',
    group: '启蒙毕业',
  },
  {
    id: 'first-project',
    name: '第一次完成作品徽章',
    description: '第一次完整完成作品时获得。',
    group: '成长时刻',
  },
]
```

`D:\pyprograms\kidsCoding\apps\web\src\features\cards\build-growth-gallery.ts`

```ts
import type { CardDefinition } from '@/features/domain/types'
import { buildCardBook } from './build-card-book'
import type { BadgeDefinition } from '@/content/rewards/badge-definitions'

export function buildGrowthGallery({
  cardDefinitions,
  badgeDefinitions,
  stars,
  earnedBadgeIds,
  earnedCardIds,
}: {
  cardDefinitions: CardDefinition[]
  badgeDefinitions: BadgeDefinition[]
  stars: number
  earnedBadgeIds: string[]
  earnedCardIds: string[]
}) {
  return {
    summary: {
      stars,
      badgeCount: earnedBadgeIds.length,
      cardCount: earnedCardIds.length,
    },
    badges: badgeDefinitions.map((badge) => ({
      ...badge,
      isEarned: earnedBadgeIds.includes(badge.id),
    })),
    cardGroups: buildCardBook(cardDefinitions, earnedCardIds),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd D:\pyprograms\kidsCoding\apps\web
npm run test:run -- src\features\cards\build-growth-gallery.test.ts --maxWorkers=1
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd D:\pyprograms\kidsCoding
git add apps/web/src/content/rewards/badge-definitions.ts apps/web/src/features/cards/build-growth-gallery.ts apps/web/src/features/cards/build-growth-gallery.test.ts
git commit -m "Add growth gallery builder"
```

### Task 2: Build the new growth gallery UI components

**Files:**
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\cards\growth-gallery.tsx`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\cards\growth-gallery.test.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\cards\card-book.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { growthGalleryFixture } from './growth-gallery.test-data'
import { GrowthGallery } from './growth-gallery'

describe('GrowthGallery', () => {
  it('shows summary stats, badge gallery, and premium card wall', () => {
    render(<GrowthGallery gallery={growthGalleryFixture} />)

    expect(screen.getByText('成长收藏馆')).toBeInTheDocument()
    expect(screen.getByText('已获得星星')).toBeInTheDocument()
    expect(screen.getByText('勋章墙')).toBeInTheDocument()
    expect(screen.getByText('高质感收藏卡')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd D:\pyprograms\kidsCoding\apps\web
npm run test:run -- src\features\cards\growth-gallery.test.tsx --maxWorkers=1
```

Expected: FAIL because `GrowthGallery` does not exist.

- [ ] **Step 3: Write minimal implementation**

`D:\pyprograms\kidsCoding\apps\web\src\features\cards\growth-gallery.tsx`

```tsx
'use client'

import { useState } from 'react'
import type { CardRarity } from '@/features/domain/types'

const rarityLabels = {
  common: '普通卡',
  fine: '优质卡',
  rare: '稀有卡',
  limited: '限定卡',
} as const

export function GrowthGallery({ gallery }: { gallery: any }) {
  const [rarityFilter, setRarityFilter] = useState<CardRarity | 'all'>('all')
  const [seriesFilter, setSeriesFilter] = useState<string>('all')
  const availableSeries = [
    'all',
    ...new Set(gallery.cardGroups.flatMap((group: any) => group.cards.map((card: any) => card.series))),
  ]

  return (
    <div className="space-y-10">
      <section className="rounded-[2.4rem] bg-[linear-gradient(135deg,#fff7ec_0%,#ffffff_52%,#eef7ff_100%)] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold tracking-[0.24em] text-orange-500">成长收藏馆</p>
        <h2 className="mt-2 text-4xl font-black text-slate-950">把学会的每一步认真收藏起来</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.75rem] bg-white/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-slate-500">已获得星星</p>
            <p className="mt-2 text-4xl font-black text-amber-500">{gallery.summary.stars}</p>
          </article>
          <article className="rounded-[1.75rem] bg-white/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-slate-500">已解锁勋章</p>
            <p className="mt-2 text-4xl font-black text-sky-600">{gallery.summary.badgeCount}</p>
          </article>
          <article className="rounded-[1.75rem] bg-white/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-slate-500">已收集卡片</p>
            <p className="mt-2 text-4xl font-black text-orange-500">{gallery.summary.cardCount}</p>
          </article>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-[0.24em] text-sky-600">勋章墙</p>
            <h3 className="mt-2 text-3xl font-black text-slate-950">把重要时刻挂起来</h3>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {gallery.badges.map((badge: any) => (
            <article
              key={badge.id}
              className={`rounded-[1.75rem] border p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)] ${
                badge.isEarned
                  ? 'border-[#ffd79c] bg-[linear-gradient(180deg,#fff6e8_0%,#ffffff_100%)]'
                  : 'border-slate-200 bg-[linear-gradient(180deg,#f3f6fb_0%,#e7edf6_100%)] text-slate-400'
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.22em]">{badge.group}</p>
              <h4 className="mt-3 text-xl font-black">{badge.isEarned ? badge.name : '等待点亮'}</h4>
              <p className="mt-2 text-sm leading-7">
                {badge.isEarned ? badge.description : '继续沿着学习路线往前走，就能把这枚勋章挂起来。'}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-sm font-semibold tracking-[0.24em] text-orange-500">高质感收藏卡</p>
          <h3 className="mt-2 text-3xl font-black text-slate-950">把每一次成长装进卡册里</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {(['all', 'common', 'fine', 'rare', 'limited'] as const).map((rarity) => (
            <button
              key={rarity}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                rarityFilter === rarity ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
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
                seriesFilter === series ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700'
              }`}
              onClick={() => setSeriesFilter(series)}
              type="button"
            >
              {series === 'all' ? '全部系列' : series}
            </button>
          ))}
        </div>
        {gallery.cardGroups.map((group: any) => (
          <section key={group.category} className="space-y-4">
            <h4 className="text-2xl font-black text-slate-950">{group.label}</h4>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {group.cards
                .filter((card: any) => rarityFilter === 'all' || card.rarity === rarityFilter)
                .filter((card: any) => seriesFilter === 'all' || card.series === seriesFilter)
                .map((card: any) => (
                  <article
                    key={card.id}
                    className={`rounded-[1.9rem] border p-5 shadow-[0_20px_40px_rgba(15,23,42,0.08)] ${
                      card.isEarned
                        ? 'border-[#ffd6a0] bg-[linear-gradient(160deg,#fff5e5_0%,#ffffff_58%,#ffe8c6_100%)]'
                        : 'border-slate-200 bg-[linear-gradient(180deg,#f2f5fb_0%,#e5ebf4_100%)] text-slate-400'
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em]">{card.series}</p>
                    <h5 className="mt-4 text-3xl font-black">{card.isEarned ? card.name : '等待解锁'}</h5>
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
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd D:\pyprograms\kidsCoding\apps\web
npm run test:run -- src\features\cards\growth-gallery.test.tsx --maxWorkers=1
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd D:\pyprograms\kidsCoding
git add apps/web/src/features/cards/growth-gallery.tsx apps/web/src/features/cards/growth-gallery.test.tsx apps/web/src/features/cards/card-book.tsx
git commit -m "Build growth collection gallery"
```

### Task 3: Replace the cards page with the new gallery

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\cards\page.tsx`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\app\cards\page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import CardsPage from './page'

vi.mock('@/features/progress/local-progress', () => ({
  defaultGuestProgress: {
    cardIds: ['growth-first-project'],
    badgeIds: ['lesson-lesson-03-forest-story'],
    stars: 9,
  },
  readGuestProgress: () => ({
    cardIds: ['growth-first-project'],
    badgeIds: ['lesson-lesson-03-forest-story'],
    stars: 9,
  }),
  subscribeGuestProgress: () => () => {},
}))

describe('CardsPage', () => {
  it('renders the growth gallery summary, badges, and card collection', () => {
    render(<CardsPage />)

    expect(screen.getByText('成长收藏馆')).toBeInTheDocument()
    expect(screen.getByText('已获得星星')).toBeInTheDocument()
    expect(screen.getByText('勋章墙')).toBeInTheDocument()
    expect(screen.getByText('高质感收藏卡')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd D:\pyprograms\kidsCoding\apps\web
npm run test:run -- src\app\cards\page.test.tsx --maxWorkers=1
```

Expected: FAIL because page still renders the old `CardBook`.

- [ ] **Step 3: Write minimal implementation**

`D:\pyprograms\kidsCoding\apps\web\src\app\cards\page.tsx`

```tsx
'use client'

import { useSyncExternalStore } from 'react'

import { cardDefinitions } from '@/content/cards/card-definitions'
import { badgeDefinitions } from '@/content/rewards/badge-definitions'
import { GrowthGallery } from '@/features/cards/growth-gallery'
import { buildGrowthGallery } from '@/features/cards/build-growth-gallery'
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
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd D:\pyprograms\kidsCoding\apps\web
npm run test:run -- src\app\cards\page.test.tsx --maxWorkers=1
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd D:\pyprograms\kidsCoding
git add apps/web/src/app/cards/page.tsx apps/web/src/app/cards/page.test.tsx
git commit -m "Replace cards page with growth gallery"
```

### Task 4: Full verification

**Files:**
- Verify: `D:\pyprograms\kidsCoding\apps\web\src\app\cards\page.tsx`
- Verify: `D:\pyprograms\kidsCoding\apps\web\src\features\cards\growth-gallery.tsx`
- Verify: `D:\pyprograms\kidsCoding\apps\web\src\content\rewards\badge-definitions.ts`

- [ ] **Step 1: Run targeted tests**

```bash
cd D:\pyprograms\kidsCoding\apps\web
npm run test:run -- src\features\cards\build-growth-gallery.test.ts src\features\cards\growth-gallery.test.tsx src\app\cards\page.test.tsx --maxWorkers=1
```

Expected: PASS

- [ ] **Step 2: Run lint**

```bash
cd D:\pyprograms\kidsCoding\apps\web
npm run lint -- src\app\cards\page.tsx src\features\cards\growth-gallery.tsx src\features\cards\build-growth-gallery.ts src\content\rewards\badge-definitions.ts src\features\cards\build-growth-gallery.test.ts src\features\cards\growth-gallery.test.tsx src\app\cards\page.test.tsx
```

Expected: PASS

- [ ] **Step 3: Run build**

```bash
cd D:\pyprograms\kidsCoding\apps\web
npm run build
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd D:\pyprograms\kidsCoding
git add apps/web/src/app/cards/page.tsx apps/web/src/features/cards apps/web/src/content/rewards/badge-definitions.ts
git commit -m "Polish growth collection gallery"
```
