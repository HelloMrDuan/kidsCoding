# Scratch 自由创作（OPS-050）

`/create` 使用 V2 应用外壳。作品页沿用 V2 变量和全屏工作区形式，并提供返回、保存和导出。Scratch 原生组件提供角色、舞台、造型、声音、积木、绿旗和停止。作品页保存和导出调用 OPS-038 的严格来源桥接，持久化完整的 `.sb3`。创作作品使用独立 IndexedDB，键为随机 UUID，保存时校验版本，避免覆盖另一窗口已保存的版本或恢复已删除的作品。课程草稿、判定和进度使用原来的路径。Python 入口保留现有实验室。

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

预发布时使用两个 HTTPS 来源，在 Web 进程或现有 Web 容器启动时设置 `SCRATCH_CREATE_GUI_URL`，无需重建镜像。Scratch 宿主设置 `SCRATCH_PARENT_ORIGIN` 为 Web 的准确来源。使用 HTTPS 反向代理保留 `Content-Security-Policy: frame-ancestors`，可用 `SCRATCH_PORT`、`SCRATCH_BIND` 指定监听端口和地址。宿主与 Web 均校验窗口及来源，编辑器 iframe 不接触 KidsCoding 账户凭据。测试 Playwright 以真实 Chrome 打开独立宿主，无需拦截 GUI 响应。作品存放在当前浏览器，没有账号级隔离或跨设备同步；可通过 `.sb3` 文件转移。保存和导入上限约为 3.75 MiB，沿用课程桥接的 5 MiB base64 信封限制。

发布后核对两个服务的版本及安全头，再走新建、两份作品、保存、刷新和 .sb3 再导入 smoke。课程的现有 GUI URL 和路由维持原配置。回滚时恢复前一个 Web 构建，即可撤下创作入口。保留本机 IndexedDB，让重新上线或导出有恢复路径。需要先提供可运行的旧版本用于导出时，可保留 Scratch 宿主和故障版本记录，不清除用户浏览器存储。

## AGPL 与素材

采用 [Scratch Foundation 源码 `ba0da34`](https://github.com/scratchfoundation/scratch-editor/tree/ba0da34a331ddf4dc0d2d713b8e0d8ec0486746e) 的官方 npm 构建。源码标注 AGPL-3.0-only，宿主使用入口 HTML、桥接和响应样式。准备脚本保留完整 LICENSE、TRADEMARK 和发布包所附依赖许可证。编辑器显示对应上游源码链接，宿主源文件和构建方式保存在本仓库。

正式公开提供前，需确认实际部署制品有对应完整源码、锁文件和构建安装脚本，用户能从界面获取它们，保留版权及许可声明。对分发构建和远程交互适用义务、桥接与宿主的源码提供范围、官方素材权利和商标分别复核。部署方记录版本对应关系和审批证据后才能正式公开。参见 [GNU AGPL v3](https://www.gnu.org/licenses/agpl-3.0.html) 和 [OPS-037 记录](../../engineering/ops-037-spike-record.md)。
