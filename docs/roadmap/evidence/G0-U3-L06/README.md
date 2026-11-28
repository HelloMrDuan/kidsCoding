# G0-U3-L06 森林节奏演出（循环单元第 6 课，OPS-055 真实 sound 能力 + 可玩课程）

Task-ID：`OPS-055`（task-register.json）。分支 `codex/ops-055-g0-u3-l06-sound`，基于 OPS-054（#579，Draft）HEAD `245c3f9b`，依赖 #579 先合并。知识点：节拍、循环、同步综合。本课在统一 V3 事件工作台上运行，不新建工作台外壳。

## 本课结构（5 关，全部由事件引擎真实运行判定）

| 关 | 类型 | 内容 | 关键判定 |
|---|---|---|---|
| 1 | 错误实验 | 小狐狸的程序“重复 4 次（空）” | 原样运行必须真实跑出 `empty_repeat`（0 下鼓声、节奏记录为空）；放入“敲鼓、敲鼓、跳一下”通过（记录 `ddj`×4，8 下鼓）；重复 3 次 `missing_effect`、5 次 `extra_effect` |
| 2 | 引导 | 先设计一轮节奏：咚、咚、跳 | 只有两下鼓 `missing_effect`；无“开始时” `no_hat`；两轮 `extra_effect` |
| 3 | 练习 A | 小兔子先“走上舞台”，再“重复 4 次（咚、咚、跳）”，与小狐狸同步 | 不入场 `out_of_sync`；3 次 `missing_effect`；顺序“咚、跳、咚” `out_of_sync` |
| 4 | 练习 B（调试） | 小兔子“重复 4 次（敲鼓、跳一下、敲鼓）”，次数对、顺序错 | 起始程序必失败 `out_of_sync`（记录 `djd`×4）；改为咚、咚、跳通过；空重复 `empty_repeat` |
| 5 | 创意改造 | 主歌下面再接“重复 2 次（副歌）”，副歌可选“跳、跳、咚”或“咚、跳” | 两人都不加 / 只给小狐狸加 `missing_effect`（按角色判定）；两人都加才通过 |

完成后：复盘卡（What-if：演 6 轮怎么改）+ 点选反思（8 下鼓、4 下跳，然后停下）+ 作品“森林节奏演出”（保存、刷新恢复、真实回放，回放同样敲真实鼓声）。

## 本课带来的共享改动

- 声音（新增 `apps/web/src/features/lessons/event-v3/event-v3-audio.ts`，`EventDrumKit`）：Web Audio 现场合成鼓声（正弦振荡器 150Hz→50Hz 下扫 + 指数衰减，约 0.3 秒），不加载任何音频文件、无网络请求。AudioContext 只在用户点击（运行按钮、开始旗、点角色）的回调内创建或恢复，兼容 `webkitAudioContext`；只有能敲鼓的关卡才创建；不支持时静默降级，动作与判定不变。
- 运行适配器（`event-v3-run-adapter.ts`）：每 520ms 揭示一拍，同一拍里的 `drum_beat` 在揭示时敲响，声音与动作同一个计时器；`beginRun()` 在每次运行前释放旧节点、计数归零（重复运行不叠加）；`stop()` / `reset()` 调 `stopAll()`；`dispose()` 在离开页面时关闭 AudioContext。舞台 data 属性 `data-drum-hits`、`data-drum-live`、`data-audio-supported` 直接读自 `EventDrumKit`，供 E2E 读取，没有 mock。
- 自由试玩（`playFree()`）：只对有 `drum_beat` 能力的关卡启用（`eventLevelCanDrum`）。开始旗 / 点角色时用同一个事件引擎、同一个 520ms 节拍计时器和同一个 `EventDrumKit` 逐拍揭示、逐拍出声，不会一次性播完全部鼓声；之前的交互直接显示，只有最新一次交互逐拍播放。自由试玩不产生判定、不改草稿、不加进度。停止（运行检查接管）、切关、编辑、重新运行、离开页面都经适配器 `stop` / `reset` / `dispose` 清掉计时器与鼓声节点。G0-U2 六节课与 G0-U3-L04 没有能敲鼓的角色，仍走原来的 `runEventProgram` 即时显示，行为不变。
- 事件引擎（`event-engine.ts`）：新动作 `drum_beat` / `jump`；角色状态新增 `rhythm`（`d` = 鼓，`j` = 跳）；表演舞台（`parallel`）上按角色比较，整体少一轮 / 多一轮判为 `missing_effect` / `extra_effect` 并指出是谁；只有“铃声”触发的脚本才按 `EVENT_MAX_EFFECTS` 判为停不下来，无铃声的有限程序只在防伪造上限 `EVENT_HARD_MAX_EFFECTS = 1000` 截断。G0-U2 六课与 L04 判定不变，原测试全部通过。
- 舞台（`event-stage.tsx`）：跳跃时角色上移、敲鼓时显示鼓点气泡、每位角色下方显示节奏记录（圆点 = 鼓，竖条 = 跳），新增 `data-rhythm` / `data-last-action`。鼓点气泡和节奏记录已裁定保留：属于 L06 专属的教学反馈，不违反 V2 视觉冻结；工作台外壳、布局与配色没动，也没有加其他装饰。
- 积木：`register-kids-blocks.ts`、`block-labels.ts` 新增“敲鼓”“跳一下”。
- 能力登记（`engine-capabilities.ts`）：新增 `sound`（指向 event-v3-audio.ts + run-adapter），`visual_effect` 补上 L06 的跳跃、鼓点与节奏记录。详案 L06 的 `finite_repeat, movement, visual_effect, sound` 不再缺失。
- 入口：`/studio/blockly/event/G0-U3-L06` 由 V3 事件工作台提供；旧 `/learn/event-lab/G0-U3-L06` 308 跳过去；两个 grid 入口保持 404。课程目录成熟度改为 3（实验可试玩）。
- `release-evidence-v1.json` 新增 L06 条目，全部 `unchecked`，只引用真实存在的文件。

## 测试（2026-11-26，本地 Windows 11，Playwright Desktop Chrome + Pixel 7 移动端仿真，3110 生产构建 BUILD_ID `3UsBnbOdu3ed2w_cAplwz`）

- 定向 Vitest（event、event-v3、grid-v3、blockly、curriculum、content/curriculum）：50 个文件、617 条全部通过，exit=0（Node 22）。
- 自由试玩补声音后复跑 event + event-v3：6 个文件、79 条全部通过，exit=0。新增 4 条：开始旗逐拍出声（累计鼓声 0→2→4→4→6→8→8，从不一次性播完）、第二次点击不叠加、stop / reset / 运行检查接管 / dispose 清理计时器与节点、无鼓关卡（G0-U2-L01）不创建 AudioContext 也不排计时器。
- 全量 Vitest：278 个文件中 4 个失败、3 条失败（`scripts/lesson-scaffold.test.ts`、`g2-u3-l02`、`g2-u3-l03`、`g2-u3-l05/judge.vm.test.ts`），与 main 基线一致，已在临时 main worktree 复核，均与本任务无关。
- `tsc --noEmit`：81 条错误，与 main 基线一致（例如 `tests/e2e/scratch-cloud-delete-restore-cloud104.spec.ts` 的隐式 any），本任务没有新增。
- ESLint：本任务改动和新增的 ts/tsx 文件 exit=0（自由试玩改动的 4 个文件已复跑）。
- 生产 `next build`（Node 20.17.0）：Compiled successfully，exit=0。
- L06 E2E（`grid-lab.spec.ts -g "G0-U3-L06"`，最终代码）：desktop 2 passed；mobile 1 passed、1 skipped（三断点用例只在 desktop 跑），exit=0。覆盖：从课程介绍页进入；错误实验不能跳过；空重复 0 下鼓；修正后 8 下鼓、发声节点归零；中途停止后鼓声计数不再增长、发声节点为 0；重跑从 0 重新计数，不叠加；**自由试玩**：开始旗后鼓声逐拍增长（先 ≥2 且 <8，最终 8），反馈仍是“自由试一试”（tone idle），进度仍是第 1 关；自由试玩中途运行检查接管，只剩运行检查的 8 下；自由试玩中途切关，鼓声计数与发声节点立即为 0，等 1.5 秒仍为 0；引导、练习 A/B、创意关只改一人失败、两人都改通过（20 下鼓）；复盘、作品回放 20 下鼓；保存、刷新恢复；访客 B 看不到 A 的作品，回到 A 后恢复。
- 共享事件引擎回归（G0-U2、G0-U3 含 L04、OPS-052/053/054，desktop + mobile 共 82 条，自由试玩补声音后在新构建上复跑）：60 passed、22 skipped（desktop-only 用例在 mobile 跳过），0 failed，exit=0，用时 12.9 分钟。
- 三断点横向溢出均为 0。

### 声音证据的边界（两类分开记录）

- **真实音频节点测试（已做）**：E2E 读舞台上由 `EventDrumKit` 直接写出的 `data-audio-supported`（浏览器真实创建了 AudioContext）、`data-drum-hits`（本次敲了几下）、`data-drum-live`（还在发声的节点数）。这能证明鼓声节点按拍创建、按时释放、不叠加，但**不能证明扬声器真的发出了声音**。
- **人工耳听验收（未做）**：没有人实际听过；iOS Safari、Android 真机也没有测。等用户验收。

## 验收截图（本地 Playwright，最终代码，3110 生产构建）

| 文件 | 场景 |
|---|---|
| `run-check-desktop.png` / `run-check-mobile.png` | 真实运行检查：错误实验修正后运行检查通过，8 下鼓，发声节点归零 |
| `free-play-desktop.png` / `free-play-mobile.png` | 自由试玩：按开始旗后逐拍演完，8 下鼓，反馈“自由试一试”，不判定、进度仍为第 1 关 |
| `project-replay-desktop.png` / `project-replay-mobile.png` | 作品回放：作品卡回放 20 下鼓（主歌 + 副歌） |
| `error-lab-1440.png` / `error-lab-768.png` / `error-lab-375.png` | 三断点：错误实验原样运行后的预想与实际（1440×900、768×1024、375×812），横向溢出为 0 |

desktop 为 1280×720 Desktop Chrome，mobile 为 Pixel 7 仿真；均为本地截图，不是 CI 产物，也不是真机。

## 已知差异与未完成项

- 自由试玩声音：已在 OPS-055 内补齐（方案②），不再是差异。
- 鼓点气泡与节奏记录：已裁定保留，不再待审。
- 未完成：独立人工教研（本课由实现者 AI 编写，尚无教研记录）；儿童试学（未进行，不得模拟）；人工耳听与 iOS Safari / Android 真机验收；创意关 / 复盘的三断点截图；PR CI 中 `scratch-real-vm-shard-s3` 超时 cancelled（CI 分片治理由主 Muse 另行负责，本任务不改 workflow）；独立审核、合并、main CI 与关账。成熟度 L3 实验可试玩，未正式发布。
