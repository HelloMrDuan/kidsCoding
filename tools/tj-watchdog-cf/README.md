# tj-watchdog — 天机机器 tj-core-01 的 Cloudflare 主监控

InstaBox 机器 **tj-core-01**（天机命理平台专用机）的第一道保险：Cloudflare Workers Cron Triggers 每 10 分钟运行一次（`5,15,25,35,45,55 * * * *`，与旧机器监控错峰），只监控这一台机器。

与 platforms-core-01 的 `instabox-watchdog` **完全独立**：独立 Worker、独立 KV 命名空间、独立 InstaBox API Key（Secret）、独立状态与恢复记录。两者互不读写对方的 KV；本 Worker 代码里**没有默认 Machine ID**——`MACHINE_ID` 未配置时以 `BLOCKED_CONFIG` 失败关闭，绝不猜测、绝不回退到其他机器。

Muse 侧的第二道保险是定时任务 `tj-backup-watchdog`（独立于旧机器的 `instabox-backup-watchdog`）。

## 阶段模型（HEALTH_MODE）

- `lifecycle`（初始）：天机尚未部署到本机，只做机器生命周期检查：
  - `running` → `LIFECYCLE_OK`。**这不是应用健康**：未部署的服务不会被判定为健康，状态记录只写 `lastLifecycleOkAt`，永不写 `lastHealthyAt`。
  - `suspended` → 自动 Resume（每 episode ≤2 次、间隔 ≥45 秒、仅 capacity/transient 重试，原始错误码留痕）。
  - `stopped` → 只记录 `STOPPED_MANUAL`，永不恢复（所有者主动停机）。
  - `resuming` 等过渡态 → 只等待，永不重复 Resume。
  - 维护开关 `WATCHDOG_HOLD=true` → 只报告不恢复。
- `tianji`（天机迁移完成后才可开启）：在生命周期之上增加天机专属深查——`8080/health`、api/web 双容器 Up、镜像版本 token 一致、与机上部署记录比对。**不检查 KidsCoding**（不在这台机器上）。全部通过才记 `OK` 并写 `lastHealthyAt`。

## 并发防撞（为什么 KV 不是锁）

Cloudflare KV 是最终一致的，读写改不构成原子锁。本 Worker 的防撞不依赖 KV：

1. **写前记账**：episode 尝试次数在发出 Resume POST **之前**落盘，进程中途死亡也已计数。
2. **新鲜状态门**：POST 前立即重读机器状态；已不是 `suspended`、或已有 `operationId` 在途 → 本轮不 POST。
3. **冲突即良性**：两个运行真撞上 POST 时，平台按机器串行化操作，只接受一个，另一个收到 `409 operation_conflict`——输家视为「他人已在恢复」，只轮询等待、同一轮绝不重发，结论记成功类 `RESUME_IN_PROGRESS`。

`claim` 键只是信息性遥测（让人能看到有运行在进行），**任何决策都不读它**。以上性质有负例单测覆盖（KV 读全旧、双运行重叠 → 平台侧恰好一个 Resume 操作）。

## 部署步骤（需要 duan 的 Cloudflare 账号操作）

现状（2026-10-23）：Worker `tj-watchdog` 已在 Cloudflare 创建，生产 `INSTABOX_API_KEY` Secret **已配置完成**（属主确认，不要重复创建或覆盖）。还差：专用 KV、真实 Machine ID、代码部署。

前置：取得 tj-core-01 的**真实 Machine ID**——从 InstaBox 控制台该机器的详情页读取，或用持有该机器所属账户 Key 的通道查机器列表按名称 `tj-core-01` 对照。不得凭名称推测、不得使用旧机器 ID。注意：Machine ID 必须与 Secret 中那把 Key 所属账户一致，否则 Worker 每轮只会得到 `BLOCKED_NOT_FOUND`（失败关闭，不会误碰其他机器）。

1. 创建本 Worker 专属 KV 命名空间（**不要**复用 instabox-watchdog 的命名空间）：

```bash
npx wrangler kv namespace create TJ_WATCHDOG_KV
```

把输出的 `id` 填入 `wrangler.toml` 的 `REPLACE_WITH_TJ_KV_NAMESPACE_ID`。

2. 把真实 Machine ID 填入 `wrangler.toml` 的 `MACHINE_ID`（替换 `REPLACE_WITH_TJ_CORE_01_MACHINE_ID`），提交回仓库。

3. 部署代码（Secret 已存在，`wrangler deploy` 不会动它）：

```bash
cd tools/tj-watchdog-cf
npm test          # 40 项测试应全过
npx wrangler deploy
```

4. 验证**真实 Cron 证据**（手动 /run 不算）：

```bash
curl https://tj-watchdog.<你的子域>.workers.dev/status
```

观察 `lastRunAt` 是否由定时运行自行推进（每 10 分钟、分钟数为 05/15/25/35/45/55）、`recentRuns` 是否增长、结论是否与机器真实状态一致。验证通过后通知 kid小宝：进行 Muse 备用层的主监控失效检测/接管验收，并把 `tj-backup-watchdog` 改为每小时一轮。

## 切换到 tianji 模式的激活清单（迁移完成后）

1. 确认 tj-core-01 上天机的部署记录文件路径与 `src/core.mjs` 中 `TJ_RECORD_PATH` 一致（不一致先改常量并补测试再部署）；
2. 确认机内天机 api/web 容器名与镜像名含 `tianji-api` / `tianji-web`，健康端点为 `127.0.0.1:8080/health`；
3. 把 `wrangler.toml` 的 `HEALTH_MODE` 改为 `tianji`，重新 `wrangler deploy`；
4. 观察至少 2 轮 `/status`：结论 `OK` 且 `lastHealthyAt` 开始更新，才算激活完成。

## 回滚

停用 Cron Trigger 或删除本 Worker 即可；其 KV 为独立命名空间，删除不影响 instabox-watchdog。Muse 的 `tj-backup-watchdog` 在 Cloudflare 层失效时会按其规则接管生命周期恢复（自然暂停后的真实 Resume 以先到达的一层记录为准）。

## 文件

- `src/api.mjs` — InstaBox 官方 REST 客户端（fetch；Key 由调用方注入，从不落日志）
- `src/logic.mjs` — 纯决策逻辑（状态机、错误分类、天机深查解析/评估、结论）
- `src/core.mjs` — 编排（防撞恢复协议、episode 跨轮上限、状态记录）
- `src/worker.mjs` — Worker 入口（scheduled + GET /status + POST /run）
- `test/` — node:test 单测（`npm test`，含并发负例）
