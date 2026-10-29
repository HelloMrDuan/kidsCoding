# Hark A 课程审定归档（G0 / G1 / M0 / D0 / S0 / R0，144 节）

> **AI 实现者自审，不是独立教研评审。** 作者 Hark A（AI）同时实现了 G0-U1-L01～L06 与 G0-U2-L01～L06。
> 基线：`origin/main` `300c6dd`（2026-10-29）。Task-ID：`AUD-101`。

| 文件 | 内容 |
|---|---|
| [HARK-A-144-AUDIT.md](./HARK-A-144-AUDIT.md) | 审定报告：方法、系统性结论、六路线覆盖矩阵、24 单元递进图、144 节逐课清单、焦点错配、重复清单、八大领域专项、扩展建议、12 节启蒙课边界、对标来源、整改 PR 计划 |
| [hark-a-144-audit.json](./hark-a-144-audit.json) | 逐课机器可读记录（144 条）：12 项检查、建议的可观察学习成果、优先级、问题与整改动作 |

使用约束：
- 不改变 `lesson-task-register.json`、`full-catalog-v1.json` 或任何课程状态；建议的学习成果在后续各单元整改 PR 中写回（只改文案字段，不改 ID 与状态），仍需独立人工教研确认。
- 不能作为 `completed`、儿童试学通过（需真实儿童 + 监护人同意）或正式发布的证据。
- 单测 `apps/web/src/features/curriculum/hark-a-audit.test.ts` 锁定：覆盖 144 个 ID 各一次、非独立、无试学/发布声明、未实现课不评分、每课有非模板化学习成果。
- 视觉差异（VISUAL-LOCK 三端截图）不在本次范围，列在整改计划第 10 项，单独 UI PR。
