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
