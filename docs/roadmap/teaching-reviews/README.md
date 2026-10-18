# 逐课教学质量审核记录（TQ-001）

每节课一份 `<lessonId>.json`，按 [09 课程品质验收标准](../09-TEACHING-QUALITY-GATE.md) 打分；评分工具和校验在
`apps/web/src/features/curriculum/teaching-review.ts`，CI 用 `teaching-review.test.ts` 逐份复查。

## 怎么填
1. 复制 `_template.json`，改名为课程 ID（如 `G0-U1-L01.json`、`lesson-07-garden-click.json`），`lessonId` 与文件名一致，且必须是 432 目录或启蒙 12 课里真实存在的 ID。
2. `reviewedCommit` 填被审代码的 commit SHA，`reviewedAt` 填日期；复查时以该 commit 重跑证据。
3. 六个维度（20/15/25/15/15/10，共 100 分）逐项给整数分；**给了分就必须写证据**（源码路径、E2E 名称、截图、日志、URL），缺陷写进 `defects`。
4. 九条硬否决逐条写 `pass` / `fail` / `unchecked`；`fail` 必须写原因。任何 `fail` 或 `unchecked` 都不能成为优质候选。
5. `runEvidence` 填正常执行、真实错误或边界、三层提示、两项目标不同的练习、两种正确方案、保存重开、E2E。
6. `reviewerKind` 为 `ai` 或 `independent` 为 `false` 时只算参考，不能认定优质。
7. 用 `renderReviewMarkdown` 生成报告贴进该课 PR。

## 结论规则
- ≥90 且无硬否决（全部已核）、独立人工复核、运行证据齐全 → **优质课程候选**，最多支持升到 L4；L5 正式发布仍需负责人批准。
- 80–89 需打磨；<80 退回重做。
- 课程分与页面/视觉分分开验收，不能互相抵分。
