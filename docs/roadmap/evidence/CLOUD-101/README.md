# CLOUD-101 真实 Supabase 迁移与回滚确认（方案 A：旧机本地栈）

目标：旧机 platforms-core-01 本机 Supabase 栈（Postgres 15.8.1.085）。
不创建 Supabase Cloud 项目，不产生新的云服务费用；不把预发布标记为正式生产标准。

## 1. 迁移盘点

- 迁移文件 11 个（`apps/web/supabase/migrations/`），线上已应用 10 个，
  唯一缺失 `202610220011_child_privacy_rls.sql`。
- 18 张 public 表；`anon` 全无授权；部署侧 hardening（2026-10-21）后 7 张儿童表
  已有 `owner_all` 策略，2 张草稿表各有 4 个自有策略。
- 行数基线：child_profiles 1、progress_records 1、guest_snapshots 14、其余多为 0；
  auth.users 4；storage 桶 0、对象 0；数据库 12 MB。

## 2. 缺失迁移：部分应用（诚实状态）

- 已应用 011 除清理段外的全部内容（单事务，exit 0）：
  18/18 表 RLS 全开；7 张儿童表新增 `*_read_own` 策略（策略总数 15→22）；
  `authenticated` 在 7 张儿童表上收为仅 SELECT；
  `purge_stale_guest_snapshots` 函数与索引已建；pg_cron 未装，定时块为 no-op。
- 未记为已应用：`schema_migrations` 仍为 10 行（部分应用不冒充全应用）。
- 2026-10-27 duan 拍板后执行（见 §3、§4），关账时 011 仍记为部分应用，
  剩余两项（答案清理、owner_all）均已按决策执行完毕。

## 3. guest 答案清理（duan 2026-10-27 决策：清理）

- 执行前残留 14/14 行含 `onboarding.answers`；执行迁移原清理逻辑
  （`SET onboarding = onboarding - 'answers' WHERE onboarding ? 'answers'`），UPDATE 14。
- 执行后：残留 0，总行数仍 14，`onboarding` 非空仍 14（只清字段，未删行）；
  业务数据未变：progress 1、badge 0、card 0、projects 0、child 1、orders 0、entitlements 0。
- 30 天清理调度：pg_cron 未装，机上无 cron；已补 systemd 定时
  `cloud101-purge-guest-snapshots.timer`（每天 03:17 UTC，Persistent=true，
  机器暂停时错过的任务在恢复后补跑），服务实测跑过一次，日志记 purged=0
  （当前无超 30 天未更新行）。函数只删 30 天未更新行，不做全表清空。

## 4. owner_all 删除（duan 2026-10-27 决策：删除遗留冗余策略）

- 删除前逐项比对（`pg_policies` + GRANT 实读）：owner_all 共 7 张表，全部 ALL 命令、
  authenticated 角色、owner 条件（6 张 `user_id = auth.uid()`，
  project_snapshots 为 `owner_user_id = auth.uid()`）；与迁移最小策略 read_own
  （同角色、同 owner 条件、仅 SELECT）相比，owner_all 同范围、更宽命令，属遗留冗余。
- 回滚备份：机上 `/data/home/backups/cloud101-20261027/owner_all-rollback.sql`
  （600 权限，7 条 CREATE POLICY 原样重建语句，删除前由 `pg_policies` 生成）。
- 删除方式：单事务 7 条显式 DROP POLICY（逐表核实过的表名，不按名批量删），exit 0；
  删后 owner_all 0、总策略 22→15、read_own 9 条 intact、7 表 GRANT 仍仅 SELECT、站点健康 200。

## 5. RLS / 跨账号隔离验证（删 owner_all 后重跑，全部通过）

- 策略层（真实用户 UUID，`SET ROLE authenticated` + `request.jwt.claim.sub`）：
  草稿 A=1/B=0、儿童 A=1/B=0；A 写儿童表拒绝、A 读配置表拒绝、anon 读草稿拒绝。
- 网关层（真实 Gotrue 注册 + 登录 + PostgREST，未用 service_role 做断言）：
  新用户草稿写 201、读自有 1 行；读儿童 0 行（他人行不可见）；写儿童 403；
  service_role 写儿童 201（服务端合法写路径 intact）；写后自有读 1 行。
- 无合法访问回归，故未触发回滚；测试行已清（drafts 0、child 1、guest 14）。

## 6. 测试用户收尾

- 管理 API 删除行为不一致（实测记录）：两轮 admin DELETE 均返回 200，但第一轮用户行仍在
  且 deleted_at 为空，第二轮用户已消失。本栈 admin 删除不能单独作为清理证据，
  须以 SQL 层行数/ID 核对为准。
- 硬删本轮测试账号（ID + `email LIKE 'cloud101%'` 双条件），DELETE 1。
- 最终用户状态：恰好 4 个原始账号，全部 deleted_at 为空（原始账号未受影响）；
  测试账号 0；会话随用户行删除而失效。

## 7. 备份与恢复

- 主备份：机上 `/data/home/backups/cloud101-20261027/postgres-20261027.dump`
  （349,686 字节，sha256 `8fa40e61…4e3ac22e`）+ `globals-20261027.sql`
  （5,417 字节，sha256 `14d8420b…9b219f226fc6d0b`），冗余副本一份，校验值一致。
- 隔离恢复验证（同镜像隔离容器）：公共数据 18 表、行数、15 个策略、10 个迁移版本全部一致；
  `--clean` 恢复后 auth.users=4 与线上一致；剩余报错只涉及未使用的 realtime 角色
  与预建的 storage/graphql 空 schema，无业务数据影响；隔离容器停启后数据完整。
- 持久化：命名卷 `supabase_db_web` → `/var/lib/postgresql/data`，重启策略 `unless-stopped`；
  连接 12/100；数据库自 2026-10-21 07:56 UTC 持续运行。
- 自动暂停后恢复：本次不主动制造暂停；历史证据为 2026-10-23、2026-10-24 自然 suspended 后
  Resume 成功；下一次自然暂停时再验证。

## 8. 最终状态

- guest_snapshots 14 行，answers 残留 0；owner_all 0；策略总数 15；GRANT 未变；
  drafts 0、child 1、guest 14；auth.users 4（原始账号）；站点健康 200。
- 全部操作后业务数据未丢失；长期生产环境迁移另行决策。
