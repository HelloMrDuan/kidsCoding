# Kids Coding Family Launch App

## 启动准备

1. 安装依赖：`npm install`
2. 把 `.env.example` 复制成 `.env.local`
3. 先执行环境检查：`npm run env:check`
4. 重建本地数据库：`npx supabase db reset`
5. 启动开发环境：`npm run dev`

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

### App URL

- `NEXT_PUBLIC_APP_URL`

## 环境检查

- 开发环境检查：`npm run env:check`
- 生产环境检查：`npm run env:check:prod`

开发环境允许缺项，但会明确提示哪些功能降级。  
生产环境如果缺少关键配置，命令会直接失败。

## 后台 AI 运行设置

- `/admin` 会展示两个预配置的 AI 提供方槽位
- 管理员只能选择默认提供方和默认模型
- 后台不会显示或保存原始 API Key
- AI 课程骨架生成和单课草稿生成都会使用当前默认模型

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
- `/admin`
- `/admin/lessons/trial-01-move-character`
