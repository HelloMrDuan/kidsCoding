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

## 本地 Supabase Docker 联调

这条链路只用于本地开发，不替代正式环境配置。

### 前置条件

1. 安装 Docker Desktop，并确保 Docker 正在运行
2. 已安装 `Supabase CLI`，并确认 `supabase --version` 可以执行

### 一键初始化

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

如果当前机器没有安装 `Supabase CLI`，命令会直接提示缺失，而不会继续执行。

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
