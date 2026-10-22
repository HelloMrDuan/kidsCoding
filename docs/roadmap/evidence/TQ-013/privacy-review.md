# TQ-013 儿童隐私与云同步审查

> **AI 整理，非法律意见。** 下表依据仓库代码（2026-10-22，分支 `tq-013`）与对《中华人民共和国个人信息保护法》（PIPL）、《儿童个人信息网络保护规定》（国家网信办 2019）的一般理解整理，用于工程排期，不构成合规结论。上线前须由具备资质的法务复核；文中条款编号为 AI 整理，须对照官方文本核对。
>
> 本次只在代码层面落地；**Supabase 真实环境未验证**（RLS 在真实项目中的效果留给 CLOUD-103）。迁移已在一次性 PostgreSQL 中逐条验证（CI：`apps/web/scripts/child-privacy-rls.sql`，本地用 PGlite 跑同一脚本并做了 3 次“改坏迁移 → 脚本报错”的反向检查）。

## 1. 儿童数据清单

### 1.1 本机（浏览器，不离开设备，除非下表“上传路径”另行说明）

| 存储位置 | 字段 | 用途 | 是否必需 | 保留期 |
|---|---|---|---|---|
| localStorage `kc-onboarding` | 年龄段 `ageBand`、测评答案 `answers`（题号/选项/分值）、推荐起点 `recommendedLevel` | 定学习起点 | 年龄段/起点必需；答案仅本机计算用 | 直到清除浏览器数据或绑定成功后清除 |
| localStorage `kc-progress` | 已完成课、星星、徽章、卡片、连续天数、当前课、已完成作品、作品积木快照（积木类型 + TQ-012 预设对白 id） | 学习地图、奖励、作品重开 | 必需 | 同上 |
| localStorage `kc-lesson-draft*` | 课堂中途积木草稿 | 刷新后恢复 | 必需（体验） | 完成该课后清除 |
| localStorage 网格课草稿（`gridDraftKey`） | 网格课程序草稿 | 恢复 | 必需（体验） | 用户清除前 |
| localStorage `kids-python-local-practice-v1:*` | Python 源代码（**自由文本**）、是否通过 | Python 练习草稿 | 必需（功能） | 用户清除前 |
| IndexedDB `kidscoding-scratch-local-v1` | Scratch `.sb3`（可含**自由文本、图片、录音**） | Scratch 草稿 | 必需（功能） | 用户清除前 |
| localStorage `kc-scroll-restore:*` | 地图滚动位置 | 返回时恢复 | 非必需，无个人信息 | 会话级 |
| Cookie `kc_guest_id`（httpOnly） | 随机 UUID | 关联访客快照 | 需云同步时必需 | 30 天（自首次同步起，不续期） |

### 1.2 云端（Supabase）

| 表 | 字段 | 写入方 | 读取方 | 用途 | 是否必需 | 保留期 |
|---|---|---|---|---|---|---|
| `guest_snapshots` | `guest_id`、`onboarding{ageBand, recommendedLevel}`、`progress{completedLessonIds, badgeIds, cardIds, projectSnapshots}`、`updated_at` | `/api/guest`（service role） | `/api/bind-account`（service role） | 绑定家长账号时恢复进度 | 仅为跨设备/绑定所需 | **30 天未更新即删除**（见 §4） |
| `child_profiles` | `user_id`、`display_name`（当前固定为“小小创作者”）、年龄段、起点 | bind-account（service role） | 家长页（本人） | 家长概览 | 必需 | 随账号删除级联 |
| `progress_records` / `badge_records` / `card_records` | 课程 id、状态、星星；徽章 id；卡片 id | bind-account（service role） | 家长页（本人） | 成长记录 | 必需 | 随账号级联 |
| `project_snapshots` | 课程 id、积木快照、`owner_guest_id`、`owner_user_id` | bind-account（service role） | 家长页、作品页（本人） | 家长看作品 | 必需 | 随账号级联 |
| `python_practice_drafts` | Python 源码（≤5000 字，**自由文本**） | 本人（RLS，已有） | 本人 | 云端草稿（手动） | 可选 | 随账号级联 |
| `scratch_practice_drafts` | `.sb3` base64（**可含文本/图片/录音**） | 本人（RLS，已有） | 本人 | 云端作品（手动） | 可选 | 随账号级联 |
| `orders` / `entitlements` | 支付订单、权益 | 服务端（service role） | 本人 | 购买课程 | 购买时必需 | 未定义（财务留存，待 CLOUD-105/法务） |
| Supabase Auth `auth.users` | 家长邮箱或手机号（OTP） | Supabase | Supabase | 家长账号 | 必需 | 账号存续期 |

不采集：孩子姓名（`display_name` 由前端固定，见风险 R4）、照片、位置、通讯录、设备标识。

## 2. 上传路径（TQ-013 之后）

1. **测评结束** `onboarding/check` → `syncGuestSnapshot` → `POST /api/guest`：只发年龄段、起点和（此时为空的）进度 id。**测评答案不再上传**（客户端 `toGuestSyncPayload` 不放，服务端 `parseGuestSnapshotPayload` 也会丢弃）。
2. **每完成一课** `learn/lesson/[lessonId]` → 同一接口：完成课 id、徽章 id、卡片 id、作品积木快照（积木类型 + 预设对白 id）。星星、连续天数、当前课不上传。
3. **绑定家长账号** `/api/bind-account`：用 service role 读 `guest_snapshots`，写入本人各表。
4. **Python / Scratch 云端草稿**：仅登录后手动点击，本人 RLS（TQ-013 未改）。

`/api/guest` 收紧：字段白名单（未知字段丢弃）、类型校验（错误类型 400）、请求体上限 64 KB（413，先看 `content-length` 再看实际字节）、所有字符串必须是 `^[A-Za-z0-9_.:-]{1,96}$` 的 id（挡住姓名等自由文本）、列表 ≤200、快照 ≤100 份、每份 ≤200 积木；数据库写失败返回 502，不再假装“已同步”。

## 3. RLS（迁移 `202610220011_child_privacy_rls.sql`）

| 表 | 策略 |
|---|---|
| child_profiles、progress_records、badge_records、card_records、orders、entitlements | RLS 开；`authenticated` 仅 `select` 且 `auth.uid() = user_id`；无写策略（写入一律走服务端 service role） |
| project_snapshots | 同上，按 `owner_user_id` |
| guest_snapshots | RLS 开；**无任何 anon/authenticated 策略、撤销全部授权** → 仅 service role |
| lesson_configs、remedial_lesson_configs、audio_asset_configs、lesson_publications、lesson_publication_backups、launch_curriculum_skeletons、ai_runtime_settings、admin_bootstrap_events | RLS 开、无策略、撤销授权 → 仅 service role（代码里全部经 `createAdminClient()`） |

已核对使用用户级客户端（`createServerSupabaseClient`）的位置都只做本人 `select`：`parent/overview`、`parent/projects/[projectId]`、`parent/purchase`、`api/course-access`、`api/payments/orders/[orderId]`。写 `guest_snapshots` 的 `/api/guest`、`/api/bind-account` 均为 admin client。浏览器端 Supabase 客户端只做认证，不查表。

迁移还会把历史 `guest_snapshots.onboarding.answers` 删掉。

## 4. guest_snapshots 保留期

- 函数 `public.purge_stale_guest_snapshots(retention_days default 30)`：删除 `updated_at` 早于 30 天的行，返回删除数；API 角色无执行权。
- 为什么 30 天：`kc_guest_id` Cookie 自首次同步起 30 天过期且不续期，超过 30 天未更新的行已无法被任何访客关联，保留无用。
- `/api/guest` 每次同步刷新 `updated_at`。
- **调度**：若数据库已装 `pg_cron`，迁移自动注册每日 03:17 UTC 任务 `purge-stale-guest-snapshots`；Supabase 需先在控制台启用 pg_cron 扩展再执行迁移（或启用后手动执行 `select cron.schedule('purge-stale-guest-snapshots','17 3 * * *','select public.purge_stale_guest_snapshots(30)')`）。没有 pg_cron 时，由运维用 service role 每日调用 `select public.purge_stale_guest_snapshots(30);`（如 GitHub Actions 定时任务 + `psql`）。**真实环境尚未配置**，与 CLOUD-103 一起验证。

## 5. 如实告知（界面）

- 课堂进度条：`完成后，进度和积木会存到服务器，不存名字`（`lesson-cloud-privacy-note`；无云端后端、结果为“仅保存到本机”时隐藏）。
- 测评页：`答题内容只留在这台设备上；服务器只记年龄段和起点，不存名字。`（`onboarding-privacy-note`）
- 原有“已同步到云端 / 仅保存到本机 / 云端同步失败”状态保持；接口失败现在会如实显示失败。

## 6. 差距表（AI 整理，非法律意见）

| 要求（概述） | 依据 | 现状 | 差距 | 负责任务 |
|---|---|---|---|---|
| 不满 14 周岁儿童个人信息属敏感个人信息，处理须取得父母或其他监护人同意 | PIPL 第28、31条；规定第9条 | 访客模式在未取得监护人同意时即上传进度 id 与作品积木快照（不含姓名，但与 Cookie 关联） | 缺监护人同意流程；需判断匿名进度是否构成个人信息（保守按是处理） | CLOUD-105 |
| 专门的儿童个人信息保护规则和用户协议，告知目的、方式、范围、保存期限 | 规定第8、10条；PIPL 第17条 | 仅有本页面级简短告知 | 缺专门规则与用户协议、隐私政策页 | CLOUD-105 |
| 最小必要，不得收集与服务无关的信息 | PIPL 第6条；规定第7、11条 | TQ-013 已停止上传测评答案、星星/连续天数等；接口白名单+id 格式 | 基本满足（代码层）；Python/Scratch 云端草稿含自由文本与媒体 | 本任务；R3 |
| 存储期限不超过实现目的所必需 | 规定第12条；PIPL 第19条 | guest_snapshots 30 天清理函数 | 调度未在真实环境开启；正式账号数据、订单无保留期定义 | CLOUD-103 / CLOUD-105 |
| 监护人可更正、删除；注销后删除 | 规定第19、20条；PIPL 第47条 | 外键级联删除；无家长自助删除入口 | 缺删除/导出 UI 与流程验证 | CLOUD-105 |
| 访问权限最小化、内部人员审批 | 规定第15条 | RLS：本人只读、guest 仅 service role | 真实环境未验证；service role 密钥管理、管理员访问审计未覆盖 | CLOUD-103 |
| 安全评估、加密等安全措施 | 规定第13条；PIPL 第51、55条 | Supabase 传输/静态加密（平台能力，未核实配置） | 未做个人信息保护影响评估 | CLOUD-105（建议另立） |
| 委托第三方处理须评估并约束 | 规定第16条；PIPL 第21条 | Supabase、支付服务商、语音/AI 服务 | 未审查数据处理协议、跨境问题 | CLOUD-105 |
| 公开作品分享需审核 | 规定（一般义务） | 当前无公开分享 | 上线分享前需审核流程 | CLOUD-105 |

## 7. 风险清单

| # | 风险 | 级别 | 负责任务 |
|---|---|---|---|
| R1 | RLS 只在一次性 PostgreSQL 验证，Supabase 真实项目（角色授权、默认权限、pg_cron）未验证 | 高 | CLOUD-103 |
| R2 | 访客上传在取得监护人同意之前发生；无删除/导出入口 | 高 | CLOUD-105 |
| R3 | Python 源码、Scratch `.sb3` 云端草稿可含孩子输入的姓名、学校、录音、图片等自由内容（本人 RLS 已有，但无内容提示与审核） | 中 | CLOUD-105 |
| R4 | `/api/bind-account` 仍接受客户端传入的 `displayName`（前端固定“小小创作者”），恶意或未来改动可写入真实姓名 | 中 | CLOUD-105 |
| R5 | 绑定成功后 guest_snapshots 不立即删除，靠 30 天清理 | 低 | CLOUD-105 |
| R6 | 家长成长报告将来如引入学习证据（预测/反思），按用户决定先只存本机 | 低 | TQ-014 / UX-503 |
| R7 | orders/entitlements 保留期未定义（财务法规与儿童数据规定需平衡） | 低 | CLOUD-105 |

## 8. 与其他任务的关系

- **TQ-002 第 7 项（TQ-002g）前半**：本任务完成“儿童隐私与云同步审查”；评价与证据部分在 TQ-014。
- **CLOUD-103**：真实 Supabase 环境 A/B 越权测试、pg_cron 调度验证。
- **CLOUD-105**：监护人同意、删除/保留策略流程、分享审核，本表“差距”列多数归它。
- **UX-503**：家长端真实成长报告只读本人数据，受本任务 RLS 约束。
