# OPS-037 Spike 记录：Scratch GUI 兼容性验证与舞蹈样板“我的舞蹈秀”

- **Task-ID**：OPS-037
- **Spike 分支**：`spike/ops-037-scratch-gui`（基底 main `348bf069`）
- **Spike PR**：[#532](https://github.com/HelloMrDuan/kidsCoding/pull/532)（已合并，merge `e127d04`）
- **收口 PR**：本记录随实验页 dev-only 门禁修复一并提交（见“收口变更”）。
- **日期**：2026-11-14
- **状态**：Spike 已完成（第一阶段与第二阶段全部实测通过）；正式产品接入另立 Task-ID，不复用 OPS-037。

## 1. 结论先行

- 原版 Scratch GUI 能在独立实验页面真实运行；孩子的舞蹈作品能完整导入、运行、修改、保存、导出，**10 项全部 PASS**。
- 推荐集成方式：**standalone 构建 + iframe/独立页面**（已验证），不走 npm 库方式（React 19 不兼容）。
- 正式采用前有 5 项待办（生产构建内存、React 19 库方式不可行、移动端适配、AGPL 合规动作、VM 版本线），见 §6。
- **实验页仅限本地开发**：生产环境下访问 `/lab/scratch-gui-spike` 返回 404，不渲染 iframe、不连接 localhost（见 §5）。

## 2. 固定版本（复现用）

| 项 | 值 |
|---|---|
| scratch-editor 仓库 | https://github.com/scratchfoundation/scratch-editor，develop 分支，提交 `009d7bb5` |
| scratch-gui 版本 | **15.3.0**（`@scratch/scratch-gui`） |
| scratch-vm（GUI 自带） | **15.3.0**（单体仓库内版本，与本仓库自托管的 scratch-vm 5.0.300 不是同一版本线） |
| Node | 本机 v24.22.1；scratch-editor `.nvmrc` 为 24.22.3，兼容 |
| KidsCoding 基底 | main `348bf069`（Spike 分支基底）；收口基底 main `e127d04` |
| 验证浏览器 | 真实 Chromium（Playwright 1.58.2，chromium-1208），视口 1440×900 |

**依赖锁文件说明**：本仓库未把 `@scratch/scratch-gui` 加为依赖（npm 库方式与 React 19 不兼容，见 §4），故本仓库的 `package-lock.json` 不含 GUI 依赖。scratch-editor 单体仓库自带其锁文件，复现时以该仓库 `develop@009d7bb5` 的锁文件为准。正式接入时须固定 scratch-editor SHA、Node、依赖锁文件和构建命令（负责人裁定）。

## 3. 测试方法（可复现）

### 3.1 准备

```bash
# 1. 克隆 scratch-editor（develop 分支，固定提交 009d7bb5）
git clone --branch develop https://github.com/scratchfoundation/scratch-editor.git
cd scratch-editor
git rev-parse HEAD  # 应为 009d7bb5（或以记录为准的固定提交）

# 2. 安装依赖（workspaces，2982 个包，约 2 分钟）
npm install

# 3. 先构建依赖包（task-herder、storage、svg-renderer、paint、render、vm），
#    再构建 scratch-gui；直接跑 build:dist-standalone 会因依赖包 dist 不存在
#    而报 TS2307。依赖包构建全部成功后，再跑 GUI 构建。
npm run build   # 全部 workspaces（见 §4：生产构建在本机 6GB 环境下 OOM）

# 4. 启动开发服务器验证（Spike 阶段用开发服务器，不以生产构建代替）
npm start       # webpack serve，监听 :8601，约 35 秒编译完成
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8601/  # 应为 200
```

```bash
# 5. 启动 KidsCoding 开发服务器（本仓库 apps/web）
cd apps/web
npm ci
npm run dev     # 监听 :3000
```

### 3.2 第一阶段：GUI 技术验证

- 打开实验页 `/lab/scratch-gui-spike`（开发环境），确认 iframe 内完整渲染官方 GUI（菜单栏、Code/Costumes/Sounds 三标签、积木库、舞台、默认小猫 Sprite1）。
- 核实兼容性：npm 库方式（`@scratch/scratch-gui` 当依赖装进 Next.js 应用）会直接抛错——GUI 用 `ReactDOM.render`（React 18 API），本仓库 react-dom 19.2.4 已移除该 API（实测 `typeof ReactDOM.render === 'undefined'`），GUI peerDeps 要求 react `^18.0.0`。正式接入须走 standalone + iframe。
- 测运行时内存：GUI 页面 JS 堆桌面加载 .sb3 后约 104MB，移动端 375×812 约 87MB。
- 测移动端：375×812 能加载、不崩溃，但布局为桌面三栏，舞台被挤出可视区，须横向滚动——移动端不可直接用，须另做响应式适配。

### 3.3 第二阶段：真实作品验证（10 项）

样例为负责人提供的 `.sb3`（337361 字节，SHA-256 `c4948fb79133c4217130b509ef06b307f8dda31823a79681ed8844920380f679`；Stage 3 背景 + pop，Abby 4 造型 + Dance Space，两条绿旗脚本）。**样例文件仅本地测试，未提交到仓库**。

在真实 Chromium（Playwright 1.58.2）中逐项验证：

| # | 要求 | 验证方法 | 结果 |
|---|---|---|---|
| 1 | 导入作品成功 | File → Load from your computer 选 .sb3；归一化积木标签的不换行空格（U+00A0）后核对 next costume、Dance Space、wait 0.3、play sound、forever 均存在 | PASS |
| 2 | Abby 四造型完整 | Costumes 标签页列出 Abby-a/b/c/d（4/4） | PASS |
| 3 | 三背景可选 | Backdrops 标签页列出 backdrop1/Spotlight/Bedroom 3（3/3） | PASS |
| 4 | 两条原始脚本可见、可编辑 | Code 标签页显示两条脚本；可编辑性由第 6 项证明 | PASS |
| 5 | 绿旗跳舞 | 点绿旗（用 `button[aria-label="Start project"]` 选择器，勿用坐标）后舞台三次采样哈希均不同 | PASS |
| 6 | 改等待时间变速度 | 2.2 秒窗口每 0.2 秒采样舞台哈希计变化次数：wait=0.3 时 8 次，改 wait=1.0 后 3 次 | PASS |
| 7 | Dance Space 音乐真实播放 | WebAudio 插桩：`AudioBufferSource.start` 被调用 3 次，首 buffer 时长 4.0087 秒。无头浏览器无法验证扬声器可听输出，验证的是音频管线真实触发播放 | PASS |
| 8 | 角色/造型/声音/背景可操作管理 | Sounds 标签页有 Dance Space；Costumes 4 造型；Backdrops 3 背景；角色面板有 Abby（官方管理界面） | PASS |
| 9 | 保存关闭重开保留修改 | 改 wait 为 1 后导出；关闭重开并重新导入，Code 页显示 wait 1 seconds；导出 project.json 解析 `waitDurations ['1']` | PASS |
| 10 | 导出 .sb3 能在标准 Scratch 重开 | 导出文件 336002 字节，有效 ZIP，10 条目；重新导入官方 GUI 成功加载 | PASS |

**合计：10/10 PASS，无 FAIL。**

验证中的探针问题（已解决，不影响结论）：积木标签用 U+00A0 不换行空格（须归一化后匹配）；绿旗须用 `aria-label="Start project"` 选择器（坐标误点停止按钮）；查背景后须重新点选 Abby 再查脚本。

## 4. 构建命令与实测结果

| 命令 | 结果 |
|---|---|
| `npm install`（scratch-editor 根） | 成功，2982 个包 |
| 依赖包构建（task-herder、storage、svg-renderer、paint、render、vm） | 全部成功，均生成 dist |
| `npm run build`（全部 workspaces，含 GUI 生产构建） | **失败：scratch-gui 的 webpack 生产构建在 92% sealing（Terser）时被 OOM 杀掉，exit 137**。本机可用内存约 6GB。依赖包构建已成功，失败只在 GUI 的生产打包 |
| `npm start`（webpack serve 开发服务器） | **成功**，监听 :8601，`curl` 返回 200，标题 “Scratch 3.0 GUI” |

**结论**：生产构建 OOM 是构建环境内存不足，不是 GUI 缺陷。最小修复路径：① 在 16GB 或以上内存的独立构建环境构建；或 ② 降低 Terser 并行/内存；或 ③ 先用开发服务器验证，正式接入时再解决生产构建。成功后必须验证生产产物，不以开发服务器通过代替生产成功。

## 5. 收口变更：实验页仅限本地开发

#532 合并时实验页默认 iframe 到 `http://localhost:8601/`，生产构建中可直接访问，会尝试连接访客的 localhost。本收口修复：

- `apps/web/src/app/lab/scratch-gui-spike/page.tsx` 改为服务端组件，在生产环境（`NODE_ENV=production`）下调用 `next/navigation` 的 `notFound()` 返回 404，不渲染 iframe、不连接 localhost；开发环境（`NODE_ENV=development`）下保持原样可用。
- 本收口不改其他产品代码，不改 G2 适配器，不动受限沙箱白名单。
- 本地验证：开发模式能打开实验页（200 + iframe）；生产构建（`npm run build`）后用 `next start` 访问该路由返回 404。验证证据见收口 PR 描述。

## 6. 阻塞与后续待办（正式采用前须解决）

| # | 事项 | 状态 | 最小修复路径 |
|---|---|---|---|
| 1 | 生产构建 OOM（6GB 环境，Terser 阶段 exit 137） | 阻塞（构建侧） | 16GB 或以上内存的独立构建环境；或降 Terser 并行/内存；不修改现有 KidsCoding React 19；不购买新服务器；无合适构建环境时汇报实际资源缺口 |
| 2 | npm 库方式与 React 19 不兼容（ReactDOM.render 已移除） | 阻塞（集成方式） | 正式接入走 standalone 构建 + iframe/独立页面，不走 npm 库方式。已验证可行 |
| 3 | 移动端布局不可用（375px 下舞台被挤出可视区） | 待办（产品侧） | 须做响应式适配（舞台与代码区切换显示等）；桌面先行不代表手机完成，手机功能不得伪报 PASS；确需改 GUI 内部布局时用独立受控补丁并落实 AGPL 源码义务 |
| 4 | AGPL 合规动作未完成 | 阻塞（法律侧） | 源码提供方式、LICENSE/NOTICE 保留、修改发布流程、法律复核。未完成前不合入正式产品主线 |
| 5 | GUI 自带 VM 15.3.0 与本仓库自托管 VM 5.0.300 版本线不同 | 待办（架构侧） | 正式接入时明确以 GUI 自带 VM 为准，不混用两个 VM |

## 7. AGPL-3.0-only 合规评估（结论）

**结论：可以正式采用，但须先完成合规动作并经法律复核；未完成前不得合入正式产品主线。**

事实依据（已读原文）：scratch-editor 根 `LICENSE`、scratch-gui 与 scratch-vm 各自的 `LICENSE` 均为 GNU AGPL v3 全文；根与 scratch-gui 的 `package.json` 的 `license` 字段均为 `AGPL-3.0-only`。旧版（LLK，BSD-3-Clause）与当前版（Scratch Foundation，AGPL-3.0-only）许可证不同，须按当前版执行。

AGPL-3.0 对 KidsCoding（公开 Web 应用）意味着：

1. **网络使用触发源码提供义务（AGPL §13）**：通过网络向用户提供 AGPL 程序时，须向用户提供获取对应源码的方式。
2. **修改须同许可**：对 GUI 代码的任何修改，须同样以 AGPL-3.0-only 提供源码。
3. **保留声明**：须保留版权与许可证声明，不得移除。
4. **边界问题（须法律复核）**：iframe/standalone 方式与 npm 打包进应用包相比，前者的合规边界更清晰，但最终定性须由法律专业判断。**不能因为采用 iframe 就宣称 AGPL 对 KidsCoding 没有影响。**
5. **须做的合规动作（正式采用前）**：锁定使用的官方源码版本；核对 AGPL、第三方 LICENSE/NOTICE、素材和商标使用边界；明确提供对应源码和构建说明的方式；审查 GUI 是否修改、与 KidsCoding 如何通信、是否形成结合作品；对 AGPL §13 和常规分发义务分别评估；完成法律专业复核后才能批准正式公开发布。

本记录不是法律意见。正式采用前须由负责人安排法律复核。

## 8. 证据索引（本地证据，不入仓）

完整验证报告与浏览器证据截图只存本地，**未提交到公开仓库**：

- 完整报告：`~/workspace/kidscoding-next-phase/ops-037-spike-report.md`（16KB，逐项 PASS/FAIL、浏览器证据、许可证评估、阻塞与修复路径）
- 浏览器证据截图：`~/workspace/ops-037-spike/shots/`（01/03/10/11/12/13/14/15/16/17/20–27/30/31/40/50）
- 验证脚本（本地）：`~/workspace/ops-037-spike/verify-gui.mjs`、`verify-phase2.mjs`、`verify-phase2-fixup.mjs`、`probe-selectors.mjs`
- scratch-editor 源码（本地构建用）：`~/workspace/ops-037-spike/scratch-editor/`（develop，009d7bb5）
- 导出文件（本地）：`~/workspace/ops-037-spike/exported-after-edit.sb3`（336002 字节）
- 样例 .sb3（本地，负责人提供）：`~/workspace/user/files/Scratch.sb3`（337361 字节，SHA-256 `c4948fb79133c4217130b509ef06b307f8dda31823a79681ed8844920380f679`）

**未提交到公开仓库**：样例 .sb3、其中音频素材、导出文件、scratch-editor 源码、验证脚本、截图二进制文件。提交到仓库的只有实验页、OPS-037 台账条目与本记录文档。

## 9. 未做事项（本 Spike 不包含）

- 未修改任何 G2 课程适配器，未动受限教学沙箱白名单。
- 未把官方 GUI 代码合入正式产品主线（实验页只 iframe 到本地开发服务器）。
- 未做第三阶段（学习模式层）；正式产品接入须另立 Task-ID。
