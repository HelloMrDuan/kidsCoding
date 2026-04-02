# Portable Supabase CLI Design

## Goal

为 `kidsCoding` 的本地 Supabase 联调补齐一层“可移植 CLI 套件”，让项目在保留系统级 `Supabase CLI` 支持的同时，也能通过仓库内脚本把指定版本的 CLI 下载到 `.tools` 目录并优先使用。

第一版目标不是做通用工具管理平台，而是解决当前本地联调的两个实际问题：

- 新机器未安装 `Supabase CLI` 时，项目可以用仓库脚本补齐依赖
- 网络或代理环境不稳定时，项目可以通过固定版本、可覆盖下载源和仓库内路径降低接入成本

最终要形成的体验是：

1. 先执行 `npm run local:supabase:install-cli`
2. 再执行 `npm run local:supabase:setup`
3. 项目优先使用仓库 `.tools` 下的 CLI
4. 如果 `.tools` 不存在，再回退到系统 `PATH`

## Scope

### In Scope

- 新增 `npm run local:supabase:install-cli`
- 固定 `Supabase CLI` 版本，并按平台下载官方发布包
- 支持 `Windows + macOS + Linux`
- 下载后解压到仓库 `.tools/supabase/<platform>/`
- `local:supabase:setup` 优先使用仓库 `.tools`，缺失时回退系统 `PATH`
- 支持通过环境变量覆盖 CLI 下载基础地址
- 更新 `README` 和相关错误提示
- 忽略 `.tools` 目录下下载的二进制文件，不提交进 git

### Out of Scope

- 把 `Supabase CLI` 二进制直接提交进仓库
- 在后台页面里管理 CLI 安装
- 自动安装 Docker Desktop
- 自动配置 shell 代理
- 动态安装“最新版本” CLI
- 管理更多开发工具的统一安装
- 在 `local:supabase:setup` 中静默自动下载 CLI

## Core Decisions

### 1. 安装和使用分成两条命令

第一版明确拆成两条命令：

- `npm run local:supabase:install-cli`
- `npm run local:supabase:setup`

原因是：

- 安装过程可能涉及下载、代理和镜像，失败原因和 setup 完全不同
- setup 的职责应保持稳定，只负责使用 CLI 启动本地 Supabase、写 `.env.local`、跑迁移和 seed
- 把“自动下载”塞进 setup 会让错误边界变模糊，排查也更难

### 2. 优先仓库 `.tools`，再回退系统 `PATH`

CLI 解析顺序固定为：

1. 仓库 `.tools/supabase/<platform>/`
2. 系统 `PATH`
3. 两者都没有时，抛出明确错误

这样既满足项目自带可用路径，也不破坏已经安装系统级 CLI 的开发机。

### 3. 固定版本，而不是总是下载最新版本

第一版必须使用项目指定版本常量，例如：

- `SUPABASE_CLI_VERSION=<固定版本>`

不使用“最新版本”有三个原因：

- 本地联调依赖 CLI 输出格式稳定
- 开发环境问题需要可重复复现
- 与仓库里的 Supabase 迁移和脚本行为更容易保持一致

### 4. 默认 GitHub Releases，支持环境变量覆盖

下载源默认走官方 GitHub Releases，但必须支持环境变量覆盖基础地址，例如：

- `SUPABASE_CLI_DOWNLOAD_BASE_URL`

原因是当前机器直连 GitHub 不稳定，后续可能需要：

- 代理
- 镜像源
- 内网制品库

第一版不把镜像策略写死到代码里，只保留覆盖入口。

## Command Design

### local:supabase:install-cli

命令职责：

1. 识别当前平台和架构
2. 计算当前平台对应的发布包名称
3. 生成下载 URL
4. 下载归档包到临时目录
5. 解压并提取 `supabase` 可执行文件
6. 将可执行文件写入 `.tools/supabase/<platform>/`
7. 如当前版本已存在，则直接跳过

命令不负责：

- 启动 Docker
- 写 `.env.local`
- 执行 `supabase db reset`

### local:supabase:setup

命令职责保持为：

1. 解析 CLI 路径
2. 启动本地 Supabase
3. 读取本地 URL 和 key
4. 更新 `.env.local`
5. 重置数据库并应用迁移
6. 创建或修复本地测试管理员

但它的 CLI 解析逻辑需要升级为：

- 先找 `.tools`
- 再找系统 `PATH`
- 找不到时提示先执行 `npm run local:supabase:install-cli`

## Directory Layout

第一版目录结构固定为：

- `.tools/supabase/windows-x64/supabase.exe`
- `.tools/supabase/darwin-x64/supabase`
- `.tools/supabase/darwin-arm64/supabase`
- `.tools/supabase/linux-x64/supabase`

这一层级已经足够覆盖主流开发机，不需要第一版就为所有冷门架构铺开。

`.tools` 目录必须加入 git 忽略规则，避免二进制进入仓库历史。

## Platform Resolution

### Supported Targets

第一版支持这些平台组合：

- `win32 + x64`
- `darwin + x64`
- `darwin + arm64`
- `linux + x64`

如果遇到不支持的平台或架构，安装脚本应直接失败并给出明确错误，而不是尝试下载不匹配的包。

### Release Mapping

安装脚本需要维护一份平台映射表，把：

- Node 的 `platform`
- Node 的 `arch`

映射为：

- 仓库目录名
- 官方发布包文件名
- 解压后的可执行文件名

映射逻辑必须集中在一个解析层里，不能散落在安装脚本和 setup 脚本中。

## Download Strategy

### Default URL

默认下载地址形如：

- `https://github.com/supabase/cli/releases/download/v<version>/<asset>`

### Override URL

如果设置了：

- `SUPABASE_CLI_DOWNLOAD_BASE_URL`

则安装脚本应改用该地址作为基础前缀，再拼接固定版本和资产名。

例如它可以指向：

- 自建镜像源
- 代理层
- 本地缓存服务

### Proxy Strategy

安装脚本不自行实现代理协议，只继承当前 shell 环境中的：

- `http_proxy`
- `https_proxy`
- `HTTP_PROXY`
- `HTTPS_PROXY`

如果下载失败，错误提示里再提醒用户检查代理或切换下载源。

## Archive Handling

安装脚本需要处理官方归档包的下载、解压和提取，但第一版不做复杂缓存系统。

明确规则：

- 当前平台目录中已存在目标 CLI，且版本匹配时直接跳过
- 下载文件保存到临时目录
- 解压后只提取目标可执行文件
- 成功落盘后清理临时文件

如果解压失败，应提示：

- 归档可能损坏
- 下载源可能返回了错误内容
- 当前平台映射可能不匹配

## Error Handling

安装脚本至少要处理这几类失败：

### 1. 平台不支持

需要明确告诉用户：

- 当前 `platform + arch`
- 第一版支持哪些平台

### 2. 下载失败

需要提示：

- 当前下载 URL
- 可以检查网络或代理
- 可以通过 `SUPABASE_CLI_DOWNLOAD_BASE_URL` 覆盖下载源

### 3. 解压失败

需要提示：

- 归档可能损坏或平台不匹配
- 可以删除临时文件后重试

### 4. 可执行文件提取失败

需要提示：

- 归档内部结构可能发生变化
- 当前项目脚本可能需要更新

### 5. setup 时找不到 CLI

`local:supabase:setup` 需要升级错误提示，优先告诉用户：

- 先执行 `npm run local:supabase:install-cli`

再提供系统级安装作为备选方案，而不是只报“未安装 CLI”。

## Documentation

需要更新 [README.md](D:/pyprograms/kidsCoding/apps/web/README.md)，将本地联调说明调整为两段：

1. 安装本地 `Supabase CLI`
2. 初始化本地 `Supabase`

文档里必须明确说明：

- `.tools` 不会提交二进制文件
- 新机器需要先执行 `npm run local:supabase:install-cli`
- 如果有代理或镜像源，可通过 `SUPABASE_CLI_DOWNLOAD_BASE_URL` 覆盖下载地址
- `local:supabase:setup` 会优先使用仓库内 CLI，再回退系统 `PATH`

## Acceptance Criteria

- 新增 `npm run local:supabase:install-cli`
- 安装命令能按当前平台把固定版本 CLI 落到 `.tools/supabase/<platform>/`
- `local:supabase:setup` 能优先使用 `.tools` 中的 CLI
- 如果 `.tools` 不存在，但系统已安装 CLI，setup 仍然可用
- 如果两者都不存在，setup 给出明确可操作的错误提示
- 支持通过 `SUPABASE_CLI_DOWNLOAD_BASE_URL` 覆盖下载源
- `.tools` 中的二进制不会进入 git 版本库
- README 与实际命令和目录结构一致

## Recommended Next Step

这份规格确认后，下一步进入 implementation plan，建议顺序为：

1. 设计 CLI 解析层和平台映射
2. 实现 `local:supabase:install-cli`
3. 升级 `local:supabase:setup` 的 CLI 查找顺序和错误提示
4. 更新 `.gitignore`、README 和 npm scripts
5. 补单测与本地验证流程
