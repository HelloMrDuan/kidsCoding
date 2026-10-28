# G0-U2-L03 兔子收到消息（事件单元第 3 课，Hark A 正式课程化）

Task-ID：`G0-U2-L03`（lesson-task-register.json）。分支 `hark-a/g0-u2-l03`，基于 main `f316b35`。前置课 `G0-U2-L02`。本课首次在课堂里使用事件引擎的铃铛广播（`message_event`：`send_bell` / `when_bell`），引擎判定逻辑未改。

## 本课结构（5 关，全部由事件引擎真实运行判定）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | 松鼠用“听到铃铛时”、小兔子用“被点击时”（发送者和接收者弄反）：先点选预测，再按原样运行 | 必须真实跑出 `nothing_happened`（点松鼠没人摇铃），显示“预想 vs 实际” |
| 2 | 引导 | 松鼠：被点击时 → 摇响铃铛；小兔子：听到铃铛时 → 露出惊喜；按开始旗、点小兔子都没动静 | 小兔子用“开始时” `too_early`；用“被点击时” `missing_effect`；松鼠做不了惊喜 `cannot_do` |
| 3 | 练习 A | 摇一次铃，小兔子惊喜、睡着的小狐狸醒来说早上好 | 小狐狸用“被点击时” `missing_effect`；用“开始时” `too_early`；听的人再摇铃 `loop` |
| 4 | 练习 B（调试） | 小兔子用“开始时”，没摇铃就惊喜 | 起始程序必失败 `too_early` |
| 5 | 创意 | 自选收信朋友（小兔子/小狐狸/小鸟），做“我的铃铛传话卡” | 拼错名下 `wrong_actor`；多一位朋友回应 `extra_effect`；3 个选择互不代替（单元测试遍历） |

完成后：复盘卡（目标回顾、本节真实遇到并修好的错误、What-if：小狐狸也接“听到铃铛时”会怎样）+ 点选反思 + 作品“我的铃铛传话卡”（保存、刷新恢复、真实回放：松鼠摇铃，只有所选朋友惊喜）。

原创素材：`apps/web/public/kc-scenes/bell-tree.svg`（铃铛树），课堂内联 `BellTree` 与之一致，铃铛摇响时摆动（`data-bell-rung`）；松鼠为 `event-stage.tsx` 内联原创 `SquirrelArt`（与 CharacterArt 同一 chibi 风格，未改共享角色文件）。已登记 `assets-register.md` 与 `asset-licenses-v1.json`。

## 共享代码的小改动

- 舞台：摇铃者头顶“🔔 叮铃！”、惊喜改为头顶“✨ 哇！”气泡（原 SVG 星星画在角色画布外会被裁掉）；角色新增 `data-rang`；舞台读屏名按场景区分。
- `globals.css`：作品卡积木块“听到铃铛时”补上事件色（原先显示成动作蓝）。
- 内容单测：创意关参考程序保留松鼠等辅助角色的积木，只把收信角色换成所选朋友。

## 保存 / 恢复

本机 `localStorage` 键 `kids-event-lesson-v1:G0-U2-L03`，读取时过滤未知关卡、角色、积木和伪造的通过。不存姓名，不上传。

## 测试（2026-10-28，本地 sandbox，Chrome for Testing arm64）

- Vitest 全量：145 files / 914 tests 通过（本地先移开 build 生成、已 gitignore 的 `public/blockly-media/`）。
- ESLint：0 errors，8 个既有 warnings；`tsc --noEmit` 非测试文件 0 报错；生产 `next build` 通过。
- 真实浏览器 E2E：`tests/e2e/grid-lab.spec.ts --project=desktop`，新增 `G0-U2-L03 formal course at the bell tree…`；首轮因我写的一条断言文案与错误实验真实反馈不符而失败，改为断言页面真实文字后，基于 f316b35 重新 build 全量 grid-lab 10/10 通过（G0-U1 六课 + G0-U2 三课 + EDU-105）。
- 三断点横向溢出均为 0，无 pageerror。

## 三断点截图（真实 Chrome，JPEG 内嵌同名 `.svg`）

| 文件 | 内容 |
|---|---|
| `error-lab-1440/768/375.svg` | 错误实验：选了“铃铛响了”，运行后什么都没发生，显示预想 vs 实际 |
| `creative-1440/768/375.svg` | 创意关：选小狐狸，松鼠摇铃、小狐狸惊喜，检查通过 |
| `review-1440/768/375.svg` | 复盘卡与点选反思 |
| `project-1440/768/375.svg` | 作品“我的铃铛传话卡”回放后 |

## 教研记录与未完成项

- `docs/roadmap/teaching-reviews/G0-U2-L03.json`：实现者 AI 参考分 83/100（`independent: false`，非独立人工评分）。
- 未完成：独立人工教研复核；儿童试学（需真实儿童与监护人同意，未进行，不得模拟）；PR CI、合并、main CI 与 `-record` 关账。
- 未正式发布：成熟度 L3 实验可试玩。
