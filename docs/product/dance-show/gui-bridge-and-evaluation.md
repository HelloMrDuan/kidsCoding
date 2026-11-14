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

### 通道二（正式产品接入的受控消息接口：已实现接收端并实测）

官方 standalone 构建本身**不提供** postMessage 接口（OPS-037 实测：
源码中无 postMessage、无 window.vm），所以本样板不伪造“GUI 已在
发消息”的假象。接收端已经实现并经单元测试验证（`gui-bridge.test.ts`），
为正式桥接做准备：

- **来源白名单**：只接受 `NEXT_PUBLIC_SCRATCH_GUI_ORIGINS`
  （默认 `http://localhost:8601`，生产部署必须覆盖）里的来源，
  用严格相等比较，不用子串、不含通配符。
- **消息结构**：只接受
  `{type: 'kidscoding.gui.project-state', version: 1, project: {...}}`，
  type 与 version 必须完全匹配，project 必须是对象。
- **发送端**：必须用明确的 targetOrigin 调用 postMessage，**禁止 '*'**。
  目标来源不在白名单里时，`postToGui` 直接拒绝发送。
- **接收端**：`createGuiMessageListener` 只处理来源在白名单且结构合规
  的消息；其余一律丢弃，不处理、不回传、不记录敏感内容。
- **收到合规消息时**：同样走 `evaluateProject` 评价并更新结果，
  与通道一同一套评价逻辑。

正式桥接的发送端（待建，不在本样板内）：用官方
`createStandaloneRoot` + `EditorState` 搭建 GUI 宿主页面（不改 GUI 源码），
从 `EditorState.store.getState().scratchGui.vm` 取项目状态
（`vm.toJSON()` / `vm.saveProjectSb3()`），按上述约定向课程层发送。
宿主页面与课程层分属不同源时，发送端用明确 targetOrigin，接收端用
本文件的白名单校验；两者缺一不可。

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
| 造型 | 目标的 costumes[].name | Abby-a/b/c/d 共 4 个 |
| 背景 | Stage 的 costumes[].name + currentCostume | 3 个背景，当前是 Spotlight（starter 保存时是 Bedroom 3，见下） |
| 声音 | 目标的 sounds[].name | Dance Space、pop |
| 脚本 | blocks 的 opcode、topLevel、连线、输入值 | 两条绿旗脚本；control_wait 的 DURATION 存在 inputs 里（`[1, [5, "0.3"]]`，不是 fields）；control_repeat 数量 |

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

**运行结果的验证分工**：
- 样板验证时：用真实 Chromium（Playwright）截图对比舞台变化，
  证明点绿旗后舞台真的在变、改等待时间后速度真的变了（见验证报告）。
- 产品使用时：孩子在 GUI 里点绿旗、自己看到 Abby 跳舞；评价引擎
  核对项目结构（脚本正确是舞蹈能跑的保证）。
- 音乐：无头浏览器只能证明 WebAudio 触发了播放，不能证明人耳听到。
  因此音乐设为**待真人听音验收**（页面明确标注，不自动判通过；
  真人须在真实设备上确认：能听到、能停止、保存后仍正常）。

## 4. 文件清单（本 Task-ID 的修改范围）

新增（不改已有文件）：
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

## 6. 未解决项与后续

- 生产构建：scratch-editor standalone 生产构建在 6GB 环境下 Terser
  阶段 OOM（OPS-037 已验证）；正式接入须在 16GB+ 独立构建环境重做，
  成功后验证生产产物（不以开发服务器通过代替）。
- 移动端：桌面 GUI 是第一版基线；375×812 下 GUI 布局不可用
  （舞台被挤出，须响应式适配），不得伪报 PASS。
- AGPL 合规：源码提供方式、LICENSE/NOTICE 保留、修改发布流程、
  法律复核；未完成前不合入正式产品主线、不对外发布。
- 正式桥接发送端（通道二的 GUI 宿主页面）：待建。
- 真人听音验收：待负责人在真实设备上完成。
