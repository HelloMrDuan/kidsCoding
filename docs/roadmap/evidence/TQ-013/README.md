# TQ-013 儿童隐私与云同步审查（最小采集、接口收紧、RLS）

审查全文与差距表：[privacy-review.md](./privacy-review.md)（AI 整理，非法律意见）。

## 改了什么
- `apps/web/src/features/progress/guest-snapshot-payload.ts`（新）：访客同步唯一允许的形状。客户端 `toGuestSyncPayload` 只发年龄段/起点 + 完成课/徽章/卡片 id + 作品积木快照（保留 TQ-012 `line`）；服务端 `parseGuestSnapshotPayload` 白名单 + 类型校验 + id 格式，未知字段（含测评 `answers`）丢弃。
- `apps/web/src/app/api/guest/route.ts`：64 KB 上限（413）、非法类型 400、写库失败 502（以前忽略错误仍报已同步）、刷新 `updated_at`。
- `sync-guest-snapshot.ts`：不再上传测评答案；`merge-guest-snapshot.ts` 兼容旧行与新形状，绑定账号流程不变。
- 迁移 `apps/web/supabase/migrations/202610220011_child_privacy_rls.sql`：所有早期表开 RLS；儿童数据表本人只读；`guest_snapshots` 与配置表仅 service role；清掉历史答案；`purge_stale_guest_snapshots(30)` + 有 pg_cron 时自动每日调度。
- 文案：课堂进度条“完成后，进度和积木会存到服务器，不存名字”；测评页“答题内容只留在这台设备上；服务器只记年龄段和起点，不存名字。”
- teaching-reviews lesson-01～12 的 `minor-privacy-risk` 备注更新：仍为 `unchecked`（真实环境未验证），成熟度保持 L3。

## 测试
- `apps/web/src/app/api/guest/route.test.ts`：丢弃答案/姓名/未知字段、保留 `line`、413、8 种非法类型 400、无后端 synced:false、写库失败 502、Cookie 复用。
- `apps/web/src/features/progress/guest-snapshot-payload.test.ts`：客户端形状、经服务端校验后 bind-account 合并仍正确。
- `apps/web/src/features/privacy/child-privacy-migration.test.ts`：每张建表都有 enable row level security、本人只读策略、guest 无策略、清理函数。
- `apps/web/scripts/child-privacy-rls.sql`（CI `scratch-rls-postgres` 作业，真实 PostgreSQL 16）：A/B 互不可见、authenticated 不能直写、anon 无权限、guest_snapshots 不可读写、答案清除、清理函数只删过期行且 API 角色不可调用。
- `sync-guest-snapshot.test.ts`、`guided-lesson-shell.test.tsx` 补断言。

## 未验证
- Supabase 真实项目 RLS 与 pg_cron 调度 → CLOUD-103。
- 监护人同意、删除/导出 → CLOUD-105。
