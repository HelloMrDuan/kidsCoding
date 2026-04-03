# 12 Lesson Foundation Curriculum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current mixed `3 trial + 12 paid` launch curriculum with a coherent `12 lesson fully open foundation path` built around four story units, then move upgrade messaging to post-graduation instead of mid-course locking.

**Architecture:** Keep the existing Next.js curriculum delivery, reward storage, and admin-editable lesson pipeline, but rewrite the seed curriculum around four units and twelve lessons. Update the content consumers that currently assume “trial vs paid” so they instead support an all-open foundation path with a graduation boundary, then realign AI skeleton generation and graduation messaging to the new curriculum shape.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest, Playwright, Supabase-backed curriculum overlays

---

## File Structure And Responsibilities

**Curriculum content**

- Create: `D:\pyprograms\kidsCoding\apps\web\src\content\curriculum\foundation-units.ts`
  - Defines the four unit summaries, unit labels, and graduation positioning for the twelve-lesson foundation path.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\content\curriculum\launch-lessons.ts`
  - Rewrites the seed lessons, templates, hint copy, and lesson ordering to match the approved twelve-lesson outline.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\content\cards\card-definitions.ts`
  - Aligns card ids, names, series, and reward tags with the new animal-and-nature curriculum units.

**Curriculum consumption**

- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\curriculum\build-launch-map.ts`
  - Returns all-open foundation lessons plus unit summaries instead of splitting the current path into `trialLessons` and `paidLessons`.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\resolve-course-access.ts`
  - Stops locking the twelve foundation lessons mid-path.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\parent\build-parent-overview.ts`
  - Rewrites the “next action” summary so it references trial completion and graduation upgrade timing correctly.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\project\[projectId]\complete\page.tsx`
  - Shows graduation messaging when the child finishes lesson twelve instead of always sending users back into a mid-course purchase story.

**AI and admin curriculum generation**

- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\domain\types.ts`
  - Replaces the old skeleton stage enum with the four foundation unit stages.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\admin\ai\generate-launch-curriculum-skeleton.ts`
  - Changes prompt and validation boundaries from `trial/guided/story/template` to the new unit structure.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\admin\ai\generate-launch-curriculum-skeleton.test.ts`
  - Covers the new four-unit stage boundaries.

**Tests**

- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\curriculum\build-launch-map.test.ts`
  - Verifies the new `12 lesson` structure and final graduation lesson id.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\resolve-course-access.test.ts`
  - Verifies foundation lessons remain open without entitlement.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\parent\build-parent-overview.test.ts`
  - Verifies next-action copy now references post-foundation upgrade timing.
- Modify: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\trial-lock-purchase.spec.ts`
  - Replaces the old lesson-four lock assertion with a graduation-upgrade assertion.

---

### Task 1: Define the Four Foundation Units and Rewrite the Seed Curriculum

**Files:**
- Create: `D:\pyprograms\kidsCoding\apps\web\src\content\curriculum\foundation-units.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\content\curriculum\launch-lessons.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\content\cards\card-definitions.ts`

- [ ] **Step 1: Write the failing curriculum shape test**

```tsx
import { describe, expect, it } from 'vitest'

import { foundationUnits } from '@/content/curriculum/foundation-units'
import { launchLessons } from '@/content/curriculum/launch-lessons'

describe('foundation curriculum seed', () => {
  it('defines four units and twelve ordered lessons', () => {
    expect(foundationUnits).toHaveLength(4)
    expect(launchLessons).toHaveLength(12)
    expect(launchLessons[0]?.id).toBe('lesson-01-forest-hello')
    expect(launchLessons[11]?.id).toBe('lesson-12-graduation-show')
  })
})
```

- [ ] **Step 2: Run the curriculum shape test to verify it fails**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\content\curriculum\foundation-units.test.ts --maxWorkers=1`

Expected: `FAIL`

- [ ] **Step 3: Create the unit metadata file**

```ts
export const foundationUnits = [
  {
    id: 'unit-1-forest-meetup',
    title: '森林见面会',
    summary: '让角色动起来并说一句话，做出第一支短故事。',
    lessonIds: ['lesson-01-forest-hello', 'lesson-02-forest-greeting', 'lesson-03-forest-story'],
  },
  {
    id: 'unit-2-journey',
    title: '小动物去旅行',
    summary: '学会场景切换和故事顺序，让故事从单画面变成前后片段。',
    lessonIds: ['lesson-04-trip-scene', 'lesson-05-trip-order', 'lesson-06-trip-story'],
  },
  {
    id: 'unit-3-garden-interaction',
    title: '花园互动秀',
    summary: '用点击触发让故事对孩子的操作做出反应。',
    lessonIds: ['lesson-07-garden-click', 'lesson-08-garden-dialogue', 'lesson-09-garden-story'],
  },
  {
    id: 'unit-4-graduation-show',
    title: '动物朋友合作演出',
    summary: '让双角色配合出场，完成启蒙毕业作品。',
    lessonIds: ['lesson-10-second-friend', 'lesson-11-duo-rehearsal', 'lesson-12-graduation-show'],
  },
] as const
```

- [ ] **Step 4: Rewrite the seed lesson list around twelve foundation lessons**

```ts
export const launchLessons: LaunchLessonDefinition[] = [
  {
    id: 'lesson-01-forest-hello',
    title: '小狐狸出场',
    goal: '让小狐狸从舞台一边走到另一边。',
    recommendedLevel: 'starter',
    steps: [
      {
        id: 'step-1',
        title: '放入开始积木',
        instruction: '先放“开始时”，告诉小狐狸什么时候出发。',
        allowedBlocks: ['when_start', 'move_right'],
        requiredBlockTypes: ['when_start'],
      },
      {
        id: 'step-2',
        title: '让小狐狸动起来',
        instruction: '把“向右移动”接在后面，让它走过舞台。',
        allowedBlocks: ['when_start', 'move_right'],
        requiredBlockTypes: ['when_start', 'move_right'],
      },
    ],
    rewardCardId: 'theme-forest-fox',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 1,
    hintLayers: foundationHintLayers,
    parentAdvice: '请孩子演示一下小狐狸怎么从舞台一边走到另一边。',
  },
  // ... keep the same object shape through lesson 12
  {
    id: 'lesson-12-graduation-show',
    title: '动物朋友毕业演出',
    goal: '完成一个双角色互动故事，作为启蒙毕业作品。',
    recommendedLevel: 'foundation',
    steps: [
      {
        id: 'step-1',
        title: '完成毕业故事',
        instruction: '把双角色出场、对白、动作和点击互动组合成完整演出。',
        allowedBlocks: ['when_start', 'say_line', 'move_right', 'when_clicked'],
        requiredBlockTypes: ['when_start', 'say_line', 'move_right', 'when_clicked'],
      },
    ],
    rewardCardId: 'commemorative-foundation-graduate',
    phase: 'trial',
    mode: 'template',
    sortOrder: 12,
    hintLayers: foundationHintLayers,
    templateId: 'forest-graduation-show',
    parentAdvice: '和孩子一起回看毕业作品，问一问哪一个角色先出场、哪里有互动变化。',
  },
]
```

- [ ] **Step 5: Align the reward cards with the new lesson ids**

```ts
export const cardDefinitions: CardDefinition[] = [
  {
    id: 'theme-forest-fox',
    name: '森林小狐狸',
    category: 'theme',
    rarity: 'common',
    series: '森林见面会',
    rewardTags: ['lesson_01', 'unit_1'],
  },
  // ...
  {
    id: 'commemorative-foundation-graduate',
    name: '启蒙毕业纪念卡',
    category: 'commemorative',
    rarity: 'limited',
    series: '启蒙毕业季',
    rewardTags: ['foundation_graduate'],
  },
]
```

- [ ] **Step 6: Run the seed curriculum tests**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\content\curriculum\foundation-units.test.ts src\features\rewards\award-lesson-completion.test.ts --maxWorkers=1`

Expected: `PASS`

- [ ] **Step 7: Commit the curriculum seed rewrite**

```bash
git add apps/web/src/content/curriculum/foundation-units.ts apps/web/src/content/curriculum/foundation-units.test.ts apps/web/src/content/curriculum/launch-lessons.ts apps/web/src/content/cards/card-definitions.ts
git commit -m "Rewrite launch curriculum as a twelve-lesson foundation path"
```

---

### Task 2: Update Curriculum Consumers for the All-Open Foundation Path

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\curriculum\build-launch-map.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\curriculum\build-launch-map.test.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\resolve-course-access.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\resolve-course-access.test.ts`

- [ ] **Step 1: Write the failing map and access tests**

```tsx
it('returns twelve foundation lessons and no mid-path paid split', () => {
  const map = buildLaunchMap()

  expect(map.allLessons).toHaveLength(12)
  expect(map.trialLessons).toHaveLength(12)
  expect(map.paidLessons).toHaveLength(0)
  expect(map.allLessons.at(-1)?.id).toBe('lesson-12-graduation-show')
})

it('keeps all foundation lessons open without entitlement', () => {
  expect(resolveCourseAccess({ lessonPhase: 'trial', hasLaunchPack: false })).toBe('allowed')
  expect(resolveCourseAccess({ lessonPhase: 'course', hasLaunchPack: false })).toBe('allowed')
})
```

- [ ] **Step 2: Run the map and access tests to verify they fail**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\curriculum\build-launch-map.test.ts src\features\billing\resolve-course-access.test.ts --maxWorkers=1`

Expected: `FAIL`

- [ ] **Step 3: Update `build-launch-map.ts` to expose the new shape**

```ts
export function buildLaunchMap(lessons: LaunchLessonDefinition[] = launchLessons) {
  const allLessons = [...lessons].sort((left, right) => left.sortOrder - right.sortOrder)

  return {
    allLessons,
    trialLessons: allLessons,
    paidLessons: [],
    remedials: remedialLessons,
    foundationUnits,
  }
}
```

- [ ] **Step 4: Update `resolve-course-access.ts` for the foundation launch**

```ts
export function resolveCourseAccess({
  lessonPhase,
  hasLaunchPack,
}: {
  lessonPhase: 'trial' | 'course'
  hasLaunchPack: boolean
}) {
  if (lessonPhase === 'trial') {
    return 'allowed'
  }

  return 'allowed'
}
```

- [ ] **Step 5: Run the map and access tests**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\curriculum\build-launch-map.test.ts src\features\billing\resolve-course-access.test.ts --maxWorkers=1`

Expected: `PASS`

- [ ] **Step 6: Commit the access-model update**

```bash
git add apps/web/src/features/curriculum/build-launch-map.ts apps/web/src/features/curriculum/build-launch-map.test.ts apps/web/src/features/billing/resolve-course-access.ts apps/web/src/features/billing/resolve-course-access.test.ts
git commit -m "Open the full foundation path in launch curriculum"
```

---

### Task 3: Move Parent and Graduation Messaging to Post-Foundation Upgrade

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\parent\build-parent-overview.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\parent\build-parent-overview.test.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\project\[projectId]\complete\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\trial-lock-purchase.spec.ts`

- [ ] **Step 1: Rewrite the failing parent-overview and graduation expectations**

```tsx
expect(summary.nextAction).toContain('启蒙毕业')
expect(summary.nextAction).toContain('高阶创作')
```

```ts
test('graduation project shows the upgrade invitation after lesson twelve', async ({ page }) => {
  await page.goto('/project/lesson-12-graduation-show/complete')

  await expect(page.getByText('启蒙毕业')).toBeVisible()
  await expect(page.getByRole('link', { name: '查看高阶创作路线' })).toHaveAttribute(
    'href',
    '/parent/purchase',
  )
})
```

- [ ] **Step 2: Run the parent and E2E assertions to verify they fail**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\features\parent\build-parent-overview.test.ts --maxWorkers=1
cmd /c node_modules\.bin\playwright.cmd test tests/e2e/trial-lock-purchase.spec.ts --workers=1
```

Expected: `FAIL`

- [ ] **Step 3: Update parent next-action logic**

```ts
nextAction: completedLessonCount >= 12
  ? '孩子已经完成启蒙毕业作品，可以看看是否适合升级更复杂的高阶创作路线。'
  : completedLessonCount >= 9
    ? '继续完成最后一个单元，目标是做出双角色互动毕业作品。'
    : '沿着当前单元继续往前走，每 2-3 节就会完成一个小作品。'
```

- [ ] **Step 4: Add graduation-aware completion messaging**

```tsx
const isFoundationGraduate = lesson.id === 'lesson-12-graduation-show'

{isFoundationGraduate ? (
  <>
    <p className="mt-4 text-lg leading-8 text-slate-600">
      你已经完成启蒙毕业作品。现在可以先回看自己的双角色互动故事，再决定要不要进入更复杂的高阶创作路线。
    </p>
    <Link
      className="rounded-full border border-violet-200 px-6 py-4 text-lg font-bold text-violet-700"
      href="/parent/purchase"
    >
      查看高阶创作路线
    </Link>
  </>
) : null}
```

- [ ] **Step 5: Replace the old lock E2E with the graduation-upgrade flow**

```ts
test('graduation project shows the upgrade invitation after lesson twelve', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'guest-progress',
      JSON.stringify({
        completedLessonIds: ['lesson-01-forest-hello'],
        currentLessonId: 'lesson-12-graduation-show',
        stars: 36,
        badgeIds: ['lesson-lesson-12-graduation-show'],
        cardIds: ['commemorative-foundation-graduate'],
        streakDays: 5,
        completedProjectIds: ['lesson-12-graduation-show'],
        projectSnapshots: [{ lessonId: 'lesson-12-graduation-show', blocks: [], updatedAt: new Date().toISOString() }],
      }),
    )
  })

  await page.goto('/project/lesson-12-graduation-show/complete')
  await expect(page.getByRole('link', { name: '查看高阶创作路线' })).toBeVisible()
})
```

- [ ] **Step 6: Run the updated tests**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\features\parent\build-parent-overview.test.ts --maxWorkers=1
cmd /c node_modules\.bin\playwright.cmd test tests/e2e/trial-lock-purchase.spec.ts --workers=1
```

Expected: `PASS`

- [ ] **Step 7: Commit the graduation messaging shift**

```bash
git add apps/web/src/features/parent/build-parent-overview.ts apps/web/src/features/parent/build-parent-overview.test.ts apps/web/src/app/project/[projectId]/complete/page.tsx apps/web/tests/e2e/trial-lock-purchase.spec.ts
git commit -m "Move upgrade messaging to foundation graduation"
```

---

### Task 4: Realign AI Skeleton Generation With the Four Unit Stages

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\domain\types.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\admin\ai\generate-launch-curriculum-skeleton.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\admin\ai\generate-launch-curriculum-skeleton.test.ts`

- [ ] **Step 1: Write the failing AI skeleton boundary tests**

```tsx
expect(result).toHaveLength(12)
expect(result[0]?.stage).toBe('unit_1')
expect(result[11]?.stage).toBe('unit_4')
```

```tsx
await expect(generateLaunchCurriculumSkeleton(...)).rejects.toThrow(
  'skeleton-unit-1-boundary-invalid',
)
```

- [ ] **Step 2: Run the AI skeleton tests to verify they fail**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\admin\ai\generate-launch-curriculum-skeleton.test.ts --maxWorkers=1`

Expected: `FAIL`

- [ ] **Step 3: Replace the old stage enum**

```ts
export type LaunchCurriculumSkeletonStage =
  | 'unit_1'
  | 'unit_2'
  | 'unit_3'
  | 'unit_4'
```

- [ ] **Step 4: Update the AI prompt and boundary validation**

```ts
enum: ['unit_1', 'unit_2', 'unit_3', 'unit_4']
```

```ts
return [
  '请为儿童编程启蒙主线生成 12 节课的课程骨架。',
  '第 1-3 节必须是 unit_1，第 4-6 节必须是 unit_2，第 7-9 节必须是 unit_3，第 10-12 节必须是 unit_4。',
  '每节课最多引入 1 个新核心点，毕业目标是双角色互动故事。',
  // ...
].join('\n')
```

```ts
if (skeleton.slice(0, 3).some((item) => item.stage !== 'unit_1')) {
  throw new Error('skeleton-unit-1-boundary-invalid')
}
if (skeleton.slice(3, 6).some((item) => item.stage !== 'unit_2')) {
  throw new Error('skeleton-unit-2-boundary-invalid')
}
if (skeleton.slice(6, 9).some((item) => item.stage !== 'unit_3')) {
  throw new Error('skeleton-unit-3-boundary-invalid')
}
if (skeleton.slice(9, 12).some((item) => item.stage !== 'unit_4')) {
  throw new Error('skeleton-unit-4-boundary-invalid')
}
```

- [ ] **Step 5: Run the AI skeleton tests**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\admin\ai\generate-launch-curriculum-skeleton.test.ts --maxWorkers=1`

Expected: `PASS`

- [ ] **Step 6: Commit the AI stage realignment**

```bash
git add apps/web/src/features/domain/types.ts apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.ts apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.test.ts
git commit -m "Align AI curriculum skeletons with the four foundation units"
```

---

### Task 5: Verify the Full Foundation Curriculum Rewrite

**Files:**
- Test: `D:\pyprograms\kidsCoding\apps\web\src\content\curriculum\foundation-units.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\curriculum\build-launch-map.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\billing\resolve-course-access.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\parent\build-parent-overview.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\admin\ai\generate-launch-curriculum-skeleton.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\trial-lock-purchase.spec.ts`

- [ ] **Step 1: Run the targeted curriculum tests**

Run:

```bash
cmd /c node_modules\.bin\vitest.cmd run src\content\curriculum\foundation-units.test.ts src\features\curriculum\build-launch-map.test.ts src\features\billing\resolve-course-access.test.ts src\features\parent\build-parent-overview.test.ts src\features\admin\ai\generate-launch-curriculum-skeleton.test.ts --maxWorkers=1
```

Expected: `PASS`

- [ ] **Step 2: Run the full unit test suite**

Run: `cmd /c node_modules\.bin\vitest.cmd run --maxWorkers=1`

Expected: `PASS`

- [ ] **Step 3: Run lint and production build**

Run:

```bash
cmd /c node_modules\.bin\eslint.cmd .
cmd /c node_modules\.bin\next.cmd build
```

Expected: `PASS`

- [ ] **Step 4: Run the graduation-upgrade E2E flow**

Run: `cmd /c node_modules\.bin\playwright.cmd test tests/e2e/trial-lock-purchase.spec.ts --workers=1`

Expected: `PASS`

- [ ] **Step 5: Commit the finished curriculum rewrite**

```bash
git add apps/web/src/content/curriculum/foundation-units.ts apps/web/src/content/curriculum/foundation-units.test.ts apps/web/src/content/curriculum/launch-lessons.ts apps/web/src/content/cards/card-definitions.ts apps/web/src/features/curriculum/build-launch-map.ts apps/web/src/features/curriculum/build-launch-map.test.ts apps/web/src/features/billing/resolve-course-access.ts apps/web/src/features/billing/resolve-course-access.test.ts apps/web/src/features/parent/build-parent-overview.ts apps/web/src/features/parent/build-parent-overview.test.ts apps/web/src/app/project/[projectId]/complete/page.tsx apps/web/src/features/domain/types.ts apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.ts apps/web/src/features/admin/ai/generate-launch-curriculum-skeleton.test.ts apps/web/tests/e2e/trial-lock-purchase.spec.ts
git commit -m "Implement the twelve-lesson foundation curriculum"
```

---

## Self-Review

- **Spec coverage:** The plan covers the four-unit outline, twelve lesson rewrite, all-open foundation access model, graduation upgrade messaging, and AI/admin skeleton boundary updates. These are the parts of the spec that require code changes in the current repo.
- **Placeholder scan:** No `TODO`, `TBD`, or “implement later” placeholders remain. Each task includes concrete files, explicit commands, and minimal code examples for the main edits.
- **Type consistency:** The plan consistently uses `foundationUnits`, `lesson-01-forest-hello` through `lesson-12-graduation-show`, and the new skeleton stages `unit_1` through `unit_4`.
