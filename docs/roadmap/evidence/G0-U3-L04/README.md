# G0-U3-L04 萤火虫闪三次（循环单元第 4 课，Hark A 正式课程化）

Task-ID：`G0-U3-L04`（lesson-task-register.json）。分支 `hark-a/g0-u3-l04`，基于 G0-U3-L03。前置课 `G0-U3-L03`。知识点：重复节奏与同步。本课把 SYS-107 的“重复 N 次”带到事件舞台。

## 本课结构（5 关，全部由事件引擎真实运行判定）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | 亮亮的程序“重复 3 次（亮起来）” | 必须真实跑出 `left_glowing`（亮灭记录 `111`，表演完灯还亮）；在重复里加“熄灭”通过（记录 `101010`）；重复 2 次 `missing_effect` |
| 2 | 引导 | 先闪一下：亮起来、熄灭 | 只亮 `left_glowing`；无“开始时” `no_hat`；闪两下 `extra_effect` |
| 3 | 练习 A | 给闪闪写“重复 3 次（亮、灭）”，与亮亮同步 | 2 次 `missing_effect`（少闪一轮）；4 次 `extra_effect`；只亮不灭 `out_of_sync` |
| 4 | 练习 B（调试） | 三只萤火虫，点点“重复 3 次（熄灭、亮起来）”慢一拍 | 起始程序必失败 `out_of_sync`（指出点点，记录 `010101`）；改为先亮后灭通过，次数不变 |
| 5 | 创意改造 | 选闪 3 / 4 / 5 轮，亮亮和闪闪都要改次数 | 只改一只 `missing_effect`；单元测试遍历 3×3：每个轮数只接受两只次数都匹配的程序 |

完成后：复盘卡（What-if：闪 6 轮怎么改）+ 点选反思（第 6 个动作后灯是灭的）+ 作品“我的萤火虫表演”（保存、刷新恢复、真实回放）。

详案常见错误对照：只重复亮起不熄灭 = `left_glowing`；重复次数错误 = `missing_effect` / `extra_effect`；角色闪烁相位不同 = `out_of_sync`。未实现：“加入不同颜色”的扩展、角色组（本课逐只编辑）、音效。

## 本课带来的共享改动（事件引擎）

- `EventBlock` 改用 SYS-107 的 `ProgramBlock`：事件脚本里可放一层“重复 N 次”（不允许重复套重复）；空重复为 `empty_repeat`；草稿读取保留 `times/body`，伪造次数夹到可选值、未允许积木丢弃。
- 新动作 `glow_on` / `glow_off`（亮起来 / 熄灭），新角色 `firefly_a/b/c`；`EventEffect.beat` 记录脚本内第几拍。
- 关卡 `parallel`（表演舞台）：按拍同时回放；判定新增 `out_of_sync`（同一拍动作不同，指出是谁）、`left_glowing`（结束时还亮），并在表演舞台上把“少一轮/多一轮”判为 `missing_effect` / `extra_effect`。G0-U2 六课（非 parallel）判定不变，原测试全部通过。
- 不可编辑角色按其 starter 固定脚本表演（练习 A/B 的亮亮、闪闪）。
- 创意关可选 `goals`：按选项（轮数）切换目标；作品状态文案支持 `{label}`。
- 能力登记 `sync_show`；详案 G0-U3-L04 `requiredEngineCapabilities` 改为 `finite_repeat, sync_show`（不冒领 `visual_effect`、`sound`）。
- 原创场景：`apps/web/public/kc-scenes/firefly-night.svg`（与 `event-stage.tsx` 内联 `FireflyNight` 一致），萤火虫 `FireflyArt` 项目自绘；已登记 `assets-register.md`、`asset-licenses-v1.json`。

## 测试（2026-10-30，本地 sandbox，Chrome for Testing arm64）

- Vitest：新增 `g0-u3-event-loop-lessons.test.ts` 8 例、`event-engine.test.ts` 新增 3 例；G0-U2 事件课测试不变全过。
- 生产 `next build`（含类型检查）通过。
- 真实浏览器 E2E：`grid-lab.spec.ts -g "G0-U3-L04" --project=desktop` 1/1 通过（从课程介绍页进入、错误实验、引导、练习 A 改次数、练习 B 重拼循环体、创意关只改一只失败再改另一只、复盘、刷新恢复）。
- 三断点横向溢出均为 0，无 pageerror。

## 三断点截图

| 文件 | 内容 |
|---|---|
| `error-lab-1440/768/375.svg` | 错误实验：只亮不熄，预想 vs 实际 |
| `creative-1440/768/375.svg` | 创意改造：闪 5 轮，两只同步，亮灭记录 10 点 |
| `review-1440/768/375.svg` | 复盘卡与点选反思 |
| `project-1440/768/375.svg` | 作品“我的萤火虫表演”回放 |

## 教研记录与未完成项

- `docs/roadmap/teaching-reviews/G0-U3-L04.json`：实现者 AI 参考分 85/100（`independent: false`），80–89 必须整改区间。
- 未完成：独立人工教研；儿童试学（未进行，不得模拟）；PR CI、合并、main CI 与 `-record` 关账。成熟度 L3 实验可试玩，未正式发布。
