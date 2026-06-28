# Kids Coding Family Launch App

## 启动准备

1. 安装依赖：`npm install`
2. 复制 `.env.example` 为 `.env.local`
3. 先执行环境检查：`npm run env:check`
4. 启动开发环境：`npm run dev`

## 环境变量

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Stripe

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### 中国大陆聚合支付

- `PAYMENT_PROVIDER_DEFAULT=aggregated_cn`
- `CN_PAYMENT_PROVIDER_BASE_URL`
- `CN_PAYMENT_PROVIDER_APP_ID`
- `CN_PAYMENT_PROVIDER_APP_SECRET`
- `CN_PAYMENT_PROVIDER_WEBHOOK_SECRET`

当前首个真实中国大陆 provider 采用连连支付接入，但环境变量继续保持 provider-agnostic 命名，避免后续切换服务商时整仓库重命名。

#### 真实联调说明

当 `PAYMENT_PROVIDER_DEFAULT=aggregated_cn` 时：

1. 配置真实或测试环境的中国大陆聚合支付参数
2. 确认 `webhook` 地址可以被支付服务商回调访问
3. 在预发布环境至少验证一次真实下单、真实回调、主动查单和管理员重试同步

本地 E2E 仍然只 mock 平台统一订单状态，不直接依赖真实支付网络请求。

### AI 提供方

- `AI_PROVIDER_MODE=openai_compatible`
- `AI_PROVIDER_PRIMARY_NAME`
- `AI_PROVIDER_PRIMARY_BASE_URL`
- `AI_PROVIDER_PRIMARY_API_KEY`
- `AI_PROVIDER_PRIMARY_MODELS`
- `AI_PROVIDER_SECONDARY_NAME`
- `AI_PROVIDER_SECONDARY_BASE_URL`
- `AI_PROVIDER_SECONDARY_API_KEY`
- `AI_PROVIDER_SECONDARY_MODELS`

### App 与首个管理员

- `NEXT_PUBLIC_APP_URL`
- `ADMIN_SETUP_TOKEN`

### 本地 Supabase 联调

- `LOCAL_SUPABASE_ENABLED`
- `LOCAL_SUPABASE_ADMIN_EMAIL`
- `LOCAL_SUPABASE_ADMIN_PASSWORD`

## 环境检查

- 开发环境检查：`npm run env:check`
- 生产环境检查：`npm run env:check:prod`

开发环境允许缺项，但会明确提示哪些能力会降级。  
生产环境如果缺少关键配置，命令会直接失败。

如果首发默认走中国大陆聚合支付，生产环境还必须补齐聚合支付 provider 的参数，否则 `env:check:prod` 会失败。

## 本地 Supabase Docker 联调

这条链路只用于本地开发，不替代正式环境配置。

### 前置条件

1. 安装 Docker Desktop，并确保 Docker 正在运行
2. 如果你不想安装系统级 `Supabase CLI`，可以先使用仓库内的可移植 CLI 安装命令

### 第一步：安装本地 Supabase CLI

在 `apps/web` 目录下执行：

```bash
npm run local:supabase:install-cli
```

如果你已经在系统里安装过 `Supabase CLI`，这一步可以跳过。

如果需要覆盖默认下载源，可先设置：

```bash
SUPABASE_CLI_DOWNLOAD_BASE_URL=https://your-mirror.example.com/supabase/cli/releases/download
```

### 第二步：初始化本地 Supabase

在 `apps/web` 目录下执行：

```bash
npm run local:supabase:setup
```

这条命令会自动完成：

1. 启动本地 Supabase Docker 栈
2. 读取本地 Supabase URL 和 key
3. 更新 `.env.local` 里的本地 Supabase 受管区块
4. 执行数据库重置与迁移
5. 创建或修复本地测试管理员

这条命令会优先使用仓库 `.tools` 里的 CLI；如果仓库内没有，再回退系统 `PATH`。

### 本地管理员登录

初始化完成后：

1. 执行 `npm run env:check`
2. 执行 `npm run dev`
3. 打开 [http://localhost:3000/setup/local-admin/login](http://localhost:3000/setup/local-admin/login)
4. 使用以下本地管理员账号登录：

- 邮箱：`admin-local@kidscoding.test`
- 密码：`KidsCodingLocalAdmin123!`

登录成功后会直接跳转到 `/admin`。

### 重置本地环境

如果你想重新初始化本地数据库和测试管理员，重新执行：

```bash
npm run local:supabase:setup
```

这会重新执行数据库重置和本地管理员修复。

### 本地联调边界

当前本地联调覆盖：

- Supabase Auth
- 数据库迁移
- 本地测试管理员登录
- `/admin` 后台
- 依赖 Supabase 的学习和后台数据链路

当前不覆盖：

- Stripe 支付和 webhook
- 本地 AI provider 请求联调
- 线上 Supabase 项目同步

## 后台 AI 运行设置

- `/admin` 会展示两个预配置的 AI 提供方槽位
- 管理员只能选择默认提供方和默认模型
- 后台不会显示或保存原始 API Key
- AI 课程骨架生成和单课草稿生成都会使用当前默认模型

## 首个管理员开通

- 在 `.env.local` 中配置 `ADMIN_SETUP_TOKEN`
- 首次部署后，使用链接 `/setup/admin?token=<ADMIN_SETUP_TOKEN>` 打开首个管理员开通页
- 先完成登录，再确认“开通管理员权限”
- 成功后当前账号会获得 `/admin` 访问权限
- 只要系统里已经存在任一管理员，这个开通入口就会永久关闭

## 验证命令

- `npm run lint`
- `npm run test:run`
- `npm run test:e2e`
- `npm run build`

## 关键路由

- `/`
- `/learn/map`
- `/learn/lesson/trial-01-move-character`
- `/learn/remedial/remedial-click-trigger`
- `/project/trial-03-scene-story/complete`
- `/parent/purchase`
- `/parent/overview`
- `/setup/admin`
- `/setup/local-admin/login`
- `/admin`
- `/admin/lessons/trial-01-move-character`

## LianLian WECHAT_NATIVE

- 当前真实中国大陆支付默认接到连连 `WECHAT_NATIVE`
- 家长购买页直接显示微信扫码二维码
- 二维码内容来自 provider 返回的 `code_url`，由前端自行渲染
- webhook 必须能回调到 `/api/payments/providers/aggregated_cn/webhook`
- 管理员支付补偿继续走 `/api/admin/payments/orders/:orderId/reconcile`

预发布联调至少验证这 4 步：

1. 真实下单后能返回微信 `code_url`
2. 微信扫码成功后 webhook 能把订单推进到 `paid`
3. 正式课程权益会自动解锁
4. 关闭 webhook 或延迟回调时，管理员重试同步仍能补齐订单状态

## 生产部署

### 运行环境

- Node.js `^20.19.0`（LTS），npm `^10.8.2`
- 在部署机上确认：`node --version`、`npm --version`
- 不需要全局安装 Supabase CLI；本地联调才用 `npm run local:supabase:install-cli`

### 安装与构建

```bash
cd apps/web
npm install
npm run env:check:prod   # 关键配置缺失会以非零退出码失败
npm run build
npm run start -- --hostname 0.0.0.0 --port 3000
```

- `npm ci` 可替代 `npm install` 以严格复现 lock 文件
- `next start` 默认监听 `3000`，可用 `--hostname` / `--port` 覆盖
- 生产进程建议用 PM2 / systemd / 容器编排管理，不要裸跑

### 环境变量清单

完整变量见 `.env.example`。生产部署必须配置：

- Supabase：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、`SUPABASE_SERVICE_ROLE_KEY`
- 支付（按 provider 选配）：`STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`，或 `PAYMENT_PROVIDER_DEFAULT=aggregated_cn` + 连连四件套
- AI：`AI_PROVIDER_MODE=openai_compatible` + 至少一个完整 provider slot
- 应用：`NEXT_PUBLIC_APP_URL`、`ADMIN_SETUP_TOKEN`

### Supabase 初始化与数据库迁移

1. 在 Supabase 控制台创建项目，记录 URL 与 anon/service key
2. 按 `apps/web/supabase/migrations/` 下文件名时间戳顺序执行迁移（本地联调用 `npm run local:supabase:setup`，生产用 Supabase 控制台或 CI 任务）
3. 首次部署后通过 `/setup/admin?token=<ADMIN_SETUP_TOKEN>` 开通首个管理员
4. 只要存在任一管理员，开通入口自动关闭

### 健康检查

- Liveness：`GET /api/health` 返回 `200 {"status":"ok"}`
- 该端点不访问 Supabase 或支付网络，仅确认进程存活
- 深度就绪检查（数据库连通性、支付连通性）请由外部监控单独覆盖

### 回滚

- 应用层：保留上一个构建产物目录，重新部署上一版 `.next` + 重启进程；或回退到上一个 git tag 重新 `npm run build && npm run start`
- 数据库：Supabase 迁移需自行准备 down migration 或项目级快照恢复；不要在生产直接重置
- 配置：`.env.local` 变更需记录变更点，回滚时同步恢复

### E2E 与测试模式

- 安装 Playwright 浏览器：`npx playwright install --with-deps`
- 跑全量 E2E：`npm run test:e2e`（等价于 `npx playwright test`）
- E2E 通过 `NEXT_PUBLIC_SUPABASE_TEST_MODE=true` + `ENABLE_ADMIN_BYPASS=true` 让生产构建在无 Supabase 环境下跑通 admin 与家长流程，所有数据链路用 `page.route` mock
- **这两个变量只能用于 E2E**：`NEXT_PUBLIC_SUPABASE_TEST_MODE=true` 会让服务端把所有 Supabase 相关分支视为未配置（API 返回 503、页面走降级分支），生产环境绝对不能设置
- **生产禁止启用 Admin bypass**：`ENABLE_ADMIN_BYPASS=true` 会让 `/admin` 页面在无 Supabase 时跳过鉴权；生产环境必须保证 `ENABLE_ADMIN_BYPASS` 未设置或为 `false`，且 `NEXT_PUBLIC_SUPABASE_TEST_MODE` 未设置
