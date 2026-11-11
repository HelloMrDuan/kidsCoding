# G2-U3-L05《倒计时游戏结束》交接说明（给下一任 Muse）

这条分支是**半成品的核心层**，不是可审的完整课程。没有 PR，没有改台账，参数全部是 `proposed`。请直接在此基础上继续，不要从零重做。

- 分支：`kiro/p0-g2-u3-l05`（已推送到 GitHub）
- 起点：最初从 main `f3b44f5a` 分出；2026-11-11 已把 main `97268964`（含已合并的 #499 / L04 全部代码）正常合并进来，无冲突，没有改 L05 文件。继续之前如果 main 又变了，再普通合并一次（不要 force-push）。
- 完整交接（任务总表、技术经验、风险）见 `docs/handoffs/kiro-to-muse-2026-11-11.md`。
- 台账：`G2-U3-L05` 仍是 `todo`。不要在本课合并前标 completed。

## 一、已有文件（相对起点只新增，没有改任何共享文件）

| 文件 | 作用 |
|---|---|
| `apps/web/src/features/lessons/g2-u3-l05/params.ts` | 全部教学参数（`rulingStatus: 'proposed'`）、三个关卡（起点 10 / 10 / 6 秒）、虚拟时钟步长、帧上限 700 |
| `.../program.ts` | 学生程序模型与 `validateProgram`（积木：设为、等待、减少、广播、重复直到、固定重复） |
| `.../compile.ts` | 把程序编译成 Scratch 3 工程：舞台（`timeLeft`、`score`、广播“游戏结束”）、`学生` 角色、课程自带的 `水果` 得分脚本 |
| `.../judge.ts` | 三层判定（舞台 / 任务 / 知识证据）+ 固定的“理解情况”说明 + `isTraceCurrent` |
| `.../testing/node-vm-runner.ts` | **只给测试用**：在 Node 里用真实 `scratch-vm` + 虚拟时钟跑工程，产出 `RunTrace` |
| `.../judge.vm.test.ts` | 19 条，在真实 scratch-vm 上跑判定矩阵 |
| `.../program.test.ts` | 10 条，校验与编译单测 |
| `docs/curriculum/g2-u3-l05/TEACHING-PLAN.md` | 方案草稿、待裁定项、实测值、已知局限 |
| `docs/curriculum/g2-u3-l05/probe-countdown-virtual-clock.cjs` | 最初的探针（虚拟时钟可行性） |
| `docs/curriculum/g2-u3-l05/mutate-l05.py` | 变异检验脚本 |

## 二、怎么复现（在仓库根目录之下的 `apps/web`）

```
cd apps/web
unset NODE_OPTIONS
npx vitest --run src/features/lessons/g2-u3-l05          # 期望：2 个文件 29 通过
node ../../docs/curriculum/g2-u3-l05/probe-countdown-virtual-clock.cjs   # 打印实测值
python3 ../../docs/curriculum/g2-u3-l05/mutate-l05.py   # 期望：20 处全部被发现
```

变异脚本用 `git checkout --` 还原被改的文件，所以**运行前必须先提交，且工作树要干净**；最后一行 `WORKTREE CLEAN` 才算正常（如果多出未跟踪的 `tsconfig.tsbuildinfo`，删掉它，不要提交）。第 19 项“运行器不请求重绘”是靠**超时**被发现的，因为它会让真实 VM 死循环，这是预期的失败方式。

在我这边的最后一次运行结果：29 通过；20 处变异 19 个 `KILLED`、1 个 `KILLED(超时)`、0 个 `SURVIVED`。这些是本地数字，不是 CI。

## 三、已经真实验证的

都在**真实 scratch-vm**（Node，虚拟时钟）上跑过，不是模拟：

- 标准做法（`重复执行直到〈timeLeft < 1〉{等待 1 秒；timeLeft 增加 -1}` 再广播）：`timeLeft` 从 10 数到 0，约 310 帧归零、广播在 311 帧附近；课程自带的得分脚本在归零前得 19 分、归零后不再变化。
- 没有判断、固定重复 15 次：`timeLeft` 变成 **-5**（对应目录里“时间变成负数仍然运行”）。
- 固定重复 10 次、起点也是 10：行为与标准做法一致，只有知识证据（真实 VM 里 `operator_lt` 的求值记录）能区分。
- 广播两次、广播后又把 `timeLeft` 设回 5（得分从 19 涨到 25）、一开始就广播、归零后多等 2 秒才广播、起点太小、空程序、散积木、迁移关 6 秒、运行中停止、超过帧上限、运行出错。
- 空程序的 `timeLeft` 初始就是 0，所以曾被舞台层误判通过——已修（要求真的从大于 0 数下来）。
- 变量读出来统一转数字（“设置变量为”写入的是文本）。

## 四、没有完成的（都需要做）

- **浏览器沙箱 iframe**：虚拟时钟只在 Node 里验证过。浏览器里要替换 `self.performance.now`（`Timer.USE_PERFORMANCE` 为真时 scratch-vm 用它）并保持 `Date.now` 一致；`Timer` 在打包后的 VM 里取不到，只能换全局时钟。必须在真实 Chrome 里验证，Node 的结果不能代替。
- **必须踩的坑（已复现）**：调度器在一帧里反复轮询“等待”中的线程，直到有重绘请求或用掉 75% 帧时间；虚拟时钟一帧内不走，所以不请求重绘就会**死循环**。解决办法是每跑一遍线程就请求一次重绘（见 `node-vm-runner.ts`），沙箱里要做同样的事，并且要有测试保护（变异第 19 项就是这个）。
- UI（Blockly 编辑器、舞台、任务面板）、会话、课程适配器、草稿、路由页、E2E、CI Job、证据文档、台账、PR——全部没做。可参考已合并的 L03、以及 #499（L04）的结构，但 L05 不依赖 #499 的任何代码。
- 学生如果用 `如果 timeLeft > 0` 之类的写法（目录里写的是“使用大于零判断”），目前**不支持**，积木集里只有“重复直到”。

## 五、待首席裁定（我没有擅自改）

1. **`focusConcept` 与课程内容对不上**：台账/目录里是“随机”，概念标签是“侦测 / 判断 / 随机”，但本课的目标、步骤和验收（`timeLeft = 10`、每秒减 1、归零广播、归零后分数不再变化、负数的错误情形）里**没有任何随机数**。建议改成“计时与游戏结束”，只改 L05 自己的条目（`full-catalog-v1.json`、`track-g2-detailed-lessons-v1.json`、`priority-asset-requirements-v1.json` 里 L05 对应项视情况，以及台账 1 行），与 L03 当时的做法一致。**裁定之前课程文案不要用“随机”这个词。**
2. 结束判断用“重复直到〈timeLeft < 1〉”（本草稿）还是目录写的“大于零判断”（`如果 timeLeft > 0`）。两者行为等价，教学侧重不同。
3. 所有 `L05_PARAMS` 与关卡参数（起点秒数、限制范围、得分间隔 0.5 秒、帧上限）。
