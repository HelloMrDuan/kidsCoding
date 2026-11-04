# Muse 接手文档：kidsCoding

## 基本信息

- 仓库：`HelloMrDuan/kidsCoding`
- 默认分支：`main`
- 本分支：`muse-c/handover-doc`，从 `main` 创建，不直接修改 `main`
- 接手日期：2026-10-30
- 接手方式：Muse 自定义连接器 `custom.github`，使用 Fine-grained PAT

## 连接验证结果

- GitHub REST API：`https://api.github.com/user`，HTTP 状态 200
- 认证方式：`Authorization: Bearer`，令牌本身不输出、不写入文档、不提交到仓库
- 当前注册主机：`api.github.com`
- MCP 说明：Muse 的 MCP 客户端模板支持 Streamable HTTP 并以 Bearer 头发送凭据，GitHub 官方远程 MCP 端点为 `https://api.githubcopilot.com/mcp/`，官方文档支持 OAuth 和 PAT 两种方式；但当前 `custom.github` 注册只包含 `api.github.com`，因此 MCP 经由本连接器尚未启用，后续如需 MCP，需单独扩展注册主机，REST 写入不受此影响

## 仓库现状（基于 `main` 的 README）

- 定位：响应式少儿编程学习平台仓库
- MVP 范围：面向手机和桌面的响应式 Web 体验、按年龄分流的入驻流程和轻量测评、引导式 Blockly 课程流程与首个动画故事项目、可收集卡片与进度追踪、游客进度保存与账号绑定、家长总览页
- MVP 相关文档：`docs/superpowers/specs/2026-03-30-kids-coding-mvp-design.md`、`docs/superpowers/plans/2026-03-30-kids-coding-mvp.md`
- MVP Web 应用：`apps/web`
- 仓库根目录另有 `AGENTS.md`、`docs/`、`apps/`、`deploy/`、`examples/`、`scripts/`、`tools/`，后续改动应先读对应目录的现有文档和规范

## 工作规则

- 不直接提交到 `main`，改动一律走 `muse-c/` 前缀的独立分支加 Draft PR
- 每次写入后回读验证，写入不确定时先查当前状态再决定是否重试
- 不把令牌、密钥、验证码写入文档、提交信息或代码注释
- 涉及多个仓库时，先确认每个仓库的完整 `owner/repo`，再按需扩展授权，不要假设仓库名

## 授权扩展说明

- 本次连接不永久锁死在 kidsCoding 一个仓库
- Fine-grained PAT 的仓库授权可以在 GitHub 的令牌设置中编辑，增加新的仓库；新增项目时按最小权限重新评估 Contents、Pull requests 等权限
- Muse 连接器注册的主机和凭据也可以重新提交扩展，扩展前先用只读请求验证新仓库的访问状态
- 账号后续参与其他项目时，应为不同项目使用独立的分支和 Draft PR，避免跨项目改动混在一个分支里

## 本次交付

- 新分支：`muse-c/handover-doc`
- 新增文件：`docs/muse-handover.md`（即本文件）
- 目标：Draft PR，基分支 `main`，用于评审接手信息，不直接合并

## 待确认事项

- 是否需要把 `api.githubcopilot.com` 加入 `custom.github` 注册，以启用官方 MCP 路线
- 下一步具体任务、优先级和验收标准，由仓库维护者在 Draft PR 中确认
