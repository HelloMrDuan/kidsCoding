# G0-U1-L01 按下开始，小狐狸出发（Hark A 正式课程化）

Task-ID：`G0-U1-L01`（lesson-task-register.json）。分支 `hark-a/g0-u1-l01`，基于 main `2cd2620`。

## 本课结构（5 关，全部由 grid-engine 真实运行判定）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | 只有一块箭头、没有“开始时”：先点选预测，再按原样运行 | 必须真实跑出 `no_start` 才算观察过；显示“预想 vs 实际”；可“恢复起始程序” |
| 2 | 引导 | 从树屋数格子走到蘑菇屋 | 3 块箭头；少一块 `not_at_goal`，多一块 `out_of_bounds` |
| 3 | 练习 A（边界） | 停在小河前 | 多一块 `fell_in_water` |
| 4 | 练习 B（调试） | 修小兔子程序里掉队的积木 | 起始程序必失败（`disconnected`） |
| 5 | 创意改造 | 孩子自选蘑菇屋位置（第 3～6 格），再写程序 | 换目标后旧通过作废，必须按新目标重跑 |

完成后：复盘卡（目标回顾、本节真实遇到并修好的错误、What-if 题）+ 点选反思 + 作品“我的出发卡”（孩子的地图与程序，可真实回放）。

## 保存 / 恢复

本机 `localStorage` 键 `kids-grid-lesson-v1:G0-U1-L01`：每关程序、已真实通过的关卡、错误实验观察、创意目标、真实错误记录。读取时过滤未知关卡、非法积木、越界目标和伪造的完成状态（grid-draft.test.ts）。不存姓名，不上传；本机记录不是正式成绩。

## 测试（2026-10-27，本地 sandbox，Chrome for Testing arm64）

- Vitest 全量：139 文件 828 项通过（含 g0-u1-grid-lessons.test.ts、grid-draft.test.ts、kc-scenes-register.test.ts；lesson-schema.test.ts 的真实步骤数随本课新增创意关由 24 改为 25）。
- `npm run lint`：0 error（8 个既有 warning）；`npm run build` 通过。
- 真实浏览器 E2E：`tests/e2e/grid-lab.spec.ts --project=desktop` 5/5 通过，其中新用例
  `G0-U1-L01 formal course: error lab, two practices, creative remake, review, saved and reopened`
  覆盖：错误实验先失败再修好 → 引导 → 练习 A 落水再修 → 练习 B 修掉队 → 创意关选目标、跑通、换目标后需重跑 → 复盘错误记录 → 刷新重开后作品仍在并可回放。
- 同批 `unit-project.spec.ts` 有 3 项在本 sandbox 失败，原因是页面错误断言收到 `Failed to fetch`：Blockly 默认从 `https://blockly-demo.appspot.com/static/media/` 拉取 sprites/音效，sandbox 无法访问该域名。与本课改动无关（main 上 UX-203 引入，CI 环境可访问），已另行上报，不在本任务修。
- 以 PR CI 结果为准：PR #161 首轮 CI 15 success / 2 skipped / 1 cancelled（scratch-touch-browser，与本课无关），已重新触发。

## 三断点截图（真实 Chrome）

> 本仓库提交走 GitHub MCP 文本接口，无法直接提交二进制 PNG；截图以 JPEG（质量 45～82，单文件约 100KB 内）内嵌进同名 `.svg` 文件保存，GitHub 和浏览器可直接打开查看，尺寸与原始 Chrome 截图一致。

| 文件 | 内容 |
|---|---|
| `error-lab-1440/768/375.svg` | 错误实验：选了“会往右走一格”，运行后小狐狸不动，显示预想 vs 实际 |
| `creative-1440/768/375.svg` | 创意改造：蘑菇屋搬到第 5 格，4 块箭头真实到达 |
| `review-1440/768/375.svg` | 复盘卡：真实错误记录、What-if 答案、点选反思 |
| `project-1440/768/375.svg` | 作品“我的出发卡”回放后 |

截图脚本以 localStorage 预置关卡进度后再**真实运行**（错误实验从空白进度真实操作）；完整的从头操作链路由 E2E 覆盖。截图里积木区右侧的破图块是上面所说 Blockly 远程 sprites 在 sandbox 加载失败，非本课问题。

## 教研记录与未完成项

- `docs/roadmap/teaching-reviews/G0-U1-L01.json` 已按本次实现更新：AI 参考分 85/100（评分者是实现者，非独立）。
- 未完成：负责人/独立人工教研复核；儿童试学（需真实儿童与监护人同意，未进行，不得模拟）；PR CI、合并、main CI 与 `-record` 关账。
