# G0-U1-L03 数一数，刚好走三步（Hark A 正式课程化）

Task-ID：`G0-U1-L03`（lesson-task-register.json）。分支 `hark-a/g0-u1-l03`。前置课 `G0-U1-L01`、`G0-U1-L02`。

## 本课结构（5 关，全部由 grid-engine 真实运行判定）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | 蘑菇屋在第 4 格，起始程序只有 2 块“向右”：先点选预测，再按原样运行 | 必须真实跑出 `not_at_goal`（停在前面一格），显示“预想 vs 实际”；补 1 块即通过 |
| 2 | 引导 | 更长的路：五步 | 3 种正解；少一块 `not_at_goal` |
| 3 | 练习 A | 脸朝左、反方向数格子（向左或向前） | 用“向右” `out_of_bounds` |
| 4 | 练习 B（调试） | 多走了一步，用“撤回最后一块”修好 | 起始程序必失败 |
| 5 | 创意改造 | 小狐狸站中间，孩子把松鼠的蘑菇屋放在左边或右边（4 个位置），再数步数 | 单元测试：每个位置正好的步数通过，少一块、多一块都失败；换位置后旧通过作废 |

完成后：复盘卡（目标回顾、本节真实遇到并修好的错误、What-if：接多一块会停在哪）+ 点选反思 + 作品“我的数数卡”（可保存、刷新恢复、真实回放）。

原创场景：`apps/web/public/kc-scenes/counting-board.svg`（松鼠的数数牌，三颗橡果标 1、2、3），课堂内联 `CountingBoard` 与之几何一致，已登记 `assets-register.md` 与 `asset-licenses-v1.json`。

## 保存 / 恢复

本机 `localStorage` 键 `kids-grid-lesson-v1:G0-U1-L03`。旧版草稿里的旧关卡 id（`exactly-three`）读取时被过滤，不会伪造通过。不存姓名，不上传。

## 测试（2026-10-27，本地 sandbox，Chrome for Testing arm64）

- 真实浏览器 E2E：`tests/e2e/grid-lab.spec.ts --project=desktop` 6/6 通过，其中新用例
  `G0-U1-L03 formal course: one-short error lab, two practices, place the house either side, review, saved and reopened`。
  原单独的 L03 用例按旧 4 关写，已由新用例替代。
- 单元测试：`g0-u1-grid-lessons.test.ts` 新增 L03 正式课程块；`lesson-schema.test.ts` 步骤数 +1；`kc-scenes-register.test.ts` 加入新场景。
- Vitest 全量 / lint / build 结果见 PR 描述；以 PR CI 为准。
- 三断点横向溢出均为 0。页面错误 `Failed to fetch` 来自 Blockly 远程 media（sandbox 无法访问），与本课无关。

## 三断点截图（真实 Chrome，JPEG 内嵌同名 `.svg`）

| 文件 | 内容 |
|---|---|
| `error-lab-1440/768/375.svg` | 错误实验：选了“刚好停在蘑菇屋”，运行后停在前面一格，显示预想 vs 实际 |
| `creative-1440/768/375.svg` | 创意改造：蘑菇屋放在最左边，3 块“向左”真实到达 |
| `review-1440/768/375.svg` | 复盘卡与点选反思 |
| `project-1440/768/375.svg` | 作品“我的数数卡”回放后 |

## 教研记录与未完成项

- `docs/roadmap/teaching-reviews/G0-U1-L03.json`：AI 参考分 85/100（评分者是实现者，非独立）。
- 未完成：独立人工教研复核；儿童试学（需真实儿童与监护人同意，未进行，不得模拟）；PR CI、合并、main CI 与 `-record` 关账。
