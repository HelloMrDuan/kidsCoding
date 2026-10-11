# 12｜可读任务总览（从 JSON 原始台账生成的起点）
> 该文件是 **2026-10-11 OPS-001 完工快照**，不是自动实时更新的仪表盘。以后**唯一真实状态**是 [task-register.json](./task-register.json) 与 [lesson-task-register.json](./lesson-task-register.json)。完工必须更新它们及 [TASK-CHANGELOG.md](./TASK-CHANGELOG.md)。

## 当前管理数字
- 产品/开发/UX/教学/安全/运营：**61** 条独立任务；OPS-001 为 `completed`，其余60条 `todo`（历史原型不自动记为完成）。
- 全量课程：**432** 条逐课任务，全部初始 `todo`；原始目录仍为大纲不可玩。实际独立启蒙 12 节不计入这 432。
- 上线/生产验收数量不能据此推断，必须读取发布门禁及 GitHub 当前证据。

## 首批领取顺序（每次只领一个）
| 顺位 | 编号 | 交付对象 | 完成条件 |
| --- | --- | --- | --- |
| 0 | OPS-001 | 本任务追踪制度（**已完成**） | [PR #25](https://github.com/HelloMrDuan/kidsCoding/pull/25) · [main课程CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38101243423) · [main追踪CI](https://github.com/HelloMrDuan/kidsCoding/actions/runs/38101243415) |
| 1 | OPS-002 | 强制PR模板及完整关联检查 | 每个新PR只能带一主任务ID；状态、日志有自动检查 |
| 2 | OPS-003 | 清理遗留PR #1 | 已移植代码和冲突核对，正式记录关闭或处理状态 |
| 3 | TQ-001 | 教学评分审核表落地 | 100分及硬否决证据可逐课填写和人审 |
| 4 | UX-001 | 页面Design Tokens | 真实CSS和组件、对比度/多屏测试 |
| 5 | EDU-101 | 真双角色第10课 | 独立坐标、错误切换、真实Chrome正反例 |
| 6 | EDU-102 | 真双角色第11课 | 第二角色对白可见与错误回归 |
| 7 | EDU-103 | 毕业项目第12课 | 双角色真实任务、可改造作品与幂等奖励 |
| 8 | UX-101 | 原创四世界学习地图 | 真实关卡数据与触屏E2E，必要的UX基础先完成 |
| 9 | TQ-002 | 1～9节课程教研差距审计 | 九课各有质量证据及未达标清单 |

**依赖优先**：如 UX-101 依赖 UX-003，先执行其依赖；不要跳过依赖为了严格照排期。见 [07 拆分计划](./07-PR-BY-PR-IMPLEMENTATION-BACKLOG.md)。
