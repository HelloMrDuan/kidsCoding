# G0-U2-L01 点击叫醒小狐狸（事件单元第 1 课，Hark A 正式课程化）

Task-ID：`G0-U2-L01`（lesson-task-register.json）。分支 `hark-a/g0-u2-l01`，基于 main `fe8fdf4`。前置课 `G0-U1-L06`。本 PR 同时带来 G0-U2 共用的事件舞台引擎。

## 新增事件引擎（`apps/web/src/features/lessons/event/event-engine.ts`）

- 事件帽：`when_start`（开始旗）、`when_clicked`（点到这个角色）、`when_bell`（听到铃铛）。
- 每个角色一段自己的积木（Scratch 式角色选择），动作 `wake_up / say_hello / show_surprise / enter_stage / raise_flag / fall_down / send_bell`；角色只能做自己会的动作。
- 铃铛广播：发送者的积木先跑完，再按舞台顺序唤起所有 `when_bell` 脚本；有防循环上限。
- 真实判定 13 类结果：`no_hat`、`hat_not_on_top`、`disconnected`、`unknown_block`、`cannot_do`、`loop`、`too_early`、`nothing_happened`、`wrong_actor`、`wrong_order`、`missing_effect`、`extra_effect`、`wrong_trigger`。
- 能力登记：`engine-capabilities.ts` 新增 `message_event`（指向事件引擎文件，单元测试校验文件存在）。

## 本课结构（5 关，全部由事件引擎真实运行判定）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | “开始时”放在动作下面：先点选预测，再按原样运行 | 必须真实跑出 `hat_not_on_top`（小狐狸继续睡），显示“预想 vs 实际” |
| 2 | 引导 | 开始时 → 睁开眼睛 → 说早上好 | 顺序反 `wrong_order` |
| 3 | 练习 A | 只有点一下小狐狸才醒 | 用“开始时” `too_early`；按开始旗、点小兔子都不能叫醒 |
| 4 | 练习 B（调试） | 小兔子名下多了“开始时”，开始旗一按就被吵醒 | 起始程序必失败 `extra_effect`，诊断指出是小兔子的积木 |
| 5 | 创意 | 自选叫醒小狐狸 / 小兔子 / 小鸟，做“我的叫醒卡” | 积木拼错角色 `nothing_happened`；3 个选择互不代替；换朋友后旧通过作废 |

完成后：复盘卡（目标回顾、本节真实遇到并修好的错误、What-if）+ 点选反思 + 作品“我的叫醒卡”（可保存、刷新恢复、真实回放：只叫醒选中的朋友）。

原创场景：`apps/web/public/kc-scenes/morning-glade.svg`（清晨林间空地），课堂内联 `MorningGlade` 与之一致，已登记 `assets-register.md` 与 `asset-licenses-v1.json`。

## 本次修复的真实缺陷

375 断点截图暴露：舞台把角色 `y`（引擎约定 0–100 舞台单位）按 `y/60` 换算，狐狸和兔子被画到舞台外（约 106%～110%），名字压住下方“播放我的叫醒卡”按钮，触屏点不到。已改为 `top: y%`，新增内容单测（所有角色坐标在舞台安全区内）和 E2E 断言（角色底边不超出舞台）。

## 保存 / 恢复

本机 `localStorage` 键 `kids-event-lesson-v1:G0-U2-L01`。读取时过滤未知关卡、角色、积木和伪造的通过（错误实验未真实观察、创意关未选朋友的通过都不算）。不存姓名，不上传。

## 测试（2026-10-28，本地 sandbox，Chrome for Testing arm64）

- Vitest 全量：145 files / 896 tests 通过（修复前一轮）；修复后事件与课程相关单测 17 项通过，PR CI 以全量为准。
- ESLint：0 errors，8 个既有 warnings。
- `tsc --noEmit`：42 个报错全部位于既有测试文件（`scripts/*.test.ts`、使用 globals 的 `kc-scenes-register.test.ts` 等），事件引擎与课程代码 0 报错；生产 `next build` 通过。
- 真实浏览器 E2E：`tests/e2e/grid-lab.spec.ts --project=desktop` 8/8 通过（G0-U1 六课回归 + 新增 `G0-U2-L01 formal course on the event stage…` + EDU-105）。
- 三断点横向溢出均为 0，页面无 pageerror。

## 三断点截图（真实 Chrome，JPEG 内嵌同名 `.svg`）

| 文件 | 内容 |
|---|---|
| `error-lab-1440/768/375.svg` | 错误实验：选了“小狐狸会醒”，运行后小狐狸继续睡，显示预想 vs 实际 |
| `creative-1440/768/375.svg` | 创意关：选小鸟，检查通过（点小鸟才醒，其他朋友还在睡） |
| `review-1440/768/375.svg` | 复盘卡与点选反思 |
| `project-1440/768/375.svg` | 作品“我的叫醒卡”回放后 |

## 教研记录与未完成项

- `docs/roadmap/teaching-reviews/G0-U2-L01.json`：实现者 AI 参考分 83/100（`independent: false`，非独立人工评分）。
- 未完成：独立人工教研复核；儿童试学（需真实儿童与监护人同意，未进行，不得模拟）；PR CI、合并、main CI 与 `-record` 关账。
- 未正式发布：成熟度 L3 实验可试玩。
