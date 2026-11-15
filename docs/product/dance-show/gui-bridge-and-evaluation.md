# OPS-038《我的舞蹈秀》GUI ↔ 课程层接口与评价设计

- **Task-ID**：OPS-038
- **日期**：2026-11-15
- **状态**：样板实现（桌面 1440×900 优先）。正式产品接入前须完成 AGPL 合规审查与移动端适配。
- **前提（已验证，见 OPS-037 报告）**：官方 Scratch GUI（scratch-editor，scratch-gui 15.3.0，AGPL-3.0-only）能在独立实验页面真实运行；孩子的舞蹈作品 .sb3 能完整导入、运行、修改、保存、导出，10 项全部通过。

## 1. 架构：一份真实项目，两种视图

学习模式与创作模式操作的是**同一份 Scratch 项目**，不是两份：

- **创作模式** = 官方 Scratch GUI 本身（standalone 独立部署，iframe 嵌入）。
  孩子在里面做的一切（加角色、换造型、改脚本、换背景、放音乐）都是对真实
  Scratch 项目的真实编辑。
- **学习模式** = KidsCoding 在 GUI 外面加的引导层（本样板页面
  `apps/web/src/app/learn/dance-show/page.tsx` + `features/lessons/dance-show/`）。
  它只做：讲目标、分步骤、给提示、检查作品。**它不重新构造一份虚假的
  课程程序**，也不自带一套角色/造型/声音/背景编辑器。
- **同一作品对象**：学习层的每一步检查读的都是 GUI 里那份项目的
  project.json（见 §2），不是学习层自己维护的另一份状态。

课程指引可以收起（顶栏“收起指引”按钮），收起后 GUI 占满整宽；
再点“展开指引”恢复。不像旧三栏任务区那样长期挤占编辑空间。
指引是**浮层抽屉**（absolute 定位，浮在编辑器上方），不是固定分栏——
这是必需的：实测 Scratch GUI 在宽度 ≤1000px 时隐藏 File/Edit 菜单
（1024px 断点；探针：1440/1220/1080 可见，1000/900/860 隐藏）。
固定分栏会把 GUI 压到约 860px，孩子无法导入/导出 .sb3；浮层让 GUI
恒得内容区全宽（1220px@1440），File 菜单与 480px 舞台始终可用。
代价是浮层展开时会盖住 GUI 左侧（含 File 菜单），孩子须收起指引
再动手——这是抽屉的标准用法，指引里已写明“读完一步点收起指引”。

## 2. 作品状态如何从 GUI 传给课程层（两条通道）

### 通道一（当前样板实际使用）：用户主动导出文件

1. 孩子在 GUI 里用自带的“文件 → 保存到你的电脑”导出 .sb3。
2. 在学习层点“检查我的作品”，在文件选择器里选中刚导出的 .sb3。
3. 学习层在浏览器本地用 JSZip 解出 project.json，用
   `evaluate-project.ts` 按步骤评价（见 §3）。
4. 解析只在本地进行，不上传、不落库；.sb3 内容只当作数据解析，
   不当作代码执行。

安全属性：完全由用户主动发起；不经过任何跨源消息；不信任、不执行
文件里的任何代码；只读 project.json 的结构。

### 通道二（正式产品接入的受控消息接口：发送端已实现，Round 2）

官方 standalone 构建本身**不提供** postMessage 接口（OPS-037 实测：
源码中无 postMessage、无 window.vm），所以桥接的发送端不在官方构建里，
而在部署包装层：GUI 宿主页面（bridge-host.html + bridge.js，用官方
dist 库构建 `scratch-gui-standalone.js` 另起宿主页面，不改 GUI 源码，
P1 原型在 back-instabox 端到端 8/8 PASS）。

- **协议**（父 ↔ 桥共用，与原型 bridge.js 一字不差）：
  信封 `{protocol: 'kidscoding-scratch-bridge', version: 1, type, requestId, payload?}`；
  父 → 桥：`get-project`（取当前作品）、`load-project`（载入作品）；
  桥 → 父：`ready`、`project`（.sb3 ArrayBuffer + projectJson 字符串，
  transfer 传递）、`loaded`、`error`。
- **发送端**（课程层，`gui-bridge.ts` 的 `ScratchBridgeClient`）：
  请求/响应配对（requestId）、超时拒绝；只接受 origin 与 targetOrigin
  严格相等、且 event.source 是该 iframe 的回复；单条载荷上限 5MB，
  超限拒绝；发送一律 `postMessage(msg, targetOrigin)`，**禁止 '*'**；
  targetOrigin 不在白名单里时构造即抛错（fail-closed）。
- **接收端**（旧 `kidscoding.gui.project-state` 接口）仍保留在
  `gui-bridge.ts`（含单元测试），但样板页已不再使用：真实桥接走上面
  的新协议，旧接口只作历史兼容，不伪造“GUI 在发旧消息”的假象。
- **ready 时机（已知局限，如实记录）**：原型 bridge.js 在 window load
  时宣告 ready，早于默认作品加载完成约 1–3 秒（此时 get-project 返回
  空作品 0 targets）。课程层收到 ready 后轮询 get-project 直到 targets
  非空（`waitUntilProjectNonEmpty`，默认 30 秒超时）才启用
  “检查我的作品”；超时未出现非空作品时明确报错，不启用检查。
  桥接改在首个非空作品后再宣告 ready 是更彻底的修法，留给部署包装层。
- **“检查我的作品”**：经桥接直接读 GUI 里正在改的作品
  （get-project → projectJson → 同一套 `evaluateProject`），
  不需要手动导出文件。手动导出文件通道（通道一）保留作备用。
- **持久化**：作品取回后（桥接或文件通道）把完整 .sb3 存入浏览器
  IndexedDB（`project-store.ts`，库名 kidscoding-dance-show，单份
  key 'current'，不上传）；页面加载时若库里有已保存作品，经桥接
  load-project 载入 GUI 并用 get-project 验证非空，恢复上次的作品，
  同时生成步骤 8 的恢复证据（savedAt / loadedAt / restored）。
  IndexedDB 不可用时抛错、页面如实提示，不静默丢作品。
- **初始作品（P3）**：页面“加载初始作品”按钮从
  `NEXT_PUBLIC_DANCE_SHOW_STARTER_URL` 取 starter .sb3，经桥接载入 GUI。
  未配置该地址时点按钮明确提示未配置，不静默失败。初始作品文件本身
  不进仓库（部署时把 P3 的 starter 文件放到静态服务上）。
  部署注意：starter 是页面用 fetch 跨源取的，静态服务须与课程页同源，
  或带 `Access-Control-Allow-Origin` 头——本地验证曾因缺 CORS 头
  导致 fetch 失败、starter 没载入（已用带 CORS 头的服务复测通过）。
  初始作品素材全部是官方 Scratch 素材库资产（Abby 4 造型、Dance Space、
  Spotlight、Bedroom 3、backdrop1、pop，从 assets.scratch.mit.edu 重新下载、
  逐个校验 MD5，没有从负责人 .sb3 复制字节；当前背景 Bedroom 3，与
  `STARTER_BACKDROP` 一致）。许可证版本未能核实（不要写 CC BY-SA 4.0：
  历史是 CC BY-SA 2.0，现行条款不统一指明版本），页面与本文档只写
  “官方 Scratch 素材库资产，许可证版本待法律复核”。
- **来源白名单**：只接受 `NEXT_PUBLIC_SCRATCH_GUI_ORIGINS`
  （逗号分隔）或 `NEXT_PUBLIC_SCRATCH_GUI_URL` 的 origin，
  用严格相等比较，不用子串、不含通配符；**未配置时白名单为空**
  （fail-closed），页面不渲染 iframe、不连 localhost。

### 禁止事项（硬性）

- 禁止 `postMessage('*')` 发送或接收。
- 禁止 event.origin 不校验就处理消息。
- 禁止把收到的消息内容当作代码执行（eval / new Function / innerHTML 注入）。
- 禁止为“打通”而放宽受限教学沙箱的白名单（G2 适配器与沙箱白名单不动）。

## 3. 课程评价：核对真实项目与运行结果

评价引擎 `evaluate-project.ts` 读 project.json 的结构，不只检查积木字符串：

| 检查维度 | 读什么 | 例子 |
|---|---|---|
| 角色 | targets（非 Stage 的 name） | Abby 在 |
| 造型 | 目标的 costumes[].name | Abby-a/b/c/d 至少 4 个（增加素材不扣分） |
| 背景 | Stage 的 costumes[].name + currentCostume | 至少 3 个背景，当前是 Spotlight（starter 保存时是 Bedroom 3，见下） |
| 声音 | 目标的 sounds[].name | Dance Space、pop |
| 脚本 | blocks 的 opcode、topLevel、连线、输入值 | 两条绿旗脚本；control_wait 的 DURATION 存在 inputs 里（`[1, [5, "0.3"]]`，不是 fields）；control_repeat 只数真实连在脚本里的（P2 修复） |

**两个容易踩的真实格式细节**（均由真实 .sb3 实测确认，不是按文档猜的）：
- `control_wait` 的等待秒数存在 **`inputs.DURATION`**（`[1, [5, "0.3"]]`），
  不是 `fields.DURATION`。评价引擎的 `readNumericInput` 先读 inputs、
  再兼容 fields；写错会把等待读成空（本样板开发中已踩过并修正）。
- starter .sb3 保存时的当前背景是 **Bedroom 3**（`stage.currentCostume = 2`），
  不是 backdrop1。所以步骤 6“换一个背景”的判据是“当前背景不是
  Bedroom 3，或用了换背景积木”，不能只判“不是 backdrop1”——否则
  原始作品就会误判为已换背景（本样板开发中已踩过并修正；
  常量 `STARTER_BACKDROP` 在 `evaluate-project.ts`，starter 文件更换须同步改）。
- GUI 里 wait 积木的 SVG 文本在 DOM 中的顺序是数字在前
  （`"1" | "wait" | "seconds"`），视觉上是 "wait 1 seconds"。
  自动化判读须按 DOM 顺序拼，不能按视觉顺序拼。
| 运行结果 | 结构 + 孩子在 GUI 里实际运行 | 结构证明脚本正确（forever + next costume + wait 点绿旗必定跳舞）；舞台实际变化由真实浏览器验证（见验证报告），音乐由真人听音验收 |

每一步的检查都在 `evaluateProject` 里写明实际读到的值（例如
“等待时间是 [1, 0.1] 秒”），不是只报通过/不通过。
步骤与检查的对应关系见 `dance-show-steps.ts` 与
`evaluate-project.ts` 的 step id（step-0 ~ step-8）。

**P2 判定修复（Round 2，2026-11-15）**：
1. **连接计数**：只数真实连在脚本里的积木（沿 parent 链能走到顶层
   帽子积木的才算）。步骤 3 的 control_repeat 与步骤 7 的
   repeat/forever 计数、步骤 2 的“下一个造型”、等待时间、音量与播放
   积木都改用连接后计数；浮在工作区、没连上的积木不通过。
   正反测试在 `evaluate-project.test.ts`（未连接 repeat 应拒绝、
   浮动等待不计入节奏）。
2. **保存重开（步骤 8）**：只认真实的保存→关闭→重新打开流程。
   页面在确实发生“保存后重新加载”时提供恢复证据
   `{savedAt, loadedAt, restored}`（IndexedDB 里有上次保存的作品，
   本会话经桥接载入并验证非空）；步骤 8 要求恢复证据为真且修改仍在。
   没有恢复证据时步骤 8 不通过，并写明原因（不是只看文件里有没有改）。
3. **至少判据**：造型 ≥4、背景 ≥3（原来是恰好等于 4/3），孩子主动
   增加素材不扣分；detail 文案同步改成“至少”。
4. **评价口径**：自动评价核对的是项目结构与已观测的运行证据，
   不宣称已验证每位孩子的实际运行结果。`evaluationScopeNote` 在
   无运行观测值时明确标注“本次评价基于项目结构，未观测到实际运行过程”；
   桥接若发来运行观测值（greenFlagClicked / costumeSwitched /
   soundPlayed，原型 bridge.js 目前不发），则在 detail 里写明已观测到的项。
   允许多种合理的创作结果，拒绝未连接、未执行或行为不符合目标的程序，
   不要求照抄标准答案；独立挑战（步骤 7）保留。

**运行结果的验证分工**：
- 样板验证时：用真实 Chromium（Playwright）截图对比舞台变化，
  证明点绿旗后舞台真的在变、改等待时间后速度真的变了（见验证报告）。
- 产品使用时：孩子在 GUI 里点绿旗、自己看到 Abby 跳舞；评价引擎
  核对项目结构（脚本正确是舞蹈能跑的保证）。
- 音乐：无头浏览器只能证明 WebAudio 触发了播放，不能证明人耳听到。
  因此音乐设为**待真人听音验收**（页面明确标注，不自动判通过；
  真人须在真实设备上确认：能听到、能停止、保存后仍正常）。

## 4. 文件清单（本 Task-ID 的修改范围）

Round 2（feature/ops-038-round2-bridge-eval，基底 main 2369b8fa）新增/修改：
- `apps/web/src/features/lessons/dance-show/gui-bridge.ts`：桥接发送端
  `ScratchBridgeClient`（协议、校验、5MB 上限、ready 后轮询等非空）；
  `defaultGuiOriginAllowlist` 未配置时返回空（fail-closed）。
- `apps/web/src/features/lessons/dance-show/project-store.ts`（新增）：
  IndexedDB 持久化（保存/读出/清空，单份 key 'current'）。
- `apps/web/src/features/lessons/dance-show/evaluate-project.ts`：
  连接计数、步骤 8 恢复证据、至少判据、评价口径（`evaluationScopeNote`）。
- `apps/web/src/features/lessons/dance-show/dance-show-steps.ts`：
  步骤文案同步（至少、连接要求、恢复流程、初始作品按钮）。
- `apps/web/src/features/lessons/dance-show/ui/dance-show-page.tsx`：
  P0 fail-closed（无默认 localhost，未配置不渲染 iframe）、桥接检查
  主通道、文件检查备用、IndexedDB 保存/恢复、加载初始作品。
- `apps/web/src/features/lessons/dance-show/evaluate-project.test.ts`、
  `gui-bridge.test.ts`：P2 正反例子与桥接消息校验测试。
- `docs/product/dance-show/gui-bridge-and-evaluation.md`（本文件）：Round 2 更新。
- `docs/roadmap/task-register.json`：仅 OPS-038 条目（scope/notes，
  状态保持 in_progress；生产构建 OOM 改为已解决）。

Round 1 新增（不改已有文件）：
- `apps/web/src/app/learn/dance-show/page.tsx`（路由与元数据）
- `apps/web/src/features/lessons/dance-show/dance-show-steps.ts`（9 步学习内容）
- `apps/web/src/features/lessons/dance-show/evaluate-project.ts`（评价引擎）
- `apps/web/src/features/lessons/dance-show/gui-bridge.ts`（安全接口）
- `apps/web/src/features/lessons/dance-show/ui/dance-show-page.tsx`（样板页面）
- `apps/web/src/features/lessons/dance-show/evaluate-project.test.ts`（评价引擎测试）
- `apps/web/src/features/lessons/dance-show/gui-bridge.test.ts`（安全接口测试）
- `docs/product/dance-show/gui-bridge-and-evaluation.md`（本文件）

修改：
- `apps/web/package.json` + `package-lock.json`：新增 `jszip ^3.10.2`
  （浏览器本地解析 .sb3 用；此前已是 scratch-storage 的传递依赖，
  本次显式声明为直接依赖，lock 只增 1 行）。
- `docs/roadmap/task-register.json`：新增 OPS-038 条目（in_progress）。

明确不改：G2 课程适配器、受限教学沙箱白名单、实验页
（`/lab/scratch-gui-spike`，OPS-037 收口）、旧 G0 课堂、
LessonWorkspace、React 版本。

## 5. 真实浏览器验证结果（2026-11-15，1440×900，15/15 PASS）

验证脚本 `~/workspace/ops-038-dance-show/verify-dance-show.mjs`
（Playwright + 真实 Chromium，本地，不提交仓库），截图
`~/workspace/ops-038-dance-show/shots/`：

| # | 验证项 | 结果 |
|---|---|---|
| P0 | 样板页加载（标题+9 步指引+GUI iframe） | PASS |
| P0b | GUI iframe 内加载出 Scratch 编辑器 | PASS |
| P1/P1b/P1c | 指引可收起、可再展开；收起后 GUI 全宽、File 菜单可用 | PASS |
| 1 | 导入初始 .sb3（Abby + 两条脚本 + wait 0.3） | PASS |
| 2 | 点绿旗真正跳舞（2.2 秒内舞台变化 10 次） | PASS |
| 5 | Dance Space 音乐脚本可操作（WebAudio start ×2，首 buffer 4.0087 秒） | PASS（只证明触发，待真人听音） |
| 4 | 改等待 0.3→1 后速度变化（10 次 → 5 次） | PASS |
| D1 | 从工具箱拖拽 repeat 积木到工作区（步骤 3 动手） | PASS |
| 6 | 三背景可选，点 Spotlight 后舞台真的换了 | PASS |
| E1 | 评价原始作品：通过 3/9 步（0/1/2 过，改动类不过） | PASS |
| E2 | 评价改过作品：通过 9/9 步 | PASS |
| 10 | 导出 .sb3 有效且保留修改（336055 字节，等待值 [1]） | PASS |
| 9 | 保存关闭重开保留修改（wait=1、两条脚本都在） | PASS |

单元测试：`npx vitest run src/features/lessons/dance-show/` 11/11 通过；
ESLint 干净；tsc 我方文件 0 错误（主线已有 73 个错误与本改动无关）。

## 5b. Round 2 真实浏览器验证（2026-11-15，1440×900，12/12 PASS）

验证脚本 `~/workspace/ops-038-round2-verify/verify-round2.mjs`
（Playwright + 真实 Chromium，本地，不提交仓库），截图
`~/workspace/ops-038-round2-verify/shots/`。环境：Next.js 开发服务器
`:3000` + 本地桥接宿主 `:8903`（开发模式 dist 库构建 +
原型 bridge-host.html/bridge.js，PARENT_ORIGIN 改为
http://localhost:3000；生产构建产物本身在 back-instabox，
本地验证用相同提交的开发模式构建——验证的是课程层代码与桥接协议，
不是生产构建产物）。

| # | 验证项 | 结果 |
|---|---|---|
| R0a | 样板页加载（9 步指引 + GUI iframe 内 Scratch 编辑器） | PASS |
| R0b | 桥接就绪后“检查我的作品”可用（不等 ready、轮询到作品非空） | PASS |
| R0c | iframe 地址是配置的桥接宿主页，不是 localhost:8601 默认 | PASS |
| R1 | 加载初始作品：步骤 0/1/2 过，改动类不过 | PASS |
| R2a | 桥接“检查我的作品”无需手动导出，直接读 GUI 当前作品 | PASS |
| R2b | 检查后完整 .sb3 存入 IndexedDB，往返解析结构正确（Abby 4 造型、等待 0.3） | PASS |
| R3a | 重新打开后恢复上次保存的作品（页面显示恢复记录） | PASS |
| R3b | 原始作品无修改：步骤 8 不通过（恢复证据在，但修改不在） | PASS |
| R4a | 经 GUI 导入改过作品（等待已改，不再是 0.3；导入时 GUI 弹 replace 确认，验证里点确定） | PASS |
| R4b | 改过作品桥接检查：除步骤 8 外 8 步通过（恢复后又改过的不算，哈希绑定生效） | PASS |
| R4c | 改过作品已存入 IndexedDB，往返解析结构正确（等待已改成 1 与 0.1） | PASS |
| R5 | 保存关闭重开保留作品：9/9 通过（含步骤 8，恢复证据有效） | PASS |

P0 另验（同日）：未配 `NEXT_PUBLIC_SCRATCH_GUI_URL` 时页面显示
“创作环境地址未配置，请联系负责人”，无 iframe、“检查我的作品”
禁用、全程 0 次请求 localhost:8601；只配 GUI 地址、不配 starter
地址时，点“加载初始作品”明确报错“初始作品地址未配置”。

验证中发现并修复的两个真问题（均已进本 PR，不只改测试）：
- 客户端曾只等 `ready` 宣告：ready 只发一次，若在监听挂载前就已发出
  （或开发模式 StrictMode 二次挂载），会永远等不到。改成不等 ready、
  直接轮询 get-project 直到作品非空；单次超时/报错继续轮询到总超时；
  成功的 project/loaded 回复也视为存活证明。单元测试新增覆盖。
- 步骤 8 的恢复证据曾不绑定作品内容：恢复旧作品后、之后再改也能
  “搭便车”通过。改成证据绑定作品规范哈希（projectHash，key 排序后
  cyrb53），步骤 8 要求当前作品哈希与证据一致。
- 另两个是验证环境问题，非产品问题：starter 跨源取须 CORS 头
  （静态服务已加；部署注意见 §2）；GUI 导入改过作品时弹 replace
  确认（作品被改过时的既定保护，真人点确定；无头默认取消）。

单元测试：`npx vitest run src/features/lessons/dance-show/` 33/33 通过；
ESLint 干净；tsc 我方文件 0 错误（主线已有 73 个错误与本改动无关；
dev 服务器运行时另有 1 个 `.next` 生成文件错误，干净检出不存在）。
IndexedDB 持久化无 jsdom 单元测试（无 fake-indexeddb），由本节
真实浏览器验证覆盖（R2b/R3a/R4c/R5）。

## 6. 未解决项与后续

- 生产构建：已解决。scratch-editor standalone 生产构建已在
  back-instabox 成功（webpack 峰值约 5.3GB，7.5GB 可用内存足够，
  不需要 16GB+、不买服务器；dist-standalone 不产 standalone.html，
  可服务版用 NODE_ENV=production webpack）。旧“OOM（6GB Terser）”
  描述已从台账 OPS-038 notes 里改掉。
- 移动端：桌面 GUI 是第一版基线；375×812 下 GUI 布局不可用
  （舞台被挤出，须响应式适配），不得伪报 PASS。
- AGPL 合规：源码提供方式、LICENSE/NOTICE 保留、修改发布流程、
  法律复核；未完成前不合入正式产品主线、不对外发布。
- 初始作品许可证版本：官方 Scratch 素材库资产的 CC 版本待法律复核
  （不要写 CC BY-SA 4.0）；与 AGPL 合规走同一法律复核通道。
- 真人听音验收：待负责人在真实设备上完成。
- 桥接 ready 时机：原型 bridge.js 在 window load 时宣告 ready，早于
  默认作品加载完成；课程层现用轮询等非空兜底，桥接改在首个非空作品
  后再宣告 ready 是更彻底的修法，留给部署包装层。
