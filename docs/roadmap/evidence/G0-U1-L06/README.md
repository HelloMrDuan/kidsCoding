# G0-U1-L06 做一张森林寻路卡（单元作品，Hark A 正式课程化）

Task-ID：`G0-U1-L06`（lesson-task-register.json）。分支 `hark-a/g0-u1-l06`，基于 main `cdc7fe2`。前置课 `G0-U1-L01`～`L05`。G0-U1 单元六课至此都改成同一套正式课程结构。

## 本课结构（5 关，全部由 grid-engine 真实运行判定）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | 积木都对、顺序错一块（“向上”排在“捡起钥匙”前）：先点选预测，再按原样运行 | 必须真实跑出 `no_key_here`，显示“预想 vs 实际”；单元测试断言起始程序和正解是同一组积木 |
| 2 | 引导 | 热身：上排石头、下排小河，从中间走 | 直走 `hit_rock`；走下排 `fell_in_water` |
| 3 | 练习 A | 大地图上走一遍：拿钥匙、开门、到右上角 | 不捡钥匙开门 `need_key` |
| 4 | 练习 B（调试） | 修好小伙伴少了“捡起钥匙”的寻路卡 | 起始程序必失败 |
| 5 | 单元作品（创意） | 选门后 4 位新伙伴之一，在大地图上拼完整寻路卡 | 单元测试 BFS：4 个目标都只能“绕开石头小河 → 拿钥匙 → 开门 → 走到”到达，去掉捡钥匙失败，任一路线只到自己的目标；换伙伴后旧通过作废 |

完成后：复盘卡（目标回顾、本节真实遇到并修好的错误、What-if：伙伴搬到最下面怎么改）+ 点选反思 + 单元作品“我的森林寻路卡”（可保存、刷新恢复、真实回放）。

单元作品原来放在练习 A（`my-route-card`），现在移到创意关（`my-forest-card`），孩子必须自己选目标才算作品；`my-route-card` 保留为练习 A 的 id，旧草稿里的练习 A 程序不丢。

原创场景：`apps/web/public/kc-scenes/guide-map.svg`（森林向导的手绘地图），课堂内联 `GuideMap` 与之几何一致，已登记 `assets-register.md` 与 `asset-licenses-v1.json`。

## 保存 / 恢复

本机 `localStorage` 键 `kids-grid-lesson-v1:G0-U1-L06`。旧版草稿里的旧关卡 id（`warmup-key`）读取时被过滤，不会伪造通过。不存姓名，不上传。

## 测试（2026-10-27，本地 sandbox，Chrome for Testing arm64）

- 真实浏览器 E2E：`tests/e2e/grid-lab.spec.ts --project=desktop` 7/7 通过，其中新用例
  `G0-U1-L06 unit project formal course: wrong-order error lab, two practices, own forest card for a new friend, review, saved and reopened`（替代原 L06 用例）。
- 单元测试：`g0-u1-grid-lessons.test.ts` 新增 L06 正式课程块，六课全部按 5 关结构检查；`lesson-schema.test.ts` 步骤数 +1；`kc-scenes-register.test.ts` 加入新场景。
- Vitest 全量 / lint / build 结果见 PR 描述；以 PR CI 为准。
- 三断点横向溢出均为 0。页面错误 `Failed to fetch` 来自 Blockly 远程 media（sandbox 无法访问），与本课无关。

## 三断点截图（真实 Chrome，JPEG 内嵌同名 `.svg`）

| 文件 | 内容 |
|---|---|
| `error-lab-1440/768/375.svg` | 错误实验：选了“一路顺利走到蘑菇屋”，运行后在没有钥匙的地方捡钥匙，显示预想 vs 实际 |
| `creative-1440/768/375.svg` | 单元作品：给门后最下面的小刺猬做寻路卡，真实到达 |
| `review-1440/768/375.svg` | 复盘卡与点选反思 |
| `project-1440/768/375.svg` | 单元作品“我的森林寻路卡”回放后 |

## 教研记录与未完成项

- `docs/roadmap/teaching-reviews/G0-U1-L06.json`：AI 参考分 85/100（评分者是实现者，非独立）。
- 未完成：独立人工教研复核；儿童试学（需真实儿童与监护人同意，未进行，不得模拟）；PR CI、合并、main CI 与 `-record` 关账。
