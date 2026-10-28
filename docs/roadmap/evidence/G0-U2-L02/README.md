# G0-U2-L02 开始旗帜响起（事件单元第 2 课，Hark A 正式课程化）

Task-ID：`G0-U2-L02`（lesson-task-register.json）。分支 `hark-a/g0-u2-l02`，基于 main `794f82c`。前置课 `G0-U2-L01`，复用其事件舞台引擎（`features/lessons/event/event-engine.ts`），引擎判定逻辑未改。

## 本课结构（5 关，全部由事件引擎真实运行判定）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | 主持人名下“升起彩旗”排在“说早上好”上面：先点选预测，再按原样运行 | 必须真实跑出 `wrong_order`（彩旗先升起），显示“预想 vs 实际” |
| 2 | 引导 | 自己拼开场：开始时 → 说早上好 → 升起彩旗；点主持人、点小兔子舞台都不能变 | 用“被点击时” `nothing_happened`；缺升旗 `missing_effect`；点小兔子也升旗 `wrong_trigger` |
| 3 | 练习 A | 主持人按开始旗开幕；小鸟是嘉宾，被点到才走上舞台问好 | 小鸟用“开始时” `too_early`；顺序反 `wrong_order`；小鸟没拼 `nothing_happened` |
| 4 | 练习 B（调试） | 小兔子名下也接了“开始时 → 升起彩旗”，抢在开幕词前升旗 | 起始程序必失败 `extra_effect`，诊断点名小兔子“两个开场在抢” |
| 5 | 创意 | 自选主持人（小狐狸/小兔子/小鸟），做“我的开幕式节目单” | 拼在别人名下 `wrong_actor`；3 位主持人互不代替（单元测试遍历） |

完成后：复盘卡（目标回顾、本节真实遇到并修好的错误、What-if：另一位朋友也接“开始时”会怎样）+ 点选反思（按开始旗时哪些积木会运行）+ 作品“我的开幕式节目单”（保存、刷新恢复、真实回放：主持人先说开幕词，彩旗再升起）。

原创场景：`apps/web/public/kc-scenes/stage-flags.svg`（森林开幕舞台：木头舞台、彩旗串、旗杆），课堂内联 `StageFlags` 与之一致，彩旗随“升起彩旗”积木真实升起（`data-flag-up`）。已登记 `assets-register.md` 与 `asset-licenses-v1.json`。

## 共享代码的小改动

- `EventActor.line`（仅绘图）：气泡文字按角色配置（L01 默认“早上好！”不变）。
- `EventLesson.project.passedText`：作品状态文字按课程配置（L01 文案不变）。
- 内容单测改为通用：创意关参考程序取本关正解再移到每个选择；“触发前舞台静止”改用 `stageStateAfter` 检查，不再假设角色都在睡觉。

## 本次发现并修复

375 截图发现创意关主持人气泡压住小鸟（三位角色前后错位），改为三位站成一排；三断点重拍。

## 保存 / 恢复

本机 `localStorage` 键 `kids-event-lesson-v1:G0-U2-L02`，读取时过滤未知关卡、角色、积木和伪造的通过。不存姓名，不上传。

## 测试（2026-10-28，本地 sandbox，Chrome for Testing arm64）

- Vitest 全量：145 files / 907 tests 通过（本地需先移开 build 生成、已 gitignore 的 `public/blockly-media/`，否则 lesson-schema 素材扫描会把它当未登记素材——属 UX-207 带来的既有本地问题，未在本 PR 修改；CI 结果以 PR 实际运行为准）。
- ESLint：0 errors，8 个既有 warnings；`tsc --noEmit` 非测试文件 0 报错（既有测试文件报错与本课无关）；生产 `next build` 通过。
- 真实浏览器 E2E：`tests/e2e/grid-lab.spec.ts --project=desktop` 9/9 通过（G0-U1 六课 + G0-U2-L01 回归 + 新增 `G0-U2-L02 formal course on the opening stage…` + EDU-105）。
- 三断点横向溢出均为 0，无 pageerror。

## 三断点截图（真实 Chrome，JPEG 内嵌同名 `.svg`）

| 文件 | 内容 |
|---|---|
| `error-lab-1440/768/375.svg` | 错误实验：选了“主持人先说开幕词”，运行后彩旗先升起，显示预想 vs 实际 |
| `creative-1440/768/375.svg` | 创意关：选小兔子主持，检查通过 |
| `review-1440/768/375.svg` | 复盘卡与点选反思 |
| `project-1440/768/375.svg` | 作品“我的开幕式节目单”回放后（小兔子说开幕词，彩旗已升起） |

## 教研记录与未完成项

- `docs/roadmap/teaching-reviews/G0-U2-L02.json`：实现者 AI 参考分 83/100（`independent: false`，非独立人工评分）。
- 未完成：独立人工教研复核；儿童试学（需真实儿童与监护人同意，未进行，不得模拟）；PR CI、合并、main CI 与 `-record` 关账。
- 未正式发布：成熟度 L3 实验可试玩。
