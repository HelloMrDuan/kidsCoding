# UX-503 家长端真实成长报告 · 策略与证据

## 裁定

duan 2026-10-29 最终裁定：设计阻塞解除，按本方案实施，不再停在
方案讨论阶段。知识点关联采用「现有课程元数据 + 真实学习记录，
通过 lesson_id 关联」。

## 知识点来源（只读，不新增数据）

- 432 课：`src/content/curriculum/full-catalog-v1.json`，读每课的
  `concepts`，`focusConcept` 只在该课 `concepts` 为空时补位。
- 12 节独立启蒙课：`src/content/curriculum/foundation-guides-v1.json`，
  读每课的 `concepts`。
- 统一查询函数 `features/parent/lesson-knowledge.ts` 的
  `getLessonKnowledge(lessonId)`：先查 432 目录（复用
  `features/curriculum/full-catalog-access.ts` 的 `getCatalogLesson`），
  再查启蒙指南；查不到返回 null。
- 不新增数据库字段、表或迁移，不复制维护第二套知识点标签。
- 课程 ID 无法关联或没有明确知识点时，报告中标记
  「课程知识点未登记」，绝不通过课程标题、作品名称或 AI 推断。

## 真实学习记录（不改动数据链路）

家长端页原有服务端查询原样保留，全部按当前登录家长过滤：

- `child_profiles`：`user_id = 当前用户`。
- `progress_records`：`user_id = 当前用户`，取 `lesson_id / status / stars`。
- `project_snapshots`：`owner_user_id = 当前用户`，取 `lesson_id / updated_at`。
- 课程元数据：课程名称与已登记知识点。

不使用 service_role 绕过 RLS 获取孩子数据。知识查询读的是公开
课程静态 JSON，不涉及孩子数据，不需要任何账号权限。

## 报告内容

`features/parent/build-parent-growth-report.ts`（纯函数）只用已完成
记录（`status = 'completed'`）生成：

- 已完成课程数量。
- 已完成课程所涉及的知识点分组，每组列出具体课程与完成记录
  （真实星星数，仅当记录中有星星时显示）。
- 未登记知识点的已完成课程单独列出，不编造标签。
- 最近作品与真实保存时间、本人作品回看入口沿用家长端页现有
  渲染；作品回看页本身在快照缺失时返回 notFound，因此知识点
  行只在该课确有快照时才给出作品回放链接。
- 下一步学习建议沿用现有 `nextAction`（基于真实完成数分段）。

文案硬性区分：「下面只列出孩子已经完成的课程涉及的知识点，
不代表孩子已经掌握这些知识点。」禁止虚构掌握率、能力百分比、
AI 评分、学习时长或学习行为。无已完成记录时显示空状态，不生成
示例数据。

## 不破坏的现有功能

- CLOUD-105 的监护人同意状态卡原样保留，本任务不动它。
- 不改 RLS、安全策略与家长授权机制；不改作品私有隔离。
- 不碰 Hark A / B / C 的课程开发代码与课程文件。
- V2 视觉：新区块只复用家长端页已有卡片、标题与按钮样式，
  不新增颜色、不改现有分区与布局结构。

## 测试与验收对应

- `lesson-knowledge.test.ts`：432 目录命中、启蒙指南命中、未知
  ID 返回 null、concepts 去重与 focusConcept 补位规则。
- `build-parent-growth-report.test.ts`：仅已完成计入、未完成排除、
  未知课程进未登记列表、作品链接仅当确有快照、重复完成记录
  只计一次、空输入空报告。
- `growth-knowledge-section.test.tsx`：组件真实渲染——分组、完成
  记录、星星、作品链接有无、未登记区块、空状态与区分文案。
- `app/parent/overview/page.test.tsx`：服务端页面真实渲染（服务端
  数据层以账号数据替身注入，不改动页面查询逻辑）：A/B 两账号
  各自只见自己的已完成课程与知识点、互不见对方数据、未完成不
  计入、未知课程标未登记、同意状态卡保持正确、空状态。
- `tests/e2e/parent-growth-ux503.spec.ts`（CI 新作业
  parent-growth-ux503，真 Chrome）：未登录访问家长端页重定向
  /auth/bind，且成长报告不向未登录者泄露。
- CI 没有 Supabase 会话 harness，登录态的真实浏览器验证不在
  CI 内完成，改为按 UX-303 前例在 InstaBox 机器上做真实账号
  浏览器实测：机器已有 node 22 与 chromium / google-chrome，
  以分支代码起本地服务接本机 Supabase 栈，用两个真实账号登录
  断言知识点区块、A/B 隔离、同意状态与 1440 / 768 / 375 三端。
  该实测在 PR CI 等待期并行执行，结果写入最终汇报，不伪装成
  CI 内的 Playwright 结果。

## 改动文件

- 新增：`features/parent/lesson-knowledge.ts` 及其单测、
  `features/parent/build-parent-growth-report.ts` 及其单测、
  `features/parent/growth-knowledge-section.tsx` 及其组件单测、
  `app/parent/overview/page.test.tsx`、
  `tests/e2e/parent-growth-ux503.spec.ts`、
  本策略文档。
- 修改：`app/parent/overview/page.tsx`（只加成长报告区块与报告
  计算，不动同意卡与现有区块）、
  `.github/workflows/curriculum-content.yml`（vitest 名单加 4 个
  新测试文件；新增 parent-growth-ux503 浏览器作业）、
  `docs/roadmap/task-register.json`（UX-503 todo → in_progress）。
