# InstaBox 主监控（Cloudflare Workers 版）

platforms-core-01 的**新主监控**：Cloudflare Workers Cron Triggers 每 10 分钟在 Cloudflare 的调度器上运行，完全独立于 GitHub 和机器本身。它与 GitHub 版 `tools/instabox-watchdog/` 是**并行实现**，共用同一套判定逻辑（`src/logic.mjs` 由 GitHub 版逐字移植）：状态判定、错误分类、Kids SHA 三方核对（GitHub 预期 SHA 获取失败必须报错）、双应用健康检查、fail-closed（监控自身出错一律 BLOCKED_*，绝不误报健康）。

切换完成前 GitHub 版保持不动；切换顺序见文末。

## 行为合同（与 GitHub 版一致）

- `running`：机内深查（双健康端点 + 容器状态 + 部署 SHA 对比 GitHub `main` 头）。
- `suspended`：**只有此状态**允许自动 Resume。每暂停 episode 最多 2 次尝试、间隔 ≥45 秒，上限**跨轮持久化**（KV 中的 episode 记录），只有 capacity/transient 类失败才重试。
- `stopped`：所有者主动停机，永不恢复，只记录 `STOPPED_MANUAL`。
- 过渡态（含 `resuming`）：只等待复查，绝不重复发起 Resume；`operation_conflict` 同样只等待。
- `no_capacity`：有限重试后判定 `BLOCKED_CAPACITY` 并告警。
- 维护总开关 `WATCHDOG_HOLD=true`：只监控、只报告，不恢复。
- 防重复：KV 锁（25 分钟 TTL）防本层重叠触发；每层恢复前都重读机器新鲜状态，这是跨层防撞的根本机制；恢复由 API 的 operation 串行化，冲突即等待。

## 状态与告警（供 Muse 备用层判活）

每轮结果写入 KV 并通过 Worker 的 HTTP 端点公开粗粒度状态：

```
GET https://instabox-watchdog.<你的子域>.workers.dev/status
```

返回 `lastRunAt`（最近一轮时间）、`lastSuccessAt`（最近一次监控本身成功执行）、`lastHealthyAt`（最近一次判定 OK）、`lastVerdict`、`lastMachineState`、`lastAlert`、最近 20 轮 `recentRuns`。不含任何密钥或敏感信息。失败判定同时以 `console.error` 写入 Workers 日志。备用层以 `lastRunAt` 是否新鲜判断主监控死活。

手动诊断触发（**不算 Cron 证据**，记录里带 `trigger=manual`）：

```
curl -X POST https://instabox-watchdog.<你的子域>.workers.dev/run \
  -H "Authorization: Bearer <RUN_TOKEN>"
```

## 文件

- `src/logic.mjs`：纯判定逻辑（与 GitHub 版同一合同）。
- `src/api.mjs`：InstaBox 官方 REST API 客户端（fetch 直连 `api.instabox.sh`，与官方 SDK 相同的端点与错误形状；不模拟网页登录、不靠 HTTP 保活）。
- `src/core.mjs`：编排（状态轮询、operation 轮询、episode 上限、KV 锁、状态落盘）。依赖注入，可在 Node 中完整单测。
- `src/worker.mjs`：Worker 入口（`scheduled()` + `/status`、`/run`）。
- `test/`：`node --test`，逻辑层、编排层及 Worker 入口共 34 个用例，含故障负例（鉴权失败、断网、容量不足跨轮上限、冲突不重发、锁占用零调用、深查失败不报健康、SHA 不符等）。

本地测试：

```
cd tools/instabox-watchdog-cf
npm test
```

## 部署步骤

前置：一个 Cloudflare 账号（免费计划即可，Cron Triggers 与 KV 都在免费额度内）；一把**专给 Worker 新建**的 InstaBox API Key（`machines:read` + `machines:write`），不要复用 GitHub 版或 Muse 备用层的那两把。

在本目录执行：

```
# 1. 登录（浏览器授权一次）
npx wrangler login

# 2. 创建 KV，把返回的 id 填回 wrangler.toml 的 REPLACE_WITH_KV_NAMESPACE_ID
npx wrangler kv namespace create WATCHDOG_KV

# 3. 设置密钥（粘贴新 Key，终端不回显；绝不写入任何文件）
npx wrangler secret put INSTABOX_API_KEY
# 如需启用手动 /run 端点必须配置；未设置 RUN_TOKEN 时 /run 返回 403
npx wrangler secret put RUN_TOKEN

# 4. 部署
npx wrangler deploy
```

部署后验证：

1. 打开 `/status`：初始显示 no runs recorded yet。
2. `POST /run` 手动跑一轮，`/status` 应出现该轮记录（机器 running 时应为 OK 或如实的其他判定），且日志中无任何密钥（`npx wrangler tail` 可看实时日志）。
3. **等真实 Cron 触发**：至少观察 2 个 10 分钟周期，`/status` 的 `lastRunAt` 应由定时运行推进、`recentRuns` 增长。手动运行不算数 —— 这是验收主监控自动触发的唯一标准。

> 也可以由 kid小宝 用 Cloudflare API 代为部署（建 KV、传脚本、挂 Cron），前提是你把一枚 Cloudflare API Token（权限：Account → Workers Scripts → Edit、Workers KV Storage → Edit）通过保险库入口存好；但第 3 步的 InstaBox Key 必须由你在 Cloudflare 后台亲手填入 Worker Secret，任何人都不会经手它的明文。

## 切换顺序（严格按序，前一步没验过不做下一步）

1. 本 Worker 部署完成并取得**真实 Cron 自动触发**证据（见上）。
2. 关闭 GitHub 旧监控：在仓库 Actions 页 Disable `instabox-watchdog` 工作流（或删除 `.github/workflows/instabox-watchdog.yml`，删除需走有 Workflows 权限的路线）。GitHub 版代码保留在仓库里以便回滚。
3. Muse 备用层改频：每 1 小时一轮，检查对象由 GitHub 运行记录改为本 Worker 的 `/status`（`lastRunAt` 新鲜度 + 机器状态独立复核，接管规则不变）。
4. 真实 `suspended → Resume` 在自然发生并被记录前，**恢复能力不算验收完成**，任何汇报不得宣称已验。

## 回滚

Cloudflare 侧异常时：重新在 GitHub Actions 页 Enable `instabox-watchdog` 工作流即可恢复旧主监控；本 Worker 可用 `npx wrangler deployments list` 查看版本、用 dashboard 或 `wrangler rollback` 回退，或直接把 `WATCHDOG_HOLD` 置 `true` 让它只监控不动作。

## Scope change (2026-10-23, Tianji migration)

Tianji moved to its own machine (tj-core-01, monitored by the separate
`tj-watchdog` worker). This worker is now KidsCoding-only:
`CHECK_TIANJI = "false"` in wrangler.toml makes the deep check skip all
Tianji requirements (health endpoint, api/web containers, tag
consistency) while every KidsCoding check — health, container state,
and the three-way deployed-SHA comparison — stays fail-closed. The
default in code remains dual-site (`CHECK_TIANJI` unset or "true"), so
this scope change is explicit in this worker's deployed config only.
Redeploy this worker after pulling this change, or Tianji's absence on
platforms-core-01 will keep producing APP_FAULT.
