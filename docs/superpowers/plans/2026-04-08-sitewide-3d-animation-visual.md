# Sitewide 3D Animation Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild all visible user-facing pages into a unified soft, dreamy, high-quality 3D animation visual system while preserving the current learning/product flow.

**Architecture:** Keep the current routing and product flow intact, but introduce one shared visual language across entry, learning, achievement, and parent layers. The implementation will center on shared surfaces, stage treatments, button depth, and consistent scene backgrounds, then apply those patterns page-by-page in the mainline order.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Vitest, Playwright

---

## File Structure Map

- `D:\pyprograms\kidsCoding\apps\web\src\app\globals.css`
  - Shared visual tokens, 3D depth helpers, surface/background utilities.
- `D:\pyprograms\kidsCoding\apps\web\src\features\marketing\*.tsx`
  - Homepage 3D scene, growth path, parent confidence, CTA sections.
- `D:\pyprograms\kidsCoding\apps\web\src\features\onboarding\*.tsx`
  - Age selection and readiness flow surfaces.
- `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\map-view.tsx`
  - Growth track visual language.
- `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\guided-lesson-shell.tsx`
  - Learning workbench shell.
- `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\blockly\preview-stage.tsx`
  - 3D stage treatment for lesson previews.
- `D:\pyprograms\kidsCoding\apps\web\src\features\projects\project-complete-card.tsx`
  - Premium completion stage presentation.
- `D:\pyprograms\kidsCoding\apps\web\src\features\cards\growth-gallery.tsx`
  - Growth collection gallery and badge wall.
- `D:\pyprograms\kidsCoding\apps\web\src\app\parent\overview\page.tsx`
  - Parent overview visual adaptation.
- `D:\pyprograms\kidsCoding\apps\web\src\app\parent\projects\[projectId]\page.tsx`
  - Parent project playback visual adaptation.
- `D:\pyprograms\kidsCoding\apps\web\src\app\parent\purchase\page.tsx`
  - Parent-side purchase entry visual adaptation.
- `D:\pyprograms\kidsCoding\apps\web\src\app\auth\bind\page.tsx`
  - Account binding visual adaptation.

## Implementation Order

### Task 1: Define Shared 3D Visual Tokens

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\globals.css`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\app\cards\page.test.tsx`

- [ ] **Step 1: Add the failing assertion for updated gallery heading still rendering under shared tokens**

```tsx
expect(screen.getByText('成长收藏馆')).toBeInTheDocument()
```

- [ ] **Step 2: Run targeted test**

Run: `npm run test:run -- src/app/cards/page.test.tsx --maxWorkers=1`
Expected: PASS before token work, proving the baseline is stable

- [ ] **Step 3: Add shared visual tokens and helpers**

Add to `globals.css`:

```css
:root {
  --kc-surface-cream: #fff8ef;
  --kc-surface-cloud: #eef6ff;
  --kc-surface-peach: #fff1dd;
  --kc-text-strong: #16233f;
  --kc-shadow-soft: 0 20px 48px rgba(22, 35, 63, 0.1);
  --kc-shadow-deep: 0 28px 70px rgba(22, 35, 63, 0.14);
}

.kc-scene-shell {
  background:
    radial-gradient(circle at top, rgba(255, 217, 170, 0.72), transparent 36%),
    radial-gradient(circle at right, rgba(214, 238, 255, 0.78), transparent 28%),
    linear-gradient(160deg, var(--kc-surface-cream) 0%, var(--kc-surface-peach) 18%, white 48%, var(--kc-surface-cloud) 100%);
}

.kc-surface-3d {
  border-radius: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow: var(--kc-shadow-soft);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
}

.kc-stage-3d {
  border-radius: 2.4rem;
  background: linear-gradient(180deg, #edf8ff 0%, #d9f0ff 100%);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.92),
    0 24px 54px rgba(56, 189, 248, 0.12);
}

.kc-button-3d {
  border-radius: 9999px;
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.72),
    0 16px 28px rgba(249, 115, 22, 0.22);
}
```

- [ ] **Step 4: Run build smoke test**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat: add shared 3d animation surface tokens"
```

### Task 2: Rebuild Entry Layer Into The New World

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\marketing\story-stage.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\marketing\growth-path.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\marketing\parent-confidence.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\marketing\trial-cta.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\onboarding\age\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\onboarding\check\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\onboarding\age-band-form.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\onboarding\assessment-form.tsx`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\marketing\story-stage.test.tsx`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\onboarding\age-band-form.test.tsx`

- [ ] **Step 1: Update homepage tests for scene shell and main CTA copy**

Add assertions:

```tsx
expect(screen.getByRole('button', { name: '开始学第一节' })).toBeInTheDocument()
expect(screen.getByText('孩子可以自己做出动画故事')).toBeInTheDocument()
```

- [ ] **Step 2: Run focused entry-layer tests**

Run: `npm run test:run -- src/features/marketing/story-stage.test.tsx src/features/onboarding/age-band-form.test.tsx src/features/onboarding/assessment-form.test.tsx --maxWorkers=1`
Expected: FAIL on stale copy or structure

- [ ] **Step 3: Rebuild homepage sections with the shared 3D scene language**

Key implementation rules:

```tsx
<section className="kc-scene-shell rounded-[2.8rem] p-6 md:p-8">
  <div className="kc-stage-3d p-5 md:p-7">...</div>
  <button className="kc-button-3d bg-[#ff8b47] px-7 py-4 text-lg font-black text-white">
    开始学第一节
  </button>
</section>
```

- [ ] **Step 4: Rebuild onboarding forms as single-purpose 3D entry cards**

Key implementation rules:

```tsx
<section className="kc-surface-3d mx-auto max-w-3xl p-6 md:p-8">
  <h1 className="text-4xl font-black text-[var(--kc-text-strong)]">先告诉我，你现在几岁</h1>
  <p className="mt-3 text-base leading-8 text-slate-600">选好年龄后，我会带你进入最适合的启蒙路线。</p>
</section>
```

- [ ] **Step 5: Run tests again**

Run: `npm run test:run -- src/features/marketing/story-stage.test.tsx src/features/onboarding/age-band-form.test.tsx src/features/onboarding/assessment-form.test.tsx --maxWorkers=1`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/features/marketing/story-stage.tsx apps/web/src/features/marketing/growth-path.tsx apps/web/src/features/marketing/parent-confidence.tsx apps/web/src/features/marketing/trial-cta.tsx apps/web/src/app/onboarding/age/page.tsx apps/web/src/app/onboarding/check/page.tsx apps/web/src/features/onboarding/age-band-form.tsx apps/web/src/features/onboarding/assessment-form.tsx apps/web/src/features/marketing/story-stage.test.tsx apps/web/src/features/onboarding/age-band-form.test.tsx
git commit -m "feat: restyle entry flow with 3d animation surfaces"
```

### Task 3: Rebuild Learning Layer

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\learn\map\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\map-view.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\learn\lesson\[lessonId]\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\guided-lesson-shell.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\blockly\preview-stage.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\blockly\blockly-workspace.tsx`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\map-view.test.tsx`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\guided-lesson-shell.test.tsx`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\lessons\blockly\preview-stage.test.tsx`

- [ ] **Step 1: Update learning tests to assert the new mainline labels remain present**

Add assertions such as:

```tsx
expect(screen.getByText('当前单元')).toBeInTheDocument()
expect(screen.getByText('看看你的故事现在发生了什么')).toBeInTheDocument()
```

- [ ] **Step 2: Run focused learning tests**

Run: `npm run test:run -- src/features/lessons/map-view.test.tsx src/features/lessons/guided-lesson-shell.test.tsx src/features/lessons/blockly/preview-stage.test.tsx --maxWorkers=1`
Expected: PASS or reveal stale structure expectations

- [ ] **Step 3: Rebuild the map as a dreamy 3D growth track**

Implementation shape:

```tsx
<section className="kc-scene-shell rounded-[2.8rem] p-6">
  <header className="kc-surface-3d p-5">
    <p className="text-sm font-black text-[#ff7c26]">当前单元</p>
    <h1 className="text-3xl font-black text-[var(--kc-text-strong)]">{currentUnit.title}</h1>
  </header>
  <div className="relative mt-6 rounded-[2.6rem] bg-white/70 p-6">
    {/* connected 12-stop growth track */}
  </div>
</section>
```

- [ ] **Step 4: Rebuild lesson workbench with stronger stage dominance**

Implementation shape:

```tsx
<div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
  <aside className="space-y-4">
    <section className="kc-surface-3d p-5">当前任务卡</section>
    <section className="kc-surface-3d p-4">小结果卡</section>
    <section className="kc-surface-3d p-4">微补课卡</section>
  </aside>
  <section className="space-y-5">
    <div className="kc-stage-3d p-5 md:p-6">预览舞台</div>
    <div className="kc-surface-3d p-4">Blockly 创作桌面</div>
  </section>
</div>
```

- [ ] **Step 5: Run focused learning tests again**

Run: `npm run test:run -- src/features/lessons/map-view.test.tsx src/features/lessons/guided-lesson-shell.test.tsx src/features/lessons/blockly/preview-stage.test.tsx --maxWorkers=1`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/learn/map/page.tsx apps/web/src/features/lessons/map-view.tsx apps/web/src/app/learn/lesson/[lessonId]/page.tsx apps/web/src/features/lessons/guided-lesson-shell.tsx apps/web/src/features/lessons/blockly/preview-stage.tsx apps/web/src/features/lessons/blockly/blockly-workspace.tsx apps/web/src/features/lessons/map-view.test.tsx apps/web/src/features/lessons/guided-lesson-shell.test.tsx apps/web/src/features/lessons/blockly/preview-stage.test.tsx
git commit -m "feat: rebuild learning layer with 3d animation workbench"
```

### Task 4: Rebuild Achievement Layer

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\project\[projectId]\complete\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\projects\project-complete-card.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\cards\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\cards\growth-gallery.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\features\cards\build-growth-gallery.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\projects\project-complete-card.test.tsx`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\cards\growth-gallery.test.tsx`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\app\cards\page.test.tsx`

- [ ] **Step 1: Update achievement-layer tests for the new gallery labels and completion staging**

Add assertions:

```tsx
expect(screen.getByText('成长收藏馆')).toBeInTheDocument()
expect(screen.getByText('勋章墙')).toBeInTheDocument()
expect(screen.getByText('你做出了一个完整作品')).toBeInTheDocument()
```

- [ ] **Step 2: Run focused achievement tests**

Run: `npm run test:run -- src/features/projects/project-complete-card.test.tsx src/features/cards/growth-gallery.test.tsx src/app/cards/page.test.tsx --maxWorkers=1`
Expected: FAIL if copy or structure still mismatches

- [ ] **Step 3: Rebuild completion pages and gallery as premium collection spaces**

Implementation direction:

```tsx
<section className="kc-scene-shell rounded-[2.8rem] p-6">
  <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
    <div className="kc-stage-3d p-5">作品舞台</div>
    <aside className="space-y-4">
      <div className="kc-surface-3d p-5">完成说明</div>
      <div className="kc-surface-3d p-5">星星 / 勋章 / 卡片</div>
    </aside>
  </div>
</section>
```

- [ ] **Step 4: Run focused achievement tests again**

Run: `npm run test:run -- src/features/projects/project-complete-card.test.tsx src/features/cards/growth-gallery.test.tsx src/app/cards/page.test.tsx --maxWorkers=1`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/project/[projectId]/complete/page.tsx apps/web/src/features/projects/project-complete-card.tsx apps/web/src/app/cards/page.tsx apps/web/src/features/cards/growth-gallery.tsx apps/web/src/features/cards/build-growth-gallery.ts apps/web/src/features/projects/project-complete-card.test.tsx apps/web/src/features/cards/growth-gallery.test.tsx apps/web/src/app/cards/page.test.tsx
git commit -m "feat: restyle achievement layer as 3d collection spaces"
```

### Task 5: Rebuild Parent Layer

**Files:**
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\parent\overview\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\parent\projects\[projectId]\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\parent\purchase\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\parent\purchase\success\page.tsx`
- Modify: `D:\pyprograms\kidsCoding\apps\web\src\app\auth\bind\page.tsx`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\parent\build-parent-overview.test.ts`
- Test: `D:\pyprograms\kidsCoding\apps\web\src\features\parent\build-parent-project-playback.test.ts`

- [ ] **Step 1: Run parent-layer tests first to lock current behavior**

Run: `npm run test:run -- src/features/parent/build-parent-overview.test.ts src/features/parent/build-parent-project-playback.test.ts --maxWorkers=1`
Expected: PASS

- [ ] **Step 2: Rebuild parent surfaces with lower-density 3D information cards**

Implementation direction:

```tsx
<main className="kc-scene-shell min-h-screen px-6 py-10">
  <section className="mx-auto max-w-7xl space-y-6">
    <header className="kc-surface-3d p-6">阶段总览</header>
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="kc-stage-3d p-5">最近作品舞台</section>
      <aside className="space-y-4">
        <section className="kc-surface-3d p-5">下一步建议</section>
        <section className="kc-surface-3d p-5">成长轨迹</section>
      </aside>
    </div>
  </section>
</main>
```

- [ ] **Step 3: Run parent-layer tests again**

Run: `npm run test:run -- src/features/parent/build-parent-overview.test.ts src/features/parent/build-parent-project-playback.test.ts --maxWorkers=1`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/parent/overview/page.tsx apps/web/src/app/parent/projects/[projectId]/page.tsx apps/web/src/app/parent/purchase/page.tsx apps/web/src/app/parent/purchase/success/page.tsx apps/web/src/app/auth/bind/page.tsx
git commit -m "feat: restyle parent layer with 3d animation surfaces"
```

### Task 6: Full Verification and Handoff

**Files:**
- Modify: none
- Test: `D:\pyprograms\kidsCoding\apps\web\tests\e2e\guest-story.spec.ts`

- [ ] **Step 1: Run full targeted unit suite**

Run: `npm run test:run -- --maxWorkers=1`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Run mainline E2E**

Run: `npm run test:e2e -- tests/e2e/guest-story.spec.ts --workers=1`
Expected: PASS

- [ ] **Step 5: Commit verification touch-ups if needed**

```bash
git add -A
git commit -m "test: finalize sitewide 3d animation visual polish"
```

## Self-Review

Spec coverage check:

- Global visual direction: covered by Task 1
- Entry layer: covered by Task 2
- Learning layer: covered by Task 3
- Achievement layer: covered by Task 4
- Parent layer: covered by Task 5
- Verification and stability: covered by Task 6

Placeholder scan:

- No TBD/TODO markers remain
- Each task includes file paths, commands, and concrete code direction

Type consistency:

- Shared CSS helpers are named once in Task 1 and reused consistently in later tasks
- No new behavior-layer interfaces are introduced, only visual system helpers
