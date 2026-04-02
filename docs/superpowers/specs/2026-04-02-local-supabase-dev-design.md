# Local Supabase Docker Development Design

## Goal

为 `kidsCoding` 提供一套可重复执行的本地联调方案，使用 `Supabase CLI` 管理本地 Docker 栈，并让当前 `Next.js` 应用在本地直接接入：

- 本地 `Supabase Auth`
- 本地数据库迁移与种子数据
- 本地测试管理员账号
- `/admin` 后台与依赖 `Supabase` 的学习链路

第一版目标不是模拟完整生产环境，而是把“本地可启动、可登录、可进入后台、可读写当前课程数据”做成稳定的开发入口。

## Scope

### In Scope

- 使用 `Supabase CLI` 启动本地 Docker 栈
- 在仓库内补齐本地 `Supabase` 开发配置
- 新增一条本地初始化命令，自动完成：
  - 启动本地 `Supabase`
  - 读取本地 API URL 与 key
  - 更新 `apps/web/.env.local`
  - 执行本地数据库重置与迁移
  - 创建或修复本地测试管理员
- 为本地开发新增邮箱 + 密码登录入口，用于本地测试管理员登录
- 明确本地开发模式与正式环境的隔离边界
- 更新 `README`，让本地联调可以按文档直接照做

### Out of Scope

- 本地 `Stripe` webhook 与支付联调
- 本地 AI provider 调用联调
- 远程 Supabase 项目同步
- 培训机构端或更多本地测试账号管理
- 在应用内做完整“管理员管理后台”
- 把现有正式登录体系整体改成密码登录

## Core Decisions

### 1. 使用 Supabase CLI，而不是手写 docker compose

本地 Docker 栈由 `Supabase CLI` 统一管理。原因是当前仓库已经采用 `Supabase` 迁移目录结构，`Supabase CLI` 可以直接复用：

- `supabase start`
- `supabase status -o env`
- `supabase db reset`

这比手写一套 compose 文件更稳，也更接近官方本地开发路径。

### 2. 本地联调只覆盖 Auth + 数据库 + 当前应用链路

第一版只要求本地跑通：

- `Supabase Auth`
- 数据库迁移
- `/setup/admin`
- `/admin`
- 学习端和后台当前依赖的数据库读写

支付和 AI 提供方继续保留为独立环境配置，不塞进这一步。

### 3. 本地管理员使用邮箱 + 固定密码

当前项目正式链路主要使用 OTP，但本地联调不应依赖本地邮件链路。

因此第一版明确新增一个“仅本地开发可用”的邮箱密码登录入口，供本地测试管理员使用。它不会替换正式登录方案，也不会在生产环境暴露。

### 4. `.env.local` 由脚本托管 Supabase 相关字段

本地初始化命令不直接覆盖整份 `apps/web/.env.local`，而是只维护一组本地 Supabase 相关键，保留其他已有配置不变。

脚本需要采用“受管区块”或“按键更新”的方式，只更新这些字段：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `LOCAL_SUPABASE_ENABLED`
- `LOCAL_SUPABASE_ADMIN_EMAIL`
- `LOCAL_SUPABASE_ADMIN_PASSWORD`

`STRIPE_*`、AI provider、`ADMIN_SETUP_TOKEN` 等现有值应保持原样。

## Local Developer Flow

### One-Command Setup

开发者在 `apps/web` 下执行：

- `npm run local:supabase:setup`

执行完成后，应达到以下状态：

1. 本地 `Supabase` Docker 栈已启动
2. 本地数据库迁移已应用
3. `apps/web/.env.local` 已切到本地 `Supabase`
4. 本地测试管理员已存在
5. 开发者执行 `npm run dev` 后可使用本地管理员登录并访问 `/admin`

### Runtime Flow

本地开发者后续使用流程为：

1. 执行 `npm run local:supabase:setup`
2. 执行 `npm run env:check`
3. 执行 `npm run dev`
4. 打开本地管理员登录页
5. 使用固定邮箱 + 密码登录
6. 跳转 `/admin`

## Architecture

### Supabase Local Stack

仓库需要补齐本地 `Supabase` CLI 所需的配置文件，例如：

- `apps/web/supabase/config.toml`

该配置负责本地 Docker 栈的基础定义，不承载业务逻辑。

### Local Setup Script

新增本地初始化脚本，例如：

- `apps/web/scripts/local-supabase-setup.mjs`

职责：

1. 检查 `Supabase CLI` 是否可执行
2. 检查 Docker 运行环境是否可用
3. 执行 `npx supabase start`
4. 执行 `npx supabase status -o env`
5. 将本地 URL / key 写入 `apps/web/.env.local`
6. 执行 `npx supabase db reset`
7. 调用本地管理员初始化脚本

### Local Admin Seed Script

新增独立脚本，例如：

- `apps/web/scripts/seed-local-admin.mjs`

职责：

1. 使用本地 `service_role` 创建 `supabase-js` server client
2. 查询本地测试管理员是否已存在
3. 如果不存在，则创建邮箱 + 密码用户
4. 如果已存在但不是管理员，则修复 `app_metadata.role = 'admin'`
5. 保证邮箱已确认，可直接登录

这里的管理员初始化必须走 `supabase.auth.admin`，而不是直接插业务表。因为当前后台鉴权依赖的是：

- `Supabase Auth` 登录态
- `app_metadata.role === 'admin'`

### Local-Only Password Login Entry

当前项目没有邮箱密码登录流程，因此第一版需要新增一个仅本地开发模式可用的页面，例如：

- `/setup/local-admin/login`

页面职责：

- 使用 `signInWithPassword`
- 只接受本地管理员邮箱 + 密码
- 登录成功后跳转 `/admin`

安全边界：

- 仅在 `LOCAL_SUPABASE_ENABLED=true` 时启用
- 正式环境访问时返回关闭状态或 `notFound`
- 不替换正式 OTP 流程

## Environment Strategy

### Local Source of Truth

本地 `Supabase` 连接值来自 `npx supabase status -o env`。

脚本从中读取：

- 本地 API URL
- `ANON_KEY`
- `SERVICE_ROLE_KEY`

其中：

- `ANON_KEY` 映射为 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SERVICE_ROLE_KEY` 映射为 `SUPABASE_SERVICE_ROLE_KEY`

### Local `.env.local` Values

脚本最终应写入：

- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
  - 实际值以 CLI 输出为准
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local anon key>`
- `SUPABASE_SERVICE_ROLE_KEY=<local service role key>`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `LOCAL_SUPABASE_ENABLED=true`
- `LOCAL_SUPABASE_ADMIN_EMAIL=admin-local@kidscoding.test`
- `LOCAL_SUPABASE_ADMIN_PASSWORD=KidsCodingLocalAdmin123!`

本地管理员密码只用于本地开发，不进入生产环境，不参与线上配置。

## Local Admin Account

### Fixed Development Credentials

第一版本地测试管理员固定为：

- 邮箱：`admin-local@kidscoding.test`
- 密码：`KidsCodingLocalAdmin123!`

这些值可以由脚本写入本地 `.env.local`，也可以在文档中说明，但最终要保证：

- 本地脚本与登录页面使用同一组值
- 可以重复执行初始化，不制造重复用户

### Idempotency Rule

本地管理员初始化必须可重复执行。

明确规则：

- 用户不存在：创建
- 用户已存在但 `role` 不是 `admin`：修复为 `admin`
- 用户已存在且已是管理员：跳过

不能要求开发者每次手工去清空用户表。

## Local Login UX

### Why A New Local Login Page Is Required

当前仓库只有 OTP 登录链路，没有邮箱密码登录入口。本地联调如果要求固定密码管理员可直接使用，就必须新增本地开发入口。

### Expected Page Behavior

本地管理员登录页需要做到：

- 显示邮箱输入框
- 显示密码输入框
- 调用 `supabase.auth.signInWithPassword`
- 登录成功后跳转 `/admin`
- 登录失败时显示统一错误提示

页面无需承担：

- 正式用户登录
- 家长游客绑定
- 首个管理员开通

它只是本地开发便利入口。

## Error Handling

本地初始化命令必须对下面这些失败给出明确提示：

- Docker 未启动
- `Supabase CLI` 不可用
- `supabase start` 失败
- `supabase status -o env` 读取失败
- `.env.local` 写入失败
- `supabase db reset` 失败
- 本地管理员创建失败

错误提示应明确说明：

- 哪一步失败
- 当前影响
- 下一步如何处理

不要只抛原始堆栈。

## Documentation

需要更新 [README.md](D:/pyprograms/kidsCoding/apps/web/README.md)，补齐本地联调说明：

- 安装 Docker Desktop
- 安装或使用 `npx supabase`
- 执行 `npm run local:supabase:setup`
- 本地管理员邮箱和密码
- 如何启动应用并进入 `/admin`
- 如何重置本地环境
- 哪些能力不在本地联调范围内

## Acceptance Criteria

- 在没有远程 Supabase 项目的情况下，可以通过本地 Docker 栈启动当前项目
- `npm run local:supabase:setup` 执行后，`apps/web/.env.local` 自动指向本地 `Supabase`
- `npx supabase db reset` 后，仓库现有迁移全部成功应用
- 本地测试管理员账号自动存在且具备 `app_metadata.role = 'admin'`
- 启动 `npm run dev` 后，可通过本地密码登录入口登录并访问 `/admin`
- 正式环境不会暴露本地密码登录入口
- 现有 `/setup/admin` 首个管理员开通链路不被这次本地联调破坏

## Recommended Next Step

这份规格确认后，下一步进入 implementation plan，建议顺序为：

1. 补本地 `Supabase` 配置文件和 npm scripts
2. 实现本地 setup 脚本与 `.env.local` 托管逻辑
3. 实现本地管理员初始化脚本
4. 新增本地密码登录入口
5. 更新 README、单测与本地 E2E 验证
