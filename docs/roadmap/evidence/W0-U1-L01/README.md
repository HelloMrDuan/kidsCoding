# W0-U1-L01 写出我的第一张网页 — 第 1 阶段证据（课节数据，无试玩）

## 任务与基底

- 任务：W0-U1-L01《写出我的第一张网页》，轨 W0《网页设计与前端基础》（11–16 岁，引擎 web）。
- 基底：新 main `b58b417f`（PR247 合并后），分支 `hark-b/w0-u1-l01`，单任务 PR。
- 台账：本课单课前置 `prerequisiteLessonIds: []`，无未完前置课；整轨先修 P0 与单课前置为空并存，
  正式开课顺序（是否须先完成 P0）仍需教研确认，本阶段先按总调指令建课，并在评审时提请主账号裁定。
- 目录状态：`catalogStatus` 保持 `outline_not_playable`，不升格。

## 本阶段交付（3 文件，见 PR）

- `apps/web/src/content/curriculum/w0-u1-web-lessons.ts`：课节数据（5 步、3 找错、40/25/20/15 评分、
  拓展、材料清单）+ 纯函数结构检查 `validateW0U1L01Page`。
- `apps/web/src/content/curriculum/w0-u1-web-lessons.test.ts`：10 个用例（数据完整性、通过、漏写结束标签、
  标签当文字、 stray 结束标签、空标题/空正文/标题正文相同、空元素、不限定具体标签名）。
- 本证据 README。

## 诚实边界（本阶段不宣称的）

- 课节内容来自 B 账号详案本地稿（2026-10-31 起草，`draft_not_reviewed`，待独立教研复核），
  不是已入库详案、不是已评审内容；详案有意只写规则不写死具体标签名，
  本模块同样不限定任何具体标签名（测试“不限定具体标签名”即证明此点）。
- 结构检查只判规则（成对、尖括号包裹、标题/正文区分），不判标签名拼写：
  找错 2（标签名拼错）需教师标签对照卡，材料未齐（`materialsReady: false`），故本阶段不机判。
- 未做：独立教研、儿童试学、三端截图、发布；无试玩、无路由、无 E2E、无 UI 改动，
  故 V2 冻结设计未动（无视觉改动可截屏）；W0 轨尚无 repo 内详案 JSON，入库格式待教研定，
  本模块为本课第 1 阶段数据来源（沿用 A0 第 1 阶段模式）。
- 台账：仅 W0-U1-L01 一条 `todo`→`in_review`，`evidence.pr` 为本 PR 链接，其余证据字段仍 null，
  `lessonReview` 保持 null（独立教研未做，不伪造分数/评审/试学）。

## 本地校验（推前实测，以 CI 为准）

- 见 PR 正文“测试证据”一节（Vitest、ESLint、tsc 结果如实填写，不只写“通过”）。

## PR 链接

- 本 PR：https://github.com/HelloMrDuan/kidsCoding/pull/442（Draft，送主账号评审）
