# InstaBox Watchdog（外部监控与官方 API 恢复）

监控对象：InstaBox 机器 `platforms-core-01`
（`m_agqv2gsjiybrpuen46a2rpxohe`，Free 套餐，闲置 30 分钟自动暂停）。

## 为什么在机器外部

机器暂停时，机内的 cron / systemd 定时任务同样被冻结，无法自救。
本监控运行在 GitHub 托管 runner 上（公开仓库、默认分支、
`.github/workflows/instabox-watchdog.yml`，每 10 分钟 + 可手动触发，
并发组锁定为单实例），与机器的暂停状态完全解耦。

## 做什么（每个周期）

1. `Sandbox.connect(id, { resume: false })` 只读附加，`getInfo()`
   查状态——查询本身不算活动、不唤醒机器。
2. 按状态行事：
   - `running`：不调用 Resume；经 `commands` 在机内深查
     KidsCoding `127.0.0.1:3000/api/health`、天机
     `127.0.0.1:8080/health`、Kids 部署 SHA（代理状态文件）、
     Docker 容器清单。
   - `suspended`（暂停）/ `stopped`：调用官方 `resume()` 恢复，
     恢复后复查状态并做同样的深查（含部署 SHA 核对）。
   - `resuming` 等过渡态：等待并复查，绝不并发重复 Resume
     （工作流并发组 + 状态机双重保证）。
   - `no_capacity` / 配额类（429）：本轮最多 2 次尝试、45 秒退避，
     10 分钟调度周期构成外层退避；持续失败记 BLOCKED 并告警，
     保留原始错误码。
   - 鉴权失败（401/403、缺 scope）：不重试，立即 BLOCKED 告警。
   - 应用健康失败：只报告（APP_FAULT），**不**从外部删/重建容器；
     机内既有看门狗负责栈级恢复。
3. 产物：`verdict.json`（含完整事件轨迹）作为 Actions artifact
   保留 14 天；失败判定（BLOCKED_* / APP_FAULT）时自动开/更新
   带 `instabox-watchdog` 标签的 Issue 告警，恢复后自动评论并
   关闭；工作流运行同时标红。

## 明确不做

- 不模拟用户活动、不制造 CPU 负载伪装活跃（平台 30 分钟暂停
  规则保持原样；只在已暂停时走官方 Resume）。
- 不保存、不打印 API Key：Key 只从仓库 Secret
  `INSTABOX_API_KEY` 读取（需 `machines:read` + `machines:write`
  权限范围）。
- 不使用私有仓库的 Actions 分钟；工作流只存在于本公开仓库。

## 本地测试

```bash
npm ci
npm test   # 纯逻辑单测：状态机、错误分类、深查解析（无需 Key）
```
