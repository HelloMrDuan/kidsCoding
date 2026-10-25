# 432 课逐课教研复核模板（TQ-007）

本模板只解决一件事：432 节课每一课的教研复核状态怎么记、记在哪、凭什么改状态。它本身不是任何一课的评审结论，不改动任何一课的现有状态。

## 模板文件

- 登记模板：`docs/roadmap/432-review-template.json`
- 质量打分表（TQ-001 已有，不重复）：`docs/roadmap/teaching-reviews/_template.json`
- 课程总目录（432 节的唯一来源）：`docs/roadmap/lesson-task-register.json`
- 成熟度唯一来源：`apps/web/src/features/curriculum/lesson-maturity.ts`，L0 大纲、L1 详案、L2 引擎、L3 试玩、L4 验收、L5 发布

登记模板故意放在 `docs/roadmap/teaching-reviews/` 之外，因为该目录下的每个 `.json`（除 `_template.json` 外）都会被 `teaching-review.test.ts` 当作一课的真实打分表校验。把登记模板放进那个目录会误触校验。

## 怎么填一课

1. 复制 `docs/roadmap/432-review-template.json` 的字段，填入一课的 `lessonId`，必须是 432 目录里的真实 ID。
2. `reviewStatus` 只写本课的复核进度，与其他 431 课无关。
3. `reviewFile` 填入真实存在的打分表路径，例如 `docs/roadmap/teaching-reviews/G3-U1-L02.json`，且文件内 `lessonId` 与登记条目一致；没有文件时填 `null`，不得凭空写路径。
4. `reviewer`、`independent`、`reviewedCommit`、`reviewedAt` 按打分表如实填；AI 评审或非独立评审只算参考，不能认定优质候选。

## 三条不升级规则

- 详案不等于可玩：`detailAssetPresent` 为 `true` 时，`catalogStatus` 仍保持 `outline_not_playable`。可玩需要真实运行引擎、路由试玩入口和 E2E 证据，对应成熟度 L2 到 L3。
- 可玩不等于发布：试玩证据最多支持到 L3，L4 需要发布验收全部通过，L5 还需要负责人批准。评审本身永远不把课程升到 L5。
- 填字段不等于完成：`catalogStatus`、`maturityLevel`、`reviewStatus` 只能由对应证据支撑。当前 432 节全部是 `todo` 和 `outline_not_playable`，其中 192 节 `detailAssetPresent` 为 `true`，这 192 节仍不是可玩课，这个现状就是本规则的反例证明。

## 与现有规则的关系

- 质量打分仍按 `docs/roadmap/09-TEACHING-QUALITY-GATE.md`：六个维度共 100 分、九条硬否决，给了分就必须写证据。
- 页面视觉与教学质量分开验收，不能互相抵分。
- 本模板不改动 `lesson-task-register.json` 里任何一课的状态；改状态只能走该课自己的功能 PR 和关账 PR，附真实 PR、CI 和证据。
