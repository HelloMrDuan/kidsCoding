# Kiro（3 号）→ 新 Muse 交接文档

日期：2026-11-11　　交接人：3 号 Kiro　　接收人：新 Muse　　仓库：HelloMrDuan/kidsCoding

> **怎么读这份文档**：每一条事实都标了来源（PR 号、提交、CI 运行、文件路径）。我在仓库、GitHub 上**核实不了**的，一律写“待核实”，没有猜。
> 先读第 0 节的“五种状态”，再读第 1 节基线。**“代码已合并”不等于“课程完成”。**

## 0. 五种状态——不要混用

| 状态 | 含义 | L02 | L03 | L04 |
|---|---|---|---|---|
| ① 代码已合并 | PR 合并进 main | 是（#470） | 是（#494） | 是（#499） |
| ② 工程测试通过 | 有真实 VM / 真实 Chrome 的 CI 或本地运行证据 | 是 | 是 | 是 |
| ③ 独立教研通过 | 有教研人员的书面结论 | **否** | **否** | **否** |
| ④ 儿童试学通过 | 真实孩子用过并有记录 | **否** | **否** | **否** |
| ⑤ 正式发布 | 目录从 `outline_not_playable` 变为可玩 | **否** | **否** | **否** |

三课的目录状态都仍是 `outline_not_playable`，教学参数 L02/L03 是 `pilot-approved`、L04 是 `proposed`（**尚无首席裁定**）。**三课都不得标 `completed`。** 本地测试用的是 Chromium，不是 Chrome 稳定版；CI 用真实 Chrome；没有真实手机/平板。

## 1. 项目当前基线（我在 2026-11-11 重新核实的，不是照抄）

- main HEAD：`972689649befd36a93e7e5c06df47f07c946a64e`（`97268964`，即 #499 的合并提交）。
- 该提交上三个主线工作流全部 success：curriculum content checks（运行 42973990177）、deploy-pipeline（42973990179）、mandatory task accountability（42973990229）。该运行里 37 个课程 Job 0 个非成功，其中 `g2-u3-l02-browser-trial`、`g2-u3-l03-browser-trial`（171 总 / 164 通过 / 7 跳过 / 0 失败）、`g2-u3-l04-*`（4 个）都是 success。
- 台账（`docs/roadmap/lesson-task-register.json` @main）：`G2-U3-L01..L04` 都是 `in_review`，**`mergeCommit` 均为空**；`L05`、`L06` 是 `todo`。**这与事实不符，见第 9 节第 1 条。**
- 我的所有分支都在远程，没有未推送的代码（第 10 节）。

## 2. 历史任务总表

范围：我只列在 GitHub 上能核实“我的分支前缀是 `kiro/`”或“我留下了评论/复核记录”的工作。**所有 PR 的作者字段都是同一个登录名（HelloMrDuan），不能靠作者区分，我是靠分支前缀 `kiro/*` 和评论内容判定的。** 其他账号的分支前缀是 `muse-c/*`、`hark-b/*` 等，不是我的。

“最初来源”：我对话最早期的任务分配记录不在仓库里。**能在 GitHub 查到的只有各 PR 评论里的称呼**（如“@2 号 / 首席”）。谁、哪天分配的，**待核实**。

| # | Task-ID | 名称 | 分支 | PR | 合并提交 / HEAD | 状态 | 剩余 |
|---|---|---|---|---|---|---|---|
| 1 | G2-U3-L02 | 接住掉落水果 | `kiro/p0-g2-u3-l02` | #470 | merge `5d4b5022`，head `8f9395c5` | ① ② 是；③④⑤ 否 | 台账未关账；#492 未合并 |
| 2 | SYS-122 | L02 专属测试接入 curriculum-content CI | `kiro/ci-g2-u3-l02-coverage` | #471 | merge `c23e3619`，head `52e0887a` | ① ② 是 | 无 |
| 3 | （演练，无 Task-ID） | 验证 SYS-122 新 Job 失败时证据上传 | `kiro/ci-drill-g2-u3-l02-DELETE-ME`（**远程分支已不存在**） | #472 | head `b7d8b735` | **已关闭，未合并（按设计）** | 无；谁删的分支我无法在仓库里确认 |
| 4 | G2-U3-L02（台账） | L02 台账改为已合并事实 | `kiro/g2-u3-l02-ledger-merged` | **#492（open, Draft）** | head `24d5c2a2` | **未合并** | 见第 9 节第 1 条 |
| 5 | G2-U3-L03 | 随机出现的礼物 | `kiro/p0-g2-u3-l03` | #494 | merge `1c17f7b3`，head `5d8432fe` | ① ② 是；③④⑤ 否 | 台账未关账 |
| 6 | G2-U3-L04 | 判断碰撞得分 | `kiro/p0-g2-u3-l04` | #499 | merge `97268964`，head `9c811b81` | ① ② 是；③④⑤ 否 | 台账未关账；参数 `proposed` |
| 7 | G2-U3-L05 | 倒计时游戏结束 | `kiro/p0-g2-u3-l05` | **无 PR** | head 见第 10 节 | **部分完成（仅核心层）** | 见第 4 节 |
| 8 | （复核）| #478 A1-U3-L02 非作者技术复核 | —（别人的分支 `muse-c/a1-u3-l02-p0-r2`） | #478 | 已由他人合并 | 我只留了复核评论 | 无 |
| 9 | （联合验收）| #480 OPS-022 共享壳 D1 + Gap A | —（别人的分支） | #480 | 已由他人合并 | 我只留了验收评论 | 无 |
| 10 | （需求/缺陷报告）| #469 共享工作区最小接口需求与 D1 缺陷交接 | —（别人的分支） | #469 | 已由他人合并 | 我只留了评论 | 无 |

**不是我的、不要认领的相邻任务**：`G2-U3-L01`（#271，分支 `hark-b/g2-u3-l01`，已合并）、`G2-U3-L06`（`todo`，我没有碰过）、`OPS-029`（#505）、`OPS-030`（#495/#500）、`A1-*`。我在仓库里**没有找到**我碰过 L01 / L06 的证据（我的三个课程分支对 L01/L06 的文件改动为 0）。如果我早期对话里有过 L01/L06 的口头安排，**待核实**，仓库里没有留下记录。

## 3. 已完成任务和合并证据

### 3.1 G2-U3-L02《接住掉落水果》— #470
- 合并：2026-11-08T06:19:31Z，merge `5d4b50225a7c0a20d05652d7c55cb26923c099c4`，50 个文件 +6996/−7。
- 内容：真实 Scratch VM 课堂样板；首个接入共享 `LessonWorkspace` 的 Scratch 课；四关、三层判定、草稿 fail-closed、三端布局。
- 测试证据：本课 Vitest 137 通过 + 2 个预期失败（共享壳缺陷 D2）；`g2-u3-l02-vm.spec.ts` 22/22；三个 spec 合计 99 实例，本地 92 通过 / 7 跳过 / 0 失败（Chromium 153）。变异检验 17 处全部被抓到，并发现修复 2 个“漏网”。证据：`docs/roadmap/evidence/G2-U3-L02/README.md`。
- 主线 CI（merge 提交）：curriculum content 42454271410 success、deploy 42454271424 success、task accountability 42454271378 success。
- 审核记录：首席（kid小宝）技术 PASS，写在 #470 评论里（2026-11-08T06:18）。
- **重要更正（我自己写在 README 里的）**：#470 页面上最初的 success 并没有执行本课测试，那些 success 不能当作本课测试通过的证据；本课 CI 覆盖由 #471（SYS-122）补上。

### 3.2 SYS-122 — #471
- 合并：2026-11-08T11:41:22Z，merge `c23e3619`；2 个文件 +65/−0（workflow 新增 L02 专属 Job + 台账登记）。
- 真实 Chrome：92 passed / 7 skipped / 0 failed（2 号复核评论里的数字）。非作者复核 PASS 是 **2 号**，写在 #471 评论里（2026-11-08T11:40）。
- #472 是它的失败演练（故意让 Job 失败看证据是否上传），**不是要合并的**，已关闭。

### 3.3 G2-U3-L03《随机出现的礼物》— #494
- 合并：2026-11-09T12:10:50Z，merge `1c17f7b3eabab9c8d7cf2cef38821b6af5472506`，合并时的 head `5d8432fe`。
- 内容：学生自己决定 `在……之间取随机数` 的下界和上界；固定种子演示关；三层判定；知识证据读真实 `operator_random` 收到的上下界。
- 测试证据：Vitest 143；Playwright 171 实例 **164 通过 / 7 跳过 / 0 失败**（本地）。CI Job `g2-u3-l03-browser-trial` 在合并前的 head `5d8432fe` 上 success（运行 42568478457，测试 390 s，Job 446 s）。20 处变异 20/20 被发现。证据：`docs/roadmap/evidence/G2-U3-L03/README.md`。
- **两个必须如实记录的事实**：
  1. **我在 GitHub 上找不到 4 号对 #494 的 PASS**：#494 的 review 为空，评论里全是我自己发的请求。“4 号已报告 PASS”来自首席对我的指令，我**无法在仓库里独立核实**——**待核实**。
  2. **#494 的合并提交 `1c17f7b3` 上，主线课程检查和 deploy 当时是 failure**（运行 42614849372 / 42614849466）。原因是 `ubuntu-latest` 变成了 ubuntu-26.04，Playwright 不支持，所有装 Chrome 的 Job 都在安装步失败，**不是 L03 的缺陷**。后来 OPS-029（#505）修复，L03 Job 在 `97268964` 上才重新验证为绿。所以关账时 L03 的 `mainCI` 应填 `97268964` 那次运行，**不要**填 `1c17f7b3` 自己的运行。
- 其他：F1（Job 超时 25→15）、F2（PR 正文残留）、F3（README 数字订正）是 4 号复核提出、我已修复的三项；L03 的 `focusConcept` 按首席裁定由“判断”改为“随机数与取值范围”。

### 3.4 G2-U3-L04《判断碰撞得分》— #499（实现细节见第 5 节）
- 合并：2026-11-11T06:39:42Z，merge `972689649befd36a93e7e5c06df47f07c946a64e`，合并时 head `9c811b81772212c6f38829c6c8716c538015f797`。
- 审核：**4 号（kid四号小宝）非作者复核 PASS**，是 #499 上的一条 `COMMENTED` 型 review（commit `9c811b81`），包含 7 条非阻塞观察（第 9 节第 5 条）。**注意它是 COMMENTED，不是 GitHub 的 APPROVED。**
- 合并人：HelloMrDuan（主 Muse 账号）。
- 最终 CI（head `9c811b81`，运行 42956548359，真实 Chrome，ubuntu-24.04）：
  - `g2-u3-l04-vm-trial`：124 总 / 124 通过 / 0 跳过 / 0 失败，311 s。
  - `g2-u3-l04-browser-trial`：desktop 27/29 通过（2 跳过）、tablet 26/29（3 跳过）、phone 27/29（2 跳过），0 失败，242/273/263 s。
  - 4 个工作流共 48 个 Job：45 success、3 skipped（`build`、两个 `wake-machine`，部署类条件跳过）、0 失败。
- 主线 CI（merge 提交）：三个工作流全部 success（见第 1 节）。

## 4. 未完成任务及接管优先级

| 优先级 | 事项 | 为什么 | 做什么 |
|---|---|---|---|
| **P1** | **关账 L02 / L03 / L04 台账** | 三个 PR 已合并，台账仍写 `in_review`、`mergeCommit` 为空，与事实不符 | 见第 9 节第 1 条的关账数据；`completed` 需要独立审核与完整证据，**目前教研/试学都没有，不要写 completed**，写 `merged_waiting_ci` 或首席指定的状态 |
| **P1** | **#492 处理** | 仍是 open Draft，与当前 main 能干净合并（我用 `git merge-tree` 验证过），内容是把 L02 台账改为已合并事实 | 决定：合并、或关闭后由新的统一关账 PR 取代（别重复） |
| **P2** | 首席裁定 L05 的 `focusConcept` 与参数 | 见第 9 节第 3 条 | 裁定之前不要写 L05 文案 |
| **P2** | 首席裁定 L04 的教学参数 | 目前 `proposed` | 见第 9 节第 4 条 |
| **P3** | 继续 L05 | 只有核心层 | 见下 |

### G2-U3-L05《倒计时游戏结束》——部分完成（只有核心层）
- 分支：`kiro/p0-g2-u3-l05`，**无 PR，台账仍是 `todo`**。HEAD 用 `git rev-parse origin/kiro/p0-g2-u3-l05` 读取。
- **已有**（相对 main 只新增文件，共 12 个，不碰共享文件）：
  - `apps/web/src/features/lessons/g2-u3-l05/params.ts`（参数，全部 `proposed`；三个关卡起点 10/10/6 秒）
  - `program.ts`（程序模型与校验）、`compile.ts`（编译成 Scratch 工程：舞台变量 `timeLeft`、`score`、广播“游戏结束”；`学生` 角色；课程自带 `水果` 得分脚本）
  - `judge.ts`（三层判定）
  - `testing/node-vm-runner.ts`（**仅测试用**：Node 里用真实 scratch-vm + 虚拟时钟）
  - `judge.vm.test.ts`（19 条，真实 VM 判定矩阵）、`program.test.ts`（10 条）
  - `docs/curriculum/g2-u3-l05/`：`TEACHING-PLAN.md`、`HANDOFF.md`、`probe-countdown-virtual-clock.cjs`、`mutate-l05.py`
- **已验证（本地，不是 CI）**：29 条测试通过；20 处变异 19 个 `KILLED` + 1 个 `KILLED(超时)` + 0 个存活。2026-11-11 在合并最新 main 之后重新跑过，结果相同。
- **虚拟时钟机制**：`control_wait` 取全局时钟（浏览器里是 `self.performance.now`，Node 里退回 `Date.now`；`Timer` 打包后取不到）。运行器把时钟换成每帧前进 1000/30 ms 的虚拟值，倒计时 10 秒变成确定的约 310 帧，不用真等。
- **死循环问题（已复现、已处理）**：调度器一帧内会反复轮询“等待”中的线程，直到有重绘请求或用掉 75% 帧时间；虚拟时钟一帧内不走，所以会**死循环**（探针在第 3 帧挂住）。处理：每跑一遍线程就 `requestRedraw()`（见 `node-vm-runner.ts` 里包装 `sequencer.stepThread`）。变异第 19 项“运行器不请求重绘”就是靠超时发现的，说明这条被测试保护。**浏览器沙箱里必须做同样的事。**
- **实测值**：标准做法 `timeLeft` 数到 0、广播在第 311 帧附近、得分停在 19；没有判断、固定重复 15 次时 `timeLeft` 变成 **-5**。
- **过程中修的真实缺陷**：`timeLeft` 初始就是 0，所以空程序也“停在 0”，舞台层原先会误判通过——已改为必须真的从大于 0 数下来。
- **没做（绝不能误报完成）**：浏览器沙箱 iframe（虚拟时钟只在 Node 里验证过，**不能拿 Node 结果代替真实 Chrome**）、UI（Blockly 编辑器/舞台/任务面板）、会话、课程适配器、草稿、路由页、E2E、CI Job、证据 README、台账、PR。
- **不支持**：学生用 `如果 timeLeft > 0` 的写法（积木集里只有“重复直到”）。

## 5. G2 Scratch 技术架构

```
学生脚本(Blockly) ──► program.ts(数据+校验) ──► compile.ts(生成 sb3 JSON)
                                                     │
                       LessonWorkspace(壳) ◄── lesson-adapter.ts ◄── session.ts ◄── vm-adapter.ts
                                                                           │ postMessage
                                          iframe sandbox="allow-scripts"(无 same-origin)
                                          scratch-gX-uY-lZ-sandbox.html: 真实 scratch-vm (+ L04: scratch-render)
                                                     │ 观察真实积木执行
                                          RunTrace ──► judge.ts(纯函数: 舞台/任务/知识三层)
```

- 共享壳：`apps/web/src/features/lessons/workspace/lesson-workspace.tsx`（**不要改**；课程只通过槽位和适配器接入）。
- 课程目录模板（L04，最完整）：`apps/web/src/features/lessons/g2-u3-l04/`：`params.ts`、`program.ts`、`compile.ts`、`judge.ts`、`state.ts`、`session.ts`、`lesson-adapter.ts`、`vm-adapter.ts`、`reference.ts`、`stage-state.ts`、`ui/`。路由页：`apps/web/src/app/learn/g2-u3-l04/page.tsx`。
- 沙箱页：`apps/web/public/scratch-g2-u3-l0{2,3,4}-sandbox.html`。
- 三层判定口径：舞台结果（舞台上看得到的）/ 任务结果（行为是否达标）/ 知识证据（是否由该知识点决定了结果）；永远附一条“理解情况”说明，**不写“已掌握”**。
- 判定只对“程序指纹 + 关卡 + 运行序号”一致的轨迹有效；编辑/切关/载入都清旧判定；通过状态不进草稿。

### L04 关键细节（#499）
- **版本**：`scratch-vm@5.0.300`、`scratch-storage@4.0.0`、`scratch-render@2.2.84`（`apps/web/package.json`，lockfile 同；lockfile 的下载源全仓库统一是 npmmirror，758 处）。
- **自托管**：`apps/web/scripts/copy-scratch-vm.mjs` 在 prebuild 里**同一次清空+复制**三个文件到 `public/scratch-vm/`（该目录被 gitignore，仓库里 0 个文件）；安装版、`package.json`、lockfile 三处必须都是 2.2.84，否则脚本退出码 1（我用 2.2.83 验证过）。清空后重跑脚本可复现三个文件，`scratch-render.js` 哈希与 `node_modules` 一致。
- **原生碰撞**：`compile.ts` 生成真实 opcode `sensing_touchingobject`（检测“篮子”）+ `control_if` + `data_changevariableby` + `looks_hide`。**没有渲染器时 `isTouchingSprite` 恒为 false**（`docs/curriculum/g2-u3-l04/probe-touch-without-renderer.cjs`、`BLOCKER-TOUCHING.md`）。所以正式沙箱必须 `attachRenderer`，spike 见 `SPIKE-RENDERER.md` 与 `apps/web/public/scratch-render-spike-sandbox.html`、`g2-u3-l04-renderer-spike.spec.ts`。
- **两个硬性前提**（`scratch-g2-u3-l04-sandbox.html`）：① 必须设置 `vm.runtime.currentStepTime` 再 `_step()`，否则线程调度器一个线程都不前进；② 必须等 SVG 造型就绪（`waitForSkins`），否则 touching 用占位尺寸，结果是错的。超时必须明确报错，不能静默继续。
- **碰撞计分与防重复**：红球落在篮子上停留 8 帧（速度 10，第 21–28 帧），每帧都碰到；不带“隐藏”的程序红球被加 **8** 次分（速度 5 时 16 次）；标准做法 `如果碰到篮子 { 得分+1; 隐藏 }` 只加 1 次。边界（4 号独立重算并确认）：速度 10 第 21 帧首次碰到，重复 20 得 0、21 通过；速度 5 第 41 帧首次碰到，重复 30/40 得 0、41/50 通过。
- **两个球**：学生脚本被复制到红球（落在篮子上）和蓝球（落在地上）两个角色上，共用 Stage 变量 `得分`。沙箱逐块比较两份脚本必须一致，否则拒绝（这是变异检验里发现并修复的真实漏洞）。
- **三层判定**（`judge.ts`）：舞台＝最终得分等于本关要求；任务＝逐球核算（红球恰好一次且加的是本关分数，蓝球零次）；知识＝每一次加分的**同一帧、同一个球**都有一次返回 true 的 `碰到 篮子？`检查。迁移 A（每球 2 分）里“不用如果、总分碰巧对”会被任务层和知识层同时抓住。两个等价变异体（总体判定忽略知识证据/忽略舞台）在真实两球结构里不可区分，已在 `TEACHING-PLAN.md` 第十节和证据 README 记录。
- **沙箱安全**：`<iframe sandbox="allow-scripts">`（无 same-origin）；CSP 与 L02/L03 逐字相同，**只多 `img-src data:`**（渲染器把 SVG 转位图需要），`connect-src 'none'`；沙箱内 fetch/XHR/图片/WebSocket 到外部地址全部被拒绝；39 个拒绝用例每个断言因预期原因被拒。控制台有渲染器内部的 `font-src` CSP 噪音，**决定不放宽 CSP**，测试只允许这一类。
- **WebGL 资源释放**：`stopAll` + `quit` + `WEBGL_lose_context` + 移除 canvas；连续运行 12 次不累积；上下文丢失可被观察；空释放不覆盖上一次真实释放的记录（修过一个真实缺陷）。
- **测试文件**：`apps/web/tests/e2e/g2-u3-l04-{vm,classroom,shell-gap-a,renderer-spike}.spec.ts`；单测 `apps/web/src/features/lessons/g2-u3-l04/*.test.ts`（129 条）。证据与截图：`docs/roadmap/evidence/G2-U3-L04/`。教学方案：`docs/curriculum/g2-u3-l04/TEACHING-PLAN.md`。
- **CI**：`.github/workflows/curriculum-content.yml` 里 `g2-u3-l04-browser-trial`（matrix：desktop/tablet/phone，用 `--grep "\[viewport\]"`，确定的分片，不是 playwright 的 `--shard`）和 `g2-u3-l04-vm-trial`；都固定 `ubuntu-24.04`、`timeout-minutes: 15`、步骤上限 4/7/1、无 `continue-on-error`，末尾用 JUnit 核对数量（课堂 matrix 里写死 total/skipped，变化会失败）。

## 6. 真实测试与验收证据（命令）

```
cd apps/web && unset NODE_OPTIONS
npx vitest --run src/features/lessons            # main 上 66 个文件 880 通过 + 2 个预期失败(共享壳 D2)
npx vitest --run src/features/lessons/g2-u3-l04  # 129
# 浏览器: 需要 Chrome/Chromium。本地我用 npm @sparticuz/chromium + 注入 CJK 字体, 需要 NODE_OPTIONS=--no-experimental-require-module
npx playwright test tests/e2e/g2-u3-l04-vm.spec.ts tests/e2e/g2-u3-l04-classroom.spec.ts \
  tests/e2e/g2-u3-l04-shell-gap-a.spec.ts tests/e2e/g2-u3-l04-renderer-spike.spec.ts --project=desktop --workers=2
```

- 本地与 CI 的数字不能互相代替。
- 全仓库 `tsc --noEmit` 有 **73 行既有错误**（`kc-scenes-register.test.ts`、`lesson-scaffold.test.ts`、`env-check.test.ts`、`scratch-cloud-delete-restore-cloud104.spec.ts` 等）。我拿 main 和本 PR 合并后的树逐文件对比过，**文件集合完全相同**，不是 L04 引入的；L04/L05 文件 tsc 错误为 0。
- 本地 `eslint .` 在 `npm run build` 之后会报 124 个 error，**全部在被 gitignore 的构建产物 `public/scratch-vm/*.js` 里**；CI 在构建之前跑 lint，不受影响。

## 7. 历史故障与解决方案

| 故障 | 原因 | 解决 / 位置 |
|---|---|---|
| `ubuntu-latest` 变成 26.04，装 Chrome 的 Job 全红（一次运行里 17 个课程 Job + deploy 的 e2e-blockly） | Playwright 不支持 26.04（`does not support ffmpeg on ubuntu26.04-x64`） | OPS-029 / #505 统一固定 `ubuntu-24.04`；L04 的 Job 自己早已固定。记录：2026-11-09 09:15 的运行还是 24.04，09:46 变 26.04 |
| L04 浏览器 Job 超时（8 分钟步骤上限） | 单 Job 211 个实例，构建约 67 s + 测试超过 7 分钟；拆成课堂 87 个仍超 | 课堂按视口分 3 片（各 29），VM 一个 Job；**没有放宽预算、没有缩减测试**（SYS-108） |
| 误提交 `apps/web/tsconfig.tsbuildinfo` | `tsc` 生成的文件被 `git add` 带进提交（main 里没有它，也没被 gitignore） | 已 `git rm --cached` 移出 #499；**注意它不在 .gitignore，tsc 一跑就会冒出来，别 `git add -A`** |
| 误跑 `git checkout origin/main -- .` 覆盖了 `apps/` | 在子目录里执行，作用到整个树 | 分支当时干净且全部已提交，用 `git reset` + `git checkout HEAD -- apps` 还原，核对 HEAD 与远端一致，未推送任何东西。教训：看 main 的文件用 `git show origin/main:路径` |
| 验证 CSP 对比的用例一直被跳过 | L03 沙箱不在 L04 分支里 | L03 合并并同步 main 后真正执行并通过，现在 0 跳过 |
| 台账 L02 写着“等待审核、CI 未出结果” | 没关账 | 见第 9 节第 1 条 |
| Playwright 本地 `ERR_PACKAGE_PATH_NOT_EXPORTED` | scratch-vm / scratch-render 包有 `exports` 限制，不能 `require('pkg/package.json')` | 读版本用 `npm ls` 或读文件，不要 require 子路径 |
| 本地 jsdom 测试要 `unset NODE_OPTIONS`；构建和 Playwright 要 `NODE_OPTIONS=--no-experimental-require-module` | Node 22.23 与 PostCSS 的已知兼容问题 | 与代码无关 |

## 8. 技术经验（给后续开发必须知道的）

1. **版本**：`scratch-vm@5.0.300`、`scratch-storage@4.0.0`、`scratch-render@2.2.84`。三个文件全部自托管（OPS-024，不走 CDN）。只有 L04 的沙箱加载 render；**不要把 render 铺到别的课**，没有这个裁定。
2. **VM 初始化与帧推进**：沙箱自己驱动 `vm.runtime._step()`；必须先设 `currentStepTime`；L04 用 `setTimeout` 按 `frameMs` 推进；一帧里“循环迭代数 ≠ 帧数”：球落地后下落脚本结束、没有重绘请求，孩子的循环会在**同一帧里跑完剩下的迭代**（所以“无如果 重复 40 次 得分+1”总分是 80 + 额外，不是 40）。有专门用例（`g2-u3-l04-vm.spec.ts` 的“帧不等于迭代”）。
3. **时钟**：`control_wait` 用全局时钟；Node 与浏览器取的来源不同（`Date.now` vs `self.performance.now`）；虚拟时钟必须配合“每遍线程请求重绘”，否则死循环（L05）。
4. **碰撞与重复计分边界**：见第 5 节。几何必须是实测的：篮子放 -130 会让球停在篮子里，连加分数取决于循环剩余次数（实测 16，不稳定）；下落距离 330 会让球被舞台下沿切掉。最终篮子 -90、下落距离 310，两个球最终球心都是 -160。**“更快的球”不能当迁移关**（实测更快的球需要更少检查，照抄上一关不会失败），所以迁移 B 用更慢的球。
5. **iframe/CSP/资源**：见第 5 节。每节课的沙箱各一份，CSP 与前一课逐字相同（有测试比较）；新沙箱加 CSP 之前必须先证明为什么需要。
6. **真实浏览器 vs Node VM**：Node 里没有渲染器、没有 WebGL、没有 iframe CSP；Node 的结果只能证明“判定逻辑在真实 VM 上对”，**不能证明浏览器沙箱对**。L05 的浏览器部分还没做。
7. **CI/测试预算**：SYS-108——Job `timeout-minutes` ≤ 15（硬限制，不是目标），预算包含所有开销；分片用显式的 `--grep` 或文件清单，不用 playwright 原生 `--shard`（AGENTS.md 第 7、8 节）；末尾必须用 JUnit 核对数量。改 workflow 要独立任务独立 PR，**只能新增自己的 Job**。
8. **前期发现并修好的真实缺陷**：L02 的“落地帧恰好”“0 步循环”两个用例在变异下仍通过（已重写）；L02 的“排在循环后面的移动不算在循环里”；L03 舞台之外的位置被 `overflow:hidden` 裁掉（改成贴边箭头）；L03 共享壳在手机上固定舞台框高度并裁切（课程舞台用容器查询取较小者）；L03 手机上 Blockly 缩放按钮盖住积木右端（课程 CSS 在手机宽度隐藏缩放按钮）；L04 沙箱不比较两个球的脚本一致；L04 校验器遇到 `null` 积木抛 `TypeError` 而不是拒绝；L04 空释放覆盖上一次真实释放记录；L05 空程序被舞台层误判。
9. **未解决的技术风险**：见第 9 节第 6 条。

## 9. 未解决风险与待裁定事项

1. **台账未关账（P1）**。三课的关账数据我已核实，直接可用：

   | 课 | PR | mergeCommit | mainCI（应填的运行） | 备注 |
   |---|---|---|---|---|
   | L02 | #470 | `5d4b50225a7c0a20d05652d7c55cb26923c099c4` | https://github.com/HelloMrDuan/kidsCoding/actions/runs/42454271410 | #492 已经写好了这些字段（`merged_waiting_ci`） |
   | L03 | #494 | `1c17f7b3eabab9c8d7cf2cef38821b6af5472506` | **用** https://github.com/HelloMrDuan/kidsCoding/actions/runs/42973990177（在 `97268964` 上 L03 Job 才绿）；**不要**用 `1c17f7b3` 自己的运行 42614849372（当时红，runner 问题） | 注明原因 |
   | L04 | #499 | `972689649befd36a93e7e5c06df47f07c946a64e` | https://github.com/HelloMrDuan/kidsCoding/actions/runs/42973990177 | 4 号审核是 COMMENTED 型 review |

   `completed` 需要独立审核 + 完整证据（含教研 reviewer 与 CHANGELOG 行），**目前没有教研，不要写 completed**。关账 PR 每个 Task-ID 一个，或按首席指定方式；**不要在 L05 的 PR 里顺带做**。
2. **#492 仍是 open Draft**，处理见第 4 节。
3. **L05 的 `focusConcept` 是“随机”，但课程内容里没有任何随机数**（目标：`timeLeft=10`、每秒减 1、归零广播、归零后分数不再变化；验收：负数仍然运行）。L03 当初是“随机数与取值范围”，L04 是“判断”。我建议改为“计时与游戏结束”，只改 L05 自己的条目——`full-catalog-v1.json`、`track-g2-detailed-lessons-v1.json`（`priority-asset-requirements-v1.json` 视情况）和台账 1 行——与 L03 当时的做法一致。**我没有擅自改。裁定前课程文案不要用“随机”这个词。**
4. **L04 的教学参数仍是 `proposed`**：球速、分数、重复次数范围、几何；两个简化（“脚本复制到两个球上”“只提供隐藏、不提供‘已收集’标志变量”）待首席确认。
5. **4 号对 #499 的 7 条非阻塞观察（首席定夺，我没处理）**：O1 顶栏“已保存到本机”出现两次（壳与本课槽位各渲染一份，建议去掉课程侧）；O2 `state.ts` 的 `saveDraft/loadDraft` 与 `session.ts` 的 `restoreFromStorage` 在 `src/` 里没有生产调用方（L02/L03 同结构）；O3 transferPoints 第 2 条提示略微解释了为什么需要“如果”；O4 “首席已裁定方案①”的原始记录复核人未核实；O5 880 总数为作者陈述；O6 CI 日志有既存 ESLint 警告（共享文件）；O7 vm-trial 数量核对含一个条件跳过。
6. **未解决的技术风险**：
   - 浏览器里的渲染器是 WebGL1；**没有内存、多角色、低端设备的专门测试**。
   - `scratch-render` 增加约 3 MB 的构建复制；未评估对页面加载的影响。
   - 本地验证用 Chromium，CI 用真实 Chrome；**没有真实手机/平板**，手机/平板只用 Playwright 视口。
   - 4 号对 #494 的 PASS 我无法在 GitHub 核实（第 3.3 节）。
   - 12 个不装 Chrome 的 Job 仍用 `ubuntu-latest`（`curriculum-web`、`scratch-real-vm-shard-s1..s6`、`scratch-vm-local` 等）；如果以后它们开始装浏览器会再踩一次。
7. **没有做、也不能宣称做了的**：独立教研、儿童试学、真实设备验证、正式发布。

## 10. 分支与未推送风险

| 分支 | 远程 HEAD | 说明 |
|---|---|---|
| `kiro/p0-g2-u3-l05` | 用 `git rev-parse origin/kiro/p0-g2-u3-l05` 读取（文件不能写自己所在提交的 SHA）；我在汇报里给出了交接时的值 | **接管分支**，已合并 main `97268964`；其上有 L05 代码、`HANDOFF.md` 和本文件 |
| `kiro/p0-g2-u3-l04` | `9c811b81` | 已合并，**保留不删** |
| `kiro/p0-g2-u3-l03` | `5d8432fe` | 已合并，保留 |
| `kiro/p0-g2-u3-l02` | `8f9395c5` | 已合并，保留 |
| `kiro/ci-g2-u3-l02-coverage` | `52e0887a` | 已合并，保留 |
| `kiro/g2-u3-l02-ledger-merged` | `24d5c2a2` | **#492 未合并**，保留 |
| `kiro/ci-drill-g2-u3-l02-DELETE-ME` | **远程已不存在** | 演练，#472 已关闭未合并；`git ls-remote` 查不到该分支。PR 页面仍在，head 是 `b7d8b735`。谁删的我无法确认 |

**未推送风险（2026-11-11 逐个核对过）**：
- 六个仍存在的 `kiro/*` 分支，远程 HEAD 就是上表的值。其中 `kiro/p0-g2-u3-l02`、`g2-u3-l02-ledger-merged`、`p0-g2-u3-l03`、`p0-g2-u3-l04` 本地与远程一致。
- `kiro/ci-g2-u3-l02-coverage`：我本地的同名分支停在 `add3161b`，**落后**远程的 `52e0887a`；本地没有任何远程没有的提交（`git log 远程..本地` 为空），本地尖端是远程的祖先，也是 main 的祖先。**没有未推送的工作，只是本地没快进**，不影响接手。
- `kiro/p0-g2-u3-l05`：本文件所在提交推送之后，本地与远程一致。
- 我本地 `.tools/` 目录（不在仓库里）还有过程文件：复核评论草稿、探针、CI 日志。有价值的已经进了仓库；**L04 的变异脚本 `mutate-l04.py` 没有进仓库**（我核对过 main 上不存在），只在我的工作目录里。如需复现 L04 的 33 处变异检验，需要重写；结论见 `docs/roadmap/evidence/G2-U3-L04/README.md` 第四节。这个工作目录随我的会话结束可能不可用，**这是唯一的“数据可能丢失”点，且只影响“复现 L04 的变异检验”，不影响任何已合并代码或测试。**

## 11. 新 Muse 接管操作步骤

**先读（按顺序）**
1. `AGENTS.md`（根目录）和 `docs/engineering/CI-EXECUTION-STANDARD.md`（SYS-108）——工作规则。
2. 本文件。
3. `docs/curriculum/g2-u3-l04/TEACHING-PLAN.md` + `docs/roadmap/evidence/G2-U3-L04/README.md`——最完整的一课的方案和证据。
4. `docs/curriculum/g2-u3-l05/HANDOFF.md` + `TEACHING-PLAN.md`——L05 现状。
5. `docs/roadmap/evidence/G2-U3-L02/README.md`、`G2-U3-L03/README.md`。

**检出**
```
git fetch origin
git checkout kiro/p0-g2-u3-l05      # L05 接管; 先 git merge origin/main (普通合并, 不要 force-push)
```

**先跑（验证你接到的东西是好的）**
```
cd apps/web && unset NODE_OPTIONS
npx vitest --run src/features/lessons/g2-u3-l05        # 期望 29 通过
python3 ../../docs/curriculum/g2-u3-l05/mutate-l05.py   # 期望 20 处全被发现; 先提交再跑, 工作树要干净
rm -f tsconfig.tsbuildinfo                               # tsc/vitest 会生成它, 别提交
```

**可以直接复用**：L04 的整个目录结构（`g2-u3-l04/`）作为 L05 的 UI/会话/适配器/沙箱模板；L04 的 CI Job 写法（matrix + `--grep` + JUnit 核对）；L05 已有的 `params/program/compile/judge` 和 Node 运行器。

**首先做什么**：(1) P1：关三课台账、处理 #492；(2) 等首席裁定 L05 的 `focusConcept` 与参数；(3) 然后做 L05 的浏览器沙箱 + 虚拟时钟 + UI（第 4 节“没做”清单）。

**绝不能误报完成**：L02/L03/L04/L05 的教研、儿童试学、真实设备、发布；L05 的任何浏览器端功能；任何 `completed` 状态。

**可以继续的 G2 课节（不要提前认领，需要主 Muse 分配）**：`G2-U3-L06`（台账 `todo`）；G2 其余单元请查台账。

**约束**
- 一个 PR 只含一个 `Task-ID:` 行；不碰共享 `workspace/`、已合并课程的沙箱和行为；workflow 只新增自己的 Job；不放宽 CI 门禁、不用 `continue-on-error`、不缩减测试。
- 不用 `git add -A`；用 `git rm --cached` 清误提交；变异检验前先提交。
- 不要自己宣布审核通过，也不要自己合并；审核人必须是非作者。
- 凡是没核实的写“待核实”。
