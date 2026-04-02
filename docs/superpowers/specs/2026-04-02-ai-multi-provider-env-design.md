# AI Multi-Provider Environment Design

## Goal

为 `kidsCoding` 的后台 AI 生成能力补齐正式上线所需的环境配置和默认运行设置，使系统不再只依赖 `OpenAI` 单一提供方，而是支持：

- OpenAI 官方服务
- OpenAI 兼容接口
- 本地模型服务，例如 `Ollama`、`LM Studio`、`vLLM`

第一版重点不是做完整模型平台，而是建立一套可上线、可运维、可切换的最小结构：

- 环境中预注册两个 AI 提供方槽位
- 后台选择全局默认提供方和默认模型
- `env:check` 能在开发和生产环境下明确检查 AI 配置是否满足要求
- 现有 AI 骨架生成和单课草稿生成统一走这套默认设置

## Scope

### In Scope

- 增加双槽位 AI 提供方环境配置
- 增加全局默认 AI 提供方和默认模型设置
- 新增 `env:check` 与 `env:check:prod`
- 按服务分组检查 `Supabase / Stripe / AI / App URL`
- AI 组支持两个预配置槽位
- 后台展示两个可用 AI 提供方及其模型列表
- 后台保存默认提供方和默认模型
- AI 路由统一读取当前默认运行设置
- 保留现有本地开发降级逻辑
- 更新 `.env.example` 和 `README`

### Out of Scope

- 后台录入新的 AI 提供方
- 后台修改 `Base URL`
- 后台修改 `API Key`
- 动态探测模型列表
- 多模型负载均衡
- 按课程或按操作选择不同模型
- 直连 Anthropic、Gemini 等非 OpenAI 兼容协议
- 在线连通性探针和真实调用健康检查

## Core Principle

第一版遵守四条原则：

1. 环境负责注册可用提供方，后台只负责选择默认项
2. 后台绝不展示或存储真实 `API Key`
3. 本地开发可降级，生产环境必须硬校验
4. AI 调用层只关心 OpenAI 兼容协议，不关心具体厂商名称

## Environment Strategy

### Environment Mode

脚本和运行时按两种模式处理：

- `development`
  - 缺项时允许启动
  - 明确提示哪些能力会降级

- `production`
  - 关键配置缺失或格式异常时直接判失败
  - 不允许带病上线

### Commands

新增两个命令：

- `npm run env:check`
  - 默认按开发环境规则检查

- `npm run env:check:prod`
  - 按生产环境规则检查
  - 发现 `FAIL` 时返回非零退出码

脚本位置建议为：

- `apps/web/scripts/env-check.mjs`

## Environment Variables

### Required Service Groups

第一版按四组服务输出：

- `SUPABASE`
- `STRIPE`
- `AI`
- `APP URL`

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

规则：

- `NEXT_PUBLIC_SUPABASE_URL` 必须是合法 `http/https` 地址
- 其余两个字段必须非空
- 生产环境缺任一项即 `FAIL`
- 开发环境缺失则 `WARN`，并提示账号、后台发布、云端同步会降级

### Stripe

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

规则：

- 两项都必须非空
- `STRIPE_SECRET_KEY` 以 `sk_` 开头
- `STRIPE_WEBHOOK_SECRET` 以 `whsec_` 开头
- 生产环境缺失或格式异常即 `FAIL`
- 开发环境缺失则 `WARN`，并提示购买链路不可用

### App URL

- `NEXT_PUBLIC_APP_URL`

规则：

- 必须是合法 `http/https` 地址
- 生产环境必须存在
- 开发环境允许回退到 `http://localhost:3000`
- 即使开发环境回退成功，脚本仍输出 `WARN`

### AI Provider Mode

增加协议模式字段：

- `AI_PROVIDER_MODE=openai_compatible`

第一版只支持这一种模式，不提前扩展多协议抽象。

### AI Provider Slots

第一版固定两个槽位：

- `AI_PROVIDER_PRIMARY_NAME`
- `AI_PROVIDER_PRIMARY_BASE_URL`
- `AI_PROVIDER_PRIMARY_API_KEY`
- `AI_PROVIDER_PRIMARY_MODELS`

- `AI_PROVIDER_SECONDARY_NAME`
- `AI_PROVIDER_SECONDARY_BASE_URL`
- `AI_PROVIDER_SECONDARY_API_KEY`
- `AI_PROVIDER_SECONDARY_MODELS`

字段含义：

- `NAME`
  - 后台展示名称，例如 `OpenAI`、`本地 Ollama`

- `BASE_URL`
  - OpenAI 兼容接口地址

- `API_KEY`
  - 对应密钥
  - 本地服务不要求真实 key 时也建议提供占位值，保持调用结构一致

- `MODELS`
  - 逗号分隔的模型列表
  - 至少要能解析出一个模型名

## AI Validation Rules

### Slot Validation

每个槽位检查四项：

- `NAME` 非空
- `BASE_URL` 是合法 `http/https` 地址
- `API_KEY` 非空
- `MODELS` 非空且至少包含一个模型名

判定规则：

- 四项完整则 `OK`
- 部分填写则 `FAIL`
- 完全未配置：
  - 开发环境为 `WARN`
  - 生产环境在另一个槽位完整可用时允许保留 `WARN`
  - 如果两个槽位都不可用，则整体 `FAIL`

### Default Selection Validation

后台默认设置必须满足：

- `default_provider_slot` 是完整可用槽位
- `default_model` 必须属于该槽位模型列表

如果默认设置无效：

- 开发环境：
  - 脚本输出 `WARN`
  - 运行时可自动回退到第一个可用槽位的第一个模型

- 生产环境：
  - 脚本输出 `FAIL`
  - 运行时不得静默回退

## Runtime Settings

### Storage

新增一份轻量全局设置，例如：

- `ai_runtime_settings`

字段：

- `default_provider_slot`
  - `primary | secondary`

- `default_model`
  - 字符串

这张表或设置记录只负责选择默认项，不存储 `Base URL` 和 `API Key`。

### Runtime Resolution Order

AI 调用时按以下顺序解析：

1. 读取环境中两个已注册槽位
2. 过滤出完整可用槽位
3. 读取后台默认设置
4. 如果默认设置有效，则使用该槽位和模型
5. 如果默认设置无效：
   - 开发环境回退到第一个可用槽位的第一个模型
   - 生产环境直接报配置错误

最终得到：

- `providerName`
- `baseUrl`
- `apiKey`
- `model`

然后统一以 OpenAI 兼容方式发起请求。

## Admin UI

### UI Placement

第一版不做独立 AI 管理后台，而是在现有后台中增加一个 `AI 运行设置卡片`。

可放在：

- `/admin`

### Display Requirements

后台需要展示：

- `Primary` 槽位
  - 名称
  - Base URL
  - 模型列表
  - 是否完整可用

- `Secondary` 槽位
  - 名称
  - Base URL
  - 模型列表
  - 是否完整可用

- 当前默认设置
  - 默认提供方槽位
  - 默认模型

密钥不显示，只展示：

- 已配置
- 未配置

### Admin Flow

管理员操作流固定为：

1. 后台读取两个槽位配置
2. 查看当前哪个槽位可用
3. 选择默认提供方槽位
4. 从该槽位模型列表选择默认模型
5. 点击保存
6. 后续 AI 骨架生成和草稿生成都使用这份默认设置

### Not Included

第一版后台不做：

- 测试连接
- 在线拉取模型列表
- 手工输入新的 `Base URL`
- 手工输入新的 `API Key`
- 单次生成时临时切换模型

## AI Call Integration

### Existing AI Routes

现有 AI 路由：

- `POST /api/admin/ai/curriculum-skeleton`
- `POST /api/admin/ai/lessons/:id/generate-draft`

需要改为：

1. 读取当前默认 AI 运行设置
2. 获取对应槽位的 `baseUrl / apiKey / model`
3. 走统一 OpenAI 兼容客户端

### Client Layer

现有 `openai-client.ts` 不再直接读取：

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

而是改成接收显式配置：

- `baseUrl`
- `apiKey`
- `model`

这样同一套客户端既能打 OpenAI，也能打本地兼容服务。

## env:check Output

### Status Levels

统一只有三类状态：

- `OK`
- `WARN`
- `FAIL`

### Per Item Output

每条检查结果至少包含：

- 字段名
- 状态
- 影响
- 修复建议

示例：

- `AI_PROVIDER_PRIMARY_BASE_URL: FAIL`
- `影响：Primary AI 提供方不可用，后台无法选择该槽位`
- `处理：配置合法的 http/https Base URL`

### Final Summary

脚本最后输出结论：

- 开发环境：
  - 可继续开发，但明确指出哪些能力降级

- 生产环境：
  - 给出失败项数量
  - 明确指出当前是否满足上线条件

## Documentation

### .env.example

需要按服务分组重写：

- Supabase
- Stripe
- AI Provider Primary
- AI Provider Secondary
- App URL

并对每个字段补一行简短说明。

### README

需要新增：

- 如何复制 `.env.example`
- 如何运行 `npm run env:check`
- 如何运行 `npm run env:check:prod`
- AI 双槽位环境变量说明
- 后台默认提供方和默认模型设置说明

## Acceptance Criteria

- 可以通过环境变量预注册两个 OpenAI 兼容 AI 提供方
- 后台可以选择全局默认提供方和默认模型
- AI 骨架生成和单课草稿生成都使用当前默认设置
- `env:check` 能按服务分组输出终端报告
- `env:check:prod` 在关键配置缺失时返回失败
- 本地开发缺配置时应用仍可启动，但会明确降级
- 生产环境默认设置无效时不允许静默回退
- README 和 `.env.example` 与实际配置一致

## Recommended Next Step

这份规格确认后，下一步进入 implementation plan，按以下顺序实现：

1. `env:check` 脚本和 `.env.example`
2. AI 双槽位环境解析与默认设置存储
3. 后台 AI 运行设置卡片
4. AI 路由切换到默认运行设置
5. 验证、README、E2E 覆盖
