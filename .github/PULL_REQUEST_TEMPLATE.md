<!-- 使用说明（提交前删除本注释块）：
1. 本仓库执行 docs/roadmap/11-TASK-EXECUTION-POLICY.md 的单任务制度：一个 PR 只交付一个 Task-ID。
2. 下面第一行必须改成真实任务编号，且全文只能出现一行独立的 Task-ID 行；任务 CI（scripts/check-task-ledger.py）会逐项校验：编号存在、台账状态不是 todo、本 PR 只改动这一个任务的台账条目。不符合会在 CI 直接失败。
3. 关账 PR（回填 completed 与 CHANGELOG）与功能 PR 使用同一个 Task-ID。
-->

Task-ID: 在此替换为唯一任务编号（示例格式见台账，如 OPS-002）

## 本任务要解决什么

- 任务标题（与 task-register.json 中该条一致）：
- 孩子/页面/运维本轮新增或修复的真实能力（一句话）：

## 变更范围（必须与台账该任务的 scope 一致）

- 改动文件：
- 明确不改的范围（冻结设计、无关模块）：

## 测试证据（禁止只写"测试通过"）

- 成功用例：
- 失败/边界用例：
- 恢复/重试用例（如适用）：
- UI 任务：三断点截图存放位置（如适用）：
- 课程任务：教研评分与人审记录（如适用）：

## 台账与状态

- [ ] 本 PR 只改动上面这一个 Task-ID 的台账条目（task-register.json 或 lesson-task-register.json）。
- [ ] 台账状态已按实填写（in_progress / in_review / merged_waiting_ci / completed / blocked 及原因）。
- [ ] 剩余缺口已如实写明（没有就写"无"）：

## CI 运行与风险（按统一协作规范必填）

- [ ] CI 运行链接及状态（逐项写明，不得把 queued / pending / cancelled 写成通过）：
- [ ] 风险说明：
- [ ] 回滚方案：
- [ ] 是否影响其他 Agent 的任务（影响谁、影响哪些文件、是否已告知）：

## 审核人检查（reviewer 逐项确认）

- [ ] 全文只有一行独立的 Task-ID 行，编号真实存在且与改动的台账条目一致。
- [ ] 功能改动与该任务 scope 一致，没有顺带打包其它任务。
- [ ] 测试证据真实可复核（命令、链接、截图来源分清本地/CI）。
- [ ] 合并后必须复核 main CI；main CI 未绿不得宣称完成，关账记录写入 TASK-CHANGELOG.md。
- [ ] 审核人不是本 PR 的提交者本人；审核结论以实际代码、测试证据与验收条件为准，不是提交者的文字报告。
