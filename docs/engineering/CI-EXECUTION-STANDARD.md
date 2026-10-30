# KidsCoding CI 执行标准（CI Execution Standard）v1

> 状态：Draft，供主要架构与 CI 负责账号评审批准后生效。
> 作者：Muse-C（课程执行账号，G2/G3/W0/W1/A0），本文件为草案，不是已生效的强制门禁，
> 在负责人批准并合并前，不得以本文件为由合并或关闭他人 PR。
> 适用范围：所有 Muse 账号、所有课程方向、所有功能开发和所有 PR。
> 本文件不修改任何现有工作流，不覆盖任何现有规范，只新增执行标准；
> 工作流整改必须走独立任务与独立 PR，见第 10 节。

## 0. 核心目标（不可妥协）

- 单个 GitHub Actions Job 目标耗时不超过 12 分钟。
- 15 分钟是当前已确认的硬限制（仓库多处 Job 已设 `timeout-minutes: 15`），
  不是正常目标，不得把 15 分钟当成预算。
- 预留至少 3 分钟安全余量：目标 12 分钟 + 余量 3 分钟 = 硬限制 15 分钟。
- 所有必需测试必须执行，不能通过跳过测试、删测试、降低断言换取 CI 通过。
- 不能把未执行的测试伪装成通过；PR、夜间、发布门禁的执行范围必须如实记录。

## 1. Job 超时预算

1. 所有必需 Job 必须显式设置 `timeout-minutes: 12`，不得留空（留空即 GitHub 默认，
   超时后才被发现，无法提前告警）。
2. 非测试类小 Job（如 task-ledger、watchdog 回归）同样设 12 分钟，除非负责人书面批准例外，
   例外必须写明理由、 Job 名和复审日期，且不得超过 15 分钟。
3. 任何 Job 在一次运行中接近 12 分钟（≥10 分钟）即进入高风险清单，
   下一次改动该 Job 前必须先拆分或提供耗时分析，不得原样重试。
4. `timeout-minutes: 15` 现状视为违规预算，必须在整改 PR 中改为 12 或拆分 Job，
   不得在整改 PR 中把 15 分钟改成更大的值。

## 2. 测试分片和分配规则

1. 分片前先量后分：用最近 3 次成功运行的 Job 耗时和测试报告估算总耗时，
   再算分片数。公式：`分片数 = ceil((总测试耗时 + 每次分片的固定开销) / 10 分钟)`，
   固定开销包括 checkout、npm ci、Chrome 安装、应用构建，至少按实测值计，不得按 0 计。
2. Playwright 分片必须同时满足两条：
   - 用 `--shard=N/M` 做测试级分片时，M 个分片必须全部运行，缺一个即为覆盖不完整；
   - 用显式 spec 文件分组时，分组表必须列出全部 spec 文件，一个文件不得同时出现在两个分片，
     也不得被任何分片遗漏（见第 8 节完整性检查）。
3. 一个 Job 不得塞入全部测试：Scratch/Blockly、Python、V2 视觉、作品集等不同域
   必须分 Job 或分片，见第 4 节。
4. 分片后每个分片的目标仍是 ≤12 分钟；分片数不够导致任一分片仍 ≥12 分钟时，
   继续增加分片，不得把分片数当成固定值。
5. 分片不得改变测试内容：同一测试在分片前后必须执行相同的断言、相同的项目（desktop/mobile）、
   相同的浏览器，不得用 `--workers` 无限放大掩盖单测试过慢。

## 3. worker 数量与资源隔离

1. 浏览器 Job：`--workers=2` 为默认上限。ubuntu-latest 共享 CPU 有限，
   workers 超过 2 容易互相抢占，反而更慢；需要更大并行时优先增加分片 Job，而不是 workers。
2. 数据库集成测试：每个 Job 独立的数据库服务实例（独立端口、独立库名），
   不得共用一个库跑并行 Job；本仓库现有的 `scratch-rls-postgres` 模式（独立 postgres:16 服务、
   独立库）为参照。
3. Python 课程测试：按课程与运行环境分组，不得把 Pyodide 浏览器测试与离线单元测试
   混在同一个 Job 里抢浏览器与 Python 运行时。
4. AI 模型测试：轻量检查（结构、导入、单测）与真实训练/大模型调用分离，
   真实训练不得进入 PR 门禁 Job，必须走夜间或独立 Job。
5. 缓存与安装：优先复用 `npm ci` 缓存与预装 Chrome（见现有 scratch-real-vm Job 的
   “Verify preinstalled real Chrome”做法，避免每次 9 分钟 apt 安装），
   但不得因缓存命中失败就跳过安装步骤。

## 4. 统一测试策略

| 域 | 分组规则 | 备注 |
|---|---|---|
| 单元测试（vitest） | 按模块分组 | 现有 `curriculum-web` Job 内已按文件列出大量测试，拆分时按模块抽出，不得删文件 |
| 前端组件测试 | 按功能域分组 | UX-002、UX-003、UX-101 等域各自独立，不得混入浏览器 E2E |
| Playwright | 按历史耗时均衡分片 | 见第 2 节；历史耗时未知时先按 spec 文件数均分，再按实测耗时重分 |
| Scratch / Blockly | 独立分片 | 一个 Job 不得塞入全部 Scratch/Blockly 测试；VM 测试与触屏测试分离 |
| Python 课程 | 按课程和运行环境分组 | 离线单元、Pyodide 浏览器、Pygame 渲染分离 |
| AI 模型测试 | 轻量与真实训练分离 | 真实训练不进 PR 门禁 |
| 数据库集成测试 | 隔离数据库资源 | 见第 3 节第 2 条 |
| 全量回归 | 夜间或发布前执行 | 包含全部必需 Job，不得用 PR 子集代替 |

## 5. 测试耗时采集

1. 每个浏览器 Job 必须上传 `test-results/`（`if: always()`），
   每个 vitest / Python Job 必须在日志中打印测试文件数与总耗时，不得只打印通过/失败。
2. Playwright 必须生成可复查的报告：优先使用 JUnit 报告或 `test-results/`，
   报告中必须能定位到具体 spec 文件与具体测试名，不得只有 Job 级通过/失败。
3. 每次整改前后必须记录对比：整改前 Job 名、最近 3 次耗时、整改后 Job 名、分片、耗时，
   见第 11 节。没有对比数据的整改 PR 不得标完成。
4. 耗时数据来源必须是 GitHub Actions 的 Job 实际起止时间或测试报告，
   不得用本地估计代替。

## 6. 日志和测试报告

1. 失败时必须提供：Job 名、分片号、spec 文件、测试名、失败断言或错误信息、截图/视频（如有）。
   只写“CI 失败”或只贴 Job 链接，不算失败证据。
2. 浏览器 Job 的 `test-results/` 必须在失败和超时时都上传（`if: always()`），
   超时 Job 的最后运行测试名必须能从报告或日志中定位。
3. 日志不得包含密钥、令牌、用户隐私数据；测试报告中的用户数据必须脱敏。

## 7. 失败分类与有限重试

失败必须先分类，再决定是否重试，不得一律重试：

| 分类 | 定义 | 处理 |
|---|---|---|
| 断言失败 | 测试断言不通过，代码或测试本身有错 | 不重试，修代码或修测试，重新跑该 Job |
| 代码异常 | 运行时异常、空指针、类型错误等 | 不重试，修代码 |
| 环境故障 | npm ci 失败、Chrome 安装失败、网络、数据库健康检查失败 | 可重试 1 次，重试前必须写明环境原因 |
| Job 超时 | Job 在 timeout 内未完成，或测试本身超时 | 不得原样重试，必须先拆分 Job 或分片（见第 9 节），重试次数 0 次（原样） |

其他规则：
- 任何必需 Job 不得设 `continue-on-error: true`。
- 自动重试不得超过 1 次，且只针对环境故障；无限重试、循环重试一律禁止。
- 重试必须保留第一次失败的报告，不得覆盖。

## 8. PR、夜间和发布门禁

- PR 门禁：可以按风险执行必要测试子集，但 PR 描述与 Job 摘要必须列出
  “已执行 / 未执行”清单，未执行的测试不得写成通过。
- 夜间门禁：全量回归，包含全部必需 Job、全部 Playwright 分片、全部 Python 与数据库测试。
- 发布门禁：必须有完整回归证据（夜间或发布前全量运行的 Job 列表与耗时），
  且 task-ledger、main CI 均为成功；缺少任一分片即不得发布。
- 任何门禁不得用 Draft PR 的存在代替 CI 结果，不得用“已提交”代替“已通过”。

## 9. 全量测试覆盖完整性检查

1. Playwright：整改 PR 必须附一张覆盖表，列出每个 spec 文件属于哪个分片，
   分片数之和等于全部 spec 文件数，测试总数（`test(` 计数或报告中的测试数）
   在分片前后一致（允许因新增/删除测试而变化，但必须说明变化原因）。
2. Vitest / Python：整改 PR 必须说明被拆分的测试文件清单，拆分前后文件数一致，
   不得在拆分中悄悄删除测试文件。
3. 未来应实现自动化检查脚本（例如 `scripts/check-ci-coverage.py`），
   在 CI 中校验分片覆盖表与实际 spec 文件的一致性；本标准 v1 先以人工覆盖表为准，
   脚本为后续独立任务，不得在本标准 PR 中顺带大规模改动工作流。
4. 覆盖检查失败时，PR 不得合并，即使其他 Job 全部通过。

## 10. CI 超时自动诊断和处理流程

超时发生时，按以下流程处理，不得只重试：

1. 保存证据：上传 `test-results/`、Job 日志、最后运行的测试名、Job 起止时间。
2. 分类：按第 7 节判断是测试过多、分片不均、资源竞争、单个测试过慢，还是环境故障。
3. 登记：在 `docs/engineering/CI-TIMEOUT-LOG.md`（后续任务建立，先以本标准 PR 的
   说明与 Job 摘要为准）中登记 Job 名、分片、耗时、最后测试、分类、整改任务 ID。
4. 拆分：同一 Job 连续两次超时，必须在第三次运行前完成拆分，不得第三次原样运行。
5. 负责人确认：整改 PR 必须由主要架构与 CI 负责账号评审，课程账号不得擅自
   修改他人负责的 Job 定义（见第 11 节协作边界）。

## 11. 权限和协作边界

- 原主要 Muse 继续负责原有主要工作，并牵头 CI 规范与架构协调；
  本文件为 Muse-C 起草的 Draft，生效与合并以负责人裁定为准。
- 其他三个 Muse 继续负责各自分配的课程方向，不得改变四个 Muse 原有职责分工。
- 不得覆盖其他账号的分支和提交；不得擅自修改其他账号正在开发的业务代码。
- 规范文件与 CI 工作流修改必须走独立任务和 PR：规范 PR 只改规范文件与台账登记，
  工作流整改 PR 只改一个 Job 家族（例如只改 Scratch VM 分片），不得一次性大规模修改所有 workflow。
- 每个 Muse 接手任务时必须执行以下检查（本标准第 12 节），并在 PR 描述中写明结果。

## 12. 所有 Muse 的执行检查清单（接手任务时必做）

1. 先读取本统一 CI 规范（`docs/engineering/CI-EXECUTION-STANDARD.md`）。
2. 检查自己修改涉及的测试范围（哪些 spec 文件、哪些 vitest 文件、哪些 Python 测试）。
3. 评估测试数量、历史耗时和资源消耗（最近 3 次 Job 耗时、测试报告）。
4. 超出 12 分钟预算时主动拆分 Job 或测试分片，不得等 CI 超时后再拆。
5. 每个分片独立执行并上传报告（`test-results/`，`if: always()`）。
6. 确认所有必需测试无遗漏、无重复（覆盖表，见第 9 节）。
7. 失败时提供具体测试名称和失败证据（见第 6 节）。
8. 区分断言失败、代码异常、环境故障和 Job 超时（见第 7 节）。
9. 不得无限重试或将失败设置为 `continue-on-error`。

## 附录 A：2026-10-30 盘点结果（第一阶段，实测，非估计）

工作流文件（main，6 个）：
- `.github/workflows/curriculum-content.yml`：13 个 Job，见下表
- `.github/workflows/deploy.yml`：config-check、test（vitest 全量）、e2e-blockly（mobile+desktop，8 个 spec×2 项目，无 timeout）、build、wake
- `.github/workflows/task-tracking.yml`：task-ledger（小 Job，无 timeout）
- `.github/workflows/instabox-watchdog.yml`：watchdog（`timeout-minutes: 15`，定时任务）
- `.github/workflows/kids-cloudflare-watchdog-regression.yml`：check-kids-cloudflare（无 timeout，小 Job）
- `.github/workflows/tj-watchdog-unit.yml`：test-tj-watchdog（无 timeout，小 Job）

`curriculum-content.yml` Job 清单（timeout 为 main 中的实际值）：

| Job | timeout | 最近实测（2026-10-30 近期运行，见正文说明） | 风险 |
|---|---|---|---|
| curriculum-web | 未设 | 约 2.1–2.7 分钟 | 中：无显式预算，需补 12 分钟 |
| scratch-rls-postgres | 未设 | 约 0.5 分钟 | 低：补 12 分钟即可 |
| offline-python-projects | 未设 | 约 0.1 分钟 | 低：补 12 分钟即可 |
| advanced-python-and-pygame | 未设 | 约 0.1–0.2 分钟 | 低：补 12 分钟即可 |
| scratch-sb3-structure | 未设 | 约 0.1–0.2 分钟 | 低：补 12 分钟即可 |
| python-browser-trial | 12 | 约 2.5–2.7 分钟 | 低：已符合目标 |
| python-batch3 | 15 | 约 2.1–2.8 分钟 | 高：预算本身就是硬限制，无余量 |
| portfolio-ux302 | 15 | 约 1.8–2.4 分钟 | 高：预算本身就是硬限制，无余量 |
| parent-growth-ux503 | 15 | 约 1.2–1.7 分钟 | 高：预算本身就是硬限制，无余量 |
| scratch-real-vm-browser | 15，分片 1/2，workers=2 | 最近 20 次运行中至少 10 次 cancelled，15.0–15.3 分钟 | P0：已确认超时，17 个 spec 文件、146 个 test() 定义，见附录 B |
| scratch-real-vm-browser-part2 | 15，分片 2/2，workers=2 | 约 2.3–2.9 分钟（近期） | P0：与上一个 Job 同源，分片不均风险 |
| scratch-touch-browser | 10 | 曾达 7.6 分钟一次 | 中：已符合目标，但接近预算，需监控 |
| scratch-v2-visual-browser | 10 | 约 2.5–2.9 分钟 | 低：已符合目标 |

说明：近期运行耗时来自 2026-10-30 的 curriculum-content 运行 Job 起止时间，
scratch-real-vm-browser 在多轮运行中长时间 in_progress，未在盘点时完成，
因此不能以“近期其他 Job 只有 2 分钟”推断它安全；用户已确认 Scratch VM 123 个
Playwright 测试存在超时问题，本标准以该确认为 P0，不以单次快速运行否定它。
deploy 的 e2e-blockly（8 个 spec×mobile+desktop，无 timeout）为次高风险，需在
第二阶段单独量测，不得与 Scratch VM 整改混在同一个 PR。

## 附录 B：第三阶段优先项 — Scratch VM Playwright 测试（分析，不改工作流）

- 已确认超时证据：2026-10-29 至 2026-10-30 的最近 20 次 curriculum-content 运行中，
  `scratch-real-vm-browser` 至少 10 次以 cancelled 结束，耗时 15.0–15.3 分钟，
  涉及 main、hark-a/g0-u3、muse-c/long-term-rules、muse-c/longterm-gate 等分支，
  不是单分支偶发。这是本标准 P0 的直接证据。
- 测试数量核对（重要修正）：用户任务中称 123 个测试，但按 main 的 17 个 spec 文件
  统计 `test(` 定义数为 146 个，其中 scratch-g2-u1.spec.ts 单文件 55 个、
  grid-lab.spec.ts 16 个、unit-project.spec.ts 11 个、scratch-vm.spec.ts 10 个、
  其余文件 1–9 个不等。123 与 146 的差值可能来自跳过测试、项目过滤或报告口径，
  整改 PR 必须以 Playwright 报告中的实际执行数为准，不得直接沿用 123 或 146 而不核对。
- 现状：`scratch-real-vm-browser` 与 `scratch-real-vm-browser-part2` 各跑
  17 个 spec 文件（scratch-vm、blockly-first-run、blockly-forest-sequence、
  blockly-meadow-journey、blockly-garden-click、blockly-second-practice、
  blockly-duo、blockly-duo-dialogue、blockly-duo-graduation、guest-story、
  reward-idempotency、grid-lab、unit-project、scratch-workbench-ux401、
  scratch-characters-ux402、scratch-vm-regression-ux403、scratch-g2-u1），
  用 `--shard=1/2` / `--shard=2/2`、`--workers=2`、`timeout-minutes: 15`。
- 问题：分片数只有 2，固定开销（checkout、npm ci、Chrome 预装检查、应用构建）
  已占一部分预算，剩余给测试的时间不足；两个分片的测试耗时不均衡时，
  慢的那个分片先撞 15 分钟硬限制，快的那个分片不能替它完成。
- 整改方向（后续独立 PR，不在本标准 PR 中改工作流）：
  1. 先按 spec 文件的历史耗时重分，目标每个分片 ≤10 分钟测试时间（含固定开销 ≤12 分钟）。
  2. 分片数至少从 2 增加到 4，优先按域分组：Blockly 基础、Blockly Duo/毕业、
     Grid/作品/Workbench、Scratch VM/G2，每组独立 Job、独立报告。
  3. 每个分片设 `timeout-minutes: 12`，上传 `test-results/`（`if: always()`）。
  4. 附覆盖表：17 个 spec 文件全部分组，无遗漏、无重复，测试总数分片前后一致；
     若用户所指的 123 个测试包含 deploy 的 e2e-blockly 等其他 spec，
     整改 PR 必须先以报告中的测试数为准，重新核对总数，不得沿用 123 这个数而不核对。
  5. 整改后对比：整改前最近 3 次各分片耗时 vs 整改后最近 3 次各分片耗时，
     且全量分片全部成功，才算整改完成。

## 附录 C：整改优先级（第二阶段清单）

- P0：scratch-real-vm-browser / part2（15 分钟、分片 2、已确认超时风险）
- P0：python-batch3、portfolio-ux302、parent-growth-ux503（timeout=15，无余量）
- P1：curriculum-web、deploy test、deploy e2e-blockly、scratch-sb3-structure、
  offline-python-projects、advanced-python-and-pygame、scratch-rls-postgres、
  task-ledger、check-kids-cloudflare、test-tj-watchdog（无显式 timeout，补 12 分钟）
- P1：scratch-touch-browser（10 分钟已合规，但曾 7.6 分钟，需监控与历史耗时采集）
- P2：instabox-watchdog（15 分钟定时任务，改为 12 分钟或负责人书面例外）
- P2：自动化覆盖检查脚本 `scripts/check-ci-coverage.py` 与超时日志
  `docs/engineering/CI-TIMEOUT-LOG.md`（后续独立任务）

整改顺序：先 P0 的 Scratch VM 分片（独立 PR），再 P0 的三个 15 分钟 Job 改为 12 分钟
（独立 PR，可合并不改测试内容），再 P1 补 timeout（分批，不一次性改全部 workflow），
最后 P2 脚本与日志。任何一步不得跳过覆盖表与耗时对比。
