# G0-U1-L05 先拿钥匙再开门（Hark A 正式课程化）

Task-ID：`G0-U1-L05`（lesson-task-register.json）。分支 `hark-a/g0-u1-l05`，基于 main `1e26cfc`。前置课 `G0-U1-L01`～`L04`。

## 本课结构（5 关，全部由 grid-engine 真实运行判定）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | 起始程序一直向右 4 格，没捡钥匙也没开门：先点选预测，再按原样运行 | 必须真实跑出 `door_locked`（撞在锁着的门上），显示“预想 vs 实际”；重拼“捡钥匙 → 开门 → 走过去”通过 |
| 2 | 引导 | 钥匙不在路上（在上面一排） | 在没钥匙的格子捡 `no_key_here`；不拿钥匙开门 `need_key` |
| 3 | 练习 A | 钥匙在左下角，自己设计绕远路的路线 | 不拿钥匙开门 `need_key` |
| 4 | 练习 B（调试） | 小兔子路过钥匙没捡，把“捡起钥匙”放到对的位置 | 起始程序必失败 |
| 5 | 创意改造 | 选门后 4 位朋友之一，拼“拿钥匙 → 开门 → 走到朋友家” | 单元测试在（格子, 有无钥匙, 门开没开）上 BFS：4 个目标都可达，去掉捡钥匙或对调顺序都失败，任一路线只到自己的目标；换朋友后旧通过作废 |

完成后：复盘卡（目标回顾、本节真实遇到并修好的错误、What-if：开门放到捡钥匙前面会怎样）+ 点选反思 + 作品“我的开门卡”（可保存、刷新恢复、真实回放）。

原创场景：`apps/web/public/kc-scenes/key-hook.svg`（钥匙挂钩牌：钥匙 → 箭头 → 小锁），课堂内联 `KeyHook` 与之几何一致，已登记 `assets-register.md` 与 `asset-licenses-v1.json`。

## 顺带修复（同一页面，影响 L02/L04/L05 的创意关）

创意关的“故事化选项”（如“小熊 · 门正对面”）在 768 宽时被挤成一行 4 个，文字被截断。现在有 `labels` 的选项固定一行 2 个；没有 `labels` 的（L01、L03 的“第 x 格”）仍是宽屏一行 4 个。L05 E2E 断言 4 个选项都没有被截断。

## 保存 / 恢复

本机 `localStorage` 键 `kids-grid-lesson-v1:G0-U1-L05`。旧版草稿里的旧关卡 id（`key-then-door`）读取时被过滤，不会伪造通过。不存姓名，不上传。

## 测试（2026-10-27，本地 sandbox，Chrome for Testing arm64）

- 真实浏览器 E2E：`tests/e2e/grid-lab.spec.ts --project=desktop`，新用例
  `G0-U1-L05 formal course: locked-door error lab, two practices, a friend behind the door, review, saved and reopened`（替代原 L05 小用例）。
  EDU-105 朗读用例：错误实验显示“预想 vs 实际”而不是“问题出在第几块”，所以改为用已保存的草稿直接进入 L05 第 2 关，在没有钥匙的格子“捡起钥匙”，验证“问题出在第 4 块”和中文朗读。
- 单元测试：`g0-u1-grid-lessons.test.ts` 新增 L05 正式课程块；`lesson-schema.test.ts` 步骤数 +1；`kc-scenes-register.test.ts` 加入新场景。
- Vitest 全量 / lint / build 结果见 PR 描述；以 PR CI 为准。
- 三断点横向溢出均为 0。页面错误 `Failed to fetch` 来自 Blockly 远程 media（sandbox 无法访问），与本课无关。

## 三断点截图（真实 Chrome，JPEG 内嵌同名 `.svg`）

| 文件 | 内容 |
|---|---|
| `error-lab-1440/768/375.svg` | 错误实验：选了“穿过门走到蘑菇屋”，运行后撞在锁着的门上，显示预想 vs 实际 |
| `creative-1440/768/375.svg` | 创意改造：拿钥匙、开门、走到小熊家 |
| `review-1440/768/375.svg` | 复盘卡与点选反思 |
| `project-1440/768/375.svg` | 作品“我的开门卡”回放后 |

## 教研记录与未完成项

- `docs/roadmap/teaching-reviews/G0-U1-L05.json`：AI 参考分 85/100（评分者是实现者，非独立）。
- 未完成：独立人工教研复核；儿童试学（需真实儿童与监护人同意，未进行，不得模拟）；PR CI、合并、main CI 与 `-record` 关账。
