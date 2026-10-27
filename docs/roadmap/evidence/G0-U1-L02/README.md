# G0-U1-L02 给森林邮差指路（Hark A 正式课程化）

Task-ID：`G0-U1-L02`（lesson-task-register.json）。分支 `hark-a/g0-u1-l02`，基于 main `e948d5e`。前置课 `G0-U1-L01`。

## 本课结构（5 关，全部由 grid-engine 真实运行判定）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | 蘑菇屋在正上方，起始程序却是两块“向下走一格”：先点选预测，再按原样运行 | 必须真实跑出 `out_of_bounds` 才算观察过；显示“预想 vs 实际” |
| 2 | 引导 | 拐个弯：横着 2 格 + 竖着 2 格，顺序可换 | 3 种正解；多走一格 `not_at_goal` |
| 3 | 练习 A（找路） | 绕开小河，至少两种走法 | 穿河 `fell_in_water` |
| 4 | 练习 B（调试） | 修好小兔子会掉进小河的路线 | 起始程序必失败（`fell_in_water`） |
| 5 | 创意改造 | 孩子选收信的小伙伴（小熊/小兔/小松鼠/小刺猬，4 个位置），再写不碰小河的路线 | 换收信人后旧通过作废；单元测试用 BFS 证明 4 个目标都能在干地上到达，且任一条路线只能到它自己的目标 |

完成后：复盘卡（目标回顾、本节真实遇到并修好的错误、What-if：蘑菇屋在左边用哪块积木）+ 点选反思 + 作品“我的送信路线卡”（孩子选的目标与程序，可真实回放）。

原创场景：`apps/web/public/kc-scenes/post-signpost.svg`（森林邮局 + 四向路牌），课堂内联 `Signpost` 与之几何一致，已登记 `docs/roadmap/assets-register.md` 与 `asset-licenses-v1.json`。

## 保存 / 恢复

本机 `localStorage` 键 `kids-grid-lesson-v1:G0-U1-L02`。旧版 4 关草稿里的旧关卡 id（如 `deliver-up`）读取时会被过滤，不会伪造通过。不存姓名，不上传；本机记录不是正式成绩。

## 测试（2026-10-27，本地 sandbox，Chrome for Testing arm64）

- 真实浏览器 E2E：`tests/e2e/grid-lab.spec.ts --project=desktop` 6/6 通过，其中新用例
  `G0-U1-L02 formal course: wrong-way error lab, two practices, pick a friend, review, saved and reopened`
  覆盖：错误实验猜错→运行看到走出地图→改向上 → 拐弯关多一格再修 → 练习 A 落水再修 → 练习 B 修路线 → 创意关先选人、路线不对、换人后通过 → 复盘错误记录 → 刷新重开后作品回放 → 换收信人后需补积木重跑。
  原 `G0-U1-L02 and L03` 用例按旧 4 关写，已拆为新 L02 正式用例和单独的 L03 用例。
- Vitest / lint / build 结果见 PR 描述；以 PR CI 结果为准。
- 页面横向溢出：1440 / 768 / 375 三断点均为 0。页面错误里的 `Failed to fetch` 来自 Blockly 默认远程 media（sandbox 无法访问），与本课无关。

## 三断点截图（真实 Chrome）

> 提交走 GitHub MCP 文本接口，截图以 JPEG 内嵌进同名 `.svg` 保存，尺寸与原始 Chrome 截图一致。

| 文件 | 内容 |
|---|---|
| `error-lab-1440/768/375.svg` | 错误实验：选了“往上走到蘑菇屋”，运行后走出地图，显示预想 vs 实际 |
| `creative-1440/768/375.svg` | 创意改造：信送给小熊，右 3 上 2 真实到达 |
| `review-1440/768/375.svg` | 复盘卡：真实错误记录、What-if 答案、点选反思、作品卡 |
| `project-1440/768/375.svg` | 作品“我的送信路线卡”回放后 |

截图脚本以 localStorage 预置关卡进度后再真实运行（错误实验从空白进度真实操作）；完整从头操作链路由 E2E 覆盖。

## 教研记录与未完成项

- `docs/roadmap/teaching-reviews/G0-U1-L02.json`：AI 参考分 85/100（评分者是实现者，非独立）。
- 未完成：独立人工教研复核；儿童试学（需真实儿童与监护人同意，未进行，不得模拟）；PR CI、合并、main CI 与 `-record` 关账。
