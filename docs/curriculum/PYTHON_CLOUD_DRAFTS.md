# Python 练习代码账号草稿同步 v1

已增加 `/api/practice/drafts` 账号草稿读写接口和 `/learn/portfolio` 明确授权的“上传本机作品 / 恢复较新作品”按钮。

- **登录后才可访问**：服务端根据 Supabase auth.getUser() 获取真实用户，客户端永远不能决定 owner ID。数据库 `python_practice_drafts` 使用 RLS，策略限制 select/insert/update/delete 只能访问 `auth.uid() = user_id` 的行。
- **运行前置条件**：目标 Supabase 实例必须应用 `202610100007_python_practice_drafts.sql`，并配置生产环境 Supabase。未应用迁移时返回503，不应声称同步可用。
- **隐私**：上传是用户主动操作；代码长度≤5000字符；只存第2/3课源码和服务器更新时间。不存客户端声称的 `passed`、星星、正式学习进度或儿童身份资料。
- **跨设备恢复**：用户登录同一账号，打开作品夹主动从云端恢复。只恢复比当前本机保存时间更新的作品，恢复后 `passed=false`，需要重新运行 Pyodide 做练习反馈。
- **离线**：仍可以离线保留本地代码；云端同步失败不会清除本机草稿。
- **部署验收阻塞**：需在真实 Supabase 执行 migration，双设备登录同一账号做保存/恢复 E2E，验证 RLS 无法读取其他账号，并经儿童隐私、安全、备份策略审核。仅 Vitest 通过不代表生产同步完成。
