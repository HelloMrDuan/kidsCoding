# Foundation Lessons 01-03 Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn foundation lessons `01-03` into polished launch-ready lesson scripts with clearer step breakdowns, hint copy, lesson-page feedback, and first-project completion messaging.

**Architecture:** Keep the existing `launch-lessons.ts` curriculum seed and `GuidedLessonShell` lesson delivery flow, but enrich lessons `01-03` with explicit `4-5` step scripts, child-friendly hint progression, and stronger completion copy. Reuse the current lesson runtime instead of inventing a new authoring model so the first three lessons become the template for later lesson-script rollout.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest, Playwright

---

## File Structure And Responsibilities

**Lesson content**

- Modify: `D:\pyprograms\kidsCoding\apps\web\src\content\curriculum\launch-lessons.ts`
  - Expands lessons `01-03` from coarse two-step seeds into the approved `4-5` step lesson scripts, along with lesson-specific hint copy and parent advice.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\content\cards\card-definitions.ts`
  - Keeps first-project and first-three-lesson reward copy aligned with the new script wording if needed.

**Lesson runtime**

- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\learn\lesson\[lessonId]\page.tsx`
  - Adjusts lesson feedback and step progression so the richer first-three-lesson scripts render cleanly.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\guided-lesson-shell.tsx`
  - Improves “today’s goal”, hint, and success feedback presentation for the new polished lesson scripts.

**Completion and parent messaging**

- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\project\[projectId]\complete\page.tsx`
  - Strengthens the first-project completion copy for lesson `03`.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\parent\build-parent-overview.ts`
  - Keeps the “next action” and parent suggestions consistent with the richer first-three-lesson learning experience.

**Tests**

- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\complete-launch-lesson.test.ts`
  - Verifies first-three-lesson progression still advances correctly after script expansion.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\parent\build-parent-overview.test.ts`
  - Verifies first-project copy still matches the new lesson wording.
- Modify: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\guest-story.spec.ts`
  - Verifies the learner can still complete the early story flow and see the strengthened first-project messaging.

---

### Task 1: Rewrite Lessons 01-03 as Polished Lesson Scripts

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\content\curriculum\launch-lessons.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\content\cards\card-definitions.ts`

- [ ] **Step 1: Write the failing curriculum-script assertions**

```ts
import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'

describe('foundation lesson scripts 01-03', () => {
  it('expands the first three lessons into polished multi-step scripts', () => {
    const lessons = launchLessons.slice(0, 3)

    expect(lessons[0]?.steps).toHaveLength(5)
    expect(lessons[1]?.steps).toHaveLength(5)
    expect(lessons[2]?.steps).toHaveLength(5)
    expect(lessons[2]?.goal).toContain('完整小故事')
  })
})
```

- [ ] **Step 2: Run the curriculum-script test to verify it fails**

Run: `npm run test:run -- src/content/curriculum/foundation-units.test.ts --maxWorkers=1`

Expected: `FAIL` because lessons `01-03` still only contain coarse two-step scripts.

- [ ] **Step 3: Expand lesson 01 into the approved five-step script**

```ts
{
  id: 'lesson-01-forest-hello',
  title: '小狐狸出场',
  goal: '让小狐狸自己走上舞台，完成第一次出场。',
  recommendedLevel: 'starter',
  steps: [
    {
      id: 'step-1',
      title: '认识今天的主角',
      instruction: '先看一看今天的小狐狸，等会儿我们要让它自己走上舞台。',
      allowedBlocks: ['when_start'],
      requiredBlockTypes: ['when_start'],
    },
    {
      id: 'step-2',
      title: '认识开始积木',
      instruction: '先放“开始时”，告诉小狐狸什么时候开始行动。',
      allowedBlocks: ['when_start'],
      requiredBlockTypes: ['when_start'],
    },
    {
      id: 'step-3',
      title: '让舞台准备好',
      instruction: '确认“开始时”放在最前面，这样舞台就准备好了。',
      allowedBlocks: ['when_start'],
      requiredBlockTypes: ['when_start'],
    },
    {
      id: 'step-4',
      title: '接上移动积木',
      instruction: '把“向右移动”接在后面，让小狐狸自己走起来。',
      allowedBlocks: ['when_start', 'move_right'],
      requiredBlockTypes: ['when_start', 'move_right'],
    },
    {
      id: 'step-5',
      title: '回看第一次出场',
      instruction: '点一下运行，看看小狐狸是不是已经顺利走上舞台。',
      allowedBlocks: ['when_start', 'move_right'],
      requiredBlockTypes: ['when_start', 'move_right'],
    },
  ],
}
```

- [ ] **Step 4: Expand lesson 02 into the approved five-step script**

```ts
{
  id: 'lesson-02-forest-greeting',
  title: '小狐狸打招呼',
  goal: '让小狐狸开口说一句欢迎的话。',
  recommendedLevel: 'starter',
  steps: [
    {
      id: 'step-1',
      title: '回顾上节的小成果',
      instruction: '先看一眼小狐狸出场，等会儿我们要让它开口打招呼。',
      allowedBlocks: ['when_start'],
      requiredBlockTypes: ['when_start'],
    },
    {
      id: 'step-2',
      title: '认识说话积木',
      instruction: '这块“说一句话”积木可以让小狐狸开口说话。',
      allowedBlocks: ['when_start', 'say_line'],
      requiredBlockTypes: ['when_start'],
    },
    {
      id: 'step-3',
      title: '先让小狐狸准备出场',
      instruction: '先放好“开始时”，告诉小狐狸什么时候准备说话。',
      allowedBlocks: ['when_start', 'say_line'],
      requiredBlockTypes: ['when_start'],
    },
    {
      id: 'step-4',
      title: '接上说话积木',
      instruction: '把“说一句话”接在后面，让小狐狸打一个招呼。',
      allowedBlocks: ['when_start', 'say_line'],
      requiredBlockTypes: ['when_start', 'say_line'],
    },
    {
      id: 'step-5',
      title: '换一句自己的话',
      instruction: '从预设对白里选一句你喜欢的话，让小狐狸再打一次招呼。',
      allowedBlocks: ['when_start', 'say_line'],
      requiredBlockTypes: ['when_start', 'say_line'],
    },
  ],
}
```

- [ ] **Step 5: Expand lesson 03 into the approved five-step first-project script**

```ts
{
  id: 'lesson-03-forest-story',
  title: '森林里的第一次见面',
  goal: '把动作和对白连起来，完成第一个完整小故事。',
  recommendedLevel: 'starter',
  steps: [
    {
      id: 'step-1',
      title: '看看今天要完成什么',
      instruction: '今天我们不只是练一个动作，而是要把小狐狸的第一次见面做成一个完整小故事。',
      allowedBlocks: ['when_start'],
      requiredBlockTypes: ['when_start'],
    },
    {
      id: 'step-2',
      title: '先让角色出场',
      instruction: '先接好“开始时”和“向右移动”，让小狐狸走上舞台。',
      allowedBlocks: ['when_start', 'move_right', 'say_line'],
      requiredBlockTypes: ['when_start', 'move_right'],
    },
    {
      id: 'step-3',
      title: '再让角色打招呼',
      instruction: '在移动后面接上一句欢迎的话，让故事继续往前走。',
      allowedBlocks: ['when_start', 'move_right', 'say_line'],
      requiredBlockTypes: ['when_start', 'move_right', 'say_line'],
    },
    {
      id: 'step-4',
      title: '调整顺序，故事才完整',
      instruction: '确认小狐狸先出场、再说话，这样第一次见面的感觉会更自然。',
      allowedBlocks: ['when_start', 'move_right', 'say_line'],
      requiredBlockTypes: ['when_start', 'move_right', 'say_line'],
    },
    {
      id: 'step-5',
      title: '回看我的第一个完整小故事',
      instruction: '点一下运行，看看小狐狸是不是已经做出了一个完整的小故事。',
      allowedBlocks: ['when_start', 'move_right', 'say_line'],
      requiredBlockTypes: ['when_start', 'move_right', 'say_line'],
    },
  ],
}
```

- [ ] **Step 6: Replace generic first-three-lesson hint copy with lesson-specific hint progression**

```ts
const firstUnitHintLayers = {
  lesson01: [
    { id: 'repeat-goal', mode: 'repeat_goal' as const, copy: '先让小狐狸准备好出场，再接动作积木。' },
    { id: 'show-block', mode: 'show_block' as const, copy: '把“开始时”放在最前面，再把“向右移动”接上去。' },
    { id: 'offer-remedial', mode: 'offer_remedial' as const, copy: '先看一个很短的示意，再回来试一次。', remedialLessonId: 'remedial-click-trigger' },
  ],
  lesson02: [
    { id: 'repeat-goal', mode: 'repeat_goal' as const, copy: '先让小狐狸准备好，再把说话积木接上去。' },
    { id: 'show-block', mode: 'show_block' as const, copy: '试试把“说一句话”接在“开始时”的后面。' },
    { id: 'offer-remedial', mode: 'offer_remedial' as const, copy: '先看一下“先开始、再说话”的小示意。', remedialLessonId: 'remedial-click-trigger' },
  ],
  lesson03: [
    { id: 'repeat-goal', mode: 'repeat_goal' as const, copy: '先让小狐狸出场，再让它开口打招呼。' },
    { id: 'show-block', mode: 'show_block' as const, copy: '确认顺序是“开始时 → 向右移动 → 说一句话”。' },
    { id: 'offer-remedial', mode: 'offer_remedial' as const, copy: '先看一个顺序示意，再回来把故事排完整。', remedialLessonId: 'remedial-click-trigger' },
  ],
}
```

- [ ] **Step 7: Run the updated lesson-script tests**

Run: `npm run test:run -- src/content/curriculum/foundation-units.test.ts src/features/rewards/award-lesson-completion.test.ts --maxWorkers=1`

Expected: `PASS`

- [ ] **Step 8: Commit the polished scripts for lessons 01-03**

```bash
git add apps/web/src/content/curriculum/launch-lessons.ts apps/web/src/content/cards/card-definitions.ts
git commit -m "Polish scripts for foundation lessons 1 to 3"
```

---

### Task 2: Upgrade Lesson Runtime Copy for the Richer First-Three-Lesson Scripts

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\learn\lesson\[lessonId]\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\guided-lesson-shell.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\complete-launch-lesson.test.ts`

- [ ] **Step 1: Write the failing runtime expectations**

```ts
import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'

describe('first three lessons runtime copy', () => {
  it('keeps lesson 03 as a first-project script with five visible steps', () => {
    const lesson = launchLessons.find((item) => item.id === 'lesson-03-forest-story')

    expect(lesson?.steps).toHaveLength(5)
    expect(lesson?.steps[0]?.title).toContain('看看今天要完成什么')
    expect(lesson?.steps[4]?.title).toContain('第一个完整小故事')
  })
})
```

- [ ] **Step 2: Run the runtime-focused test to verify it fails**

Run: `npm run test:run -- src/features/lessons/complete-launch-lesson.test.ts --maxWorkers=1`

Expected: `FAIL` because the old runtime copy does not reference the new lesson-script milestones.

- [ ] **Step 3: Update lesson-page feedback to match the polished scripts**

```ts
const successFeedback =
  currentLesson.id === 'lesson-01-forest-hello'
    ? '太好了，小狐狸已经走上舞台了。'
    : currentLesson.id === 'lesson-02-forest-greeting'
      ? '太好了，小狐狸已经会打招呼了。'
      : currentLesson.id === 'lesson-03-forest-story'
        ? '你已经做出了第一个完整动画故事。'
        : '这一小步已经完成，继续往前走。'
```

- [ ] **Step 4: Update `GuidedLessonShell` labels so they match the new child-friendly pacing**

```tsx
<p className="inline-flex rounded-full bg-[#eef8ff] px-4 py-2 text-sm font-semibold text-sky-700">
  今天的小步骤
</p>
```

```tsx
{feedback ? (
  <div className="rounded-[1.5rem] bg-[#eff8ff] px-4 py-4 text-sm font-semibold leading-7 text-sky-800">
    刚刚完成：{feedback}
  </div>
) : null}
```

```tsx
<button
  className="w-full rounded-full bg-[#ff8b4e] px-5 py-3 font-bold text-white shadow-[0_16px_28px_rgba(255,139,78,0.28)] transition hover:bg-[#ff7b38]"
  data-testid="lesson-complete-step"
  onClick={onCompleteStep}
  type="button"
>
  完成这一步
</button>
```

- [ ] **Step 5: Update `complete-launch-lesson.test.ts` to use the new lesson ids and next-lesson flow**

```ts
expect(result.currentLessonId).toBe('lesson-02-forest-greeting')
expect(result.completedLessonIds).toEqual(['lesson-01-forest-hello'])
expect(result.completedProjectIds).toEqual(['lesson-01-forest-hello'])
```

- [ ] **Step 6: Run the lesson runtime tests**

Run: `npm run test:run -- src/features/lessons/complete-launch-lesson.test.ts src/features/lessons/map-view.test.tsx --maxWorkers=1`

Expected: `PASS`

- [ ] **Step 7: Commit the runtime copy upgrade**

```bash
git add apps/web/src/app/learn/lesson/[lessonId]/page.tsx apps/web/src/features/lessons/guided-lesson-shell.tsx apps/web/src/features/lessons/complete-launch-lesson.test.ts
git commit -m "Refine runtime copy for foundation lessons 1 to 3"
```

---

### Task 3: Strengthen First-Project Completion and Parent Messaging

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\project\[projectId]\complete\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\parent\build-parent-overview.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\parent\build-parent-overview.test.ts`
- Modify: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\guest-story.spec.ts`

- [ ] **Step 1: Write the failing parent and completion assertions**

```ts
expect(summary.nextAction).toContain('第一个完整小故事')
expect(summary.nextAction).toContain('先让孩子给你演示')
```

```ts
await expect(page.getByText('你已经做出了第一个完整动画故事')).toBeVisible()
await expect(page.getByText('今天你学会了：让角色动起来、再说一句话')).toBeVisible()
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
npm run test:run -- src/features/parent/build-parent-overview.test.ts --maxWorkers=1
npm run test:e2e -- tests/e2e/guest-story.spec.ts --workers=1
```

Expected: `FAIL`

- [ ] **Step 3: Add first-project-specific completion copy to lesson 03**

```tsx
const isFirstProjectStory = lesson.id === 'lesson-03-forest-story'
```

```tsx
{isFirstProjectStory ? (
  <div className="mt-8 rounded-[1.5rem] bg-orange-50 px-6 py-5 text-left">
    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">
      第一个完整小故事
    </p>
    <h2 className="mt-2 text-2xl font-black text-slate-950">
      你已经做出了第一个完整动画故事
    </h2>
    <p className="mt-3 text-base leading-8 text-slate-700">
      今天你学会了：让角色动起来、再说一句话，并把它们连成一个完整故事。
    </p>
  </div>
) : null}
```

- [ ] **Step 4: Update parent next-action copy for the first unit**

```ts
const nextAction = hasLaunchPack
  ? '孩子已经进入高阶创作阶段，可以继续挑战更长的故事结构和更复杂的互动演出。'
  : completedLessonCount >= 12
    ? '孩子已经完成启蒙毕业作品，现在可以看看是否适合升级到更复杂的高阶创作路线。'
    : completedLessonCount >= 3
      ? '孩子已经完成第一个完整小故事，下一步会继续学习场景切换和故事顺序。'
      : '先让孩子把小狐狸动起来、说一句话，再完成第一个完整小故事。'
```

- [ ] **Step 5: Update the guest-story E2E to assert the new first-project completion copy**

```ts
await page.goto('/project/lesson-03-forest-story/complete')

await expect(
  page.getByRole('heading', { name: '你已经做出了第一个完整动画故事' }),
).toBeVisible()
await expect(
  page.getByText('今天你学会了：让角色动起来、再说一句话，并把它们连成一个完整故事。'),
).toBeVisible()
```

- [ ] **Step 6: Run the updated parent and guest-story tests**

Run:

```bash
npm run test:run -- src/features/parent/build-parent-overview.test.ts --maxWorkers=1
npm run test:e2e -- tests/e2e/guest-story.spec.ts --workers=1
```

Expected: `PASS`

- [ ] **Step 7: Commit the first-project messaging polish**

```bash
git add apps/web/src/app/project/[projectId]/complete/page.tsx apps/web/src/features/parent/build-parent-overview.ts apps/web/src/features/parent/build-parent-overview.test.ts apps/web/tests/e2e/guest-story.spec.ts
git commit -m "Polish first project completion for lessons 1 to 3"
```

---

### Task 4: Verify the Full First-Three-Lesson Script Polish

**Files:**
- Test: `D:\pyprograms\kidsCoding\apps\web\src\content\curriculum\f oundation-units.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\complete-launch-lesson.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\parent\build-parent-overview.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\guest-story.spec.ts`

- [ ] **Step 1: Run the targeted script-polish tests**

Run:

```bash
npm run test:run -- src/content/curriculum/foundation-units.test.ts src/features/lessons/complete-launch-lesson.test.ts src/features/parent/build-parent-overview.test.ts --maxWorkers=1
```

Expected: `PASS`

- [ ] **Step 2: Run the focused E2E flow**

Run: `npm run test:e2e -- tests/e2e/guest-story.spec.ts --workers=1`

Expected: `PASS`

- [ ] **Step 3: Run the full unit test suite**

Run: `npm run test:run -- --maxWorkers=1`

Expected: `PASS`

- [ ] **Step 4: Run lint and production build**

Run:

```bash
npm run lint
npm run build
```

Expected: `PASS`

- [ ] **Step 5: Commit the finished lesson-script polish**

```bash
git add apps/web/src/content/curriculum/launch-lessons.ts apps/web/src/content/cards/card-definitions.ts apps/web/src/app/learn/lesson/[lessonId]/page.tsx apps/web/src/features/lessons/guided-lesson-shell.tsx apps/web/src/features/lessons/complete-launch-lesson.test.ts apps/web/src/app/project/[projectId]/complete/page.tsx apps/web/src/features/parent/build-parent-overview.ts apps/web/src/features/parent/build-parent-overview.test.ts apps/web/tests/e2e/guest-story.spec.ts
git commit -m "Implement polished scripts for foundation lessons 1 to 3"
```

---

## Self-Review

- **Spec coverage:** The plan covers the first-three-lesson script goals, five-step pacing, warm teacher-style feedback, in-lesson hint progression, and stronger first-project completion messaging. It intentionally stays scoped to lessons `01-03` instead of redesigning later units.
- **Placeholder scan:** No `TODO`, `TBD`, or vague “handle later” steps remain. Each task names exact files, commands, and concrete code shapes.
- **Type consistency:** The plan consistently uses lesson ids `lesson-01-forest-hello`, `lesson-02-forest-greeting`, and `lesson-03-forest-story`, and stays within the existing `LaunchLessonDefinition` / `HintLayer` / `buildParentOverview` interfaces.
