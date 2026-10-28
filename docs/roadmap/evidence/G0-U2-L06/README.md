# G0-U2-L06 森林伙伴见面会（事件单元第 6 课 · 单元作品，Hark A 正式课程化）

Task-ID：`G0-U2-L06`（lesson-task-register.json）。分支 `hark-a/g0-u2-l06`，基于 main `5681c52`。前置课 `G0-U2-L05`。G0-U2 单元作品：在一个作品里综合开始旗、点角色、铃铛消息三种事件。复用事件舞台引擎，判定逻辑未改。

## 本课结构（5 关，全部由事件引擎真实运行判定）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | 三位伙伴都接在“开始时”下面：先点选预测，再按原样运行 | 必须真实跑出 `too_early`（大家跟着开始旗一起动、小鸟没等就上台），显示“预想 vs 实际” |
| 2 | 引导 | 开始旗：小狐狸上台开场；点小兔子：露出惊喜 | 小兔子用“开始时” `too_early`；没拼小兔子 / 开场用点击 `nothing_happened` |
| 3 | 练习 A | 整场：开始旗开场 → 点小兔子惊喜并摇铃 → 小鸟听到铃铛上台问好 | 小鸟用“被点击时” `missing_effect`；先摇铃后惊喜 `wrong_order`；小鸟听铃又摇铃 `loop` |
| 4 | 练习 B（调试） | 只测了开始旗：小兔子惊喜后漏了“摇响铃铛”，小鸟一直不来 | 起始程序必失败 `missing_effect`；补一块积木即通过 |
| 5 | 单元作品 | 铃声请哪位嘉宾上台：小鸟 / 小青蛙 / 松鼠，做“我的森林见面会” | 拼错名下 `wrong_actor`；多请一位 `extra_effect`；小兔子跟着开始旗 `too_early`；3 个选择互不代替 |

完成后：复盘卡（目标回顾、本节真实遇到并修好的错误、What-if：漏了摇铃只测开始旗能否发现）+ 点选反思（至少要测哪些触发）+ 单元作品“我的森林见面会”（保存、刷新恢复、真实回放三种触发）。

原创场景：`apps/web/public/kc-scenes/meeting-stage.svg`（彩旗、聚光灯、圆形木舞台、观众树桩），课堂内联 `MeetingStage` 与之一致。已登记 `assets-register.md` 与 `asset-licenses-v1.json`。

## 共享舞台的小改动与本次发现

- 截图发现两处气泡重叠：主持人台词压住小兔子的铃声提示；同一角色同时“惊喜 + 摇铃”时两个气泡叠在一起。改为：同一角色合并成一个“✨🔔 叮铃！”提示，铃声提示放到上一层；主持人台词缩短为“开场啦！”，五位角色拉开站位。三断点重拍后无重叠。
- 首轮截图时 sandbox 中文字体被清掉（方框），重新安装字体后重拍。

## 保存 / 恢复

本机 `localStorage` 键 `kids-event-lesson-v1:G0-U2-L06`，读取时过滤未知关卡、角色、积木和伪造的通过。不存姓名，不上传。

## 测试（2026-10-28，本地 sandbox，Chrome for Testing arm64）

- rebase 到 5681c52 后：Vitest 全量 144 files / 943 tests 通过（本地先移开 build 生成、已 gitignore 的 `public/blockly-media/`）；ESLint 改动文件 0 问题；`tsc --noEmit` 非测试文件 0 报错（仅有的报错在 Hark B 的 `tests/e2e/scratch-cloud-delete-restore-cloud104.spec.ts` 与既有测试文件）；生产 `next build` 通过。
- 真实浏览器 E2E：重新 build 后 `grid-lab.spec.ts --project=desktop` 全量 13/13 通过（G0-U1 六课 + G0-U2 六课 + EDU-105），并重拍三断点截图。
- 三断点横向溢出均为 0，无 pageerror。

## 三断点截图（真实 Chrome，JPEG 内嵌同名 `.svg`）

| 文件 | 内容 |
|---|---|
| `error-lab-1440/768/375.svg` | 错误实验：选了“只有小狐狸上台”，运行后三位一起动，显示预想 vs 实际 |
| `creative-1440/768/375.svg` | 单元作品：选松鼠作嘉宾，检查通过 |
| `review-1440/768/375.svg` | 复盘卡与点选反思 |
| `project-1440/768/375.svg` | 作品“我的森林见面会”回放后（小狐狸、小兔子、松鼠在台上，小鸟和小青蛙在后台） |

## 教研记录与未完成项

- `docs/roadmap/teaching-reviews/G0-U2-L06.json`：实现者 AI 参考分 83/100（`independent: false`，非独立人工评分）。
- 未完成：独立人工教研复核；儿童试学（需真实儿童与监护人同意，未进行，不得模拟）；PR CI、合并、main CI 与 `-record` 关账。
- 未正式发布：成熟度 L3 实验可试玩。
