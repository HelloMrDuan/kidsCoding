# First Admin Bootstrap Design

## Goal

为 `kidsCoding` 提供一条可正式上线的“首个管理员自助开通”流程，使系统不再依赖手工进入 Supabase 后台修改用户 metadata 才能使用 `/admin`。

第一版目标很收敛：

- 只解决首个管理员如何安全创建
- 创建成功后现有 `/admin` 权限体系立即生效
- 开通入口在系统已有管理员后永久关闭
- 不把后续管理员管理、多人授权或后台角色系统一起做进来

## Scope

### In Scope

- 新增首个管理员开通页 `/setup/admin`
- 使用专用链接中的一次性 setup token 作为访问凭证
- 要求用户先登录，再进行首个管理员开通
- 服务端校验“当前系统尚无管理员”
- 将当前登录用户写为 `app_metadata.role = 'admin'`
- 记录一条首个管理员 bootstrap 成功日志
- 成功后跳转 `/admin`
- 当系统已有任一管理员后，永久关闭该入口
- 更新 README，补充首个管理员真实开通流程

### Out of Scope

- 应用内新增第二个及后续管理员
- 后台管理员管理页面
- 角色撤销、角色变更、多人审批
- 基于邮箱输入给其他用户授予管理员
- 复杂审计系统
- 通过 Supabase SQL 直接批量修复管理员角色

## Core Principle

第一版遵守四条原则：

1. 首个管理员只能把“当前登录用户”开通为管理员
2. setup token 只作为首个管理员创建入口，不作为长期后台权限机制
3. 系统中一旦存在任一管理员，开通入口永久关闭
4. 权限真相来源仍然是 `auth.users.app_metadata.role = 'admin'`

## User Flow

### Bootstrap Link

系统通过专用链接进入首个管理员开通页，例如：

- `/setup/admin?token=<setup-token>`

第一版只支持链接携带 token，不支持在页面中手工输入。

### End-to-End Flow

1. 用户打开 `/setup/admin?token=...`
2. 如果未登录，先跳转登录流程
3. 登录成功后回到当前 setup 链接
4. 页面调用服务端查询当前开通状态
5. 服务端校验：
   - token 是否有效
   - 当前系统是否尚无管理员
   - 当前登录用户是否存在
6. 校验通过后，页面显示确认信息和当前登录邮箱
7. 用户点击“开通管理员权限”
8. 服务端执行管理员写入和 bootstrap 日志写入
9. 成功后跳转到 `/admin`

## Page States

页面只需要支持以下状态：

### Not Logged In

- 展示“请先登录后继续”
- 登录后回到原 setup 链接

### Invalid Token

- 统一提示“开通链接无效或不可用”
- 不区分空 token、错误 token、格式错误
- 不暴露环境变量细节

### Already Closed

- 当系统已有任一管理员时，提示“首个管理员已完成开通”
- 不再展示确认按钮
- 给返回首页或登录页入口

### Ready To Confirm

- 展示当前登录邮箱
- 明确告知：将把该用户开通为首个管理员
- 提供单一确认按钮

### Success

- 展示开通成功
- 自动或立即跳转 `/admin`

### Failure

- 展示通用失败提示
- 允许重试
- 不泄露内部错误堆栈

## Security Boundary

### Access Model

该页面不是公开自助注册管理员入口。真正的安全校验必须全部在服务端执行：

- token 必须与环境变量中的 setup token 一致
- 当前请求必须带有已登录用户
- 服务端每次执行前都重新检查系统是否已存在管理员

### Closure Rule

关闭条件采用单一标准：

- 只要系统里已经存在任一管理员，`/setup/admin` 就永久关闭

这意味着即使旧链接仍被访问，也只能看到关闭状态，而不能再次开通。

### Token Handling

第一版 token 规则如下：

- token 仅通过链接传入
- 前端不回显 token
- 服务端不记录原始 token
- token 本身不需要单独落库标记“已使用”
- 因为“已有管理员”已经是天然关闭条件

## Data Model

### Admin Role Source

运行时管理员判断保持不变：

- `auth.users.app_metadata.role = 'admin'`

现有 `assertAdminUser` 继续使用这条规则，无需重构 `/admin` 权限体系。

### Bootstrap Event Table

新增一张轻量记录表：

- `admin_bootstrap_events`

建议字段：

- `id`
- `user_id`
- `email`
- `event_type`
- `created_at`

第一版只记录一种事件：

- `first_admin_granted`

这张表的作用只是保留首个管理员开通记录，不作为权限判断真相来源。

## API Design

### Route

新增：

- `GET /api/setup/admin/bootstrap`
- `POST /api/setup/admin/bootstrap`

### GET Responsibility

用于页面初始化状态查询，返回：

- 当前是否已登录
- token 是否有效
- 系统是否已有管理员
- 当前是否可继续开通
- 当前登录邮箱（如可安全展示）

### POST Responsibility

用于真正执行首个管理员开通。服务端需要按顺序执行：

1. 校验当前登录用户存在
2. 校验 token 有效
3. 查询当前是否已存在管理员
4. 使用 service role 更新当前用户 `app_metadata.role = 'admin'`
5. 写入 `admin_bootstrap_events`
6. 返回成功结果

### Atomicity Rule

第一版需要把“写管理员角色”和“写 bootstrap 日志”放在同一条服务端流程里处理。

如果日志写入失败，则整体视为失败，不应把页面表现成成功状态。

## Existing Auth Integration

本设计不改现有后台鉴权模型，只补权限来源。

集成结果应为：

- 首个管理员开通前：`/admin` 对普通用户继续拒绝访问
- 首个管理员开通后：现有 `/admin` 页面、AI 设置、课程编辑、发布流程自动可用
- 不新增第二套管理员状态判断

## Error Handling

第一版必须明确处理以下错误：

- 未登录
- token 无效
- 系统已有管理员
- 当前用户不存在
- 写入 `app_metadata` 失败
- 写入 `admin_bootstrap_events` 失败

错误返回规则：

- 对用户显示统一且可理解的提示
- 不暴露 Supabase 内部错误细节
- 不因前端缓存状态而跳过服务端重查

## Documentation

需要在 [apps/web/README.md](D:/pyprograms/kidsCoding/apps/web/README.md) 中新增：

- setup token 环境变量说明
- 首个管理员开通链接说明
- 首次部署后的管理员开通步骤
- 成功开通后入口为何会永久关闭

## Acceptance Criteria

- 未登录用户访问 `/setup/admin?token=...` 时会被引导先登录
- token 无效时页面不会泄露内部细节
- 系统尚无管理员时，当前登录用户可以通过 setup 链接把自己开通为管理员
- 成功后当前用户的 `app_metadata.role` 变为 `admin`
- 成功后写入一条 `admin_bootstrap_events` 记录
- 成功后访问 `/admin` 可以通过现有鉴权
- 一旦系统已有管理员，`/setup/admin` 入口永久关闭
- README 能说明真实开通流程

## Recommended Next Step

这份规格确认后，下一步进入 implementation plan，建议顺序为：

1. 数据库迁移：新增 `admin_bootstrap_events`
2. 新增 `/setup/admin` 页面与状态流
3. 新增 `/api/setup/admin/bootstrap` 的 `GET/POST`
4. 接通 service role 更新 `app_metadata`
5. 补 README、单测和 E2E
