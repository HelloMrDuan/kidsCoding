# 创作中心（OPS-050）

`/create` 提供 Scratch 图形化创作、Python 代码创作和本机作品库。两个编辑器共用 V2 顶栏。Scratch 原生组件提供角色、舞台、造型、声音、积木、绿旗和停止，通过 OPS-038 桥接保存与导出完整 `.sb3`。Python 代码使用 CodeMirror 6，作品可导出或从 UTF-8 `.py` 导入。课程草稿、判定、进度及原有课堂入口沿用原来的路径。

## 审核整改与本机存储

- 进入编辑器、从顶栏返回、进入导入页均用文档导航。修改作品后启用浏览器原生离开确认，覆盖后退、前进、刷新、关页及站内返回。取消会保留当前编辑器。浏览器被操作系统强制终止时，只能恢复最后一次成功保存。
- IndexedDB 按经 Supabase 核验的账号或访客分库。身份核验失败时关闭对应工作区，不回退访客库。旧版 Scratch 作品保留 ID 和 `.sb3` 内容，首次打开访客库自动迁移。登录用户可在访客库导出旧作，再以账号导入。此处是应用层本机隔离，浏览器存储没有加密或云同步。
- 保存使用事务及版本校验，另一窗口已保存后会提示冲突，可先导出当前编辑版本。删除后旧窗口无法重新写入已删除记录。账号退出后重新登录原账号可恢复其本机列表，换设备靠作品文件迁移。
- 独立 Chrome workflow 分开运行 Scratch 与 Python 专项，上传报告、截图及失败 trace。沿用 Ubuntu 24.04 Runner 自带 Chrome 探测。见 [#564 独立复核](https://github.com/HelloMrDuan/kidsCoding/pull/564#issuecomment-7029229158)。

## Python 运行能力

每次执行使用新 Worker 和独立内存文件系统。隔离 iframe 采用不透明来源及禁止联网的 CSP。父页传入锁定版本的本地 Pyodide 资源，用户代码没有网页 DOM、外部网络、作品库、用户文件或第三方依赖安装权限。`input()` 通过 JSPI 等待控制台提交，再在同一个解释器里继续运行。缺少 JSPI 的浏览器会收到提示，可用最新版 Chrome 或 Edge。

初始化限时 45 秒，每个执行段限时 8 秒，等待输入限时 2 分钟。Wasm 线性内存上限 256 MiB，源文件限 UTF-8 128 KiB，输出超过 64,000 字符会截断并提示。停止、重置和超时销毁正在运行的 Worker 及其隔离 iframe。下一次运行重新初始化，作品源码保留。

## 构建与部署

Scratch GUI 和 KidsCoding Web 使用不同来源。准备固定 Scratch Foundation 官方 GUI 15.3.0 发布包，脚本验证 SHA-512 后才解包。Web 端没有引入另一套 React 或重新实现 Scratch GUI。

```sh
npm pack @scratch/scratch-gui@15.3.0
node apps/scratch-host/prepare.mjs scratch-scratch-gui-15.3.0.tgz
SCRATCH_PARENT_ORIGIN=http://127.0.0.1:3110 node apps/scratch-host/serve.mjs
```

另一个终端从 `apps/web` 构建和启动 KidsCoding：

```sh
npm ci
npm run build
SCRATCH_CREATE_GUI_URL=http://127.0.0.1:8610/host.html npm start -- --hostname 127.0.0.1 --port 3110
npx playwright test -c playwright.scratch-create.config.ts
```

Muse 在预发布使用两个 HTTPS 来源，在 Web 进程或容器启动时设置 `SCRATCH_CREATE_GUI_URL` 为 Scratch `host.html` 的完整 URL。Scratch 宿主设置 `SCRATCH_PARENT_ORIGIN` 为 Web 的准确来源，无路径。反向代理保留 `Content-Security-Policy: frame-ancestors`，可用 `SCRATCH_PORT`、`SCRATCH_BIND` 指定监听端口和地址。Python 依赖资源由 `npm run build` 从锁定依赖复制。代理应允许访问 `/python-create-sandbox.html` 与 `/python-create-runtime/`，并保留沙箱 CSP。Scratch `.sb3` 保存和导入上限约为 3.75 MiB，沿用课程桥接限制。课程 GUI URL 与账号设置沿用部署原值。

预发布核对两个服务的版本和安全头，用两个实际账号检查作品隔离。分别在 Scratch 和 Python 执行新建、编辑、保存、刷新、导出、重新导入、再运行，并复验实际触摸设备。回滚时恢复前一个 Web 镜像，保留新旧本机 IndexedDB。回滚到只读旧库的版本前先允许新版作品导出。回撤期间旧版列表无法显示新版作品，重新上线后仍可读取。

## AGPL 与素材

采用 [Scratch Foundation 源码 `ba0da34`](https://github.com/scratchfoundation/scratch-editor/tree/ba0da34a331ddf4dc0d2d713b8e0d8ec0486746e) 的官方 npm 构建。源码标注 AGPL-3.0-only，宿主使用入口 HTML、桥接和响应样式。准备脚本保留完整 LICENSE、TRADEMARK 和发布包所附依赖许可证。编辑器显示对应上游源码链接，宿主源文件和构建方式保存在本仓库。

正式公开提供前，需确认实际部署制品有对应完整源码、锁文件和构建安装脚本，用户能从界面获取它们，保留版权及许可声明。对分发构建和远程交互适用义务、桥接与宿主的源码提供范围、官方素材权利和商标分别复核。部署方记录版本对应关系和审批证据后才能正式公开。参见 [GNU AGPL v3](https://www.gnu.org/licenses/agpl-3.0.html) 和 [OPS-037 记录](../../engineering/ops-037-spike-record.md)。
