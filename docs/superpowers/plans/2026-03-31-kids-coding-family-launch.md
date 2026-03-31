# Kids Coding Family Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing `apps/web` MVP into the first formal family-launch product: 3 trial lessons, 12 paid lessons, guest cloud snapshots, parent binding, one-time course purchase, parent overview, lightweight content admin, and Chinese content safety checks.

**Architecture:** Keep the existing Next.js App Router app in `apps/web`, but move launch behavior behind three clear layers: DB-backed curriculum and entitlement data, thin route pages, and focused feature modules for lessons, billing, progress, and admin. Use Stripe Checkout for the one-time launch course pack purchase, Supabase for auth/data/storage, and treat Chinese encoding validation as a release gate rather than a nice-to-have.

**Tech Stack:** Next.js App Router, React, TypeScript, Blockly, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), Stripe Checkout, Vitest, Testing Library, Playwright

---

## Planned File Structure

- `apps/web/src/features/domain/types.ts`: shared launch types for lessons, hints, remedials, templates, projects, purchases, and admin publish checks
- `apps/web/src/content/curriculum/*`: launch seed data for the 15 main lessons and remedial lessons
- `apps/web/src/features/curriculum/*`: launch map building, DB loading, voice cue loading, and publish validation helpers
- `apps/web/src/features/lessons/*`: guided lesson shell, hint flow, remedial entry, and template-story runtime
- `apps/web/src/features/progress/*`: guest state, project snapshots, guest merge, and entitlement-aware learning state
- `apps/web/src/features/billing/*`: course pack metadata, checkout session creation, webhook mapping, entitlement resolution
- `apps/web/src/features/parent/*`: parent overview summary, recent project cards, next-step suggestions
- `apps/web/src/features/admin/*`: editor forms, publish validation, lesson save actions, seed sync
- `apps/web/src/features/media/*`: launch voice cue metadata and playback helpers
- `apps/web/src/app/*`: route pages for child learning, parent purchase/view, admin pages, and billing callbacks
- `apps/web/src/app/api/*`: guest sync, bind, checkout, and webhook routes
- `apps/web/supabase/migrations/*`: schema upgrades for curriculum, projects, orders, entitlements, and publish audits
- `apps/web/tests/e2e/*`: browser-level coverage for trial completion, lock/upgrade flow, parent view, and admin publish checks

## Assumptions To Keep Explicit

- Billing provider: `Stripe Checkout` in test/live mode.
- First launch stays `PC/平板优先`; no mobile-specific learning UI task is included.
- Admin is for `内容运营`, not for institutions or teachers.
- Curriculum authoring starts from seed data in repo, then moves into Supabase-backed admin editing.

### Task 1: Normalize launch curriculum types and seed data

**Files:**
- Create: `apps/web/src/content/curriculum/launch-lessons.ts`
- Create: `apps/web/src/content/curriculum/remedial-lessons.ts`
- Create: `apps/web/src/features/curriculum/build-launch-map.ts`
- Create: `apps/web/src/features/curriculum/build-launch-map.test.ts`
- Modify: `apps/web/src/features/domain/types.ts`
- Modify: `apps/web/src/content/cards/card-definitions.ts`
- Modify: `apps/web/src/features/rewards/award-lesson-completion.ts`
- Modify: `apps/web/src/features/rewards/award-lesson-completion.test.ts`

- [ ] **Step 1: Write the failing curriculum and reward tests**

```ts
// apps/web/src/features/curriculum/build-launch-map.test.ts
import { describe, expect, it } from 'vitest'

import { buildLaunchMap } from './build-launch-map'

describe('buildLaunchMap', () => {
  it('returns 3 trial lessons and 12 paid lessons', () => {
    const map = buildLaunchMap()

    expect(map.trialLessons).toHaveLength(3)
    expect(map.paidLessons).toHaveLength(12)
    expect(map.allLessons.at(-1)?.id).toBe('course-15-finish-story')
    expect(map.remedials.map((item) => item.id)).toContain('remedial-click-trigger')
  })
})
```

```ts
// apps/web/src/features/rewards/award-lesson-completion.test.ts
import { describe, expect, it } from 'vitest'

import { awardLessonCompletion } from './award-lesson-completion'

describe('awardLessonCompletion', () => {
  it('awards the first-project badge after the first trial project', () => {
    expect(
      awardLessonCompletion({
        lessonId: 'trial-03-scene-story',
        rewardCardId: 'growth-first-project',
        isFirstProject: true,
        streakDays: 1,
      }),
    ).toMatchObject({
      stars: 3,
      badgeIds: ['first-project'],
      cardIds: ['growth-first-project'],
    })
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/curriculum/build-launch-map.test.ts src/features/rewards/award-lesson-completion.test.ts
```

Expected: FAIL because the launch curriculum module does not exist and current rewards do not cover the launch IDs.

- [ ] **Step 3: Extend the launch types and seed data**

```ts
// apps/web/src/features/domain/types.ts
export type LessonPhase = 'trial' | 'course'
export type LessonMode = 'guided' | 'template'
export type HintLayer = {
  id: string
  mode: 'repeat_goal' | 'show_block' | 'offer_remedial'
  copy: string
  remedialLessonId?: string
}
export type RemedialLessonDefinition = {
  id: string
  title: string
  focus: string
  returnToLessonId: string
  returnToStepId: string
  steps: LessonStep[]
}
export type LaunchLessonDefinition = LessonDefinition & {
  phase: LessonPhase
  mode: LessonMode
  sortOrder: number
  hintLayers: HintLayer[]
  templateId?: string
}
export type ProjectTemplateDefinition = {
  id: string
  name: string
  starterScene: string
  starterCharacters: string[]
}
```

```ts
// apps/web/src/content/curriculum/launch-lessons.ts
import type { LaunchLessonDefinition, ProjectTemplateDefinition } from '@/features/domain/types'

export const launchTemplates: ProjectTemplateDefinition[] = [
  { id: 'forest-friendship', name: '森林友谊故事', starterScene: 'forest', starterCharacters: ['cat', 'bird'] },
  { id: 'space-rescue', name: '太空救援故事', starterScene: 'space', starterCharacters: ['robot', 'star'] },
]

export const launchLessons: LaunchLessonDefinition[] = [
  { id: 'trial-01-move-character', title: '让角色动起来', goal: '主角从左边走到右边', recommendedLevel: 'starter', rewardCardId: 'theme-scout-cat', phase: 'trial', mode: 'guided', sortOrder: 1, steps: [], hintLayers: [] },
  { id: 'trial-02-dialogue-action', title: '让角色说话和做动作', goal: '角色边走边说一句话', recommendedLevel: 'starter', rewardCardId: 'theme-dialogue-bird', phase: 'trial', mode: 'guided', sortOrder: 2, steps: [], hintLayers: [] },
  { id: 'trial-03-scene-story', title: '做出第一个完整小故事', goal: '完成一个可回放的短故事', recommendedLevel: 'starter', rewardCardId: 'growth-first-project', phase: 'trial', mode: 'guided', sortOrder: 3, steps: [], hintLayers: [] },
  { id: 'course-04-two-characters', title: '让两个角色一起表演', goal: '安排两个角色先后出场', recommendedLevel: 'starter', rewardCardId: 'theme-stage-duo', phase: 'course', mode: 'guided', sortOrder: 4, steps: [], hintLayers: [] },
  { id: 'course-05-scene-change', title: '让场景切换起来', goal: '在故事中切换两个场景', recommendedLevel: 'starter', rewardCardId: 'theme-scene-switch', phase: 'course', mode: 'guided', sortOrder: 5, steps: [], hintLayers: [] },
  { id: 'course-06-repeat-motion', title: '让动作重复出现', goal: '让角色重复做动作', recommendedLevel: 'starter', rewardCardId: 'growth-repeat-master', phase: 'course', mode: 'guided', sortOrder: 6, steps: [], hintLayers: [] },
  { id: 'course-07-click-trigger', title: '点一下就发生事情', goal: '让点击触发角色动作', recommendedLevel: 'foundation', rewardCardId: 'growth-click-trigger', phase: 'course', mode: 'guided', sortOrder: 7, steps: [], hintLayers: [] },
  { id: 'course-08-order-events', title: '排好故事顺序', goal: '让多个事件按顺序发生', recommendedLevel: 'foundation', rewardCardId: 'theme-story-order', phase: 'course', mode: 'guided', sortOrder: 8, steps: [], hintLayers: [] },
  { id: 'course-09-character-teamwork', title: '让角色配合起来', goal: '完成双角色互动', recommendedLevel: 'foundation', rewardCardId: 'theme-teamwork', phase: 'course', mode: 'guided', sortOrder: 9, steps: [], hintLayers: [] },
  { id: 'course-10-simple-choice', title: '故事里出现选择', goal: '做出一个简单分支', recommendedLevel: 'foundation', rewardCardId: 'growth-choice-maker', phase: 'course', mode: 'guided', sortOrder: 10, steps: [], hintLayers: [] },
  { id: 'course-11-rhythm-control', title: '控制故事节奏', goal: '让动作和对白更有节奏', recommendedLevel: 'foundation', rewardCardId: 'theme-rhythm-star', phase: 'course', mode: 'guided', sortOrder: 11, steps: [], hintLayers: [] },
  { id: 'course-12-story-polish', title: '把故事打磨完整', goal: '补齐开头和结尾', recommendedLevel: 'foundation', rewardCardId: 'growth-story-polish', phase: 'course', mode: 'guided', sortOrder: 12, steps: [], hintLayers: [] },
  { id: 'course-13-template-story-start', title: '按模板做自己的故事', goal: '在模板里替换角色和场景', recommendedLevel: 'foundation', rewardCardId: 'theme-template-explorer', phase: 'course', mode: 'template', sortOrder: 13, steps: [], hintLayers: [], templateId: 'forest-friendship' },
  { id: 'course-14-template-story-edit', title: '给故事加对白和动作', goal: '丰富模板故事内容', recommendedLevel: 'foundation', rewardCardId: 'growth-story-editor', phase: 'course', mode: 'template', sortOrder: 14, steps: [], hintLayers: [], templateId: 'space-rescue' },
  { id: 'course-15-finish-story', title: '完成我的独立小故事', goal: '独立完成一个可回放小故事', recommendedLevel: 'foundation', rewardCardId: 'commemorative-story-graduate', phase: 'course', mode: 'template', sortOrder: 15, steps: [], hintLayers: [] },
]
```

```ts
// apps/web/src/features/curriculum/build-launch-map.ts
import { launchLessons } from '@/content/curriculum/launch-lessons'
import { remedialLessons } from '@/content/curriculum/remedial-lessons'

export function buildLaunchMap() {
  const allLessons = [...launchLessons].sort((left, right) => left.sortOrder - right.sortOrder)
  return {
    allLessons,
    trialLessons: allLessons.filter((item) => item.phase === 'trial'),
    paidLessons: allLessons.filter((item) => item.phase === 'course'),
    remedials: remedialLessons,
  }
}
```

- [ ] **Step 4: Run the tests and verify the curriculum passes**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/curriculum/build-launch-map.test.ts src/features/rewards/award-lesson-completion.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the curriculum foundation**

```powershell
git add apps/web/src/features/domain/types.ts apps/web/src/content/curriculum apps/web/src/features/curriculum apps/web/src/features/rewards
git commit -m "feat: add family launch curriculum model"
```

### Task 2: Add launch schema, guest project snapshots, and curriculum repositories

**Files:**
- Create: `apps/web/supabase/migrations/20260331_002_family_launch.sql`
- Create: `apps/web/src/features/curriculum/load-launch-curriculum.ts`
- Create: `apps/web/src/features/progress/project-snapshot.ts`
- Create: `apps/web/src/features/progress/project-snapshot.test.ts`
- Modify: `apps/web/src/features/progress/local-progress.ts`
- Modify: `apps/web/src/features/progress/sync-guest-snapshot.ts`
- Modify: `apps/web/src/features/progress/merge-guest-snapshot.ts`
- Modify: `apps/web/src/app/api/guest/route.ts`

- [ ] **Step 1: Write the failing persistence tests**

```ts
// apps/web/src/features/progress/project-snapshot.test.ts
import { describe, expect, it } from 'vitest'

import { buildProjectSnapshotKey, normalizeProjectSnapshots } from './project-snapshot'

describe('project snapshot helpers', () => {
  it('keeps only the newest snapshot per lesson', () => {
    const snapshots = normalizeProjectSnapshots([
      { lessonId: 'trial-03-scene-story', updatedAt: '2026-03-31T10:00:00.000Z', blocks: [] },
      { lessonId: 'trial-03-scene-story', updatedAt: '2026-03-31T10:01:00.000Z', blocks: [{ type: 'move_right' }] },
    ])

    expect(snapshots).toHaveLength(1)
    expect(buildProjectSnapshotKey('trial-03-scene-story')).toBe('project:trial-03-scene-story')
    expect(snapshots[0]?.blocks).toEqual([{ type: 'move_right' }])
  })
})
```

```ts
// apps/web/src/features/progress/merge-guest-snapshot.test.ts
import { describe, expect, it } from 'vitest'

import { mergeGuestSnapshot } from './merge-guest-snapshot'

describe('mergeGuestSnapshot', () => {
  it('includes project snapshots and paid entitlement flags', () => {
    const merged = mergeGuestSnapshot({
      snapshot: {
        onboarding: { ageBand: 'age_6_8', recommendedLevel: 'starter' },
        progress: {
          completedLessonIds: ['trial-01-move-character'],
          currentLessonId: 'trial-03-scene-story',
          stars: 6,
          badgeIds: ['first-project'],
          cardIds: ['growth-first-project'],
          streakDays: 2,
          completedProjectIds: ['trial-03-scene-story'],
          projectSnapshots: [
            { lessonId: 'trial-03-scene-story', updatedAt: '2026-03-31T10:00:00.000Z', blocks: [] },
          ],
        },
      },
    })

    expect(merged.projectSnapshots).toHaveLength(1)
    expect(merged.childProfile.recommendedStartLevel).toBe('starter')
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/progress/project-snapshot.test.ts src/features/progress/merge-guest-snapshot.test.ts
```

Expected: FAIL because project snapshot helpers and updated merge logic do not exist.

- [ ] **Step 3: Add the schema and persistence helpers**

```sql
-- apps/web/supabase/migrations/20260331_002_family_launch.sql
create table if not exists lesson_configs (
  id text primary key,
  phase text not null,
  mode text not null,
  sort_order integer not null,
  title text not null,
  goal text not null,
  payload jsonb not null,
  published_at timestamptz
);

create table if not exists remedial_lesson_configs (
  id text primary key,
  title text not null,
  focus text not null,
  payload jsonb not null
);

create table if not exists audio_asset_configs (
  id text primary key,
  lesson_id text not null,
  usage_type text not null,
  provider text not null,
  asset_url text not null
);

create table if not exists project_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_guest_id uuid,
  owner_user_id uuid references auth.users(id) on delete cascade,
  lesson_id text not null,
  snapshot jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_session_id text not null unique,
  status text not null,
  product_code text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null,
  status text not null,
  granted_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists entitlements_user_product_idx
  on entitlements (user_id, product_code);
```

```ts
// apps/web/src/features/progress/project-snapshot.ts
export type ProjectSnapshot = {
  lessonId: string
  updatedAt: string
  blocks: Array<{ type: string }>
}

export function buildProjectSnapshotKey(lessonId: string) {
  return `project:${lessonId}`
}

export function normalizeProjectSnapshots(input: ProjectSnapshot[]) {
  const newestByLesson = new Map<string, ProjectSnapshot>()
  for (const snapshot of input) {
    const existing = newestByLesson.get(snapshot.lessonId)
    if (!existing || existing.updatedAt < snapshot.updatedAt) {
      newestByLesson.set(snapshot.lessonId, snapshot)
    }
  }
  return [...newestByLesson.values()]
}
```

```ts
// apps/web/src/features/progress/local-progress.ts
export type GuestProgress = {
  completedLessonIds: string[]
  currentLessonId: string
  stars: number
  badgeIds: string[]
  cardIds: string[]
  streakDays: number
  completedProjectIds: string[]
  projectSnapshots: Array<{ lessonId: string; updatedAt: string; blocks: Array<{ type: string }> }>
}

export const defaultGuestProgress: GuestProgress = {
  completedLessonIds: [],
  currentLessonId: 'trial-01-move-character',
  stars: 0,
  badgeIds: [],
  cardIds: [],
  streakDays: 1,
  completedProjectIds: [],
  projectSnapshots: [],
}
```

```ts
// apps/web/src/features/progress/merge-guest-snapshot.ts
import { normalizeProjectSnapshots } from './project-snapshot'

export function mergeGuestSnapshot({ snapshot }: { snapshot: { onboarding: { ageBand: string; recommendedLevel: string }; progress: any } }) {
  const projectSnapshots = normalizeProjectSnapshots(snapshot.progress.projectSnapshots ?? [])

  return {
    childProfile: {
      ageBand: snapshot.onboarding.ageBand,
      recommendedStartLevel: snapshot.onboarding.recommendedLevel,
    },
    progressRecords: [...new Set(snapshot.progress.completedLessonIds)].map((lessonId) => ({
      lessonId,
      status: 'completed',
      stars: snapshot.progress.stars,
    })),
    badgeRecords: [...new Set(snapshot.progress.badgeIds)].map((badgeType) => ({ badgeType })),
    cardRecords: [...new Set(snapshot.progress.cardIds)].map((cardDefinitionId) => ({
      cardDefinitionId,
      sourceType: 'guest_merge',
    })),
    projectSnapshots,
  }
}
```

- [ ] **Step 4: Run the persistence tests and migration checks**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/progress/project-snapshot.test.ts src/features/progress/merge-guest-snapshot.test.ts
npx supabase db reset
```

Expected: tests PASS and the local Supabase reset completes with the new migration applied.

- [ ] **Step 5: Commit the launch data layer**

```powershell
git add apps/web/supabase/migrations/20260331_002_family_launch.sql apps/web/src/features/progress apps/web/src/app/api/guest/route.ts apps/web/src/features/curriculum/load-launch-curriculum.ts
git commit -m "feat: add family launch data schema"
```

### Task 3: Upgrade the child learning flow to the 3-trial + 12-paid experience

**Files:**
- Create: `apps/web/src/features/lessons/build-hint-state.ts`
- Create: `apps/web/src/features/lessons/build-hint-state.test.ts`
- Create: `apps/web/src/features/lessons/guided-lesson-shell.tsx`
- Create: `apps/web/src/features/lessons/remedial-link-card.tsx`
- Create: `apps/web/src/features/lessons/template-story-builder.tsx`
- Create: `apps/web/src/app/learn/remedial/[remedialId]/page.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/learn/map/page.tsx`
- Modify: `apps/web/src/app/learn/lesson/[lessonId]/page.tsx`
- Modify: `apps/web/src/app/project/[projectId]/complete/page.tsx`
- Modify: `apps/web/src/features/lessons/map-view.tsx`

- [ ] **Step 1: Write the failing hint and gating tests**

```ts
// apps/web/src/features/lessons/build-hint-state.test.ts
import { describe, expect, it } from 'vitest'

import { buildHintState } from './build-hint-state'

describe('buildHintState', () => {
  it('escalates to remedial after two failed attempts', () => {
    const state = buildHintState({
      failedAttempts: 2,
      hintLayers: [
        { id: 'h1', mode: 'repeat_goal', copy: '再看一下目标。' },
        { id: 'h2', mode: 'show_block', copy: '先拖开始积木。' },
        { id: 'h3', mode: 'offer_remedial', copy: '先去学一个小课。', remedialLessonId: 'remedial-click-trigger' },
      ],
    })

    expect(state.activeHint?.mode).toBe('offer_remedial')
    expect(state.showRemedialJump).toBe(true)
  })
})
```

```tsx
// apps/web/src/features/lessons/guided-lesson-shell.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GuidedLessonShell } from './guided-lesson-shell'

describe('GuidedLessonShell', () => {
  it('shows the purchase lock for paid lessons without entitlement', () => {
    render(
      <GuidedLessonShell
        lessonTitle="让两个角色一起表演"
        lessonGoal="安排两个角色先后出场"
        isLocked
        onStartRemedial={vi.fn()}
      />,
    )

    expect(screen.getByText('购买整套课程后继续学习')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '完成这一步' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/lessons/build-hint-state.test.ts src/features/lessons/guided-lesson-shell.test.tsx
```

Expected: FAIL because the hint builder and launch lesson shell do not exist.

- [ ] **Step 3: Implement the launch lesson runtime**

```ts
// apps/web/src/features/lessons/build-hint-state.ts
import type { HintLayer } from '@/features/domain/types'

export function buildHintState({
  failedAttempts,
  hintLayers,
}: {
  failedAttempts: number
  hintLayers: HintLayer[]
}) {
  const activeHint = hintLayers[Math.min(failedAttempts, hintLayers.length - 1)] ?? null
  return {
    activeHint,
    showRemedialJump: activeHint?.mode === 'offer_remedial',
  }
}
```

```tsx
// apps/web/src/features/lessons/guided-lesson-shell.tsx
type GuidedLessonShellProps = {
  lessonTitle: string
  lessonGoal: string
  isLocked: boolean
  feedback?: string
  onCompleteStep?: () => void
  onStartRemedial: (remedialId: string) => void
}

export function GuidedLessonShell(props: GuidedLessonShellProps) {
  if (props.isLocked) {
    return (
      <section className="rounded-[2rem] bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black text-slate-950">{props.lessonTitle}</h1>
        <p className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 font-semibold text-orange-700">
          购买整套课程后继续学习
        </p>
      </section>
    )
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <aside className="rounded-[2rem] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-slate-950">{props.lessonTitle}</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">目标：{props.lessonGoal}</p>
        {props.feedback ? <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 font-semibold text-sky-700">{props.feedback}</p> : null}
        <button className="mt-4 w-full rounded-full bg-orange-500 px-5 py-3 font-bold text-white" onClick={props.onCompleteStep} type="button">
          完成这一步
        </button>
      </aside>
      <div className="space-y-6" />
    </section>
  )
}
```

```tsx
// apps/web/src/app/learn/lesson/[lessonId]/page.tsx
import { buildLaunchMap } from '@/features/curriculum/build-launch-map'
import { GuidedLessonShell } from '@/features/lessons/guided-lesson-shell'

const launchMap = buildLaunchMap()
const lesson = launchMap.allLessons.find((item) => item.id === lessonId)
const isLocked = lesson?.phase === 'course' && !hasCourseEntitlement

return (
  <main className="min-h-screen bg-[#f8fbff] px-6 py-8">
    <GuidedLessonShell
      lessonTitle={lesson.title}
      lessonGoal={lesson.goal}
      isLocked={isLocked}
      feedback={feedback}
      onCompleteStep={handleNext}
      onStartRemedial={(remedialId) => router.push(`/learn/remedial/${remedialId}`)}
    />
  </main>
)
```

- [ ] **Step 4: Run focused tests and a build smoke check**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/lessons/build-hint-state.test.ts src/features/lessons/guided-lesson-shell.test.tsx
npm run build
```

Expected: both tests PASS and the production build completes.

- [ ] **Step 5: Commit the child launch flow**

```powershell
git add apps/web/src/app/page.tsx apps/web/src/app/learn apps/web/src/features/lessons apps/web/src/features/curriculum
git commit -m "feat: upgrade child learning flow for family launch"
```

### Task 4: Add parent binding, one-time purchase, entitlements, and richer parent overview

**Files:**
- Create: `apps/web/src/features/billing/course-pack.ts`
- Create: `apps/web/src/features/billing/resolve-course-access.ts`
- Create: `apps/web/src/features/billing/resolve-course-access.test.ts`
- Create: `apps/web/src/lib/billing/stripe.ts`
- Create: `apps/web/src/app/api/checkout/route.ts`
- Create: `apps/web/src/app/api/payments/stripe/webhook/route.ts`
- Create: `apps/web/src/app/parent/purchase/page.tsx`
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/app/api/bind-account/route.ts`
- Modify: `apps/web/src/features/parent/build-parent-overview.ts`
- Modify: `apps/web/src/features/parent/build-parent-overview.test.ts`
- Modify: `apps/web/src/app/parent/overview/page.tsx`

- [ ] **Step 1: Write the failing billing and parent-summary tests**

```ts
// apps/web/src/features/billing/resolve-course-access.test.ts
import { describe, expect, it } from 'vitest'

import { resolveCourseAccess } from './resolve-course-access'

describe('resolveCourseAccess', () => {
  it('allows all trial lessons but locks paid lessons without entitlement', () => {
    expect(resolveCourseAccess({ lessonPhase: 'trial', hasLaunchPack: false })).toBe('allowed')
    expect(resolveCourseAccess({ lessonPhase: 'course', hasLaunchPack: false })).toBe('locked')
    expect(resolveCourseAccess({ lessonPhase: 'course', hasLaunchPack: true })).toBe('allowed')
  })
})
```

```ts
// apps/web/src/features/parent/build-parent-overview.test.ts
import { describe, expect, it } from 'vitest'

import { buildParentOverview } from './build-parent-overview'

describe('buildParentOverview', () => {
  it('surfaces recent project count and purchase suggestion', () => {
    const summary = buildParentOverview({
      profile: { display_name: '小小创作者', recommended_start_level: 'starter' },
      progressRecords: [{ lesson_id: 'trial-03-scene-story', status: 'completed', stars: 6 }],
      cardRecords: [{ card_definition_id: 'growth-first-project' }],
      badgeRecords: [{ badge_type: 'first-project' }],
      projectSnapshots: [{ lesson_id: 'trial-03-scene-story', updated_at: '2026-03-31T10:00:00.000Z' }],
      hasLaunchPack: false,
    })

    expect(summary.recentProjectCount).toBe(1)
    expect(summary.nextAction).toContain('购买整套课程')
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```powershell
Set-Location apps/web
npm install stripe
npm run test:run -- src/features/billing/resolve-course-access.test.ts src/features/parent/build-parent-overview.test.ts
```

Expected: FAIL because the billing helper and updated parent summary contract do not exist.

- [ ] **Step 3: Implement checkout, entitlement resolution, and parent summary**

```ts
// apps/web/src/features/billing/resolve-course-access.ts
export function resolveCourseAccess({
  lessonPhase,
  hasLaunchPack,
}: {
  lessonPhase: 'trial' | 'course'
  hasLaunchPack: boolean
}) {
  if (lessonPhase === 'trial') return 'allowed'
  return hasLaunchPack ? 'allowed' : 'locked'
}
```

```ts
// apps/web/src/features/billing/course-pack.ts
export const launchCoursePack = {
  productCode: 'launch-story-pack',
  title: '动画故事启蒙课程包',
  lessonCount: 12,
  trialLessonCount: 3,
  priceCny: 19900,
}
```

```ts
// apps/web/src/lib/billing/stripe.ts
import Stripe from 'stripe'

export function createStripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
  })
}
```

```ts
// apps/web/src/app/api/checkout/route.ts
import { NextResponse } from 'next/server'

import { launchCoursePack } from '@/features/billing/course-pack'
import { createStripeClient } from '@/lib/billing/stripe'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const stripe = createStripeClient()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price_data: { currency: 'cny', product_data: { name: launchCoursePack.title }, unit_amount: launchCoursePack.priceCny }, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/parent/overview?purchase=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/parent/purchase?purchase=cancelled`,
    metadata: { userId: data.user.id, productCode: launchCoursePack.productCode },
  })

  return NextResponse.json({ url: session.url })
}
```

```ts
// apps/web/src/features/parent/build-parent-overview.ts
export function buildParentOverview(input: {
  profile: { display_name: string; recommended_start_level: string }
  progressRecords: Array<{ lesson_id: string; status: string; stars?: number }>
  cardRecords: Array<{ card_definition_id: string }>
  badgeRecords: Array<{ badge_type: string }>
  projectSnapshots: Array<{ lesson_id: string; updated_at: string }>
  hasLaunchPack: boolean
}) {
  return {
    childName: input.profile.display_name,
    recommendedStartLevel: input.profile.recommended_start_level,
    completedLessonCount: input.progressRecords.filter((item) => item.status === 'completed').length,
    earnedStarCount: input.progressRecords.reduce((maxStars, item) => Math.max(maxStars, item.stars ?? 0), 0),
    earnedCardCount: input.cardRecords.length,
    earnedBadgeCount: input.badgeRecords.length,
    recentProjectCount: input.projectSnapshots.length,
    nextAction: input.hasLaunchPack ? '继续正式课程第 4 节。' : '孩子已经完成试听，可以购买整套课程继续学习。',
  }
}
```

- [ ] **Step 4: Run tests and checkout smoke checks**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/billing/resolve-course-access.test.ts src/features/parent/build-parent-overview.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit the family account and purchase flow**

```powershell
git add apps/web/package.json apps/web/package-lock.json apps/web/src/features/billing apps/web/src/lib/billing apps/web/src/app/api/checkout apps/web/src/app/api/payments apps/web/src/app/parent apps/web/src/app/api/bind-account/route.ts apps/web/src/features/parent
git commit -m "feat: add family purchase and entitlement flow"
```

### Task 5: Build the lightweight content admin and publish checks

**Files:**
- Create: `apps/web/src/features/admin/validate-course-content.ts`
- Create: `apps/web/src/features/admin/validate-course-content.test.ts`
- Create: `apps/web/src/features/admin/audio-asset-editor.tsx`
- Create: `apps/web/src/features/admin/course-editor.tsx`
- Create: `apps/web/src/features/admin/save-launch-curriculum.ts`
- Create: `apps/web/src/app/admin/page.tsx`
- Create: `apps/web/src/app/api/admin/publish/route.ts`
- Modify: `apps/web/src/features/curriculum/load-launch-curriculum.ts`

- [ ] **Step 1: Write the failing publish validation test**

```ts
// apps/web/src/features/admin/validate-course-content.test.ts
import { describe, expect, it } from 'vitest'

import { validateCourseContent } from './validate-course-content'

describe('validateCourseContent', () => {
  it('blocks mojibake and replacement characters', () => {
    expect(
      validateCourseContent({
        lessonId: 'trial-01-move-character',
        title: '鍋氬姩鐢诲﹂',
        steps: [{ title: '第 1 步', instruction: '角色出现�' }],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'encoding_suspect' }),
      ]),
    )
  })
})
```

- [ ] **Step 2: Run the validation test and confirm it fails**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/admin/validate-course-content.test.ts
```

Expected: FAIL because the validator does not exist.

- [ ] **Step 3: Implement the admin page and publish validator**

```ts
// apps/web/src/features/admin/validate-course-content.ts
const suspiciousFragments = ['�', '鈥', '鍋', '璇', '浣']

export function validateCourseContent(input: {
  lessonId: string
  title: string
  steps: Array<{ title: string; instruction: string }>
}) {
  const issues = []
  const fields = [input.title, ...input.steps.flatMap((step) => [step.title, step.instruction])]
  for (const value of fields) {
    if (suspiciousFragments.some((fragment) => value.includes(fragment))) {
      issues.push({ code: 'encoding_suspect', lessonId: input.lessonId, value })
    }
  }
  return issues
}
```

```tsx
// apps/web/src/app/admin/page.tsx
import { CourseEditor } from '@/features/admin/course-editor'
import { loadLaunchCurriculum } from '@/features/curriculum/load-launch-curriculum'

export default async function AdminPage() {
  const curriculum = await loadLaunchCurriculum()

  return (
    <main className="min-h-screen bg-[#fffaf2] px-6 py-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">内容后台</p>
          <h1 className="text-4xl font-black text-slate-950">课程和提示管理</h1>
        </header>
        <CourseEditor curriculum={curriculum} />
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          这一页同时维护课程步骤、提示文案和语音资源。
        </p>
      </section>
    </main>
  )
}
```

```ts
// apps/web/src/app/api/admin/publish/route.ts
import { NextResponse } from 'next/server'

import { validateCourseContent } from '@/features/admin/validate-course-content'

export async function POST(request: Request) {
  const payload = await request.json()
  const issues = payload.lessons.flatMap(validateCourseContent)
  if (issues.length > 0) {
    return NextResponse.json({ ok: false, issues }, { status: 422 })
  }
  return NextResponse.json({ ok: true, issues: [] })
}
```

- [ ] **Step 4: Run the admin validation checks**

Run:

```powershell
Set-Location apps/web
npm run test:run -- src/features/admin/validate-course-content.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit the admin tools**

```powershell
git add apps/web/src/features/admin apps/web/src/app/admin apps/web/src/app/api/admin apps/web/src/features/curriculum/load-launch-curriculum.ts
git commit -m "feat: add launch content admin and publish checks"
```

### Task 6: Expand documentation and end-to-end coverage for the formal launch flow

**Files:**
- Create: `apps/web/tests/e2e/trial-lock-purchase.spec.ts`
- Create: `apps/web/tests/e2e/parent-overview.spec.ts`
- Modify: `apps/web/tests/e2e/guest-story.spec.ts`
- Modify: `apps/web/README.md`

- [ ] **Step 1: Write the failing end-to-end tests**

```ts
// apps/web/tests/e2e/trial-lock-purchase.spec.ts
import { expect, test } from '@playwright/test'

test('trial learner is locked on lesson four before purchase', async ({ page }) => {
  await page.goto('/learn/lesson/course-04-two-characters')
  await expect(page.getByText('购买整套课程后继续学习')).toBeVisible()
})
```

```ts
// apps/web/tests/e2e/parent-overview.spec.ts
import { expect, test } from '@playwright/test'

test('parent overview shows next action copy', async ({ page }) => {
  await page.goto('/parent/overview')
  await expect(page.getByText('下一步建议')).toBeVisible()
})
```

- [ ] **Step 2: Run the browser tests and confirm at least one fails**

Run:

```powershell
Set-Location apps/web
npm run test:e2e -- tests/e2e/trial-lock-purchase.spec.ts tests/e2e/parent-overview.spec.ts
```

Expected: FAIL until the launch flow is fully wired.

- [ ] **Step 3: Update the docs for launch setup and release checks**

```md
<!-- apps/web/README.md -->
# Kids Coding Family Launch App

## Setup

1. `npm install`
2. 配置 `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
3. `npx supabase db reset`
4. `npm run dev`

## Launch Checks

- `npm run lint`
- `npm run test:run`
- `npm run test:e2e`
- `npm run build`

## Core Routes

- `/`
- `/learn/map`
- `/learn/lesson/trial-01-move-character`
- `/learn/remedial/remedial-click-trigger`
- `/project/trial-03-scene-story/complete`
- `/parent/purchase`
- `/parent/overview`
- `/admin`
```

- [ ] **Step 4: Run the full verification suite**

Run:

```powershell
Set-Location apps/web
npm run lint
npm run test:run
npm run test:e2e
npm run build
```

Expected: lint, unit tests, E2E, and production build all PASS.

- [ ] **Step 5: Commit the launch verification layer**

```powershell
git add apps/web/tests/e2e apps/web/README.md
git commit -m "test: cover family launch flow end to end"
```

## Self-Review Notes

- **Spec coverage:** Tasks cover curriculum, self-paced lesson runtime, guest cloud snapshots, binding, one-time purchase, parent overview, lightweight admin, and Chinese-content release checks. The only deliberate assumption not stated in the spec is the payment provider, which this plan fixes to Stripe Checkout.
- **Placeholder scan:** No `TODO`, `TBD`, or “implement later” markers remain. The remaining implementation work is expressed as concrete files, tests, commands, and commits.
- **Type consistency:** The plan consistently uses `trial`/`course`, `hasLaunchPack`, `projectSnapshots`, `launchCoursePack`, and `resolveCourseAccess`.
