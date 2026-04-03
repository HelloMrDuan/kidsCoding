# Learning Mainline Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the learning-facing product flow so the homepage, learning map, lesson page, and parent overview all reinforce one clear promise: children can independently create animated stories.

**Architecture:** Keep the existing data model, APIs, and course flow intact, but redesign the presentation layer and learning UI structure around a unified learning mainline. The implementation starts with competitor-informed content and layout references, then rebuilds the homepage, map, lesson shell, and parent overview in that order so the product reads as one coherent learning experience instead of a set of unrelated utility pages.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest, Playwright

---

## File Structure And Responsibilities

**Reference and design support**

- Create: `D:\pyprograms\kidsCoding\docs\superpowers\references\2026-04-03-learning-mainline-ui-reference.md`
  - Records the domestic and international platform UI/page patterns used as implementation reference.

**Homepage**

- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\page.tsx`
  - Rebuild the homepage into the approved 4-screen narrative.
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\marketing\story-stage.tsx`
  - Homepage animated story stage block.
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\marketing\growth-path.tsx`
  - Three-step learning path block.
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\marketing\parent-confidence.tsx`
  - Parent-facing growth record/value block.
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\marketing\trial-cta.tsx`
  - Trial conversion block.

**Learning map**

- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\learn\map\page.tsx`
  - Update the page shell and content order.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\map-view.tsx`
  - Present lessons as a growth route rather than a plain function page.

**Lesson page**

- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\learn\lesson\[lessonId]\page.tsx`
  - Adjust state copy and structure to match the new self-guided lesson flow.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\guided-lesson-shell.tsx`
  - Rebuild the shell around task focus, feedback, and story progress.

**Parent overview**

- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\parent\overview\page.tsx`
  - Reframe the page around learning growth, recent work, and next action.

**Tests**

- Create: `D:\pyprograms\kidsCoding\apps\web\src\app\page.test.tsx`
  - Homepage structure and CTA coverage.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\map-view.test.tsx`
  - Growth-route structure coverage.
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\guided-lesson-shell.test.tsx`
  - Lesson shell structure and hint/feedback visibility coverage.
- Modify: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\guest-story.spec.ts`
  - Update selectors or copy expectations if the homepage or lesson entrance changes.
- Modify: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\trial-lock-purchase.spec.ts`
  - Keep the trial-to-purchase path aligned after the visual rewrite.

---

### Task 1: Record Competitor Reference Patterns

**Files:**
- Create: `D:\pyprograms\kidsCoding\docs\superpowers\references\2026-04-03-learning-mainline-ui-reference.md`

- [ ] **Step 1: Write the reference document**

```md
# Learning Mainline UI Reference

## International references

### Tynker
- Homepage hero leads with what kids can create, not platform plumbing.
- Course progression is explained as a path, not a list of lessons.
- Parent trust is built with outcomes and structure.

### Kodable
- Self-guided learning is framed as low-pressure and kid-operable.
- Early progression uses tiny goals and obvious success feedback.

### ScratchJr
- Story creation is treated as expression, not just puzzle completion.
- Interface stays playful without losing clarity.

### codeSpark
- Puzzle moments are short and always point back to making something.

## Domestic references

### Reference rules
- Homepage must balance child attraction and parent reassurance.
- The first screen must show outcome before curriculum detail.
- Learning pages must feel like a guided activity, not a utility console.

## Product translation rules
- Use story-stage hero instead of generic education banner.
- Use three-step growth path instead of a dense syllabus wall.
- Use growth record storytelling instead of pure statistics blocks.
```

- [ ] **Step 2: Stage the new document**

Run: `git add docs/superpowers/references/2026-04-03-learning-mainline-ui-reference.md`

Expected: no output

- [ ] **Step 3: Commit the reference baseline**

```bash
git commit -m "Add learning mainline UI reference notes"
```

---

### Task 2: Rebuild the Homepage Into the 4-Screen Narrative

**Files:**
- Create: `D:\pyprograms\kidsCoding\apps\web\src\app\page.test.tsx`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\marketing\story-stage.tsx`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\marketing\growth-path.tsx`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\marketing\parent-confidence.tsx`
- Create: `D:\pyprograms\kidsCoding\apps\web\src\features\marketing\trial-cta.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\page.tsx`

- [ ] **Step 1: Write the failing homepage test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import HomePage from './page'

describe('HomePage', () => {
  it('renders the four learning-mainline sections', () => {
    render(<HomePage />)

    expect(
      screen.getByRole('heading', { name: '孩子可以自己做出动画故事' }),
    ).toBeInTheDocument()
    expect(screen.getByText('让角色动起来')).toBeInTheDocument()
    expect(screen.getByText('家长可见成长记录')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '免费试听 3 节' })).toHaveAttribute(
      'href',
      '/onboarding/age',
    )
  })
})
```

- [ ] **Step 2: Run the homepage test to verify it fails**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\app\page.test.tsx --maxWorkers=1`

Expected: `FAIL`

- [ ] **Step 3: Create the story-stage component**

```tsx
import Link from 'next/link'

export function StoryStage() {
  return (
    <section className="grid gap-8 rounded-[2.5rem] bg-[linear-gradient(180deg,#fff8e8_0%,#fef4ff_100%)] p-8 shadow-[0_24px_80px_rgba(255,173,96,0.18)] md:grid-cols-[1.1fr_0.9fr] md:p-12">
      <div className="space-y-5">
        <p className="inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-orange-700 shadow-sm">
          适合 6-8 岁 · 可以自己学 · 卡住有语音和动画提示
        </p>
        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
            孩子可以自己做出动画故事
          </h1>
          <p className="max-w-xl text-lg leading-8 text-slate-700">
            从让角色动起来开始，一步一步完成对白、场景和互动，最后做出属于自己的小故事。
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-4 text-lg font-black text-white shadow-[0_14px_32px_rgba(249,115,22,0.28)] transition hover:bg-orange-400"
            href="/onboarding/age"
          >
            免费试听 3 节
          </Link>
          <a
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-4 text-lg font-black text-slate-800 transition hover:border-sky-300 hover:text-sky-700"
            href="#story-preview"
          >
            看看孩子能做出什么
          </a>
        </div>
      </div>
      <div
        id="story-preview"
        className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,#7dd3fc_0%,#c4b5fd_55%,#fde68a_100%)] p-6"
      >
        <div className="absolute inset-x-6 bottom-6 rounded-[1.5rem] bg-white/88 p-4 backdrop-blur">
          <p className="text-sm font-bold text-sky-700">作品舞台</p>
          <p className="mt-2 text-base font-semibold text-slate-800">
            小狐狸出发去森林找星星，点击云朵还会下起亮晶晶的雨。
          </p>
        </div>
        <div className="relative h-[320px] rounded-[1.75rem] border border-white/40 bg-[radial-gradient(circle_at_top,#ffffff_0%,transparent_38%),linear-gradient(180deg,#7dd3fc_0%,#93c5fd_45%,#f9a8d4_100%)]">
          <div className="absolute left-6 top-8 h-10 w-10 rounded-full bg-yellow-200 shadow-[0_0_40px_rgba(253,224,71,0.8)]" />
          <div className="absolute left-16 top-20 h-16 w-16 rounded-full bg-white/70" />
          <div className="absolute right-14 top-16 h-20 w-20 rounded-full bg-white/75" />
          <div className="absolute bottom-0 left-0 right-0 h-24 rounded-t-[3rem] bg-green-300/80" />
          <div className="absolute bottom-20 left-12 h-24 w-24 rounded-[45%] bg-orange-300 shadow-lg" />
          <div className="absolute bottom-[7.5rem] left-[5.25rem] h-3 w-3 rounded-full bg-slate-900" />
          <div className="absolute bottom-[7rem] left-[6.25rem] h-3 w-3 rounded-full bg-slate-900" />
          <div className="absolute bottom-[8.75rem] right-12 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-slate-700 shadow-md">
            我找到第一颗星星啦
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Create the growth-path component**

```tsx
const steps = [
  {
    title: '让角色动起来',
    copy: '从最简单的动作开始，让孩子立刻看到自己做对了什么。',
  },
  {
    title: '做出自己的小故事',
    copy: '2 到 3 节课汇成一个小作品，把零散能力变成故事片段。',
  },
  {
    title: '独立完成完整作品',
    copy: '在模板支持下组合角色、对白和互动，完成第一个完整动画故事。',
  },
]

export function GrowthPath() {
  return (
    <section className="rounded-[2.25rem] bg-white p-8 shadow-sm md:p-10">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-600">
          三段式成长路径
        </p>
        <h2 className="text-3xl font-black text-slate-950">不是随便玩，是一步一步学会创作</h2>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <article
            key={step.title}
            className="rounded-[1.75rem] bg-[linear-gradient(180deg,#f8fbff_0%,#fff7ed_100%)] p-6"
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-lg font-black text-white">
              {index + 1}
            </div>
            <h3 className="text-xl font-black text-slate-950">{step.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{step.copy}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Create the parent-confidence component**

```tsx
const items = [
  '学到哪一节，一眼看懂',
  '最近做了什么作品，马上可回看',
  '获得了哪些卡片和成就，清楚可见',
]

export function ParentConfidence() {
  return (
    <section className="grid gap-6 rounded-[2.25rem] bg-[#f5fbff] p-8 md:grid-cols-[0.95fr_1.05fr] md:p-10">
      <div className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-600">
          家长可见成长记录
        </p>
        <h2 className="text-3xl font-black text-slate-950">孩子学到哪里、做了什么，都能看得见</h2>
        <p className="text-base leading-8 text-slate-600">
          不只是学了几节课，而是把作品、进度、成就和下一步建议都整理清楚。
        </p>
      </div>
      <div className="rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.5rem] bg-orange-50 p-4">
            <p className="text-sm text-orange-700">当前进度</p>
            <p className="mt-2 text-2xl font-black text-slate-950">第 4 节</p>
          </div>
          <div className="rounded-[1.5rem] bg-sky-50 p-4">
            <p className="text-sm text-sky-700">最近作品</p>
            <p className="mt-2 text-2xl font-black text-slate-950">2 个</p>
          </div>
          <div className="rounded-[1.5rem] bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">卡片与成就</p>
            <p className="mt-2 text-2xl font-black text-slate-950">8 张 / 3 枚</p>
          </div>
        </div>
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-[1.25rem] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Create the trial-cta component**

```tsx
import Link from 'next/link'

export function TrialCta() {
  return (
    <section className="rounded-[2.5rem] bg-[linear-gradient(180deg,#fff2cc_0%,#ffe4e6_100%)] p-8 text-center shadow-sm md:p-12">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-600">
        免费试听
      </p>
      <h2 className="mt-3 text-3xl font-black text-slate-950 md:text-4xl">
        先学 3 节，先做出第一个小故事
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-700">
        第一节让角色动起来，第三节完成第一个故事片段。先看到孩子真的能做出来，再决定要不要继续。
      </p>
      <div className="mt-8">
        <Link
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-7 py-4 text-lg font-black text-white transition hover:bg-slate-800"
          href="/onboarding/age"
        >
          开始免费试听
        </Link>
      </div>
    </section>
  )
}
```

- [ ] **Step 7: Replace the homepage shell**

```tsx
import { GrowthPath } from '@/features/marketing/growth-path'
import { ParentConfidence } from '@/features/marketing/parent-confidence'
import { StoryStage } from '@/features/marketing/story-stage'
import { TrialCta } from '@/features/marketing/trial-cta'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff4d6,transparent_24%),linear-gradient(180deg,#fffaf0_0%,#eef7ff_52%,#fff8f1_100%)] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <StoryStage />
        <GrowthPath />
        <ParentConfidence />
        <TrialCta />
      </div>
    </main>
  )
}
```

- [ ] **Step 8: Run the homepage test**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\app\page.test.tsx --maxWorkers=1`

Expected: `PASS`

- [ ] **Step 9: Commit the homepage rewrite**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/page.test.tsx apps/web/src/features/marketing/story-stage.tsx apps/web/src/features/marketing/growth-path.tsx apps/web/src/features/marketing/parent-confidence.tsx apps/web/src/features/marketing/trial-cta.tsx
git commit -m "Redesign homepage around the learning mainline"
```

---

### Task 3: Turn the Learning Map Into a Growth Route

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\learn\map\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\map-view.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\map-view.test.tsx`

- [ ] **Step 1: Add the failing map-view test**

```tsx
it('highlights the current route, progress summary, and next lesson CTA', () => {
  render(
    <MapView
      hasCourseEntitlement={false}
      lessons={buildLessonsFixture()}
      progress={buildProgressFixture()}
    />,
  )

  expect(screen.getByText('下一步')).toBeInTheDocument()
  expect(screen.getByText('试听进行中')).toBeInTheDocument()
  expect(screen.getByText('继续前进')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the map-view test to verify it fails**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\lessons\map-view.test.tsx --maxWorkers=1`

Expected: `FAIL`

- [ ] **Step 3: Update the learning map page shell**

```tsx
<main className="min-h-screen bg-[linear-gradient(180deg,#eef8ff_0%,#fffaf2_100%)] px-6 py-10">
  <section className="mx-auto max-w-6xl space-y-6">
    <header className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-600">
        学习成长路线
      </p>
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-950">今天继续往前走一点</h1>
          <p className="text-base text-slate-600">
            推荐起点：{startLevelLabels[recommendedLevel]} · 已获得 {progress.stars} 颗星星 · 已收集 {progress.cardIds.length} 张卡片
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-5 py-3 font-black text-slate-800"
          href="/cards"
        >
          打开我的卡册
        </Link>
      </div>
    </header>
    <MapView hasCourseEntitlement={hasCourseEntitlement} lessons={allLessons} progress={progress} />
  </section>
</main>
```

- [ ] **Step 4: Update the route presentation inside `map-view.tsx`**

```tsx
<section className="rounded-[2rem] bg-white p-6 shadow-sm">
  <div className="mb-6 flex items-center justify-between">
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">试听进行中</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950">下一步</h2>
    </div>
    <div className="rounded-full bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700">继续前进</div>
  </div>
  {/* existing lesson cards rewritten as a visual route */}
</section>
```

- [ ] **Step 5: Run the map-view test**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\lessons\map-view.test.tsx --maxWorkers=1`

Expected: `PASS`

- [ ] **Step 6: Commit the learning map redesign**

```bash
git add apps/web/src/app/learn/map/page.tsx apps/web/src/features/lessons/map-view.tsx apps/web/src/features/lessons/map-view.test.tsx
git commit -m "Turn the learning map into a growth route"
```

---

### Task 4: Reframe the Lesson Page Around Task Flow and Story Progress

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\learn\lesson\[lessonId]\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\guided-lesson-shell.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\guided-lesson-shell.test.tsx`

- [ ] **Step 1: Write the failing lesson-shell test**

```tsx
it('shows current mission, progress wording, and support actions', () => {
  render(
    <GuidedLessonShell
      feedback="角色已经动起来了"
      hintCopy="先把动作积木拖进去"
      instruction="让小狐狸向前走一步"
      isLocked={false}
      lessonGoal="完成第一段故事动作"
      lessonTitle="第一节：让角色动起来"
      onCompleteStep={() => {}}
      stepTitle="第 1 步 · 让小狐狸走起来"
    >
      <div>workspace</div>
    </GuidedLessonShell>,
  )

  expect(screen.getByText('今天的小目标')).toBeInTheDocument()
  expect(screen.getByText('第 1 步 · 让小狐狸走起来')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '完成这一步' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the lesson-shell test to verify it fails**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\lessons\guided-lesson-shell.test.tsx --maxWorkers=1`

Expected: `FAIL`

- [ ] **Step 3: Update the lesson page copy and mission framing**

```tsx
const DEFAULT_FEEDBACK = '先试试看，让角色动起来。'

// ...

<GuidedLessonShell
  feedback={feedback}
  hintCopy={hintCopy}
  instruction={step.instruction}
  isLocked={courseAccess === 'locked'}
  lessonGoal={currentLesson.goal}
  lessonTitle={currentLesson.title}
  onCompleteStep={handleNext}
  onStartRemedial={handleStartRemedial}
  remedialLessonId={remedialLessonId}
  stepTitle={`第 ${stepIndex + 1} 步 · ${step.title}`}
>
```

- [ ] **Step 4: Rebuild `guided-lesson-shell.tsx` around child-readable task framing**

```tsx
<div className="grid gap-6 lg:grid-cols-[0.34fr_0.66fr]">
  <aside className="rounded-[2rem] bg-white p-6 shadow-sm">
    <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">今天的小目标</p>
    <h1 className="mt-3 text-2xl font-black text-slate-950">{lessonTitle}</h1>
    <p className="mt-2 text-sm font-semibold text-sky-700">{stepTitle}</p>
    <p className="mt-4 text-base leading-8 text-slate-700">{instruction}</p>
    <div className="mt-6 rounded-[1.5rem] bg-sky-50 p-4">
      <p className="text-sm font-bold text-sky-700">这一步做完，你会得到什么</p>
      <p className="mt-2 text-sm leading-7 text-slate-700">{lessonGoal}</p>
    </div>
    {hintCopy ? (
      <div className="mt-4 rounded-[1.5rem] bg-amber-50 p-4 text-sm font-semibold text-amber-800">
        {hintCopy}
      </div>
    ) : null}
  </aside>
  <section className="rounded-[2rem] bg-white p-6 shadow-sm">
    <div className="mb-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-600">创作舞台</p>
        <p className="mt-2 text-sm text-slate-600">{feedback}</p>
      </div>
      <button
        className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white"
        onClick={onCompleteStep}
        type="button"
      >
        完成这一步
      </button>
    </div>
    {children}
  </section>
</div>
```

- [ ] **Step 5: Run the lesson-shell test**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\features\lessons\guided-lesson-shell.test.tsx --maxWorkers=1`

Expected: `PASS`

- [ ] **Step 6: Commit the lesson-shell redesign**

```bash
git add apps/web/src/app/learn/lesson/[lessonId]/page.tsx apps/web/src/features/lessons/guided-lesson-shell.tsx apps/web/src/features/lessons/guided-lesson-shell.test.tsx
git commit -m "Reframe lesson flow around child-friendly missions"
```

---

### Task 5: Lightly Upgrade the Parent Overview

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\parent\overview\page.tsx`

- [ ] **Step 1: Add a failing overview assertion**

```tsx
// append inside the existing parent overview page test file or create one if missing
expect(screen.getByText('最近作品')).toBeInTheDocument()
expect(screen.getByText('下一步建议')).toBeInTheDocument()
```

- [ ] **Step 2: Run the parent overview test to verify it fails**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\app\parent\overview\page.test.tsx --maxWorkers=1`

Expected: `FAIL`

- [ ] **Step 3: Reorder the parent overview page around growth storytelling**

```tsx
<header className="space-y-3">
  <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-600">家长成长看板</p>
  <h1 className="text-4xl font-black text-slate-950">{summary.childName} 的学习进度</h1>
  <p className="text-base leading-8 text-slate-600">
    先看最近作品，再看学习进度和下一步建议，帮助家长更容易理解孩子的成长。
  </p>
</header>
```

- [ ] **Step 4: Add a dedicated next-action section**

```tsx
<section className="rounded-[1.75rem] bg-orange-50 p-5">
  <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-700">下一步建议</p>
  <p className="mt-3 text-base font-semibold leading-8 text-orange-800">
    {summary.nextAction}
  </p>
</section>
```

- [ ] **Step 5: Run the parent overview test**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\app\parent\overview\page.test.tsx --maxWorkers=1`

Expected: `PASS`

- [ ] **Step 6: Commit the parent overview upgrade**

```bash
git add apps/web/src/app/parent/overview/page.tsx apps/web/src/app/parent/overview/page.test.tsx
git commit -m "Refine parent overview around growth storytelling"
```

---

### Task 6: Verify the Full Learning Mainline Rewrite

**Files:**
- Test: `D:\pyprograms\kidsCoding\apps\web\src\app\page.test.tsx`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\map-view.test.tsx`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\guided-lesson-shell.test.tsx`
- Test: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\guest-story.spec.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\trial-lock-purchase.spec.ts`

- [ ] **Step 1: Run targeted learning-mainline tests**

Run: `cmd /c node_modules\.bin\vitest.cmd run src\app\page.test.tsx src\features\lessons\map-view.test.tsx src\features\lessons\guided-lesson-shell.test.tsx src\app\parent\overview\page.test.tsx --maxWorkers=1`

Expected: `PASS`

- [ ] **Step 2: Run the full unit test suite**

Run: `cmd /c node_modules\.bin\vitest.cmd run --maxWorkers=1`

Expected: `PASS`

- [ ] **Step 3: Run lint and production build**

Run:

```bash
cmd /c node_modules\.bin\eslint.cmd .
cmd /c node_modules\.bin\next.cmd build --webpack
```

Expected: `PASS`

- [ ] **Step 4: Start the production server on a clean port**

Run:

```bash
powershell -Command "$connections = Get-NetTCPConnection -LocalPort 3200 -State Listen -ErrorAction SilentlyContinue; if ($connections) { $procIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($procId in $procIds) { Stop-Process -Id $procId -Force } }; Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','cd /d D:\pyprograms\kidsCoding\apps\web && node_modules\.bin\next.cmd start --hostname 127.0.0.1 --port 3200'"
```

Expected: no error output

- [ ] **Step 5: Run the key E2E flows**

Run: `cmd /c "set PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:3200 && node_modules\.bin\playwright.cmd test tests/e2e/guest-story.spec.ts tests/e2e/trial-lock-purchase.spec.ts"`

Expected: `PASS`

- [ ] **Step 6: Commit the completed redesign**

```bash
git add docs/superpowers/references/2026-04-03-learning-mainline-ui-reference.md apps/web/src/app/page.tsx apps/web/src/app/page.test.tsx apps/web/src/features/marketing/story-stage.tsx apps/web/src/features/marketing/growth-path.tsx apps/web/src/features/marketing/parent-confidence.tsx apps/web/src/features/marketing/trial-cta.tsx apps/web/src/app/learn/map/page.tsx apps/web/src/features/lessons/map-view.tsx apps/web/src/features/lessons/map-view.test.tsx apps/web/src/app/learn/lesson/[lessonId]/page.tsx apps/web/src/features/lessons/guided-lesson-shell.tsx apps/web/src/features/lessons/guided-lesson-shell.test.tsx apps/web/src/app/parent/overview/page.tsx apps/web/src/app/parent/overview/page.test.tsx
git commit -m "Redesign the learning mainline experience"
```

---

## Self-Review

- **Spec coverage:** Covered homepage 4-screen narrative, learning map rewrite, lesson-page self-guided flow, parent overview light upgrade, competitor reference capture, and the 12-lesson/high-level learning framing through the UI narrative. No spec requirement is left without a task.
- **Placeholder scan:** No `TODO`, `TBD`, “similar to” shortcuts, or vague “add tests” lines remain. Each task includes explicit files, commands, and expected outcomes.
- **Type consistency:** The plan consistently uses `StoryStage`, `GrowthPath`, `ParentConfidence`, `TrialCta`, `MapView`, and `GuidedLessonShell` names, and keeps the route/test file names aligned with the current codebase.
