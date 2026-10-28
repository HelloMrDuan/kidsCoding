# G0-U2-L05 点击苹果让它落下（事件单元第 5 课，Hark A 正式课程化）

Task-ID：`G0-U2-L05`（lesson-task-register.json）。分支 `hark-a/g0-u2-l05`，基于 main `ad08596`。前置课 `G0-U2-L04`。复用事件舞台引擎，判定逻辑未改；新增角色 id `tree`，以及仅用于绘图的 `size`（角色宽度）与 `fallY`（掉落后位置）字段。

## 本课结构（5 关，全部由事件引擎真实运行判定）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | “被点击时 → 掉到地上”拼在苹果树名下：先点选预测，再按原样运行 | 必须真实跑出 `nothing_happened`（点苹果不动），显示“预想 vs 实际” |
| 2 | 引导 | 苹果：被点击时 → 掉到地上；检查时还会按开始旗、点树、点小狐狸 | 用“开始时” `too_early`（苹果自己掉）；小狐狸被点也有反应 `wrong_trigger` |
| 3 | 练习 A | 点苹果：掉到地上 → 摇响铃铛；小兔子听到铃铛露出惊喜 | 小兔子用“被点击时” / 苹果不摇铃 `missing_effect`；先摇铃后落 `wrong_order` |
| 4 | 练习 B（调试） | 苹果在等铃铛，小狐狸被点就摇铃：点苹果没反应，点小狐狸苹果反而掉 | 起始程序必失败：先 `nothing_happened`，修好苹果后 `wrong_trigger`，再清空小狐狸 |
| 5 | 创意 | 自选苹果落下时惊喜的朋友（小狐狸/小兔子/小鸟），做“我的苹果惊喜卡” | 拼错名下 `wrong_actor`；苹果自己掉 `too_early`；多一位朋友惊喜 `extra_effect`；3 个选择互不代替 |

完成后：复盘卡（目标回顾、本节真实遇到并修好的错误、What-if：积木拼在树上会怎样）+ 点选反思 + 作品“我的苹果惊喜卡”（保存、刷新恢复、真实回放）。

原创素材：`apps/web/public/kc-scenes/apple-tree.svg`（苹果园），课堂内联背景 `AppleOrchard`，苹果树与苹果是可点击的内联原创角色（`TreeArt`、`AppleArt`），苹果掉落有下落过渡（`data-fallen`）。已登记 `assets-register.md` 与 `asset-licenses-v1.json`。

## 本次发现并修复

- 截图发现掉落的苹果压住“苹果树”名字，调整苹果位置后三断点重拍。
- 内容反例自查：拼在苹果树名下的“掉到地上”因树做不了而永不运行，判定上等同空积木，因此删掉了一个我原先写错期望（`wrong_trigger`）的反例，单元测试暴露了这一点。
- 课程文字里的动作名统一为积木真实标签“掉到地上”。

## 保存 / 恢复

本机 `localStorage` 键 `kids-event-lesson-v1:G0-U2-L05`，读取时过滤未知关卡、角色、积木和伪造的通过。不存姓名，不上传。

## 测试（2026-10-28，本地 sandbox，Chrome for Testing arm64）

- Vitest 全量：145 files / 936 tests 通过（本地先移开 build 生成、已 gitignore 的 `public/blockly-media/`）。
- 真实浏览器 E2E：`grid-lab.spec.ts --project=desktop` 12/12 通过（G0-U1 六课 + G0-U2 五课 + EDU-105）；调整苹果位置后 G0-U2 五课 5/5 重跑通过；rebase 到 ad08596 后重新 build，全量 grid-lab 12/12 通过并重拍三断点截图。
- 三断点横向溢出均为 0，无 pageerror。

## 三断点截图（真实 Chrome，JPEG 内嵌同名 `.svg`）

| 文件 | 内容 |
|---|---|
| `error-lab-1440/768/375.svg` | 错误实验：选了“苹果落到地上”，运行后苹果一动不动，显示预想 vs 实际 |
| `creative-1440/768/375.svg` | 创意关：选小鸟，苹果掉落、摇铃、小鸟惊喜，检查通过 |
| `review-1440/768/375.svg` | 复盘卡与点选反思 |
| `project-1440/768/375.svg` | 作品“我的苹果惊喜卡”回放后 |

## 教研记录与未完成项

- `docs/roadmap/teaching-reviews/G0-U2-L05.json`：实现者 AI 参考分 83/100（`independent: false`，非独立人工评分）。
- 未完成：独立人工教研复核；儿童试学（需真实儿童与监护人同意，未进行，不得模拟）；PR CI、合并、main CI 与 `-record` 关账。
- 未正式发布：成熟度 L3 实验可试玩。
