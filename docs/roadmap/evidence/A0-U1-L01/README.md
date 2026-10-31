# A0-U1-L01 AI在哪里出现 — 证据（第 1 阶段：数据与判定）

## 本阶段交付

- `apps/web/src/content/curriculum/a0-u1-ai-lessons.ts`：课程数据与纯判定函数。
  分类规则取自详案：是否从数据中识别模式。6 项工具分三类（每类 2 项），
  通过线为至少 5 项“分类正确且有理由”——无理由的正确分类不计分。
- `apps/web/src/content/curriculum/a0-u1-ai-lessons.test.ts`：Vitest 用例，
  覆盖工具数量与分类、详案 3 项、评分标准合计 100 分、通过线、
  无理由不计分、会发声反例、自主创作判定。
- 台账：`docs/roadmap/lesson-task-register.json` 中 A0-U1-L01 `todo` → `in_review`，
  其余字段（合并提交、main CI、教研）仍为空，`catalogStatus` 仍为 `outline_not_playable`。

## 必须诚实说明的三点

1. **详案只列出 3 项工具**（导航软件、算术计算器、纸质尺子，见详案情境）。
   另 3 项（拍照识花应用、电子闹钟、纸质笔记本）是实现者按同一分类规则补充的示例，
   数据中标记为 `implementer_example`，**需独立人工教研复核后才能算作正式课例**，
   不得说成是台账原有内容。
2. **本阶段没有试玩入口**：没有路由页面、没有 E2E、没有插画素材。
   A0 的 `ai` 引擎不在 `trialIntegrations` 的引擎类型（blockly / scratch-vm / pyodide）中，
   试玩入口与 E2E 需要统筹决定引擎类型后另做第 2 阶段，**不得在本 PR 擅自扩展共享类型**。
3. **未完成项**：独立人工教研、儿童试学、三端截图、原创情境卡与课堂记录表实物
   （`materialsReady: false`）、发布证据。课程仍为 `in_review` / `outline_not_playable`，
   不得标完成、不得标可玩。

## 判定逻辑（可本地复核）

- 6 项全对且有理由 → 通过；5 项 → 通过；4 项及以下 → 不通过。
- 分类正确但理由为空 → 不计入通过数。
- 反例：会发声的收音机判为 AI → 判错；判为传统程序且有理由 → 判对。

## 第 2 阶段：分类试玩（本阶段新增）

- 总调决定（2026-10-31）：A0 试玩引擎类型定为 `'classify'`（分类与判定引擎）。
  第 1 阶段证据中“不得在本 PR 擅自扩展共享类型”的限制已被该决定取代，
  本阶段扩展是经统筹决定的，不是擅自行为。
- 共享类型：`lesson-maturity.ts` 的 `TrialIntegration['engine']` 新增 `'classify'`，
  并登记 `A0-U1-L01`（路由 `/learn/classify-lab/A0-U1-L01`，E2E `tests/e2e/classify-a0-u1.spec.ts`）；
  成熟度测试的试玩计数由 34 + G2 课数改为 35 + G2 课数，并新增 classify 登记断言。
- Widget：`apps/web/src/features/classify/classify-lab.tsx`（`'use client'`，SSR 安全：
  localStorage 只在 effect 与事件处理中读写，服务端渲染不碰浏览器 API）。
  6 张工具卡 + 3 个分类桶 + 每项理由输入 + 会发声反例 + 自创例子 + 提交 +
  逐项反馈 + 通过判定（沿用第 1 阶段判定函数）+ 本机草稿持久化。
  理由只判定有无，不评价理由质量，不宣称 AI 批改理由质量。
  3 项 `implementer_example` 工具在界面上继续标注“示例工具（待教研复核）”，教研通过前不去掉。
- 路由：`apps/web/src/app/learn/classify-lab/[lessonId]/page.tsx`，仅 `A0-U1-L01` 可达，其他 id 走 `notFound()`。
- E2E：`tests/e2e/classify-a0-u1.spec.ts`，5 个用例——全对有理由→通过；
  正确分类无理由→不计分（6 项全对分类、2 项无理由时为 4/6 未通过）；收音机判 AI→失败提示；
  自创无理由→拒绝；关闭重开→草稿仍在（同 context 新页面断言 localStorage 草稿恢复）。
- **E2E 接线先查结论**：课程内容 workflow 不自动拾取新 spec——全部 Job 均为显式文件清单，
  且 pull_request 路径过滤也不含新 spec、路由与 widget 目录。否则新 spec 等于无 E2E。
  因此本阶段在 workflow 中新增 `a0-classify-browser-trial` Job（仿 python-browser-trial 结构，
  12 分钟超时，只跑本 spec 的 desktop 工程），并补 3 条路径过滤；
  未改动任何已有 Job、超时与分片。Workflow 改动按仓库 AGENTS.md 第 7 节本应走独立任务与独立 PR，
  此处随本 PR 一并提交是为让本课 E2E 真实跑起来，提请主账号在评审时裁定该接线方式；
  若裁定须独立 PR，拆出 workflow 两处改动即可，课内代码不受影响。
- 发布证据：`release-evidence-v1.json` 新增 `A0-U1-L01` 条目（试玩登记后，发布证据必须覆盖全部试玩课，
  否则发布就绪检查失败——第 1 阶段无试玩故无条目，第 2 阶段必须补），7 门禁全 `unchecked`；
  台账仅把本行 `evidence.realE2E` 由 null 改为新 spec 路径，状态仍 `in_review`，
  `catalogStatus` 仍 `outline_not_playable`，`mergeCommit` / `mainCI` / `lessonReview` 仍 null。
- 本阶段不做：独立教研、儿童试学、三端截图（按本次指令暂不做，非遗漏）、发布。
  目录页不新增 classify 试玩入口区块（本阶段只交付路由试玩本身），后续 UI 工作可另起。

## 第 2 阶段修复（2026-10-31 晚，用户批准后补推，与第 2 阶段同一 PR、同一分支）

- 新 head 4a034549 的 CI：任务台账 success，课程内容与部署 failure，唯一失败点均为
  lesson-schema.test.ts 的 SYS-105 门禁。根因两点，皆为第 2 阶段引入、非旧问题：
  1）漏改第二处硬编码试玩计数：lesson-schema.test.ts 仍要求 trials 34 + G2 课数
  （成熟度测试那处已改 35），实际登记后为 46 节；2）A0-U1-L01 登记试玩后被判
  missing_examples——门禁要求每个试玩课有带正反例的步骤，否则只能进历史欠账名单，
  而欠账名单已满 19 条上限且只能减少、不能新增；快照构造器此前只从 G0 网格/事件/循环课
  与 G2 Scratch 课取步骤，A0 课没有步骤来源。
- 修复（未改 widget、路由、E2E、判定逻辑）：课数据新增 `a0u1L01SnapshotSteps`（2 步：
  practiceA-classify 正例为课数据自身的 6 项正确分类、反例为详案诊断与无理由不计分规则；
  practiceB-counter-example 正例复用反例数据、反例为详案诊断原话），快照构造器接入该步骤源；
  lesson-schema.test.ts 计数 trials 34→35、steps 75→77（+2 步）；a0 测试新增快照步骤断言
  （每步正反例均 ≥1、正例与课数据一致）。正反例均为课内真实内容，非为过门禁编造。
- 本修复未动：独立教研、儿童试学、三端截图、发布、合并；目录页 classify 入口区块仍未加。
