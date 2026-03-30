# Kids Coding MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first-phase kids coding web app with onboarding, guided Blockly lessons, collectible cards, guest progress, account binding, and a parent overview page.

**Architecture:** Use a single Next.js App Router app in `apps/web`. Keep lesson, card, and assessment data in local content files. Keep pages thin and move behavior into small feature modules. Persist guest state in `localStorage` and a Supabase-backed guest snapshot, then merge it into an authenticated parent account during bind.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Blockly, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), Vitest, Testing Library, Playwright

---

## Planned File Structure

- `apps/web/src/app/*`: route pages for home, onboarding, map, lesson, cards, bind, and parent overview
- `apps/web/src/content/*`: assessment questions, lesson definitions, and card definitions
- `apps/web/src/features/onboarding/*`: age selection, assessment scoring, and onboarding session state
- `apps/web/src/features/cards/*`: card grouping, filters, and card book UI
- `apps/web/src/features/lessons/*`: map view, Blockly workspace, preview, and reward logic
- `apps/web/src/features/progress/*`: local guest progress, guest sync, and guest merge logic
- `apps/web/src/features/auth/*`: OTP request and verify UI
- `apps/web/src/features/parent/*`: parent summary building
- `apps/web/src/lib/supabase/*`: browser, server, admin, and proxy helpers
- `apps/web/supabase/migrations/*`: guest snapshot and authenticated progress schema
- `apps/web/tests/e2e/*`: browser-level regression tests for the core child flow

## Implementation Notes

- Put the app in `apps/web` so the existing `docs/` folder stays at repo root.
- The repository is not initialized as git yet. The first commit step initializes git; skip that line if git already exists when execution begins.
- Keep all lesson interactions mobile-safe by exposing click-to-add blocks in addition to drag-and-drop.
- Phase one does not include a CMS or payment flow. Content stays in code.

### Task 1: Scaffold the Next.js app and testing baseline

**Files:**
- Create: `apps/web/`
- Create: `apps/web/vitest.config.mts`
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/app/page.test.tsx`
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Scaffold the app**

Run:

```powershell
npx create-next-app@latest apps/web --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm --yes
```

Expected: `apps/web/package.json`, `apps/web/src/app/layout.tsx`, and `apps/web/src/app/page.tsx` are created.

- [ ] **Step 2: Install the test dependencies**

Run:

```powershell
Set-Location apps/web
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom vite-tsconfig-paths @playwright/test
npx playwright install
```

Expected: test dependencies are added and Playwright browsers install successfully.

- [ ] **Step 3: Write the failing home page test**

```tsx
// apps/web/src/app/page.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import HomePage from './page'

describe('HomePage', () => {
  it('renders the child and parent entry points', () => {
    render(<HomePage />)

    expect(
      screen.getByRole('heading', { name: '做动画学编程' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '马上开始' })).toHaveAttribute(
      'href',
      '/onboarding/age',
    )
    expect(screen.getByRole('link', { name: '家长查看' })).toHaveAttribute(
      'href',
      '/parent/overview',
    )
  })
})
```

- [ ] **Step 4: Run the test and confirm it fails**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/app/page.test.tsx
```

Expected: FAIL because the default scaffolded page does not contain the expected heading and links.

- [ ] **Step 5: Add the test config and replace the default page**

```json
// apps/web/package.json (scripts section)
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

```ts
// apps/web/vitest.config.mts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

```ts
// apps/web/src/test/setup.ts
import '@testing-library/jest-dom/vitest'
```

```ts
// apps/web/playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
```

```tsx
// apps/web/src/app/page.tsx
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ffe9b5,transparent_32%),linear-gradient(180deg,#fff8ea_0%,#f7f2ff_100%)] px-6 py-10">
      <section className="mx-auto flex min-h-[85vh] max-w-5xl flex-col justify-between rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_20px_80px_rgba(255,176,63,0.18)] backdrop-blur md:p-12">
        <div className="space-y-6">
          <p className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
            中文启蒙 · 手机和电脑都能学
          </p>
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-slate-950 md:text-6xl">
              做动画学编程
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-700">
              先让角色动起来，再一步一步学会故事、互动和逻辑。
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 pt-8 sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-4 text-lg font-bold text-white"
            href="/onboarding/age"
          >
            马上开始
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-4 text-lg font-bold text-slate-800"
            href="/parent/overview"
          >
            家长查看
          </Link>
        </div>
      </section>
    </main>
  )
}
```

```tsx
// apps/web/src/app/layout.tsx
import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: '孩子编程星球',
  description: '通过动画和故事让孩子一步一步学会编程',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
```

```css
/* apps/web/src/app/globals.css */
@import 'tailwindcss';

:root {
  color-scheme: light;
}

body {
  margin: 0;
  min-width: 320px;
  background: #fff8ea;
}

a {
  text-decoration: none;
}

button {
  cursor: pointer;
}
```

- [ ] **Step 6: Run the checks and commit**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/app/page.test.tsx
npm run lint
```

Expected: the home page test passes and lint exits with code 0.

Commit:

```powershell
if (-not (Test-Path .git)) { git init }
git add docs apps/web
git commit -m "chore: scaffold kids coding web app"
```

### Task 2: Add domain types, content definitions, and onboarding pages

**Files:**
- Create: `apps/web/src/features/domain/types.ts`
- Create: `apps/web/src/content/assessment/questions.ts`
- Create: `apps/web/src/content/cards/card-definitions.ts`
- Create: `apps/web/src/content/lessons/story-path.ts`
- Create: `apps/web/src/features/onboarding/recommend-start-level.ts`
- Create: `apps/web/src/features/onboarding/recommend-start-level.test.ts`
- Create: `apps/web/src/features/onboarding/onboarding-session.ts`
- Create: `apps/web/src/features/onboarding/age-band-form.tsx`
- Create: `apps/web/src/features/onboarding/assessment-form.tsx`
- Create: `apps/web/src/features/onboarding/assessment-form.test.tsx`
- Create: `apps/web/src/app/onboarding/age/page.tsx`
- Create: `apps/web/src/app/onboarding/check/page.tsx`

- [ ] **Step 1: Write the failing scoring and assessment interaction tests**

```ts
// apps/web/src/features/onboarding/recommend-start-level.test.ts
import { describe, expect, it } from 'vitest'

import type { AssessmentAnswer } from '@/features/domain/types'

import { recommendStartLevel } from './recommend-start-level'

const lowAnswers: AssessmentAnswer[] = [
  { questionId: 'sequence', optionId: 'one_by_one', score: 1 },
  { questionId: 'loop', optionId: 'not_sure', score: 0 },
  { questionId: 'event', optionId: 'click_once', score: 1 },
]

describe('recommendStartLevel', () => {
  it('keeps a 6-8 learner in starter level', () => {
    expect(recommendStartLevel('age_6_8', lowAnswers)).toBe('starter')
  })
})
```

```tsx
// apps/web/src/features/onboarding/assessment-form.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { assessmentQuestions } from '@/content/assessment/questions'

import { AssessmentForm } from './assessment-form'

describe('AssessmentForm', () => {
  it('walks through the questions and emits the recommendation', () => {
    const onComplete = vi.fn()

    render(
      <AssessmentForm
        ageBand="age_9_12"
        questions={assessmentQuestions.slice(0, 2)}
        onComplete={onComplete}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '一个一个排好顺序' }))
    fireEvent.click(screen.getByRole('button', { name: '让它重复同一个动作' }))

    expect(onComplete).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/onboarding/recommend-start-level.test.ts src/features/onboarding/assessment-form.test.tsx
```

Expected: FAIL because the onboarding modules do not exist yet.

- [ ] **Step 3: Implement the domain types, content, and onboarding flow**

```ts
// apps/web/src/features/domain/types.ts
export type AgeBand = 'age_6_8' | 'age_9_12' | 'age_13_plus'
export type StartLevel = 'starter' | 'foundation' | 'advanced'
export type AssessmentAnswer = { questionId: string; optionId: string; score: number }
export type AssessmentQuestion = {
  id: string
  prompt: string
  options: Array<{ id: string; label: string; score: number }>
}
export type CardCategory = 'theme' | 'growth' | 'commemorative'
export type CardRarity = 'common' | 'fine' | 'rare' | 'limited'
export type CardDefinition = {
  id: string
  name: string
  category: CardCategory
  rarity: CardRarity
  series: string
}
export type LessonStep = {
  id: string
  title: string
  instruction: string
  allowedBlocks: string[]
  requiredBlockTypes: string[]
}
export type LessonDefinition = {
  id: string
  title: string
  goal: string
  recommendedLevel: StartLevel
  steps: LessonStep[]
  rewardCardId: string
}
```

```ts
// apps/web/src/content/assessment/questions.ts
import type { AssessmentQuestion } from '@/features/domain/types'

export const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: 'sequence',
    prompt: '想让角色连续做几个动作，你会怎么安排？',
    options: [
      { id: 'one_by_one', label: '一个一个排好顺序', score: 1 },
      { id: 'group_actions', label: '把动作组合成一段流程', score: 2 },
      { id: 'guess_first', label: '先随便点点看', score: 0 },
    ],
  },
  {
    id: 'loop',
    prompt: '想让角色重复跳舞，你觉得哪种想法更接近？',
    options: [
      { id: 'repeat_until_done', label: '让它重复同一个动作', score: 2 },
      { id: 'click_again', label: '每次都重新点一下', score: 1 },
      { id: 'not_sure', label: '还不清楚', score: 0 },
    ],
  },
]
```

```ts
// apps/web/src/content/cards/card-definitions.ts
import type { CardDefinition } from '@/features/domain/types'

export const cardDefinitions: CardDefinition[] = [
  { id: 'theme-scout-cat', name: '探险小猫', category: 'theme', rarity: 'common', series: '森林启程' },
  { id: 'growth-first-project', name: '我的第一部动画', category: 'growth', rarity: 'fine', series: '成长时刻' },
  { id: 'growth-three-day-streak', name: '三天坚持之星', category: 'growth', rarity: 'rare', series: '成长时刻' },
  { id: 'commemorative-story-graduate', name: '故事创作者纪念卡', category: 'commemorative', rarity: 'limited', series: '第一季纪念' },
]
```

```ts
// apps/web/src/content/lessons/story-path.ts
import type { LessonDefinition } from '@/features/domain/types'

export const storyPathLessons: LessonDefinition[] = [
  {
    id: 'move-character',
    title: '让角色动起来',
    goal: '让主角从左边走到右边',
    recommendedLevel: 'starter',
    rewardCardId: 'theme-scout-cat',
    steps: [
      {
        id: 'step-1',
        title: '放入开始积木',
        instruction: '先给动画一个开始按钮',
        allowedBlocks: ['when_start', 'move_right'],
        requiredBlockTypes: ['when_start'],
      },
      {
        id: 'step-2',
        title: '让角色前进',
        instruction: '把移动积木接在开始积木后面',
        allowedBlocks: ['when_start', 'move_right'],
        requiredBlockTypes: ['when_start', 'move_right'],
      },
    ],
  },
]
```

```ts
// apps/web/src/features/onboarding/recommend-start-level.ts
import type { AgeBand, AssessmentAnswer, StartLevel } from '@/features/domain/types'

export function recommendStartLevel(
  ageBand: AgeBand,
  answers: AssessmentAnswer[],
): StartLevel {
  const score = answers.reduce((total, answer) => total + answer.score, 0)

  if (ageBand === 'age_6_8' || score <= 3) {
    return 'starter'
  }

  if (score >= 6 || ageBand === 'age_13_plus') {
    return 'advanced'
  }

  return 'foundation'
}
```

```ts
// apps/web/src/features/onboarding/onboarding-session.ts
import type { AgeBand, AssessmentAnswer, StartLevel } from '@/features/domain/types'

const STORAGE_KEY = 'kc-onboarding'

export type OnboardingSession = {
  ageBand: AgeBand | null
  answers: AssessmentAnswer[]
  recommendedLevel: StartLevel | null
}

export function readOnboardingSession(): OnboardingSession {
  if (typeof window === 'undefined') {
    return { ageBand: null, answers: [], recommendedLevel: null }
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as OnboardingSession) : { ageBand: null, answers: [], recommendedLevel: null }
}

export function writeOnboardingSession(session: OnboardingSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}
```

```tsx
// apps/web/src/features/onboarding/age-band-form.tsx
'use client'

import { useRouter } from 'next/navigation'

import type { AgeBand } from '@/features/domain/types'

import { readOnboardingSession, writeOnboardingSession } from './onboarding-session'

const options: Array<{ id: AgeBand; title: string; subtitle: string }> = [
  { id: 'age_6_8', title: '6-8 岁', subtitle: '更少文字，更强引导' },
  { id: 'age_9_12', title: '9-12 岁', subtitle: '游戏化闯关 + 编程逻辑' },
  { id: 'age_13_plus', title: '13 岁以上', subtitle: '更快进入进阶挑战' },
]

export function AgeBandForm() {
  const router = useRouter()

  function chooseAgeBand(ageBand: AgeBand) {
    const session = readOnboardingSession()
    writeOnboardingSession({ ...session, ageBand, answers: [], recommendedLevel: null })
    router.push('/onboarding/check')
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {options.map((option) => (
        <button
          key={option.id}
          className="rounded-[1.75rem] border border-amber-200 bg-white p-6 text-left shadow-sm"
          onClick={() => chooseAgeBand(option.id)}
          type="button"
        >
          <p className="text-2xl font-black text-slate-950">{option.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{option.subtitle}</p>
        </button>
      ))}
    </div>
  )
}
```

```tsx
// apps/web/src/features/onboarding/assessment-form.tsx
'use client'

import { useState } from 'react'

import type { AgeBand, AssessmentAnswer, AssessmentQuestion } from '@/features/domain/types'

import { recommendStartLevel } from './recommend-start-level'

type AssessmentFormProps = {
  ageBand: AgeBand
  questions: AssessmentQuestion[]
  onComplete: (payload: {
    answers: AssessmentAnswer[]
    recommendedLevel: 'starter' | 'foundation' | 'advanced'
  }) => void
}

export function AssessmentForm({ ageBand, questions, onComplete }: AssessmentFormProps) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([])
  const question = questions[index]

  function choose(option: AssessmentQuestion['options'][number]) {
    const nextAnswers = [...answers, { questionId: question.id, optionId: option.id, score: option.score }]

    if (index === questions.length - 1) {
      onComplete({
        answers: nextAnswers,
        recommendedLevel: recommendStartLevel(ageBand, nextAnswers),
      })
      return
    }

    setAnswers(nextAnswers)
    setIndex(index + 1)
  }

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-orange-500">第 {index + 1} / {questions.length} 题</p>
      <h1 className="mt-3 text-2xl font-black text-slate-950">{question.prompt}</h1>
      <div className="mt-6 grid gap-3">
        {question.options.map((option) => (
          <button
            key={option.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left font-semibold text-slate-800"
            onClick={() => choose(option)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

```tsx
// apps/web/src/app/onboarding/age/page.tsx
import { AgeBandForm } from '@/features/onboarding/age-band-form'

export default function AgeBandPage() {
  return (
    <main className="min-h-screen bg-[#fff7eb] px-6 py-10">
      <section className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">第一步</p>
          <h1 className="text-4xl font-black text-slate-950">先选一个适合你的起点</h1>
        </header>
        <AgeBandForm />
      </section>
    </main>
  )
}
```

```tsx
// apps/web/src/app/onboarding/check/page.tsx
'use client'

import { useRouter } from 'next/navigation'

import { assessmentQuestions } from '@/content/assessment/questions'
import { AssessmentForm } from '@/features/onboarding/assessment-form'
import { readOnboardingSession, writeOnboardingSession } from '@/features/onboarding/onboarding-session'

export default function AssessmentPage() {
  const router = useRouter()
  const session = readOnboardingSession()

  if (!session.ageBand) {
    router.replace('/onboarding/age')
    return null
  }

  return (
    <main className="min-h-screen bg-[#f7f2ff] px-6 py-10">
      <section className="mx-auto max-w-3xl">
        <AssessmentForm
          ageBand={session.ageBand}
          questions={assessmentQuestions}
          onComplete={({ answers, recommendedLevel }) => {
            writeOnboardingSession({ ...session, answers, recommendedLevel })
            router.push('/learn/map')
          }}
        />
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Run the tests and commit**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/onboarding/recommend-start-level.test.ts src/features/onboarding/assessment-form.test.tsx
```

Expected: both onboarding tests pass.

Commit:

```powershell
git add apps/web
git commit -m "feat: add onboarding content and assessment flow"
```

### Task 3: Build the learning map and the card book

**Files:**
- Create: `apps/web/src/features/progress/local-progress.ts`
- Create: `apps/web/src/features/cards/build-card-book.ts`
- Create: `apps/web/src/features/cards/build-card-book.test.ts`
- Create: `apps/web/src/features/cards/card-book.tsx`
- Create: `apps/web/src/features/lessons/map-view.tsx`
- Create: `apps/web/src/app/learn/map/page.tsx`
- Create: `apps/web/src/app/cards/page.tsx`

- [ ] **Step 1: Write the failing card grouping test**

```ts
// apps/web/src/features/cards/build-card-book.test.ts
import { describe, expect, it } from 'vitest'

import { cardDefinitions } from '@/content/cards/card-definitions'

import { buildCardBook } from './build-card-book'

describe('buildCardBook', () => {
  it('marks earned cards and keeps category order', () => {
    const result = buildCardBook(cardDefinitions, ['theme-scout-cat'])

    expect(result[0].category).toBe('theme')
    expect(result[0].cards[0].isEarned).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/cards/build-card-book.test.ts
```

Expected: FAIL because the card grouping module does not exist yet.

- [ ] **Step 3: Implement local progress, the map, and the card book**

```ts
// apps/web/src/features/progress/local-progress.ts
const STORAGE_KEY = 'kc-progress'

export type GuestProgress = {
  completedLessonIds: string[]
  currentLessonId: string
  stars: number
  badgeIds: string[]
  cardIds: string[]
  streakDays: number
  completedProjectIds: string[]
}

export const defaultGuestProgress: GuestProgress = {
  completedLessonIds: [],
  currentLessonId: 'move-character',
  stars: 0,
  badgeIds: [],
  cardIds: [],
  streakDays: 1,
  completedProjectIds: [],
}

export function readGuestProgress(): GuestProgress {
  if (typeof window === 'undefined') return defaultGuestProgress
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw ? ({ ...defaultGuestProgress, ...JSON.parse(raw) } as GuestProgress) : defaultGuestProgress
}

export function writeGuestProgress(next: GuestProgress) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
```

```ts
// apps/web/src/features/cards/build-card-book.ts
import type { CardCategory, CardDefinition } from '@/features/domain/types'

const categoryOrder: CardCategory[] = ['theme', 'growth', 'commemorative']

export function buildCardBook(definitions: CardDefinition[], earnedCardIds: string[]) {
  return categoryOrder.map((category) => ({
    category,
    cards: definitions
      .filter((card) => card.category === category)
      .map((card) => ({ ...card, isEarned: earnedCardIds.includes(card.id) })),
  }))
}
```

```tsx
// apps/web/src/features/cards/card-book.tsx
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
  commemorative: '稀有纪念卡',
}

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
              rarityFilter === rarity ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
            onClick={() => setRarityFilter(rarity)}
            type="button"
          >
            {rarity === 'all' ? '全部稀有度' : rarity}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {['all', ...availableSeries].map((series) => (
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
      {groups.map((group) => (
        <section key={group.category} className="space-y-4">
          <h2 className="text-2xl font-black text-slate-950">{categoryLabels[group.category]}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {group.cards
              .filter((card) => rarityFilter === 'all' || card.rarity === rarityFilter)
              .filter((card) => seriesFilter === 'all' || card.series === seriesFilter)
              .map((card) => (
                <article
                  key={card.id}
                  className={`rounded-[1.5rem] border p-5 shadow-sm ${
                    card.isEarned ? 'border-orange-200 bg-orange-50' : 'border-slate-200 bg-slate-100 text-slate-400'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.25em]">{card.series}</p>
                  <h3 className="mt-3 text-xl font-black">
                    {card.isEarned ? card.name : '等待解锁'}
                  </h3>
                </article>
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

```tsx
// apps/web/src/features/lessons/map-view.tsx
import Link from 'next/link'

import type { LessonDefinition } from '@/features/domain/types'
import type { GuestProgress } from '@/features/progress/local-progress'

export function MapView({
  lessons,
  progress,
}: {
  lessons: LessonDefinition[]
  progress: GuestProgress
}) {
  return (
    <div className="grid gap-4">
      {lessons.map((lesson, index) => {
        const isCompleted = progress.completedLessonIds.includes(lesson.id)
        const isCurrent = progress.currentLessonId === lesson.id
        const isLocked = !isCompleted && !isCurrent && index > progress.completedLessonIds.length

        return (
          <div
            key={lesson.id}
            className={`rounded-[1.5rem] border p-5 ${
              isCurrent ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'
            } ${isLocked ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">第 {index + 1} 关</p>
                <h2 className="text-2xl font-black text-slate-950">{lesson.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{lesson.goal}</p>
              </div>
              <Link
                className={`rounded-full px-5 py-3 text-sm font-bold ${
                  isLocked ? 'pointer-events-none bg-slate-200 text-slate-500' : 'bg-orange-500 text-white'
                }`}
                href={`/learn/lesson/${lesson.id}`}
              >
                {isCompleted ? '再看一遍' : isCurrent ? '继续挑战' : '尚未解锁'}
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

```tsx
// apps/web/src/app/learn/map/page.tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { storyPathLessons } from '@/content/lessons/story-path'
import { MapView } from '@/features/lessons/map-view'
import { defaultGuestProgress, readGuestProgress, type GuestProgress } from '@/features/progress/local-progress'
import { readOnboardingSession } from '@/features/onboarding/onboarding-session'

export default function LearnMapPage() {
  const [progress, setProgress] = useState<GuestProgress>(defaultGuestProgress)

  useEffect(() => {
    setProgress(readGuestProgress())
  }, [])

  const onboarding = readOnboardingSession()

  return (
    <main className="min-h-screen bg-[#eef8ff] px-6 py-10">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 rounded-[2rem] bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-600">推荐起点：{onboarding.recommendedLevel ?? 'starter'}</p>
            <h1 className="text-3xl font-black text-slate-950">学习地图</h1>
            <p className="mt-2 text-sm text-slate-600">
              已获得 {progress.stars} 颗星星 · 已获得 {progress.badgeIds.length} 枚徽章 · 已收集 {progress.cardIds.length} 张卡片
            </p>
          </div>
          <Link className="rounded-full border border-slate-200 px-5 py-3 font-bold text-slate-800" href="/cards">
            打开我的卡册
          </Link>
        </header>
        <MapView lessons={storyPathLessons} progress={progress} />
      </section>
    </main>
  )
}
```

```tsx
// apps/web/src/app/cards/page.tsx
'use client'

import { useEffect, useState } from 'react'

import { cardDefinitions } from '@/content/cards/card-definitions'
import { CardBook } from '@/features/cards/card-book'
import { readGuestProgress } from '@/features/progress/local-progress'

export default function CardsPage() {
  const [earnedCardIds, setEarnedCardIds] = useState<string[]>([])

  useEffect(() => {
    setEarnedCardIds(readGuestProgress().cardIds)
  }, [])

  return (
    <main className="min-h-screen bg-[#fff8ef] px-6 py-10">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">我的卡册</p>
          <h1 className="text-4xl font-black text-slate-950">收集你学会的每一步</h1>
        </header>
        <CardBook definitions={cardDefinitions} earnedCardIds={earnedCardIds} />
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Run the tests and commit**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/cards/build-card-book.test.ts
```

Expected: the card grouping test passes.

Commit:

```powershell
git add apps/web
git commit -m "feat: add learning map and card book"
```

### Task 4: Build the guided Blockly lesson and completion rewards

**Files:**
- Create: `apps/web/src/features/lessons/blockly/register-kids-blocks.ts`
- Create: `apps/web/src/features/lessons/blockly/evaluate-step.ts`
- Create: `apps/web/src/features/lessons/blockly/evaluate-step.test.ts`
- Create: `apps/web/src/features/lessons/blockly/blockly-workspace.tsx`
- Create: `apps/web/src/features/lessons/blockly/preview-stage.tsx`
- Create: `apps/web/src/features/rewards/award-lesson-completion.ts`
- Create: `apps/web/src/features/rewards/award-lesson-completion.test.ts`
- Create: `apps/web/src/app/learn/lesson/[lessonId]/page.tsx`
- Create: `apps/web/src/app/project/[projectId]/complete/page.tsx`
- Modify: `apps/web/src/features/progress/local-progress.ts`

- [ ] **Step 1: Write the failing evaluation and reward tests**

```ts
// apps/web/src/features/lessons/blockly/evaluate-step.test.ts
import { describe, expect, it } from 'vitest'

import { evaluateStep } from './evaluate-step'

describe('evaluateStep', () => {
  it('accepts the required blocks in order', () => {
    expect(
      evaluateStep(['when_start', 'move_right'], [
        { type: 'when_start' },
        { type: 'move_right' },
      ]),
    ).toBe(true)
  })
})
```

```ts
// apps/web/src/features/rewards/award-lesson-completion.test.ts
import { describe, expect, it } from 'vitest'

import { awardLessonCompletion } from './award-lesson-completion'

describe('awardLessonCompletion', () => {
  it('awards stars, a badge, and a card', () => {
    const result = awardLessonCompletion({
      lessonId: 'move-character',
      rewardCardId: 'theme-scout-cat',
      isFirstProject: true,
      streakDays: 1,
    })

    expect(result.stars).toBe(3)
    expect(result.badgeIds).toContain('lesson-move-character')
    expect(result.cardIds).toContain('theme-scout-cat')
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/lessons/blockly/evaluate-step.test.ts src/features/rewards/award-lesson-completion.test.ts
```

Expected: FAIL because the lesson modules do not exist yet.

- [ ] **Step 3: Install Blockly and implement the lesson slice**

Run:

```powershell
Set-Location apps/web
npm install blockly
```

Expected: `blockly` is added to `dependencies`.

```ts
// apps/web/src/features/lessons/blockly/register-kids-blocks.ts
import * as Blockly from 'blockly/core'

const definitions = Blockly.common.createBlockDefinitionsFromJsonArray([
  { type: 'when_start', message0: '开始时', nextStatement: null, colour: 35 },
  { type: 'move_right', message0: '向右移动', previousStatement: null, nextStatement: null, colour: 210 },
  { type: 'say_line', message0: '说 “你好呀”', previousStatement: null, nextStatement: null, colour: 120 },
])

let isRegistered = false

export function registerKidsBlocks() {
  if (isRegistered) return
  Blockly.common.defineBlocks(definitions)
  isRegistered = true
}
```

```ts
// apps/web/src/features/lessons/blockly/evaluate-step.ts
export function evaluateStep(requiredBlockTypes: string[], blocks: Array<{ type: string }>) {
  return requiredBlockTypes.every((type, index) => blocks[index]?.type === type)
}
```

```tsx
// apps/web/src/features/lessons/blockly/blockly-workspace.tsx
'use client'

import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly/core'

import { registerKidsBlocks } from './register-kids-blocks'

export function BlocklyWorkspace({
  allowedBlocks,
  onSnapshotChange,
}: {
  allowedBlocks: string[]
  onSnapshotChange: (blocks: Array<{ type: string }>) => void
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)

  useEffect(() => {
    registerKidsBlocks()
    if (!mountRef.current) return

    const workspace = Blockly.inject(mountRef.current, {
      toolbox: {
        kind: 'flyoutToolbox',
        contents: allowedBlocks.map((type) => ({ kind: 'block', type })),
      },
      trashcan: false,
      move: { scrollbars: true, drag: true, wheel: true },
    })

    workspaceRef.current = workspace
    workspace.addChangeListener(() => {
      onSnapshotChange(
        workspace.getTopBlocks(true).map((block) => ({
          type: block.type,
        })),
      )
    })

    return () => workspace.dispose()
  }, [allowedBlocks, onSnapshotChange])

  function addBlock(type: string) {
    const workspace = workspaceRef.current
    if (!workspace) return
    const block = workspace.newBlock(type)
    block.initSvg()
    block.render()
    block.moveBy(24, 24 + workspace.getTopBlocks(false).length * 64)
    onSnapshotChange(workspace.getTopBlocks(true).map((item) => ({ type: item.type })))
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div ref={mountRef} className="min-h-[420px] rounded-[1.5rem] border border-slate-200 bg-white" />
      <div className="grid content-start gap-3">
        {allowedBlocks.map((type) => (
          <button
            key={type}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-left text-sm font-bold text-white"
            onClick={() => addBlock(type)}
            type="button"
          >
            添加积木：{type}
          </button>
        ))}
      </div>
    </div>
  )
}
```

```tsx
// apps/web/src/features/lessons/blockly/preview-stage.tsx
export function PreviewStage({ blocks }: { blocks: Array<{ type: string }> }) {
  const moved = blocks.some((block) => block.type === 'move_right')
  const spoke = blocks.some((block) => block.type === 'say_line')

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-b from-sky-100 to-white p-6">
      <div className={`h-24 w-24 rounded-full bg-orange-400 transition-all duration-300 ${moved ? 'translate-x-20' : 'translate-x-0'}`} />
      <p className="mt-4 text-sm text-slate-700">
        {spoke ? '你好呀，我已经会说话啦。' : '先完成当前步骤，让角色展示结果。'}
      </p>
    </div>
  )
}
```

```ts
// apps/web/src/features/rewards/award-lesson-completion.ts
export function awardLessonCompletion({
  lessonId,
  rewardCardId,
  isFirstProject,
  streakDays,
}: {
  lessonId: string
  rewardCardId: string
  isFirstProject: boolean
  streakDays: number
}) {
  const badgeIds = [`lesson-${lessonId}`]
  const cardIds = [rewardCardId]

  if (isFirstProject) {
    badgeIds.push('first-project')
    cardIds.push('growth-first-project')
  }

  if (streakDays >= 3) {
    cardIds.push('growth-three-day-streak')
  }

  return { stars: 3, badgeIds, cardIds }
}
```

```tsx
// apps/web/src/app/learn/lesson/[lessonId]/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { storyPathLessons } from '@/content/lessons/story-path'
import { BlocklyWorkspace } from '@/features/lessons/blockly/blockly-workspace'
import { evaluateStep } from '@/features/lessons/blockly/evaluate-step'
import { PreviewStage } from '@/features/lessons/blockly/preview-stage'
import { readGuestProgress, writeGuestProgress } from '@/features/progress/local-progress'
import { awardLessonCompletion } from '@/features/rewards/award-lesson-completion'

export default function LessonPage({ params }: { params: { lessonId: string } }) {
  const router = useRouter()
  const lesson = storyPathLessons.find((item) => item.id === params.lessonId)
  const [stepIndex, setStepIndex] = useState(0)
  const [blocks, setBlocks] = useState<Array<{ type: string }>>([])

  if (!lesson) return <main className="p-6">没有找到这一关。</main>

  const step = lesson.steps[stepIndex]

  function handleNext() {
    if (!evaluateStep(step.requiredBlockTypes, blocks)) return

    if (stepIndex < lesson.steps.length - 1) {
      setStepIndex(stepIndex + 1)
      return
    }

    const progress = readGuestProgress()
    const reward = awardLessonCompletion({
      lessonId: lesson.id,
      rewardCardId: lesson.rewardCardId,
      isFirstProject: progress.completedProjectIds.length === 0,
      streakDays: progress.streakDays,
    })

    writeGuestProgress({
      ...progress,
      completedLessonIds: [...new Set([...progress.completedLessonIds, lesson.id])],
      currentLessonId: 'move-character',
      stars: progress.stars + reward.stars,
      badgeIds: [...new Set([...progress.badgeIds, ...reward.badgeIds])],
      cardIds: [...new Set([...progress.cardIds, ...reward.cardIds])],
      completedProjectIds: [...new Set([...progress.completedProjectIds, lesson.id])],
    })

    router.push(`/project/${lesson.id}/complete`)
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] px-6 py-8">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4 rounded-[2rem] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-sky-600">步骤 {stepIndex + 1} / {lesson.steps.length}</p>
          <h1 className="text-3xl font-black text-slate-950">{lesson.title}</h1>
          <p className="text-base text-slate-600">{step.instruction}</p>
          <button className="w-full rounded-full bg-orange-500 px-5 py-3 font-bold text-white" onClick={handleNext} type="button">
            完成这一步
          </button>
        </aside>
        <div className="space-y-6">
          <PreviewStage blocks={blocks} />
          <BlocklyWorkspace allowedBlocks={step.allowedBlocks} onSnapshotChange={setBlocks} />
        </div>
      </section>
    </main>
  )
}
```

```tsx
// apps/web/src/app/project/[projectId]/complete/page.tsx
'use client'

import Link from 'next/link'

import { cardDefinitions } from '@/content/cards/card-definitions'
import { storyPathLessons } from '@/content/lessons/story-path'
import { readGuestProgress } from '@/features/progress/local-progress'

export default function ProjectCompletePage({ params }: { params: { projectId: string } }) {
  const progress = readGuestProgress()
  const lesson = storyPathLessons.find((item) => item.id === params.projectId)
  const rewardCard = cardDefinitions.find((item) => item.id === lesson?.rewardCardId)

  return (
    <main className="min-h-screen bg-[#fff9ec] px-6 py-10">
      <section className="mx-auto max-w-4xl rounded-[2rem] bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">完成作品</p>
        <h1 className="mt-4 text-4xl font-black text-slate-950">你已经做出了第一个会动的故事</h1>
        <p className="mt-4 text-lg text-slate-600">
          当前累计 {progress.stars} 颗星星，已收集 {progress.cardIds.length} 张卡片。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700">获得 3 颗星星</span>
          <span className="rounded-full bg-sky-100 px-4 py-2 text-sm font-bold text-sky-700">获得徽章：lesson-{params.projectId}</span>
          {rewardCard ? (
            <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700">获得卡片：{rewardCard.name}</span>
          ) : null}
        </div>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link className="rounded-full bg-orange-500 px-6 py-4 text-lg font-bold text-white" href="/auth/bind">
            保存我的进度
          </Link>
          <Link className="rounded-full border border-slate-200 px-6 py-4 text-lg font-bold text-slate-800" href="/learn/map">
            回到学习地图
          </Link>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Run the tests and commit**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/lessons/blockly/evaluate-step.test.ts src/features/rewards/award-lesson-completion.test.ts
```

Expected: both lesson tests pass.

Commit:

```powershell
git add apps/web
git commit -m "feat: add guided block lessons and completion rewards"
```

### Task 5: Add Supabase guest sync, account binding, and the parent overview

**Files:**
- Create: `apps/web/.env.example`
- Create: `apps/web/supabase/migrations/20260330_001_initial.sql`
- Create: `apps/web/src/lib/env.ts`
- Create: `apps/web/src/lib/supabase/admin.ts`
- Create: `apps/web/src/lib/supabase/browser.ts`
- Create: `apps/web/src/lib/supabase/server.ts`
- Create: `apps/web/src/lib/supabase/proxy.ts`
- Create: `apps/web/src/proxy.ts`
- Create: `apps/web/src/features/progress/sync-guest-snapshot.ts`
- Create: `apps/web/src/features/progress/merge-guest-snapshot.ts`
- Create: `apps/web/src/features/progress/merge-guest-snapshot.test.ts`
- Create: `apps/web/src/features/auth/bind-account-form.tsx`
- Create: `apps/web/src/features/auth/bind-account-form.test.tsx`
- Create: `apps/web/src/features/parent/build-parent-overview.ts`
- Create: `apps/web/src/app/api/guest/route.ts`
- Create: `apps/web/src/app/api/bind-account/route.ts`
- Create: `apps/web/src/app/auth/bind/page.tsx`
- Create: `apps/web/src/app/parent/overview/page.tsx`
- Modify: `apps/web/src/app/onboarding/check/page.tsx`
- Modify: `apps/web/src/app/learn/lesson/[lessonId]/page.tsx`

- [ ] **Step 1: Write the failing merge and bind form tests**

```ts
// apps/web/src/features/progress/merge-guest-snapshot.test.ts
import { describe, expect, it } from 'vitest'

import { mergeGuestSnapshot } from './merge-guest-snapshot'

describe('mergeGuestSnapshot', () => {
  it('deduplicates progress, badges, and cards', () => {
    const result = mergeGuestSnapshot({
      snapshot: {
        onboarding: { ageBand: 'age_9_12', recommendedLevel: 'foundation' },
        progress: {
          completedLessonIds: ['move-character', 'move-character'],
          stars: 6,
          badgeIds: ['lesson-move-character'],
          cardIds: ['theme-scout-cat', 'theme-scout-cat'],
          completedProjectIds: ['move-character'],
        },
      },
    })

    expect(result.progressRecords).toHaveLength(1)
    expect(result.cardRecords).toHaveLength(1)
  })
})
```

```tsx
// apps/web/src/features/auth/bind-account-form.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BindAccountForm } from './bind-account-form'

describe('BindAccountForm', () => {
  it('shows the code input after OTP request', async () => {
    const requestOtp = vi.fn().mockResolvedValue(undefined)
    const verifyOtp = vi.fn().mockResolvedValue(undefined)

    render(<BindAccountForm requestOtp={requestOtp} verifyOtp={verifyOtp} />)
    fireEvent.change(screen.getByLabelText('邮箱或手机号'), { target: { value: 'parent@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }))

    expect(requestOtp).toHaveBeenCalled()
    expect(await screen.findByLabelText('验证码')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/progress/merge-guest-snapshot.test.ts src/features/auth/bind-account-form.test.tsx
```

Expected: FAIL because the Supabase integration modules do not exist yet.

- [ ] **Step 3: Implement the guest sync and auth slice**

```env
# apps/web/.env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

```sql
-- apps/web/supabase/migrations/20260330_001_initial.sql
create table if not exists guest_snapshots (
  guest_id text primary key,
  onboarding jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists child_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  age_band text not null,
  recommended_start_level text not null
);

create table if not exists progress_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  status text not null,
  stars integer not null default 0
);

create table if not exists badge_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_type text not null
);

create table if not exists card_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_definition_id text not null,
  source_type text not null,
  is_consumed boolean not null default false,
  reserved_for_redemption boolean not null default false
);
```

```ts
// apps/web/src/lib/env.ts
export function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}
```

```ts
// apps/web/src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

import { getRequiredEnv } from '@/lib/env'

export function createAdminClient() {
  return createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  )
}
```

```ts
// apps/web/src/lib/supabase/browser.ts
import { createBrowserClient } from '@supabase/ssr'

import { getRequiredEnv } from '@/lib/env'

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  )
}
```

```ts
// apps/web/src/lib/supabase/server.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { getRequiredEnv } from '@/lib/env'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    },
  )
}
```

```ts
// apps/web/src/lib/supabase/proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { getRequiredEnv } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  await supabase.auth.getUser()
  return response
}
```

```ts
// apps/web/src/proxy.ts
import type { NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

```ts
// apps/web/src/features/progress/merge-guest-snapshot.ts
export function mergeGuestSnapshot({
  snapshot,
}: {
  snapshot: {
    onboarding: { ageBand: string; recommendedLevel: string }
    progress: {
      completedLessonIds: string[]
      stars: number
      badgeIds: string[]
      cardIds: string[]
      completedProjectIds: string[]
    }
  }
}) {
  const completedLessons = [...new Set(snapshot.progress.completedLessonIds)]
  const badgeIds = [...new Set(snapshot.progress.badgeIds)]
  const cardIds = [...new Set(snapshot.progress.cardIds)]

  return {
    childProfile: {
      ageBand: snapshot.onboarding.ageBand,
      recommendedStartLevel: snapshot.onboarding.recommendedLevel,
    },
    progressRecords: completedLessons.map((lessonId) => ({
      lessonId,
      status: 'completed',
      stars: snapshot.progress.stars,
    })),
    badgeRecords: badgeIds.map((badgeType) => ({ badgeType })),
    cardRecords: cardIds.map((cardDefinitionId) => ({
      cardDefinitionId,
      sourceType: 'guest_merge',
    })),
  }
}
```

```ts
// apps/web/src/features/progress/sync-guest-snapshot.ts
import type { OnboardingSession } from '@/features/onboarding/onboarding-session'

import type { GuestProgress } from './local-progress'

export async function syncGuestSnapshot({
  onboarding,
  progress,
}: {
  onboarding: OnboardingSession
  progress: GuestProgress
}) {
  await fetch('/api/guest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ onboarding, progress }),
  })
}
```

```ts
// apps/web/src/app/api/guest/route.ts
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const payload = await request.json()
  const cookieStore = await cookies()
  const existingGuestId = cookieStore.get('kc_guest_id')?.value
  const guestId = existingGuestId ?? crypto.randomUUID()

  await createAdminClient().from('guest_snapshots').upsert({
    guest_id: guestId,
    onboarding: payload.onboarding,
    progress: payload.progress,
  })

  const response = NextResponse.json({ guestId })

  if (!existingGuestId) {
    response.cookies.set('kc_guest_id', guestId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  return response
}
```

```tsx
// apps/web/src/features/auth/bind-account-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function BindAccountForm({
  requestOtp,
  verifyOtp,
}: {
  requestOtp: (channel: 'email' | 'phone', value: string) => Promise<void>
  verifyOtp: (channel: 'email' | 'phone', value: string, token: string) => Promise<void>
}) {
  const router = useRouter()
  const [channel, setChannel] = useState<'email' | 'phone'>('email')
  const [value, setValue] = useState('')
  const [token, setToken] = useState('')
  const [codeSent, setCodeSent] = useState(false)

  async function handleRequestOtp() {
    await requestOtp(channel, value)
    setCodeSent(true)
  }

  async function handleVerify() {
    await verifyOtp(channel, value, token)
    await fetch('/api/bind-account', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName: '小小创作者' }),
    })
    router.push('/parent/overview')
  }

  return (
    <div className="space-y-4 rounded-[2rem] bg-white p-6 shadow-sm">
      <div className="flex gap-3">
        <button className="rounded-full bg-slate-900 px-4 py-2 font-bold text-white" onClick={() => setChannel('email')} type="button">邮箱</button>
        <button className="rounded-full bg-slate-100 px-4 py-2 font-bold text-slate-700" onClick={() => setChannel('phone')} type="button">手机号</button>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        邮箱或手机号
        <input className="rounded-2xl border border-slate-200 px-4 py-3" onChange={(event) => setValue(event.target.value)} value={value} />
      </label>
      {!codeSent ? (
        <button className="w-full rounded-full bg-orange-500 px-5 py-3 font-bold text-white" onClick={handleRequestOtp} type="button">发送验证码</button>
      ) : (
        <>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            验证码
            <input className="rounded-2xl border border-slate-200 px-4 py-3" onChange={(event) => setToken(event.target.value)} value={token} />
          </label>
          <button className="w-full rounded-full bg-sky-600 px-5 py-3 font-bold text-white" onClick={handleVerify} type="button">保存我的进度</button>
        </>
      )}
    </div>
  )
}
```

```ts
// apps/web/src/features/parent/build-parent-overview.ts
export function buildParentOverview({
  profile,
  progressRecords,
  cardRecords,
  badgeRecords,
}: {
  profile: { display_name: string; recommended_start_level: string }
  progressRecords: Array<{ lesson_id: string; status: string; stars?: number }>
  cardRecords: Array<{ card_definition_id: string }>
  badgeRecords: Array<{ badge_type: string }>
}) {
  return {
    childName: profile.display_name,
    recommendedStartLevel: profile.recommended_start_level,
    completedLessonCount: progressRecords.filter((item) => item.status === 'completed').length,
    earnedStarCount: progressRecords.reduce((total, item) => total + (item.stars ?? 0), 0),
    earnedCardCount: cardRecords.length,
    earnedBadgeCount: badgeRecords.length,
    nextAction:
      progressRecords.some((item) => item.lesson_id === 'move-character')
        ? '回到学习地图继续下一关'
        : '先完成第一关“让角色动起来”',
  }
}
```

```ts
// apps/web/src/app/api/bind-account/route.ts
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { mergeGuestSnapshot } from '@/features/progress/merge-guest-snapshot'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const admin = createAdminClient()
  const cookieStore = await cookies()
  const guestId = cookieStore.get('kc_guest_id')?.value
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user
  const body = await request.json()

  if (!guestId || !user) {
    return NextResponse.json({ error: 'missing-session' }, { status: 400 })
  }

  const { data: guestSnapshot } = await admin.from('guest_snapshots').select('*').eq('guest_id', guestId).single()
  if (!guestSnapshot) {
    return NextResponse.json({ error: 'missing-guest-snapshot' }, { status: 404 })
  }

  const merged = mergeGuestSnapshot({
    snapshot: { onboarding: guestSnapshot.onboarding, progress: guestSnapshot.progress },
  })

  await admin.from('child_profiles').upsert({
    user_id: user.id,
    display_name: body.displayName,
    age_band: merged.childProfile.ageBand,
    recommended_start_level: merged.childProfile.recommendedStartLevel,
  })
  await admin.from('progress_records').insert(
    merged.progressRecords.map((record) => ({
      user_id: user.id,
      lesson_id: record.lessonId,
      status: record.status,
      stars: record.stars,
    })),
  )
  await admin.from('badge_records').insert(
    merged.badgeRecords.map((record) => ({ user_id: user.id, badge_type: record.badgeType })),
  )
  await admin.from('card_records').insert(
    merged.cardRecords.map((record) => ({
      user_id: user.id,
      card_definition_id: record.cardDefinitionId,
      source_type: record.sourceType,
    })),
  )

  return NextResponse.json({ ok: true })
}
```

```tsx
// apps/web/src/app/auth/bind/page.tsx
'use client'

import { BindAccountForm } from '@/features/auth/bind-account-form'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

export default function BindPage() {
  const supabase = createBrowserSupabaseClient()

  return (
    <main className="min-h-screen bg-[#f7f4ff] px-6 py-10">
      <section className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">保存学习成果</p>
          <h1 className="text-4xl font-black text-slate-950">绑定家长账号</h1>
        </header>
        <BindAccountForm
          requestOtp={async (channel, value) => {
            if (channel === 'email') {
              await supabase.auth.signInWithOtp({ email: value })
              return
            }
            await supabase.auth.signInWithOtp({ phone: value })
          }}
          verifyOtp={async (channel, value, token) => {
            if (channel === 'email') {
              await supabase.auth.verifyOtp({ email: value, token, type: 'email' })
              return
            }
            await supabase.auth.verifyOtp({ phone: value, token, type: 'sms' })
          }}
        />
      </section>
    </main>
  )
}
```

```tsx
// apps/web/src/app/parent/overview/page.tsx
import { redirect } from 'next/navigation'

import { buildParentOverview } from '@/features/parent/build-parent-overview'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function ParentOverviewPage() {
  const supabase = await createServerSupabaseClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  if (!user) redirect('/auth/bind')

  const [{ data: profile }, { data: progressRecords }, { data: cardRecords }, { data: badgeRecords }] =
    await Promise.all([
      supabase.from('child_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('progress_records').select('*').eq('user_id', user.id),
      supabase.from('card_records').select('*').eq('user_id', user.id),
      supabase.from('badge_records').select('*').eq('user_id', user.id),
    ])

  const summary = buildParentOverview({
    profile: profile!,
    progressRecords: progressRecords ?? [],
    cardRecords: cardRecords ?? [],
    badgeRecords: badgeRecords ?? [],
  })

  return (
    <main className="min-h-screen bg-[#f8fbff] px-6 py-10">
      <section className="mx-auto max-w-4xl space-y-6 rounded-[2rem] bg-white p-8 shadow-sm">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">家长查看页</p>
          <h1 className="text-4xl font-black text-slate-950">{summary.childName} 的学习进度</h1>
        </header>
        <div className="grid gap-4 md:grid-cols-4">
          <article className="rounded-[1.5rem] bg-slate-50 p-5"><p className="text-sm text-slate-500">推荐起点</p><p className="mt-2 text-2xl font-black text-slate-950">{summary.recommendedStartLevel}</p></article>
          <article className="rounded-[1.5rem] bg-slate-50 p-5"><p className="text-sm text-slate-500">已完成关卡</p><p className="mt-2 text-2xl font-black text-slate-950">{summary.completedLessonCount}</p></article>
          <article className="rounded-[1.5rem] bg-slate-50 p-5"><p className="text-sm text-slate-500">已收集卡片</p><p className="mt-2 text-2xl font-black text-slate-950">{summary.earnedCardCount}</p></article>
          <article className="rounded-[1.5rem] bg-slate-50 p-5"><p className="text-sm text-slate-500">徽章和星星</p><p className="mt-2 text-2xl font-black text-slate-950">{summary.earnedBadgeCount} / {summary.earnedStarCount}</p></article>
        </div>
        <p className="rounded-[1.5rem] bg-orange-50 p-5 text-base font-semibold text-orange-700">下一步建议：{summary.nextAction}</p>
      </section>
    </main>
  )
}
```

```tsx
// apps/web/src/app/onboarding/check/page.tsx (replace onComplete)
import { readGuestProgress } from '@/features/progress/local-progress'
import { syncGuestSnapshot } from '@/features/progress/sync-guest-snapshot'

onComplete={async ({ answers, recommendedLevel }) => {
  const nextSession = { ...session, answers, recommendedLevel }
  writeOnboardingSession(nextSession)
  await syncGuestSnapshot({ onboarding: nextSession, progress: readGuestProgress() })
  router.push('/learn/map')
}}
```

```tsx
// apps/web/src/app/learn/lesson/[lessonId]/page.tsx (after writeGuestProgress)
import { readOnboardingSession } from '@/features/onboarding/onboarding-session'
import { syncGuestSnapshot } from '@/features/progress/sync-guest-snapshot'

const nextProgress = {
  ...progress,
  completedLessonIds: [...new Set([...progress.completedLessonIds, lesson.id])],
  currentLessonId: 'move-character',
  stars: progress.stars + reward.stars,
  badgeIds: [...new Set([...progress.badgeIds, ...reward.badgeIds])],
  cardIds: [...new Set([...progress.cardIds, ...reward.cardIds])],
  completedProjectIds: [...new Set([...progress.completedProjectIds, lesson.id])],
}

writeGuestProgress(nextProgress)
await syncGuestSnapshot({
  onboarding: readOnboardingSession(),
  progress: nextProgress,
})
```

- [ ] **Step 4: Run the checks, generate DB types, and commit**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/progress/merge-guest-snapshot.test.ts src/features/auth/bind-account-form.test.tsx
npx supabase init
npx supabase db start
npx supabase migration up
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

Expected: the tests pass, Supabase starts locally, migrations apply, and `database.types.ts` is generated.

Commit:

```powershell
git add apps/web
git commit -m "feat: add guest sync, auth binding, and parent overview"
```

### Task 6: Add end-to-end coverage and developer documentation

**Files:**
- Create: `apps/web/tests/e2e/guest-story.spec.ts`
- Create: `apps/web/tests/e2e/cards.spec.ts`
- Create: `apps/web/README.md`

- [ ] **Step 1: Write the failing end-to-end tests**

```ts
// apps/web/tests/e2e/guest-story.spec.ts
import { expect, test } from '@playwright/test'

test('guest user can reach the first completed project', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: '马上开始' }).click()
  await page.getByRole('button', { name: '9-12 岁' }).click()
  await page.getByRole('button', { name: '一个一个排好顺序' }).click()
  await page.getByRole('button', { name: '让它重复同一个动作' }).click()
  await page.getByRole('link', { name: '继续挑战' }).click()
  await page.getByRole('button', { name: '添加积木：when_start' }).click()
  await page.getByRole('button', { name: '完成这一步' }).click()
  await page.getByRole('button', { name: '添加积木：move_right' }).click()
  await page.getByRole('button', { name: '完成这一步' }).click()

  await expect(page.getByRole('heading', { name: '你已经做出了第一个会动的故事' })).toBeVisible()
})
```

```ts
// apps/web/tests/e2e/cards.spec.ts
import { expect, test } from '@playwright/test'

test('card book opens and shows the card heading', async ({ page }) => {
  await page.goto('/cards')
  await expect(page.getByRole('heading', { name: '收集你学会的每一步' })).toBeVisible()
})
```

- [ ] **Step 2: Run the browser tests and confirm at least one fails**

Run:

```powershell
Set-Location apps/web
npm run test:e2e -- tests/e2e/guest-story.spec.ts tests/e2e/cards.spec.ts
```

Expected: at least one test fails before the final glue code and docs are in place.

- [ ] **Step 3: Add the README and run the full verification suite**

```md
<!-- apps/web/README.md -->
# Kids Coding Web App

## Setup

1. Copy `.env.example` to `.env.local`
2. Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
3. Install dependencies: `npm install`
4. Start Supabase locally: `npx supabase db start`
5. Run migrations: `npx supabase migration up`
6. Start the app: `npm run dev`

## Commands

- `npm run lint`
- `npm run test:run`
- `npm run test:e2e`

## Main Routes

- `/`
- `/onboarding/age`
- `/onboarding/check`
- `/learn/map`
- `/learn/lesson/move-character`
- `/project/move-character/complete`
- `/cards`
- `/auth/bind`
- `/parent/overview`
```

Run:

```powershell
Set-Location apps/web
npm run lint
npm run test:run
npm run test:e2e
npm run build
```

Expected: lint, unit tests, end-to-end tests, and production build all pass.

Commit:

```powershell
git add apps/web
git commit -m "test: add end-to-end coverage for the core learning journey"
```
