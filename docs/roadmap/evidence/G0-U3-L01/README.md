# G0-U3-L01 蘑菇小路的规律（循环单元第 1 课，Hark A 正式课程化）

Task-ID：`G0-U3-L01`（lesson-task-register.json）。分支 `hark-a/g0-u3-l01`，基于 main `6897f51`（含 SYS-107 真循环引擎）。前置课 `G0-U2-L06`。首个使用 C 形“重复 N 次”积木的课程。

## 本课结构（5 关，全部由网格引擎真实运行判定）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | 小兔子的程序：重复 2 次（放红脚印、向前走、放蓝脚印、向前走）。先点选预测，再按原样运行 | 必须真实跑出 `pattern_short`（只印 4 个脚印），显示“预想 vs 实际”；只把次数改成 4 即通过 |
| 2 | 引导 | 只印一对：找出最小单元“红、蓝” | 先蓝后红 / 红红 `wrong_pattern`；两脚印之间不走 `stamp_twice`；少走最后一格 `not_at_goal` |
| 3 | 练习 A | 整条小路 4 对脚印：把一对放进“重复 N 次”并选对次数 | 3 次 `pattern_short`；5 次 `out_of_bounds`；循环体漏“向前走” `stamp_twice`；重复 4 次 / 两段重复 2 次 / 16 块平铺三种写法都通过 |
| 4 | 练习 B（调试） | 小松鼠的循环体先蓝后红 | 起始程序必失败 `wrong_pattern`，提示“第 1 个脚印应该是红色”；交换循环体内两块即通过，次数不用改 |
| 5 | 创意改造 | 自选节奏：红蓝×2 / 红红蓝×2 / 红蓝蓝×3，做“我的节奏小路” | 选择前不能运行；每种节奏只接受自己的程序（单元测试遍历 3×3） |

完成后：复盘卡（目标回顾、本节真实遇到并修好的错误、What-if：6 对脚印怎么改）+ 点选反思（最小重复单元）+ 作品“我的节奏小路”（保存、刷新恢复、真实回放，作品卡显示“重复 2 次（…）”）。

## 本课带来的共享改动

- 网格引擎：新增 `stamp_red` / `stamp_blue` 积木与关卡 `footprints` 规律判定（失败 `stamp_twice` / `wrong_pattern` / `pattern_short`，帧带 `stamp`，运行结果带 `trail`）；登记能力 `finite_repeat`、`pattern_stamp`（engine-capabilities.ts）。详案 G0-U3-L01 的 `requiredEngineCapabilities` 由 `finite_repeat, movement, visual_effect, sound` 改为 `finite_repeat, movement, pattern_stamp`：本课不使用音效，`visual_effect` 不冒领。
- 舞台：淡色虚线脚印（小熊留下的规律，供孩子照着印）与实心脚印；原创场景“小熊的蘑菇路牌”。
- 积木区（点按钮添加，照顾 5–7 岁触屏）：程序最后一块是“重复”时，出现“重复几次？2/3/4/5/6/8 次”与“点按钮加的积木放到：重复里面 / 重复后面”；新加的“重复”默认把后续积木放进口里，“撤回最后一块”撤回口里最后一块。拖拽仍可用。
- 积木按钮配色：重复（控制青色）、脚印（物品紫色）与 Blockly 主题一致。
- `GridLessonStep.solutions / counterExamples` 支持带循环体的程序（`GridProgram`），G0-U1 课程与测试不变。

原创场景：`apps/web/public/kc-scenes/mushroom-path.svg`，课堂内联 `MushroomPath` 与之一致；已登记 `assets-register.md` 与 `asset-licenses-v1.json`。

## 保存 / 恢复

本机 `localStorage` 键 `kids-grid-lesson-v1:G0-U3-L01`；循环体与次数经 `sanitizeProgram` 读取，未知积木丢弃、伪造次数夹到可选值。不存姓名，不上传。

## 测试（2026-10-29，本地 sandbox，Chrome for Testing arm64）

- Vitest：`src/features/lessons` + `src/content/curriculum` + `src/features/curriculum` 60 files / 616 tests 通过（本地先移开 build 生成、已 gitignore 的 `public/blockly-media/`）；新增 `g0-u3-loop-lessons.test.ts` 12 例。
- 生产 `next build`（含类型检查）通过。
- 真实浏览器 E2E：`grid-lab.spec.ts -g "G0-U3-L01" --project=desktop` 1/1 通过（错误实验改次数、引导、点按钮把积木放进重复口并逐次改次数、修颜色、选红红蓝节奏、复盘、刷新后回放）。
- 三断点横向溢出均为 0，无 pageerror。

## 三断点截图（真实 Chrome，JPEG 内嵌同名 `.svg`）

| 文件 | 内容 |
|---|---|
| `error-lab-1440/768/375.svg` | 错误实验：选了“能走到蘑菇屋”，运行后只印 4 个脚印，显示预想 vs 实际，可见“重复几次？”按钮 |
| `creative-1440/768/375.svg` | 创意改造：选红红蓝节奏，重复 2 次通过 |
| `review-1440/768/375.svg` | 复盘卡与点选反思 |
| `project-1440/768/375.svg` | 作品“我的节奏小路”回放中 |

## 教研记录与未完成项

- `docs/roadmap/teaching-reviews/G0-U3-L01.json`：实现者 AI 参考分 85/100（`independent: false`，非独立人工评分），落在 80–89 必须整改区间。
- 未完成：独立人工教研复核；儿童试学（需真实儿童与监护人同意，未进行，不得模拟）；PR CI、合并、main CI 与 `-record` 关账。
- 未正式发布：成熟度 L3 实验可试玩。
