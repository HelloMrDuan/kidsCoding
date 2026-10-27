# G0-U1-L04 转个弯，绕开大石头（Hark A 正式课程化）

Task-ID：`G0-U1-L04`（lesson-task-register.json）。分支 `hark-a/g0-u1-l04`，基于 main `8d174d5`。前置课 `G0-U1-L01`～`L03`。

## 本课结构（5 关，全部由 grid-engine 真实运行判定；只用“向前走、向左转、向右转”）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | 蘑菇屋在上面 1 格，起始程序只有一块“向左转”：先点选预测，再按原样运行 | 必须真实跑出 `not_at_goal`：小狐狸原地转向朝上没走；显示“预想 vs 实际”；补“向前走”即通过 |
| 2 | 引导 | 绕过大石头 | 直走 `hit_rock`；2 种正解 |
| 3 | 练习 A | 从中间小桥过河 | 直走 `fell_in_water` |
| 4 | 练习 B（调试） | 修好小兔子转反的两次弯 | 起始程序必失败（`hit_rock`） |
| 5 | 创意改造 | 选一位朋友（小熊在石头后面、小兔、小松鼠、小刺猬），拼不撞石头的路线 | 单元测试在（格子, 朝向）上 BFS：4 个目标都可达、每条路线至少转一次、任一路线只到自己的目标；换朋友后旧通过作废 |

完成后：复盘卡（目标回顾、本节真实遇到并修好的错误、What-if：脸朝上想往右走先接哪块）+ 点选反思 + 作品“我的转弯路线卡”（可保存、刷新恢复、真实回放）。

原创场景：`apps/web/public/kc-scenes/turn-sign.svg`（路口转弯牌与小石头），课堂内联 `TurnSign` 与之几何一致，已登记 `assets-register.md` 与 `asset-licenses-v1.json`。

## 保存 / 恢复

本机 `localStorage` 键 `kids-grid-lesson-v1:G0-U1-L04`。旧版草稿里的旧关卡 id（`first-turn`）读取时被过滤，不会伪造通过。不存姓名，不上传。

## 测试（2026-10-27，本地 sandbox，Chrome for Testing arm64）

- 真实浏览器 E2E：`tests/e2e/grid-lab.spec.ts --project=desktop` 7/7 通过，其中新用例
  `G0-U1-L04 formal course: turn-in-place error lab, two practices, detour to a friend, review, saved and reopened`。
  原“L04 and L05”用例拆为新 L04 正式用例 + 单独的 L05 用例；EDU-105 朗读用例原来用 L04 第 1 关，现在 L04 第 1 关是错误实验，改用 L05 第 1 关（撞上锁着的门，“问题出在第 4 块”）。
- 单元测试：`g0-u1-grid-lessons.test.ts` 新增 L04 正式课程块；`lesson-schema.test.ts` 步骤数 +1；`kc-scenes-register.test.ts` 加入新场景。
- Vitest 全量 / lint / build 结果见 PR 描述；以 PR CI 为准。
- 三断点横向溢出均为 0。页面错误 `Failed to fetch` 来自 Blockly 远程 media（sandbox 无法访问），与本课无关。

## 三断点截图（真实 Chrome，JPEG 内嵌同名 `.svg`）

| 文件 | 内容 |
|---|---|
| `error-lab-1440/768/375.svg` | 错误实验：选了“往上走到蘑菇屋”，运行后小狐狸原地转身，显示预想 vs 实际 |
| `creative-1440/768/375.svg` | 创意改造：绕过石头到小熊家，真实到达 |
| `review-1440/768/375.svg` | 复盘卡与点选反思 |
| `project-1440/768/375.svg` | 作品“我的转弯路线卡”回放后 |

## 教研记录与未完成项

- `docs/roadmap/teaching-reviews/G0-U1-L04.json`：AI 参考分 85/100（评分者是实现者，非独立）。
- 未完成：独立人工教研复核；儿童试学（需真实儿童与监护人同意，未进行，不得模拟）；PR CI、合并、main CI 与 `-record` 关账。
