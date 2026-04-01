# Kids Coding Family Launch App

## 启动准备

1. 安装依赖：`npm install`
2. 配置 `.env.local`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
3. 重建本地数据库：`npx supabase db reset`
4. 启动开发环境：`npm run dev`

## 首发验收命令

- `npm run lint`
- `npm run test:run`
- `npm run test:e2e`
- `npm run build`

## 管理后台与 AI 草稿

- 管理员账号要求：`app_metadata.role = "admin"`
- `/admin` 提供课程列表，支持进入单课编辑页
- `/admin/lessons/[lessonId]` 支持整课草稿保存、单课发布、回退上一发布版
- AI 入口支持先生成整套课程骨架，再生成单课文案草稿
- AI 只会写入草稿，不会直接发布到孩子端
- 发布前仍会执行中文与必填字段校验

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
