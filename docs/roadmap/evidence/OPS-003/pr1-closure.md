# OPS-003 遗留 PR #1 收口对照

- PR：[#1 feat: make lesson-01-forest-hello playable](https://github.com/HelloMrDuan/kidsCoding/pull/1)（Jules 自动生成，2026-10-09 创建，8 commits，9 文件 +559/-15）
- PR 头：`5c7be3cb1089eeb25444757dfb4a92d0de1a1899`，分支 `feature/lesson-01-blockly-stage-1173733923584212726`
- 对照基线：main（OPS-003 分支起点）

## PR #1 想做的事 vs main 现状

| PR #1 内容 | main 现状 | 结论 |
| --- | --- | --- |
| 新增 `playable-stage/playable-stage.tsx`（188 行）真实舞台 | 已存在，202 行，后续由 EDU-101/102/103、UX-202 继续扩展（双角色、对白、毕业寻宝、插画角色） | 已被取代 |
| 新增 `use-block-executor.ts`（102 行）积木执行器 | 已存在，207 行，首次由 PR #16 `836a6dc`「real first forest run gates completion」合入，之后 #19/#20/#27/#29/#31 扩展 | 已被取代 |
| `use-block-executor.test.ts` 6 个用例 | main 12 个用例，另有 duo-executor / duo-dialogue / duo-graduation 测试 | main 覆盖更多 |
| 课堂页按「运行成功 + 积木正确」判定通关 | PR #16 已实现运行门禁，UX-202 三区课堂沿用 | 已实现 |
| `launch-lessons.ts` 给第 1 课加 `templateId` | main 第 1 课已有 `templateId: 'forest-meetup-stage'` | 已实现 |
| e2e `guest-story` / `reward-idempotency` 改为点击运行 | main e2e 已按运行流程编写（`_fixtures/curriculum.ts` 首课 `lesson-01-forest-hello`） | 已实现 |

## 风险

PR #1 基于很早的 main 分叉；与当前 main 直接对比，相对 `apps/web/src` 显示 117 个文件、约 56,000 行删除（会抹掉后续全部课程、V2 外壳、教学工作）。直接合并或 rebase 都会造成重复/回退。

## 决定

**不移植、关闭 PR #1。** 其有效能力已由 PR #16 及后续 EDU/UX 任务在 main 中以更完整的形式交付；本文件保留证据。分支暂不删除，保留可追溯性。
