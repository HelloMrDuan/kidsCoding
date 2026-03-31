# Kids Coding Family Launch App

## 启动准备

1. 安装依赖：`npm install`
2. 配置 `.env.local`：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
3. 重建本地数据库：`npx supabase db reset`
4. 启动开发环境：`npm run dev`

## 首发验收命令

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
