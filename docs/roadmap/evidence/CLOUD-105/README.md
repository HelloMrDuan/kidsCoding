# CLOUD-105 儿童私有作品同意与保留策略

任务：隐私流程和家长授权。acceptance：最小采集、监护人同意、
删除与分享审核流程实际验证。方案 A（记录式同意，非破坏性）；
方案 B（无同意记录时阻断保存）因破坏性未做，需负责人点头才做。

## 1. 最小采集（已验证，现状即达标）

- 两张草稿表写入字段只有 user_id、lesson_id、作品本体
  （archive_base64 / source）、updated_at；无姓名、年龄、联系方式、
  设备标识等扩展字段。
- `verifiedGrade` 只出现在响应里写 false，从不入库；Python 路由
  注释明言不接受、不持久化浏览器通过标志。
- 「私有作品」范围收窄为 drafts + project_snapshots；progress /
  badge / card 是学习记录非作品，已有 owner-only RLS，不在改动面。

## 2. 监护人同意（本任务新建）

- 账号模型：本产品无独立监护人角色；bind-account 是
  guest→注册账号的数据迁移，不是监护人-儿童关联；parent 视图是
  同一账号持有人看同一 user_id 数据。因此「监护人同意」在本产品
  里 = 账号持有人的同意记录。
- 新表 `guardian_consents`（迁移 012）：主键 (user_id, scope)，
  user_id 外键级联 auth.users，RLS 仅本人四项策略
  （select/insert/update/delete 均 uid = user_id），仅授权
  authenticated 角色。同意记录不放进 child_profiles（监护人行为
  不属儿童画像字段）。
- 新接口 `POST/GET /api/guardian-consent`：scope 服务端固定
  `cloud-drafts`，不接受调用方 scope / user_id；同源 + 鉴权；
  upsert onConflict 'user_id,scope'；错误码与 drafts 路由同族
  （503/401/403）。
- 家长端展示：`/parent/overview` 首屏状态卡（沿用本页已有卡片
  与按钮样式，无新增颜色、无布局改动）+ 确认按钮（POST 后刷新
  状态行）。同意是记录，不做保存/绑定的硬门禁：现有用户不受影响。
- 部署注意：012 需在合并后由部署侧应用到线上 Supabase
  （与 CLOUD-101 的 011 同例），否则同意接口在预发布上因无表
  而报 503。

## 3. 删除（本任务补 API 层，不改 RLS、不新增迁移）

- 两条路由此前只有 GET/PUT、无 DELETE；DB 层两表 delete_own
  RLS 已齐，user_id 外键 on delete cascade（账号注销自动清作品，
  无需另写清除逻辑）。
- 新增：Scratch 路由 DELETE（清本人固定单课）、drafts 路由
  DELETE（按 lessonId 清本人一行，无 lessonId 不删任何东西）。
  路由层恒按 session user_id 过滤，跨用户删除构造上不可能；
  DB 失败报 503 不谎称成功。
- 本任务不给作品列表加删除按钮（作品列表属 UX-302/303 已验收
  范围，擅自加按钮是 scope 扩张）；删除流程以 API + 单测验证，
  UI 删除入口留待后续任务定。

## 4. 保留策略（定案）

- 认证用户作品：保留至用户主动删除或账号级联清除；不加自动
  purge——对学习作品按 30 天自动删是破坏性行为。
- 仅 guest_snapshots 有 30 天 purge（011 迁移，systemd 定时），
  本任务不动。
- 未决点（交负责人知晓，不擅自处理）：owner_user_id 为空的
  未绑定 guest 快照无 purge 覆盖，会一直留着；默认处理 = 本
  文档定性，不擅自加删。

## 5. 分享审核（验证结论：默认不公开）

- 全仓无 share / publish API；`app/project/` 只有只读完成页。
- 家长视图全部查询按 user_id / owner_user_id 过滤，未登录
  redirect /auth/bind，无跨用户泄露面。
- 本任务不新建分享功能；分享部分以「验证默认不公开 + 监护人
  查看鉴权」验收。

## 6. 测试与验收边界

- 路由单测：scratch DELETE 3 例、drafts DELETE 3 例、同意接口
  7 例（含服务端固定 scope、跨域、存储失败）；迁移静态检查
  （建表、主键、FK 级联、RLS、仅 authenticated、四项 owner-only
  策略）；家长端确认按钮组件单测 2 例。
- 未新增 Playwright spec，原因：家长端页面需登录会话，现有
  mock 式 spec 模式无法覆盖登录后服务端页面；按钮由组件单测
  覆盖，流程由路由单测覆盖；workflow 只补了新单测文件的运行
  接线与触发路径，未动 portfolio E2E 名单。
- 本地验证：5 文件 36 项 vitest 全绿，ESLint 改动文件 0 错，
  tsc 改动文件 0 错（测试床其余历史遗留错误与本任务无关）。
