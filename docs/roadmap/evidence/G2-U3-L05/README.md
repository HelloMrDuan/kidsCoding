# G2-U3-L05《倒计时游戏结束》测试证据

范围标注：**教学定向**。教学参数状态：**proposed**（`rulingStatus`；首席已同意课程核心方向按「计时与游戏结束」核对，其余参数尚无裁定，见 `docs/curriculum/g2-u3-l05/TEACHING-PLAN.md`）。**不代表儿童教学效果已验证**，课程不得标 completed。
本文记录**本地真实运行**的结果。GitHub Actions 的结果以 PR 页面为准，两者不能互相代替（见第六节）。

## 一、运行环境与限制（如实）

| 项 | 实际情况 |
|---|---|
| Scratch VM | 真实 `scratch-vm@5.0.300` + `scratch-storage@4.0.0`，由应用自己的源站提供（`public/scratch-vm/`，prebuild 复制），不走 CDN。 |
| 渲染器 | **没有**。本课舞台只显示 timeLeft 与 score 两个变量，判定不依赖碰撞，所以 L05 沙箱只加载 VM 与 storage；VM 规范用例断言 `scratch-render` 从未被请求。L02–L04 的沙箱未改动。 |
| 虚拟时钟 | 打包版 scratch-vm 的 Timer 走 `Date.now`（探针实测 `USE_PERFORMANCE=false`）。沙箱把 `Date.now` 接到虚拟时钟、逐帧推进 1000/30 ms 再 `_step()`；`performance.now` 同步替换为尽力而为。每次运行虚拟起点重置，同一程序两跑轨迹逐帧一致（浏览器与 Node 双环境都断言）。课堂每帧约 16 ms 真实时间，10 秒倒计时约 6–7 秒跑完。 |
| 沙箱 CSP | 与 L03/L04 同款：`default-src 'none'`、`connect-src 'none'`，只放行本站 script 与 data: 图片。 |
| 浏览器 | 本地为真实 **Google Chrome 157.0.8103.50**（`channel: 'chrome'`，与 CI 相同通道），headless。本地这台机器的 Chrome 是手动下载官方 .deb 装的（Playwright 的 `--with-deps` 安装在本机 apt 镜像上失败，依赖由系统已满足）；CI 按工作流自己的有界安装步骤装 Chrome。 |
| 中文字体 | 本地 Chrome 自带 CJK 字体，未注入测试字体。 |
| 真实设备 | **没有**。1440 / 768 / 375 是 Playwright 视口（手机 `isMobile + hasTouch`）。真实指针拖放只在桌面视口；手机、平板走点按添加。 |
| 儿童试学 / 独立教研 | **没有做**，不宣称。 |

## 二、命令与结果（本地，`apps/web`）

```
npx vitest run src/features/lessons/g2-u3-l05 --testTimeout=30000
npx playwright test tests/e2e/g2-u3-l05-vm.spec.ts --project=desktop
npx playwright test tests/e2e/g2-u3-l05-classroom.spec.ts --project=desktop --grep "\[<viewport>\]" --workers=2
python3 docs/curriculum/g2-u3-l05/mutate-l05.py
npm run build
```

- Vitest（`src/features/lessons/g2-u3-l05`）：**75 通过 / 0 失败**（交接核心层 29 + 本轮新增 46：契约/草稿/舞台字典、会话、课内适配器、参考做法真实 VM 验证、沙箱与 TS 常量一致性）。
  - 超时说明：真实 VM 单测一次运行约 1–4 秒（scratch-vm 加载 + 约 400 帧），默认 5 秒超时在本机共享 CPU 环境实测 7 次中 2 次超时失败（交接的 `judge.vm.test.ts` 标准做法与新增的参考做法各中一次）。CI 的 checks 步骤因此显式 `--testTimeout=30000`，本课自己的参考做法用例也逐个写了 30 秒超时；**断言一条未改**。
- Playwright（本地真实 Chrome，含生产构建）：
  - `g2-u3-l05-vm.spec.ts`：**17 通过 / 0 跳过 / 0 失败**。
  - `g2-u3-l05-classroom.spec.ts`：合计 45 个实例——desktop **14 通过 / 1 跳过**、tablet **13 通过 / 2 跳过**、phone **14 通过 / 1 跳过**，0 失败。跳过是设计决定：手机首屏用例只在 phone 组执行（desktop / tablet 各跳 1），真实指针拖放只在 desktop 组执行（tablet / phone 各跳 1）。
- 变异检验：`mutate-l05.py` 在本 PR 提交后复跑，**20 处全部被发现**（19 KILLED + 第 19 项「运行器不请求重绘」KILLED（超时）），与接管时复现的交接基线一致，工作树干净。
- 目录相关单测（`full-catalog-v1.test.ts` 等 6 个文件）：52 通过；`scripts/check-task-ledger.py` 通过。
- ESLint：本课源码与两个 spec **0 error 0 warning**。`tsc --noEmit`：本课文件 0 错误（仓库既有 73 个错误在 `scripts/*.test.ts` 等无关文件，与 main 基线逐行比对一致）。
- `npm run build`：通过，路由表含 `/learn/g2-u3-l05`（静态预渲染，robots noindex）。

## 三、真实 VM + 虚拟时钟：测了什么

课程没有随机数，同一个程序的轨迹完全确定，所以断言具体帧与具体分数。实测锚点（本地 Chrome 与交接探针一致）：标准做法（起点 10）广播在第 311 帧、广播时得分 19；演示程序（固定重复 15 次）最后 timeLeft 为 −5、得分 19；固定重复 10 次行为与标准做法完全一样，但 `operator_lt` 求值记录为空。

- **判定矩阵**（浏览器 VM spec，每行真实运行）：标准做法三层全过；演示 −5（舞台/任务不过）；重复 10 次（舞台/任务过、知识不过）；迁移 6 秒只改起点通过；忘广播、广播两次、一开始就广播（任务不过）；空程序（舞台不过：「倒计时没有开始」）；参考做法 2 种 × 2 关在浏览器里同样通过。
- **虚拟时钟**：约 400 帧、约 13 秒虚拟时间的运行在真实时间 5 秒内完成（全速模式断言）；同程序两跑的帧、广播、检查记录逐项深相等。
- **知识证据是真的**：知识层只读 VM 真实执行 `operator_lt` 时的求值记录（沙箱包装 `_primitives.operator_lt`，只记录「学生」角色），不是看程序长什么样。重复 10 次与标准做法的最终轨迹一模一样，区别只在记录为空——单元与浏览器两层都断言了这一点。
- **沙箱严格校验（REJECTED 不运行）**：学生积木改一个 opcode、水果脚本去掉「如果」的条件、多一个角色、广播改名，四种篡改各有用例；学生脚本仅允许 9 种 opcode 且结构/字面量与 `compile` 输出一一对应，水果脚本逐块核对固定形状。
- **停止与帧上限**：运行中停止 → `endedBy='stopped'`、明确不判定；起点 20 + 每次等 2 秒 → 恰好 700 帧触顶、`endedBy='frameCap'`、不判定，不静默通过也不静默失败。
- **课堂（三视口）**：预测门禁（不写预测点运行被拦并写明原因）、预测与真实结果对照、演示关运行中停止、标准做法三层全过后改一个数字立即作废、重复 10/15 次的两种失败、忘广播、第三关只改起点通过、三级提示逐条出现、角色栏（水果脚本是课程带来的、舞台没有脚本）、草稿保存/刷新恢复（脚本、关卡、预测都在；损坏草稿与别课草稿一律拒绝）、重新开始本关、桌面真实拖放拼标准做法（含把循环拖向循环体——连接层直接拒绝，循环身体不变）、手机工具栏首屏与任务折叠。

## 四、变异检验

沿用交接的 `docs/curriculum/g2-u3-l05/mutate-l05.py`（判定/编译/校验/运行器共 20 处），结果见第二节：20/20 被发现，未被发现 0 处。其中「总体：不看知识证据」一处在本课结构里由重复 10 次用例发现（与 L04 的等价变异体情形不同：本课任务层不蕴含知识层）。

过程中测试发现并修复的真实问题（都在本课新代码里，核心层未动）：

1. 编辑器「添加积木」原先会把只能放在最外层的积木（如广播）接进循环体尾部，导致刚填好循环就加广播必然被校验拒绝；改为选中积木在循环体内时这类积木自动接到循环后面。
2. E2E 保存恢复用例最初在自动保存落盘前就刷新，丢了编辑——这是用例时序问题（共享壳保存是异步的），改为等「已保存」标记后刷新；产品行为与 L04 一致，未改。

## 五、与交接核心层的关系

- `params.ts / program.ts / compile.ts / judge.ts / judge.vm.test.ts / program.test.ts / testing/node-vm-runner.ts` 与 `docs/curriculum/g2-u3-l05/` 交接文档**一字未改**（本 PR 的 diff 可核）。浏览器沙箱是同一判定的第二个运行环境：常量与 opcode 清单由新增单测与 TS 侧逐项对齐（漂移即失败）。
- 本课判定**没有**共享判定器：L02–L04 的共享轨迹形状装不下「检查记录」这一层，理由写在 `lesson-adapter.ts` 的注释里；舞台/任务/知识三层文字直接来自 `judge.ts`。

## 六、没有做到 / 还不能宣称的

- **CI 覆盖**：`curriculum-content.yml` 只**新增** L05 的触发路径、checks 里一条单测步骤与两个专属 Job（相對 main 只增不删），Job 末尾用 JUnit 核对数量，不会靠 skip 或缩水变绿，没有 `continue-on-error`：
  - `g2-u3-l05-vm-trial`：VM 矩阵 17 个实例，要求 0 跳过。
  - `g2-u3-l05-browser-trial`：三视口课堂按视口分片（`--grep "\[viewport\]"`，不是 playwright 的 `--shard`），每片 15 个实例，核对跳过 desktop 1 / tablet 2 / phone 1（按设计的跳过）。
  - 超时预算按 SYS-108：每 Job `timeout-minutes: 15`（硬限制），Chrome 安装步 4 分钟（每次限时 100 秒、最多 2 次）、测试步 7 分钟、核对 1 分钟；runner 固定 `ubuntu-24.04`（理由同 L04 注释）。
  - **本地数字不能代替 CI，CI 结果见 PR 页面的最新运行。**
- **参数仍是 proposed**：起点范围、等待/减少范围、得分间隔、帧上限等未经教研裁定；只有课程核心方向（focusConcept「计时与游戏结束」）经首席同意核对，台账与目录仅 L05 自己条目做了最小一致性修正。
- 没有独立教研、没有儿童试学、没有真实设备、没有低端设备性能实测；课堂单次运行约 400 帧 × 16 ms，低端机可能更慢。目录仍是 `outline_not_playable`，本课未发布，台账只到 `in_review`。
- 共享 `workspace/` 壳、L02 / L03 / L04 的沙箱与行为未修改；`apps/web/playwright.local.config.ts` 是本地验证用的一次性文件，**未提交**；`public/scratch-vm/` 是 gitignore 的构建产物。
- 推送方式：本机无 git 直推通道，分支经 GitHub Git Data API 逐提交镜像（tree 与本地逐字一致，已读回核对），提交 SHA 与本地不同源于 API 侧时间戳规范化，内容以 tree 为准。
