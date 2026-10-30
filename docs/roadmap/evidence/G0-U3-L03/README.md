# G0-U3-L03 花园浇水机器（循环单元第 3 课，Hark A 正式课程化）

Task-ID：`G0-U3-L03`（lesson-task-register.json）。分支 `hark-a/g0-u3-l03`，基于 G0-U3-L02（PR #253）。前置课 `G0-U3-L02`。知识点：循环与批量任务——把“走过去 + 做一件事”组成一轮，重复给每一个对象做一次。

## 本课结构（5 关，全部由网格引擎真实运行判定）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | 机器人程序“重复 3 次（向前走一格、给这盆花浇水）”，花园四盆花 | 必须真实跑出 `pots_missed`（只开 3 朵，舞台 `data-watered=3`），显示“预想 vs 实际”；只改次数为 4 即通过；5 次 `out_of_bounds` |
| 2 | 引导 | 一盆花：先走过去再浇水 | 先浇后走 `no_pot_here`；浇两次 `watered_twice`；只走不浇 `pots_missed` |
| 3 | 练习 A | 四盆挨着：一轮“走一格 + 浇水”，重复 4 次 | 只重复走路 `pots_missed`；先浇后走 `no_pot_here`；5 次 `out_of_bounds`；重复 / 8 块平铺都通过 |
| 4 | 练习 B（调试） | 花盆隔一格放，小松鼠照搬上一关的循环 | 起始程序必失败 `no_pot_here`；循环体改为“走两格 + 浇水”，次数不变 |
| 5 | 创意改造 | 自选花园：3 盆挨着 / 5 盆挨着 / 3 盆隔开，做“我的小花园” | 选择前不能运行；每种花园只接受自己的循环（单元测试遍历 3×3） |

完成后：复盘卡（目标回顾、真实错误、What-if：6 盆怎么改）+ 点选反思（浇水放在重复里面还是后面）+ 作品“我的小花园”（保存、刷新恢复、真实回放）。

详案常见错误全部可真实触发：“重复次数为三”（错误实验）、“只重复移动没重复浇水”（练习 A、反思题）、“最后一盆浇水后越界”（多一轮 `out_of_bounds`）。“直到四盆都完成”在本课用固定次数表达，条件循环留给 G0-U4。

## 本课带来的共享改动

- 网格引擎：新增 `water_plant`（给这盆花浇水）与关卡 `pots`：每盆恰好浇一次；失败 `no_pot_here` / `watered_twice` / `pots_missed`；帧带 `water`。登记能力 `batch_action`；详案 G0-U3-L03 的 `requiredEngineCapabilities` 由 `finite_repeat, movement, visual_effect, sound` 改为 `finite_repeat, movement, batch_action`（本课不用音效）。
- 舞台：花盆（未浇是花苞，浇后开花带水滴），`data-watered` 计数；关卡角色 `robot`（`character-art.tsx` 新增项目自绘浇水机器人）。
- 创意关可选 `pots`：每个选项带自己的花盆布局。
- 原创场景“浇水机器人的巡回计划”：`apps/web/public/kc-scenes/watering-plan.svg`，课堂内联 `WateringPlan` 与之一致；已登记 `assets-register.md` 与 `asset-licenses-v1.json`。

## 保存 / 恢复

本机 `localStorage` 键 `kids-grid-lesson-v1:G0-U3-L03`。不存姓名，不上传。

## 测试（2026-10-30，本地 sandbox，Chrome for Testing arm64）

- Vitest：`g0-u3-loop-lessons.test.ts` 新增 L03 5 例、`grid-engine.test.ts` 新增浇水 2 例；相关课程测试见 PR 描述。
- 生产 `next build`（含类型检查）通过。
- 真实浏览器 E2E：`grid-lab.spec.ts -g "G0-U3-L03" --project=desktop` 1/1 通过。
- 三断点横向溢出均为 0，无 pageerror。

## 三断点截图（真实 Chrome，JPEG 内嵌同名 `.svg`）

| 文件 | 内容 |
|---|---|
| `error-lab-1440/768/375.svg` | 错误实验：重复 3 次，最后一盆仍是花苞，预想 vs 实际 |
| `creative-1440/768/375.svg` | 创意改造：5 盆挨着，重复 5 次全部开花 |
| `review-1440/768/375.svg` | 复盘卡与点选反思 |
| `project-1440/768/375.svg` | 作品“我的小花园”回放中 |

## 教研记录与未完成项

- `docs/roadmap/teaching-reviews/G0-U3-L03.json`：实现者 AI 参考分 85/100（`independent: false`），80–89 必须整改区间。
- 未完成：独立人工教研；儿童试学（未进行，不得模拟）；PR CI、合并、main CI 与 `-record` 关账。
- 未正式发布：成熟度 L3 实验可试玩。
