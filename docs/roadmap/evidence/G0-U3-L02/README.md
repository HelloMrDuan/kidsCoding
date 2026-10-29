# G0-U3-L02 重复走两步（循环单元第 2 课，Hark A 正式课程化）

Task-ID：`G0-U3-L02`（lesson-task-register.json）。分支 `hark-a/g0-u3-l02`，基于 main `679895e`（含 SYS-107 真循环与 G0-U3-L01）。前置课 `G0-U3-L01`。知识点：固定次数重复——同一个动作做几次，次数就设几。

## 本课结构（5 关，全部由网格引擎真实运行判定）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | 小兔子的程序只有一块“向前跳一下”，路上两个水坑。先点选预测，再按原样运行 | 必须真实跑出 `not_at_goal`（停在两个水坑中间，舞台格 2,1），显示“预想 vs 实际”；重复 2 次或再加一跳通过；重复 3 次 `out_of_bounds` |
| 2 | 引导 | 一个水坑：先学“向前跳一下” | 向前走 `fell_in_water`；跳两下 `out_of_bounds` |
| 3 | 练习 A | 两个水坑：数一数，把跳跃放进“重复 N 次” | 3 次 `out_of_bounds`（跳过头）；重复 2 次走路 `fell_in_water`；重复 2 次 / 两块平铺都通过 |
| 4 | 练习 B（调试） | 水坑-干地-干地-水坑-干地-家：小松鼠的循环体“先走后跳” | 起始程序必失败 `fell_in_water`；循环体换成“先跳后走”即通过，次数不用改；只重复跳跃仍落水 |
| 5 | 创意改造 | 自选 2 / 3 / 4 个水坑，做“我的水坑小路” | 选择前不能运行；每条路只接受次数等于水坑数的程序（单元测试遍历 3×3） |

完成后：复盘卡（目标回顾、本节真实遇到并修好的错误、What-if：5 个水坑怎么改）+ 点选反思（3 个水坑重复几次）+ 作品“我的水坑小路”（保存、刷新恢复、真实回放）。

详案常见错误对照：“只跳一次”= 第 1 关错误实验；“重复块套在开始事件外”= `no_start` 诊断；“无限循环无法停下”本课没有无限循环积木，只在反思题以“一直重复不停”作干扰项说明固定次数。

## 本课带来的共享改动

- 网格引擎：新增 `jump_forward`（向前跳一下）：越过一格落在两格外；中间是水坑可以跳过，石头或未开的门跳不过（`hit_rock` / `door_locked`），落点出界 `out_of_bounds`、落点是水 `fell_in_water`，步数 +2。登记能力 `jump_over`；详案 G0-U3-L02 的 `requiredEngineCapabilities` 由 `finite_repeat, movement, visual_effect, sound` 改为 `finite_repeat, movement, jump_over`（本课不用音效）。
- 关卡可选 `actor`（默认小狐狸），本课用项目自绘的小兔子；跳跃帧在舞台上画橙色虚线跳跃弧。
- 创意关可选 `waters`：每个选项带自己的水坑布局（与 `goalChoices` 同序）。
- 原创场景“小兔子的水坑路牌”：`apps/web/public/kc-scenes/puddle-sign.svg`，课堂内联 `PuddleSign` 与之一致；已登记 `assets-register.md` 与 `asset-licenses-v1.json`。

## 保存 / 恢复

本机 `localStorage` 键 `kids-grid-lesson-v1:G0-U3-L02`；循环体与次数经 `sanitizeProgram` 读取。不存姓名，不上传。

## 测试（2026-10-30，本地 sandbox，Chrome for Testing arm64）

- Vitest：`g0-u3-loop-lessons.test.ts` 24 例（L02 新增 5 例）、`grid-engine.test.ts` 新增跳跃 2 例，相关课程测试见 PR 描述。
- 生产 `next build`（含类型检查）通过。
- 真实浏览器 E2E：`grid-lab.spec.ts -g "G0-U3-L02" --project=desktop` 1/1 通过（错误实验、走路落水、次数 3 跳过头再改 2、修循环体顺序、选 3 个水坑先 2 次未到家再 3 次、复盘、刷新后回放）。
- 三断点横向溢出均为 0，无 pageerror。

## 三断点截图（真实 Chrome，JPEG 内嵌同名 `.svg`）

| 文件 | 内容 |
|---|---|
| `error-lab-1440/768/375.svg` | 错误实验：只跳一次停在两个水坑中间，显示预想 vs 实际 |
| `creative-1440/768/375.svg` | 创意改造：选 3 个水坑，重复 3 次跳到家（舞台有跳跃弧） |
| `review-1440/768/375.svg` | 复盘卡与点选反思 |
| `project-1440/768/375.svg` | 作品“我的水坑小路”回放中 |

## 教研记录与未完成项

- `docs/roadmap/teaching-reviews/G0-U3-L02.json`：实现者 AI 参考分 85/100（`independent: false`，非独立人工评分），落在 80–89 必须整改区间。
- 未完成：独立人工教研复核；儿童试学（需真实儿童与监护人同意，未进行，不得模拟）；PR CI、合并、main CI 与 `-record` 关账。
- 未正式发布：成熟度 L3 实验可试玩。
