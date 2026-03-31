# Admin Curriculum Save And AI Draft Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the launch-curriculum admin workflow so admins can save drafts, publish or roll back single lessons, and generate text-only lesson drafts with AI for the existing 15 launch lessons.

**Architecture:** Introduce a Supabase-backed curriculum repository that owns draft, published, backup, and skeleton records. Learner pages switch from reading static `launchLessons` directly to server-fed published data with code-seed fallback, while admin-only API routes and pages sit on top of claim-based auth, validation, and an OpenAI-backed generation service that only writes draft copy fields.

**Tech Stack:** Next.js App Router, React, Supabase, Vitest, Playwright, server-side `fetch` to the OpenAI Responses API

---

## File Structure

- Modify: `apps/web/src/features/domain/types.ts`
  Add database-facing lesson payload types, admin status types, and curriculum skeleton types.
- Modify: `apps/web/src/lib/env.ts`
  Add `hasAiEnv()` and `hasServiceRoleEnv()` helpers so server code can branch cleanly.
- Create: `apps/web/src/features/admin/launch-curriculum-records.ts`
  Pure helpers for seed fallback, published merge, draft resolution, and AI text-only overwrite.
- Create: `apps/web/src/features/admin/launch-curriculum-records.test.ts`
  Unit tests for precedence, merge rules, and structure lock.
- Create: `apps/web/src/features/admin/launch-curriculum-repository.ts`
  Supabase adapter for drafts, publications, backups, and skeleton rows.
- Create: `apps/web/src/features/admin/admin-auth.ts`
  Shared admin-claim guard for pages and routes.
- Create: `apps/web/src/features/admin/admin-auth.test.ts`
  Tests for claim parsing and rejection paths.
- Modify: `apps/web/src/features/admin/validate-course-content.ts`
  Split draft-save validation from publish validation.
- Modify: `apps/web/src/features/admin/validate-course-content.test.ts`
  Cover required fields and mojibake blocking for publish mode.
- Create: `apps/web/src/features/admin/lesson-actions.ts`
  Save-draft, publish, rollback, and skeleton persistence orchestrators.
- Create: `apps/web/src/features/admin/lesson-actions.test.ts`
  Unit tests for publish backup creation, rollback behavior, and skeleton writes.
- Modify: `apps/web/src/features/curriculum/load-launch-curriculum.ts`
  Replace direct seed return with repository-backed loaders.
- Modify: `apps/web/src/features/curriculum/build-launch-map.ts`
  Accept injected lessons instead of importing `launchLessons` directly.
- Modify: `apps/web/src/features/curriculum/build-launch-map.test.ts`
  Cover injected lessons and unchanged trial/course counts.
- Create: `apps/web/src/app/learn/map/learn-map-client.tsx`
  Existing client logic moved behind a server wrapper.
- Modify: `apps/web/src/app/learn/map/page.tsx`
  Server wrapper that loads published lessons.
- Create: `apps/web/src/app/learn/lesson/[lessonId]/lesson-client.tsx`
  Existing interactive lesson logic moved behind a server wrapper.
- Modify: `apps/web/src/app/learn/lesson/[lessonId]/page.tsx`
  Server wrapper that loads one lesson from the repository-backed curriculum.
- Create: `apps/web/src/app/project/[projectId]/complete/project-complete-client.tsx`
  Client completion UI that receives server-loaded lesson metadata.
- Modify: `apps/web/src/app/project/[projectId]/complete/page.tsx`
  Server wrapper for published lesson metadata.
- Modify: `apps/web/src/app/learn/remedial/[remedialId]/page.tsx`
  Read remedials directly instead of via `buildLaunchMap()`.
- Create: `apps/web/src/app/admin/lessons/[lessonId]/page.tsx`
  Lesson editor route.
- Modify: `apps/web/src/app/admin/page.tsx`
  Course list page that reads admin view data.
- Create: `apps/web/src/features/admin/course-list.tsx`
  Lesson list UI with draft/published status.
- Create: `apps/web/src/features/admin/lesson-editor.tsx`
  Draft save, publish, rollback, and AI controls for one lesson.
- Create: `apps/web/src/features/admin/admin-api.ts`
  Browser-side fetch helpers for admin routes.
- Delete: `apps/web/src/features/admin/save-launch-curriculum.ts`
  Superseded by lesson-scoped admin API helpers.
- Delete: `apps/web/src/app/api/admin/publish/route.ts`
  Superseded by lesson-scoped routes.
- Create: `apps/web/src/app/api/admin/lessons/[lessonId]/route.ts`
  Read one admin lesson payload.
- Create: `apps/web/src/app/api/admin/lessons/[lessonId]/draft/route.ts`
  Save draft route.
- Create: `apps/web/src/app/api/admin/lessons/[lessonId]/publish/route.ts`
  Publish route.
- Create: `apps/web/src/app/api/admin/lessons/[lessonId]/rollback/route.ts`
  Rollback route.
- Create: `apps/web/src/features/admin/ai/openai-client.ts`
  Thin server wrapper around the OpenAI Responses API.
- Create: `apps/web/src/features/admin/ai/openai-client.test.ts`
  Tests for request shaping and failure handling with mocked `fetch`.
- Create: `apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.ts`
  Build the 15-lesson skeleton and persist it.
- Create: `apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.test.ts`
  Validate skeleton stage/difficulty progression.
- Create: `apps/web/src/features/admin/ai/generate-launch-lesson-draft.ts`
  Generate one lesson draft and apply copy-only updates.
- Create: `apps/web/src/features/admin/ai/generate-launch-lesson-draft.test.ts`
  Validate copy-only overwrite and context packaging.
- Create: `apps/web/src/app/api/admin/ai/curriculum-skeleton/route.ts`
  Trigger skeleton generation.
- Create: `apps/web/src/app/api/admin/ai/lessons/[lessonId]/generate-draft/route.ts`
  Trigger per-lesson draft generation.
- Create: `apps/web/tests/e2e/admin-curriculum-save.spec.ts`
  Draft save, publish, rollback browser path.
- Create: `apps/web/tests/e2e/admin-ai-draft.spec.ts`
  AI draft generation browser wiring with mocked API responses.
- Modify: `apps/web/README.md`
  Add admin claim, migration, and AI env instructions.
- Create: `apps/web/supabase/migrations/20260331_003_admin_curriculum_and_ai.sql`
  Publication, backup, skeleton, and lesson-config metadata columns.

### Task 1: Add Curriculum Record Types And Pure Merge Helpers

**Files:**
- Modify: `apps/web/src/features/domain/types.ts`
- Create: `apps/web/src/features/admin/launch-curriculum-records.ts`
- Test: `apps/web/src/features/admin/launch-curriculum-records.test.ts`

- [ ] **Step 1: Write the failing record-helper tests**

```ts
import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'
import {
  applyGeneratedLessonCopy,
  mergePublishedLessons,
  resolveAdminLessonRecord,
} from './launch-curriculum-records'

describe('resolveAdminLessonRecord', () => {
  it('prefers draft over publication over seed', () => {
    const seed = launchLessons[0]
    const record = resolveAdminLessonRecord({
      lessonId: seed.id,
      seedLessons: [seed],
      draftRows: [{ id: seed.id, title: '草稿标题', goal: seed.goal, payload: { ...seed } }],
      publicationRows: [{ lesson_id: seed.id, title: '线上标题', goal: seed.goal, payload: { ...seed } }],
    })

    expect(record.title).toBe('草稿标题')
  })
})

describe('applyGeneratedLessonCopy', () => {
  it('only replaces copy fields and preserves block structure', () => {
    const seed = launchLessons[0]
    const next = applyGeneratedLessonCopy(seed, {
      title: '新标题',
      goal: '新目标',
      steps: seed.steps.map((step) => ({
        id: step.id,
        title: `${step.title}-新`,
        instruction: `${step.instruction}-新`,
      })),
      hintLayers: seed.hintLayers.map((layer) => ({
        id: layer.id,
        copy: `${layer.copy}-新`,
      })),
      parentAdvice: '家长先让孩子自己试一次，再听提示。',
    })

    expect(next.steps[0]?.allowedBlocks).toEqual(seed.steps[0]?.allowedBlocks)
    expect(next.hintLayers[0]?.mode).toBe(seed.hintLayers[0]?.mode)
  })
})
```

- [ ] **Step 2: Run the tests to verify the helpers do not exist yet**

Run: `cd apps/web; npm run test:run -- src/features/admin/launch-curriculum-records.test.ts`

Expected: FAIL with `Cannot find module './launch-curriculum-records'`.

- [ ] **Step 3: Add the admin-facing curriculum types**

```ts
export type LaunchLessonDefinition = LessonDefinition & {
  phase: LessonPhase
  mode: LessonMode
  sortOrder: number
  hintLayers: HintLayer[]
  templateId?: string
  parentAdvice?: string
}

export type LaunchLessonPayload = {
  steps: LessonStep[]
  hintLayers: HintLayer[]
  templateId?: string
  parentAdvice?: string
}

export type LessonConfigRow = {
  id: string
  phase: LessonPhase
  mode: LessonMode
  sort_order: number
  title: string
  goal: string
  payload: LaunchLessonPayload
  updated_at?: string | null
  updated_by?: string | null
}

export type LessonPublicationRow = {
  lesson_id: string
  phase: LessonPhase
  mode: LessonMode
  sort_order: number
  title: string
  goal: string
  payload: LaunchLessonPayload
  published_at: string
  published_by: string | null
}

export type LessonPublicationBackupRow = {
  lesson_id: string
  title: string
  goal: string
  payload: LaunchLessonPayload
  source_published_at?: string | null
  backed_up_at?: string | null
  backed_up_by?: string | null
}

export type GeneratedLessonCopy = {
  title: string
  goal: string
  steps: Array<{ id: string; title: string; instruction: string }>
  hintLayers: Array<{ id: string; copy: string }>
  parentAdvice: string
}

export type ValidationIssue = {
  code: string
  lessonId: string
  value: string
}

export type EditableLessonPayload = Pick<
  LaunchLessonDefinition,
  'id' | 'phase' | 'mode' | 'sortOrder' | 'title' | 'goal' | 'steps' | 'hintLayers' | 'templateId'
> & {
  parentAdvice?: string
}

export type AdminLessonSummary = {
  id: string
  title: string
  phase: LessonPhase
  draftUpdatedAt?: string | null
  publishedAt?: string | null
  hasUnpublishedChanges: boolean
}

export type LaunchCurriculumSkeleton = {
  lessonId: string
  stage: 'trial' | 'guided' | 'story' | 'template'
  lessonObjective: string
  newConcepts: string[]
  dependsOn: string[]
  childOutcome: string
  difficultyLevel: 1 | 2 | 3 | 4
}
```

- [ ] **Step 4: Implement the pure helper module**

```ts
export function resolveAdminLessonRecord(input: {
  lessonId: string
  seedLessons: LaunchLessonDefinition[]
  draftRows: LessonConfigRow[]
  publicationRows: LessonPublicationRow[]
}) {
  const seed = input.seedLessons.find((lesson) => lesson.id === input.lessonId)
  const draft = input.draftRows.find((row) => row.id === input.lessonId)
  const published = input.publicationRows.find(
    (row) => row.lesson_id === input.lessonId,
  )

  if (draft) return toLaunchLessonDefinition(draft)
  if (published) return toLaunchLessonDefinition(published)
  if (!seed) throw new Error(`Unknown lesson: ${input.lessonId}`)
  return seed
}

export function mergePublishedLessons(
  seedLessons: LaunchLessonDefinition[],
  publicationRows: LessonPublicationRow[],
) {
  return seedLessons.map((seed) => {
    const publication = publicationRows.find((row) => row.lesson_id === seed.id)
    return publication ? toLaunchLessonDefinition(publication) : seed
  })
}

export function applyGeneratedLessonCopy(
  current: LaunchLessonDefinition,
  generated: GeneratedLessonCopy,
) {
  return {
    ...current,
    title: generated.title,
    goal: generated.goal,
    steps: current.steps.map((step) => {
      const generatedStep = generated.steps.find((item) => item.id === step.id)
      return generatedStep
        ? { ...step, title: generatedStep.title, instruction: generatedStep.instruction }
        : step
    }),
    hintLayers: current.hintLayers.map((layer) => {
      const generatedLayer = generated.hintLayers.find((item) => item.id === layer.id)
      return generatedLayer ? { ...layer, copy: generatedLayer.copy } : layer
    }),
    parentAdvice: generated.parentAdvice,
  }
}
```

- [ ] **Step 5: Run the helper tests**

Run: `cd apps/web; npm run test:run -- src/features/admin/launch-curriculum-records.test.ts`

Expected: PASS with both tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/domain/types.ts apps/web/src/features/admin/launch-curriculum-records.ts apps/web/src/features/admin/launch-curriculum-records.test.ts
git commit -m "feat: add curriculum record helpers"
```

### Task 2: Add Schema And Repository Adapters

**Files:**
- Create: `apps/web/supabase/migrations/20260331_003_admin_curriculum_and_ai.sql`
- Create: `apps/web/src/features/admin/launch-curriculum-repository.ts`
- Test: `apps/web/src/features/admin/lesson-actions.test.ts`

- [ ] **Step 1: Write the failing repository-action tests**

```ts
import { describe, expect, it, vi } from 'vitest'

import { publishLaunchLesson } from './lesson-actions'

describe('publishLaunchLesson', () => {
  it('copies the current publication into backup before replacing it', async () => {
    const repository = {
      loadDraftLesson: vi.fn(),
      loadPublishedLesson: vi.fn(),
      upsertPublicationBackup: vi.fn(),
      upsertPublication: vi.fn(),
    }

    await publishLaunchLesson({
      lessonId: 'trial-01-move-character',
      repository,
      actorUserId: 'user-1',
    })

    expect(repository.upsertPublicationBackup).toHaveBeenCalledOnce()
    expect(repository.upsertPublication).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run the tests to verify the repository orchestration is missing**

Run: `cd apps/web; npm run test:run -- src/features/admin/lesson-actions.test.ts`

Expected: FAIL with `Cannot find module './lesson-actions'`.

- [ ] **Step 3: Add the Supabase migration**

```sql
alter table lesson_configs
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

create table if not exists lesson_publications (
  lesson_id text primary key,
  phase text not null,
  mode text not null,
  sort_order integer not null,
  title text not null,
  goal text not null,
  payload jsonb not null,
  published_at timestamptz not null default timezone('utc', now()),
  published_by uuid references auth.users(id) on delete set null
);

create table if not exists lesson_publication_backups (
  lesson_id text primary key,
  title text not null,
  goal text not null,
  payload jsonb not null,
  source_published_at timestamptz,
  backed_up_at timestamptz not null default timezone('utc', now()),
  backed_up_by uuid references auth.users(id) on delete set null
);

create table if not exists launch_curriculum_skeletons (
  lesson_id text primary key,
  stage text not null,
  lesson_objective text not null,
  new_concepts jsonb not null,
  depends_on jsonb not null,
  child_outcome text not null,
  difficulty_level integer not null,
  generated_at timestamptz not null default timezone('utc', now())
);
```

- [ ] **Step 4: Implement the repository adapter**

```ts
export function createLaunchCurriculumRepository(admin: ReturnType<typeof createAdminClient>) {
  return {
    async loadDraftLessons() {
      const { data, error } = await admin.from('lesson_configs').select('*').order('sort_order')
      if (error) throw error
      return (data ?? []) as LessonConfigRow[]
    },
    async loadDraftLesson(lessonId: string) {
      const { data, error } = await admin.from('lesson_configs').select('*').eq('id', lessonId).maybeSingle()
      if (error) throw error
      return (data ?? null) as LessonConfigRow | null
    },
    async loadPublishedLessons() {
      const { data, error } = await admin.from('lesson_publications').select('*').order('sort_order')
      if (error) throw error
      return (data ?? []) as LessonPublicationRow[]
    },
    async loadPublishedLesson(lessonId: string) {
      const { data, error } = await admin.from('lesson_publications').select('*').eq('lesson_id', lessonId).maybeSingle()
      if (error) throw error
      return (data ?? null) as LessonPublicationRow | null
    },
    async loadPublicationBackup(lessonId: string) {
      const { data, error } = await admin.from('lesson_publication_backups').select('*').eq('lesson_id', lessonId).maybeSingle()
      if (error) throw error
      return (data ?? null) as LessonPublicationBackupRow | null
    },
    async upsertDraftLesson(row: LessonConfigRow) {
      const { error } = await admin.from('lesson_configs').upsert(row, { onConflict: 'id' })
      if (error) throw error
    },
    async upsertPublication(row: LessonPublicationRow) {
      const { error } = await admin.from('lesson_publications').upsert(row, { onConflict: 'lesson_id' })
      if (error) throw error
    },
    async upsertPublicationBackup(row: LessonPublicationBackupRow) {
      const { error } = await admin.from('lesson_publication_backups').upsert(row, { onConflict: 'lesson_id' })
      if (error) throw error
    },
    async loadCurriculumSkeleton(lessonId: string) {
      const { data, error } = await admin.from('launch_curriculum_skeletons').select('*').eq('lesson_id', lessonId).maybeSingle()
      if (error) throw error
      if (!data) return null
      return {
        lessonId: data.lesson_id,
        stage: data.stage,
        lessonObjective: data.lesson_objective,
        newConcepts: data.new_concepts,
        dependsOn: data.depends_on,
        childOutcome: data.child_outcome,
        difficultyLevel: data.difficulty_level,
      } satisfies LaunchCurriculumSkeleton
    },
    async upsertCurriculumSkeleton(row: LaunchCurriculumSkeleton) {
      const { error } = await admin.from('launch_curriculum_skeletons').upsert({
        lesson_id: row.lessonId,
        stage: row.stage,
        lesson_objective: row.lessonObjective,
        new_concepts: row.newConcepts,
        depends_on: row.dependsOn,
        child_outcome: row.childOutcome,
        difficulty_level: row.difficultyLevel,
      }, { onConflict: 'lesson_id' })
      if (error) throw error
    },
    async loadAdminLesson(lessonId: string) {
      const draft = await this.loadDraftLesson(lessonId)
      if (draft) return toLaunchLessonDefinition(draft)

      const published = await this.loadPublishedLesson(lessonId)
      if (published) return toLaunchLessonDefinition(published)

      const seed = launchLessons.find((lesson) => lesson.id === lessonId)
      if (!seed) throw new Error(`Unknown lesson: ${lessonId}`)
      return seed
    },
  }
}
```

- [ ] **Step 5: Reset the local database and re-run the orchestration tests**

Run: `cd apps/web; npx supabase db reset; npm run test:run -- src/features/admin/lesson-actions.test.ts`

Expected: The reset finishes successfully and the repository-backed action tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/supabase/migrations/20260331_003_admin_curriculum_and_ai.sql apps/web/src/features/admin/launch-curriculum-repository.ts apps/web/src/features/admin/lesson-actions.test.ts
git commit -m "feat: add admin curriculum storage schema"
```

### Task 3: Add Admin Claim Guard And Publish Validation

**Files:**
- Create: `apps/web/src/features/admin/admin-auth.ts`
- Test: `apps/web/src/features/admin/admin-auth.test.ts`
- Modify: `apps/web/src/features/admin/validate-course-content.ts`
- Modify: `apps/web/src/features/admin/validate-course-content.test.ts`

- [ ] **Step 1: Write the failing auth and validation tests**

```ts
import { describe, expect, it } from 'vitest'

import { assertAdminUser } from './admin-auth'
import { validateCourseContent } from './validate-course-content'

describe('assertAdminUser', () => {
  it('accepts users whose app_metadata.role is admin', () => {
    expect(() =>
      assertAdminUser({
        id: 'user-1',
        app_metadata: { role: 'admin' },
      } as never),
    ).not.toThrow()
  })
})

describe('validateCourseContent', () => {
  it('blocks empty title during publish validation', () => {
    expect(
      validateCourseContent({
        mode: 'publish',
        lessonId: 'trial-01-move-character',
        title: '',
        goal: '目标',
        steps: [{ title: '步骤', instruction: '说明' }],
      }),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'title_required' })]))
  })
})
```

- [ ] **Step 2: Run the tests to verify the guard logic is absent**

Run: `cd apps/web; npm run test:run -- src/features/admin/admin-auth.test.ts src/features/admin/validate-course-content.test.ts`

Expected: FAIL with missing export errors and validation mismatch.

- [ ] **Step 3: Implement the shared admin guard**

```ts
import type { User } from '@supabase/supabase-js'

export function assertAdminUser(user: User | null | undefined) {
  if (!user) {
    throw new Error('admin-auth-required')
  }

  if (user.app_metadata?.role !== 'admin') {
    throw new Error('admin-role-required')
  }

  return user
}
```

- [ ] **Step 4: Expand validation into draft and publish modes**

```ts
export function validateCourseContent(input: {
  mode: 'draft' | 'publish'
  lessonId: string
  title: string
  goal: string
  steps: Array<{ title: string; instruction: string }>
}) {
  const issues: ValidationIssue[] = []

  if (input.mode === 'publish' && !input.title.trim()) {
    issues.push({ code: 'title_required', lessonId: input.lessonId, value: input.title })
  }

  if (input.mode === 'publish' && !input.goal.trim()) {
    issues.push({ code: 'goal_required', lessonId: input.lessonId, value: input.goal })
  }

  for (const step of input.steps) {
    if (input.mode === 'publish' && !step.title.trim()) {
      issues.push({ code: 'step_title_required', lessonId: input.lessonId, value: step.title })
    }
    if (input.mode === 'publish' && !step.instruction.trim()) {
      issues.push({ code: 'step_instruction_required', lessonId: input.lessonId, value: step.instruction })
    }
  }

  return [...issues, ...findEncodingIssues(input)]
}
```

- [ ] **Step 5: Run the targeted tests**

Run: `cd apps/web; npm run test:run -- src/features/admin/admin-auth.test.ts src/features/admin/validate-course-content.test.ts`

Expected: PASS with admin-claim and publish-validation coverage.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/admin/admin-auth.ts apps/web/src/features/admin/admin-auth.test.ts apps/web/src/features/admin/validate-course-content.ts apps/web/src/features/admin/validate-course-content.test.ts
git commit -m "feat: add admin claim guard and publish validation"
```

### Task 4: Implement Draft, Publish, And Rollback Services And Routes

**Files:**
- Create: `apps/web/src/features/admin/lesson-actions.ts`
- Create: `apps/web/src/app/api/admin/lessons/[lessonId]/route.ts`
- Create: `apps/web/src/app/api/admin/lessons/[lessonId]/draft/route.ts`
- Create: `apps/web/src/app/api/admin/lessons/[lessonId]/publish/route.ts`
- Create: `apps/web/src/app/api/admin/lessons/[lessonId]/rollback/route.ts`
- Delete: `apps/web/src/app/api/admin/publish/route.ts`

- [ ] **Step 1: Extend the failing service test to cover rollback**

```ts
it('restores the last backup without overwriting the current draft', async () => {
  const repository = {
    loadPublicationBackup: vi.fn().mockResolvedValue({
      lesson_id: 'trial-01-move-character',
      title: '上一版标题',
      goal: '上一版目标',
      payload: { steps: [], hintLayers: [] },
    }),
    upsertPublication: vi.fn(),
  }

  await rollbackLaunchLessonPublication({
    lessonId: 'trial-01-move-character',
    repository,
    actorUserId: 'user-1',
  })

  expect(repository.upsertPublication).toHaveBeenCalledWith(
    expect.objectContaining({ title: '上一版标题' }),
  )
})
```

- [ ] **Step 2: Run the service tests**

Run: `cd apps/web; npm run test:run -- src/features/admin/lesson-actions.test.ts`

Expected: FAIL with missing `publishLaunchLesson` and `rollbackLaunchLessonPublication`.

- [ ] **Step 3: Implement the lesson actions**

```ts
export async function saveLaunchLessonDraft(input: SaveLessonDraftInput) {
  const issues = validateCourseContent({
    mode: 'draft',
    lessonId: input.lesson.id,
    title: input.lesson.title,
    goal: input.lesson.goal,
    steps: input.lesson.steps.map((step) => ({
      title: step.title,
      instruction: step.instruction,
    })),
  })
  if (issues.some((issue) => issue.code === 'encoding_suspect')) {
    return { ok: false, issues }
  }

  await input.repository.upsertDraftLesson({
    id: input.lesson.id,
    phase: input.lesson.phase,
    mode: input.lesson.mode,
    sort_order: input.lesson.sortOrder,
    title: input.lesson.title,
    goal: input.lesson.goal,
    payload: {
      steps: input.lesson.steps,
      hintLayers: input.lesson.hintLayers,
      templateId: input.lesson.templateId,
      parentAdvice: input.lesson.parentAdvice,
    },
    updated_by: input.actorUserId,
    updated_at: new Date().toISOString(),
  })

  return { ok: true, issues: [] }
}

export async function publishLaunchLesson(input: PublishLessonInput) {
  const draft = await input.repository.loadDraftLesson(input.lessonId)
  if (!draft) throw new Error('draft-not-found')

  const issues = validateCourseContent({
    mode: 'publish',
    lessonId: draft.id,
    title: draft.title,
    goal: draft.goal,
    steps: draft.payload.steps.map((step) => ({
      title: step.title,
      instruction: step.instruction,
    })),
  })
  if (issues.length > 0) return { ok: false, issues }

  const current = await input.repository.loadPublishedLesson(input.lessonId)
  if (current) {
    await input.repository.upsertPublicationBackup({
      lesson_id: current.lesson_id,
      title: current.title,
      goal: current.goal,
      payload: current.payload,
      source_published_at: current.published_at,
      backed_up_at: new Date().toISOString(),
      backed_up_by: input.actorUserId,
    })
  }

  await input.repository.upsertPublication({
    lesson_id: draft.id,
    phase: draft.phase,
    mode: draft.mode,
    sort_order: draft.sort_order,
    title: draft.title,
    goal: draft.goal,
    payload: draft.payload,
    published_at: new Date().toISOString(),
    published_by: input.actorUserId,
  })
  return { ok: true, issues: [] }
}
```

- [ ] **Step 4: Add the lesson-scoped admin routes**

```ts
export async function POST(
  request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  const user = assertAdminUser(data.user)
  const repository = createLaunchCurriculumRepository(createAdminClient())
  const { lessonId } = await context.params

  const body = await request.json()
  return NextResponse.json(
    await saveLaunchLessonDraft({
      lessonId,
      actorUserId: user.id,
      lesson: body.lesson,
      repository,
    }),
  )
}
```

- [ ] **Step 5: Run targeted tests**

Run: `cd apps/web; npm run test:run -- src/features/admin/lesson-actions.test.ts src/features/admin/admin-auth.test.ts`

Expected: PASS with save/publish/rollback orchestration covered.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/admin/lesson-actions.ts apps/web/src/app/api/admin/lessons apps/web/src/features/admin/admin-auth.ts
git rm apps/web/src/app/api/admin/publish/route.ts
git commit -m "feat: add lesson-scoped admin publish workflow"
```

### Task 5: Move Learner Pages To Published-First Curriculum Loading

**Files:**
- Modify: `apps/web/src/features/curriculum/load-launch-curriculum.ts`
- Modify: `apps/web/src/features/curriculum/build-launch-map.ts`
- Modify: `apps/web/src/features/curriculum/build-launch-map.test.ts`
- Create: `apps/web/src/app/learn/map/learn-map-client.tsx`
- Modify: `apps/web/src/app/learn/map/page.tsx`
- Create: `apps/web/src/app/learn/lesson/[lessonId]/lesson-client.tsx`
- Modify: `apps/web/src/app/learn/lesson/[lessonId]/page.tsx`
- Create: `apps/web/src/app/project/[projectId]/complete/project-complete-client.tsx`
- Modify: `apps/web/src/app/project/[projectId]/complete/page.tsx`
- Modify: `apps/web/src/app/learn/remedial/[remedialId]/page.tsx`

- [ ] **Step 1: Write the failing curriculum-loader tests**

```ts
import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'
import { buildLaunchMap } from './build-launch-map'

describe('buildLaunchMap', () => {
  it('uses injected lessons so published titles flow through the learner pages', () => {
    const map = buildLaunchMap({
      lessons: [{ ...launchLessons[0], title: '数据库标题' }, ...launchLessons.slice(1)],
    })

    expect(map.allLessons[0]?.title).toBe('数据库标题')
  })
})
```

- [ ] **Step 2: Run the curriculum tests**

Run: `cd apps/web; npm run test:run -- src/features/curriculum/build-launch-map.test.ts`

Expected: FAIL because `buildLaunchMap` still takes no arguments.

- [ ] **Step 3: Implement repository-backed load helpers**

```ts
export async function loadLaunchCurriculumForLearner() {
  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return { lessons: launchLessons, remedials: remedialLessons, templates: launchTemplates }
  }

  const repository = createLaunchCurriculumRepository(createAdminClient())
  const publications = await repository.loadPublishedLessons()

  return {
    lessons: mergePublishedLessons(launchLessons, publications),
    remedials: remedialLessons,
    templates: launchTemplates,
  }
}

export function buildLaunchMap(input: {
  lessons: LaunchLessonDefinition[]
  remedials?: RemedialLessonDefinition[]
}) {
  const allLessons = [...input.lessons].sort((left, right) => left.sortOrder - right.sortOrder)
  return {
    allLessons,
    trialLessons: allLessons.filter((item) => item.phase === 'trial'),
    paidLessons: allLessons.filter((item) => item.phase === 'course'),
    remedials: input.remedials ?? remedialLessons,
  }
}
```

- [ ] **Step 4: Split server wrappers from client components**

```tsx
export default async function LearnMapPage() {
  const curriculum = await loadLaunchCurriculumForLearner()
  return <LearnMapClient lessons={curriculum.lessons} />
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>
}) {
  const { lessonId } = await params
  const curriculum = await loadLaunchCurriculumForLearner()
  const lesson = curriculum.lessons.find((item) => item.id === lessonId)
  return <LessonClient lesson={lesson} allLessons={curriculum.lessons} templates={curriculum.templates} />
}
```

- [ ] **Step 5: Run the learner tests and a production build**

Run: `cd apps/web; npm run test:run -- src/features/curriculum/build-launch-map.test.ts src/features/lessons/guided-lesson-shell.test.tsx; npm run build`

Expected: Unit tests pass and the build succeeds with the new server/client split.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/curriculum/load-launch-curriculum.ts apps/web/src/features/curriculum/build-launch-map.ts apps/web/src/app/learn apps/web/src/app/project/[projectId]/complete apps/web/src/app/learn/remedial/[remedialId]/page.tsx
git commit -m "feat: load learner curriculum from publications"
```

### Task 6: Build The Admin List And Lesson Editor UI

**Files:**
- Modify: `apps/web/src/app/admin/page.tsx`
- Create: `apps/web/src/app/admin/lessons/[lessonId]/page.tsx`
- Create: `apps/web/src/features/admin/course-list.tsx`
- Create: `apps/web/src/features/admin/lesson-editor.tsx`
- Create: `apps/web/src/features/admin/admin-api.ts`
- Test: `apps/web/src/features/admin/lesson-editor.test.tsx`

- [ ] **Step 1: Write the failing editor component tests**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LessonEditor } from './lesson-editor'

describe('LessonEditor', () => {
  it('saves the whole lesson draft and shows the returned status', async () => {
    const saveDraft = vi.fn().mockResolvedValue({ ok: true, issues: [] })
    const lesson = {
      id: 'trial-01-move-character',
      title: '让角色动起来',
      goal: '角色从左边走到右边',
      steps: [{ id: 'step-1', title: '放入开始积木', instruction: '先放开始积木' }],
      hintLayers: [{ id: 'repeat-goal', mode: 'repeat_goal', copy: '先完成这一步' }],
      phase: 'trial',
      mode: 'guided',
      sortOrder: 1,
    } satisfies EditableLessonPayload

    render(<LessonEditor lesson={lesson} onSaveDraft={saveDraft} onPublish={vi.fn()} onRollback={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('课程标题'), { target: { value: '新的课程标题' } })
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }))

    await waitFor(() => expect(saveDraft).toHaveBeenCalled())
  })
})
```

- [ ] **Step 2: Run the component tests**

Run: `cd apps/web; npm run test:run -- src/features/admin/lesson-editor.test.tsx`

Expected: FAIL because `LessonEditor` does not exist.

- [ ] **Step 3: Create the browser admin API helpers**

```ts
export async function saveLessonDraft(lessonId: string, lesson: EditableLessonPayload) {
  const response = await fetch(`/api/admin/lessons/${lessonId}/draft`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lesson }),
  })

  return response.json() as Promise<{ ok: boolean; issues: ValidationIssue[] }>
}
```

- [ ] **Step 4: Implement the list and editor UI**

```tsx
type LessonEditorProps = {
  lesson: EditableLessonPayload
  onSaveDraft: () => Promise<void> | void
  onPublish: () => Promise<void> | void
  onRollback: () => Promise<void> | void
}

export function CourseList({ lessons }: { lessons: AdminLessonSummary[] }) {
  return (
    <div className="grid gap-4">
      {lessons.map((lesson) => (
        <Link key={lesson.id} href={`/admin/lessons/${lesson.id}`} className="rounded-[1.5rem] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">{lesson.id}</p>
          <h2 className="text-2xl font-black text-slate-950">{lesson.title}</h2>
          <p className="mt-2 text-sm text-slate-600">{lesson.hasUnpublishedChanges ? '有未发布改动' : '草稿与线上一致'}</p>
        </Link>
      ))}
    </div>
  )
}

export function LessonEditor(props: LessonEditorProps) {
  return (
    <form className="space-y-6">
      <label className="grid gap-2">
        <span className="text-sm font-bold text-slate-700">课程标题</span>
        <input defaultValue={props.lesson.title} name="title" />
      </label>
      <button type="button" onClick={props.onSaveDraft}>保存草稿</button>
      <button type="button" onClick={props.onPublish}>发布本课</button>
      <button type="button" onClick={props.onRollback}>回退上一发布版</button>
    </form>
  )
}
```

- [ ] **Step 5: Run the component tests**

Run: `cd apps/web; npm run test:run -- src/features/admin/lesson-editor.test.tsx`

Expected: PASS with save-draft interaction covered.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/admin apps/web/src/features/admin/course-list.tsx apps/web/src/features/admin/lesson-editor.tsx apps/web/src/features/admin/admin-api.ts apps/web/src/features/admin/lesson-editor.test.tsx
git commit -m "feat: add admin lesson list and editor"
```

### Task 7: Add The OpenAI Client And Curriculum Skeleton Services

**Files:**
- Modify: `apps/web/src/lib/env.ts`
- Create: `apps/web/src/features/admin/ai/openai-client.ts`
- Create: `apps/web/src/features/admin/ai/openai-client.test.ts`
- Create: `apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.ts`
- Create: `apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.test.ts`

- [ ] **Step 1: Write the failing AI service tests**

```ts
import { describe, expect, it, vi } from 'vitest'

import { generateLaunchCurriculumSkeleton } from './generate-launch-curriculum-skeleton'

describe('generateLaunchCurriculumSkeleton', () => {
  it('returns 15 lessons and keeps trial/template stage boundaries intact', async () => {
    const fixtureSkeletonResponse = launchLessons.map((lesson, index) => ({
      lessonId: lesson.id,
      stage: index < 3 ? 'trial' : index >= 12 ? 'template' : index < 8 ? 'guided' : 'story',
      lessonObjective: `${lesson.title}的教学目标`,
      newConcepts: [lesson.goal],
      dependsOn: index === 0 ? [] : [launchLessons[index - 1].id],
      childOutcome: `${lesson.title}完成后可达成的结果`,
      difficultyLevel: index < 3 ? 1 : index >= 12 ? 4 : index < 8 ? 2 : 3,
    }))

    const result = await generateLaunchCurriculumSkeleton({
      lessons: launchLessons,
      callModel,
    })

    expect(result).toHaveLength(15)
    expect(result[0]?.stage).toBe('trial')
    expect(result[14]?.stage).toBe('template')
  })
})
```

- [ ] **Step 2: Run the AI service tests**

Run: `cd apps/web; npm run test:run -- src/features/admin/ai/generate-launch-curriculum-skeleton.test.ts`

Expected: FAIL because the AI service files do not exist.

- [ ] **Step 3: Add AI env helpers and the OpenAI client**

```ts
export function hasAiEnv() {
  return Boolean(process.env.OPENAI_API_KEY)
}

export async function callOpenAiJson<T>(input: {
  model: string
  prompt: string
  parse: (raw: unknown) => T
}) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getRequiredEnv('OPENAI_API_KEY')}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      input: input.prompt,
    }),
  })

  if (!response.ok) throw new Error(`openai-request-failed:${response.status}`)
  const payload = await response.json()
  return input.parse(payload)
}
```

- [ ] **Step 4: Implement skeleton generation with hard progression checks**

```ts
function buildSkeletonPrompt(lessons: LaunchLessonDefinition[]) {
  return [
    '为 15 节首发主线课生成课程骨架。',
    '必须保持第 1-3 节为试听，第 13-15 节为模板创作。',
    JSON.stringify(lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, goal: lesson.goal }))),
  ].join('\n')
}

function extractSkeleton(raw: unknown) {
  return raw as LaunchCurriculumSkeleton[]
}

export async function generateLaunchCurriculumSkeleton(input: {
  lessons: LaunchLessonDefinition[]
  callModel?: typeof callOpenAiJson<LaunchCurriculumSkeleton[]>
}) {
  const callModel =
    input.callModel ??
    ((prompt: string) =>
      callOpenAiJson({
        model: process.env.OPENAI_MODEL ?? 'gpt-5-mini',
        prompt,
        parse: extractSkeleton,
      }))

  const skeleton = await callModel(buildSkeletonPrompt(input.lessons))

  if (skeleton.length !== 15) throw new Error('skeleton-length-invalid')
  if (skeleton.slice(0, 3).some((item) => item.stage !== 'trial')) {
    throw new Error('skeleton-trial-boundary-invalid')
  }
  if (skeleton.slice(12).some((item) => item.stage !== 'template')) {
    throw new Error('skeleton-template-boundary-invalid')
  }

  return skeleton
}
```

- [ ] **Step 5: Run the AI tests**

Run: `cd apps/web; npm run test:run -- src/features/admin/ai/openai-client.test.ts src/features/admin/ai/generate-launch-curriculum-skeleton.test.ts`

Expected: PASS with request-shape and skeleton-boundary coverage.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/env.ts apps/web/src/features/admin/ai/openai-client.ts apps/web/src/features/admin/ai/openai-client.test.ts apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.ts apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.test.ts
git commit -m "feat: add ai skeleton generation service"
```

### Task 8: Add Per-Lesson AI Draft Generation And Admin Integration

**Files:**
- Create: `apps/web/src/features/admin/ai/generate-launch-lesson-draft.ts`
- Create: `apps/web/src/features/admin/ai/generate-launch-lesson-draft.test.ts`
- Create: `apps/web/src/app/api/admin/ai/curriculum-skeleton/route.ts`
- Create: `apps/web/src/app/api/admin/ai/lessons/[lessonId]/generate-draft/route.ts`
- Modify: `apps/web/src/features/admin/lesson-editor.tsx`
- Modify: `apps/web/src/features/admin/admin-api.ts`

- [ ] **Step 1: Write the failing per-lesson AI tests**

```ts
import { describe, expect, it, vi } from 'vitest'

import { generateLaunchLessonDraft } from './generate-launch-lesson-draft'

describe('generateLaunchLessonDraft', () => {
  it('keeps allowedBlocks and requiredBlockTypes unchanged after AI generation', async () => {
    const lesson = launchLessons[0]
    const skeleton = {
      lessonId: lesson.id,
      stage: 'trial',
      lessonObjective: lesson.goal,
      newConcepts: [lesson.goal],
      dependsOn: [],
      childOutcome: '完成第一个小作品',
      difficultyLevel: 1,
    } satisfies LaunchCurriculumSkeleton
    const callModel = vi.fn().mockResolvedValue({
      title: 'AI 标题',
      goal: 'AI 目标',
      steps: lesson.steps.map((step) => ({
        id: step.id,
        title: `AI-${step.title}`,
        instruction: `AI-${step.instruction}`,
      })),
      hintLayers: lesson.hintLayers.map((layer) => ({ id: layer.id, copy: `AI-${layer.copy}` })),
      parentAdvice: '先让孩子自己点一次，再听语音提示。',
    })

    const result = await generateLaunchLessonDraft({
      lesson,
      skeleton,
      callModel,
    })

    expect(result.steps[0]?.allowedBlocks).toEqual(lesson.steps[0]?.allowedBlocks)
  })
})
```

- [ ] **Step 2: Run the tests**

Run: `cd apps/web; npm run test:run -- src/features/admin/ai/generate-launch-lesson-draft.test.ts`

Expected: FAIL with missing file/export errors.

- [ ] **Step 3: Implement per-lesson generation and routes**

```ts
function buildLessonDraftPrompt(input: {
  lesson: LaunchLessonDefinition
  skeleton: LaunchCurriculumSkeleton
  previousSkeleton?: LaunchCurriculumSkeleton
  nextSkeleton?: LaunchCurriculumSkeleton
}) {
  return [
    `课节: ${input.lesson.id}`,
    `目标: ${input.skeleton.lessonObjective}`,
    `新增知识点: ${input.skeleton.newConcepts.join(', ')}`,
    `依赖: ${input.skeleton.dependsOn.join(', ')}`,
  ].join('\n')
}

function extractGeneratedLessonCopy(raw: unknown) {
  return raw as GeneratedLessonCopy
}

export async function generateLaunchLessonDraft(input: {
  lesson: LaunchLessonDefinition
  skeleton: LaunchCurriculumSkeleton
  previousSkeleton?: LaunchCurriculumSkeleton
  nextSkeleton?: LaunchCurriculumSkeleton
  callModel?: typeof callOpenAiJson<GeneratedLessonCopy>
}) {
  const callModel =
    input.callModel ??
    ((prompt: string) =>
      callOpenAiJson({
        model: process.env.OPENAI_MODEL ?? 'gpt-5-mini',
        prompt,
        parse: extractGeneratedLessonCopy,
      }))

  const generated = await callModel(buildLessonDraftPrompt(input))

  return applyGeneratedLessonCopy(input.lesson, generated)
}
```

```ts
export async function POST(
  _: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  const user = assertAdminUser(data.user)
  const repository = createLaunchCurriculumRepository(createAdminClient())
  const { lessonId } = await context.params
  const lesson = await repository.loadAdminLesson(lessonId)
  const skeleton = await repository.loadCurriculumSkeleton(lessonId)
  const draft = await generateLaunchLessonDraft({
    lesson,
    skeleton,
  })
  await saveLaunchLessonDraft({ lessonId, actorUserId: user.id, lesson: draft, repository })

  return NextResponse.json({ ok: true, lesson: draft })
}
```

- [ ] **Step 4: Add the admin UI entry points**

```tsx
<button type="button" onClick={props.onGenerateSkeleton}>
  生成整套课程骨架
</button>
<button type="button" onClick={props.onGenerateDraft}>
  生成本课草稿
</button>
<p className="text-sm text-slate-600">
  AI 只会覆盖标题、目标、步骤说明、提示文案和家长建议。
</p>
```

- [ ] **Step 5: Run the targeted tests**

Run: `cd apps/web; npm run test:run -- src/features/admin/ai/generate-launch-lesson-draft.test.ts src/features/admin/lesson-editor.test.tsx`

Expected: PASS with AI overwrite limits and editor wiring covered.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/admin/ai/generate-launch-lesson-draft.ts apps/web/src/features/admin/ai/generate-launch-lesson-draft.test.ts apps/web/src/app/api/admin/ai apps/web/src/features/admin/lesson-editor.tsx apps/web/src/features/admin/admin-api.ts
git commit -m "feat: add ai lesson draft generation"
```

### Task 9: Cover Browser Flows, Update Docs, And Run Full Verification

**Files:**
- Create: `apps/web/tests/e2e/admin-curriculum-save.spec.ts`
- Create: `apps/web/tests/e2e/admin-ai-draft.spec.ts`
- Modify: `apps/web/README.md`

- [ ] **Step 1: Add the save/publish/rollback E2E spec**

```ts
import { expect, test } from '@playwright/test'

test('admin can save a draft, publish it, and roll it back', async ({ page }) => {
  await page.goto('/admin')
  await page.getByRole('link', { name: 'trial-01-move-character' }).click()
  await page.getByLabel('课程标题').fill('E2E 标题')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await page.getByRole('button', { name: '发布本课' }).click()
  await expect(page.getByText('发布成功')).toBeVisible()
  await page.getByRole('button', { name: '回退上一发布版' }).click()
  await expect(page.getByText('已回退到上一发布版')).toBeVisible()
})
```

- [ ] **Step 2: Add the AI draft E2E spec with mocked API responses**

```ts
import { expect, test } from '@playwright/test'

test('admin can trigger AI draft generation from the lesson editor', async ({ page }) => {
  await page.route('**/api/admin/ai/curriculum-skeleton', async (route) => {
    await route.fulfill({ json: { ok: true } })
  })
  await page.route('**/api/admin/ai/lessons/**/generate-draft', async (route) => {
    await route.fulfill({
      json: { ok: true, lesson: { title: 'AI 新标题' } },
    })
  })

  await page.goto('/admin/lessons/trial-01-move-character')
  await page.getByRole('button', { name: '生成整套课程骨架' }).click()
  await page.getByRole('button', { name: '生成本课草稿' }).click()
  await expect(page.getByDisplayValue('AI 新标题')).toBeVisible()
})
```

- [ ] **Step 3: Update the app README**

```md
## 后台课程发布与 AI 草稿

- 管理员账号要求：`app_metadata.role = "admin"`
- 新增环境变量：
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
- 发布前先运行：`npx supabase db reset`
- AI 生成只写草稿，不会直接发布到孩子端
```

- [ ] **Step 4: Run the full verification suite**

Run:

```bash
cd apps/web
npm run lint
npm run test:run
npm run test:e2e -- tests/e2e/admin-curriculum-save.spec.ts tests/e2e/admin-ai-draft.spec.ts tests/e2e/guest-story.spec.ts
npm run build
```

Expected: All commands pass on the final branch with no TypeScript, lint, unit, E2E, or build failures.

- [ ] **Step 5: Commit**

```bash
git add apps/web/tests/e2e/admin-curriculum-save.spec.ts apps/web/tests/e2e/admin-ai-draft.spec.ts apps/web/README.md
git commit -m "test: cover admin curriculum workflows"
```

## Spec Coverage Check

- `2026-03-31-admin-curriculum-save-design.md`
  Covered by Tasks 1-6 and Task 9.
- `2026-03-31-ai-curriculum-draft-generation-design.md`
  Covered by Tasks 1, 7, 8, and Task 9.
- Learner-side published-first read path
  Covered by Task 5.
- Admin claim enforcement
  Covered by Tasks 3 and 4.
- Chinese/encoding publish gate
  Covered by Task 3 and re-verified in Task 9.

## Placeholder Scan

- No placeholder markers or deferred “implement later” notes remain in this plan.
- Every task names concrete files, commands, and target tests.
- The plan intentionally keeps audio assets, remedials, and card editing out of scope to match the approved specs.
